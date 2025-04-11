const { default: mongoose } = require("mongoose");
const utils = require("../../utils/utils");
const crypto = require("crypto");
const plan = require("../../models/plan");
const subscription = require("../../models/subscription");
// const stripe = require('stripe')('your_stripe_secret_key');

async function genratePlanId() {
    const token = crypto.randomBytes(5).toString('hex')
    return `plan-${token}`
}

async function intervalCount(interval) {
    if (interval === "monthly") {
        return 1
    } else if (interval === "yearly") {
        return 12
    } else {
        return 1
    }
}

exports.createPlan = async (req, res) => {
    try {
        const data = req.body
        console.log("data : ", data)
        const planId = await genratePlanId()
        console.log("plan id : ", planId)

        // const product = await stripe.products.create({
        //     name: data.name,
        //     description: data.description,
        //     metadata: data.metadata || {},
        // });

        const interval_count = await intervalCount(data.interval)
        console.log("interval_count : ", interval_count)
        // const price = await stripe.prices.create({
        //     unit_amount: data.price,
        //     currency: "USD",
        //     recurring: {
        //         interval: data.interval,
        //         interval_count,
        //     },
        //     product: product.id,
        // });

        data.plan_id = planId
        data.interval_count = interval_count
        const newplan = await plan.create(data);
        console.log("newplan : ", newplan)
        return res.status(201).json({ message: "plan created successfully", data: newplan, code: 200 });
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.editPlan = async (req, res) => {
    try {
        const { id } = req.params
        const plandata = await plan.findOne({ _id: id })
        console.log("plandata : ", plandata)
        if (!plandata) {
            return utils.handleError(res, {
                message: "Plan not found",
                code: 404,
            });
        }
        const data = req.body
        console.log("data : ", data)
        const response = await plan.findOneAndUpdate(
            { _id: id },
            { $set: data },
            { new: true }
        )
        console.log("response : ", response)
        return res.status(200).json({
            message: "Plan updated successfully",
            data: response,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.getAllPlan = async (req, res) => {
    try {
        const { offset = 0, limit = 10, type } = req.query
        let filter = {}
        if (type) {
            filter.type = type
        }
        const plandata = await plan.find(filter).skip(Number(offset)).limit(Number(limit)).sort({ createdAt: -1 });
        console.log("plandata : ", plandata)
        const count = await plan.countDocuments(filter)
        return res.status(200).json({
            message: "plan data fetched successfully", data: plandata, count, code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.getSinglePlan = async (req, res) => {
    const { id } = req.params
    const plandata = await plan.findOne({ _id: id })
    console.log("plandata : ", plandata)
    if (!plandata) {
        return utils.handleError(res, {
            message: "Plan not found",
            code: 404,
        });
    }
    return res.status(200).json({
        message: "plan data fetched successfully", data: plandata, code: 200
    })
}


exports.deletePlan = async (req, res) => {
    const { id } = req.params
    const plandata = await plan.findOne({ _id: id })
    console.log("plandata : ", plandata)
    if (!plandata) {
        return utils.handleError(res, {
            message: "Plan not found",
            code: 404,
        });
    }
    const result = await plan.deleteOne({ _id: id });
    console.log("result : ", result)
    return res.status(200).json({
        message: "plan data deleted successfully", data: plandata, code: 200
    })
}


exports.getAllSubscription = async (req, res) => {
    try {
        const { offset = 0, limit = 10, search } = req.query
        let filter = {}
        if (search) {
            filter['$or'] = [
                { 'user.company_data.name': { $regex: search, $options: 'i' } },
                { 'plan.plan_name': { $regex: search, $options: 'i' } }
            ]
        }
        const data = await subscription.aggregate(
            [
                {
                    $lookup: {
                        from: "users",
                        localField: "user_id",
                        foreignField: "_id",
                        as: "user",
                        pipeline: [
                            {
                                $project: {
                                    full_name: 1,
                                    email: 1,
                                    user_type: 1,
                                    company_data: 1
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: {
                        path: "$user",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "plans",
                        localField: "plan_id",
                        foreignField: "plan_id",
                        as: "plan",
                        pipeline: [
                            {
                                $project: {
                                    plan_id: 1,
                                    plan_name: 1,
                                    price: 1
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: {
                        path: "$plan",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: filter
                },
                {
                    $sort: {
                        createdAt: -1
                    }
                },
                {
                    $skip: Number(offset)
                },
                {
                    $limit: Number(limit)
                }
            ]
        )

        return res.status(200).json({
            message: "Subscription data fetched successfully",
            data,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}