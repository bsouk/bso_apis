const { default: mongoose } = require("mongoose");
const utils = require("../../utils/utils");
const crypto = require("crypto");
const plan = require("../../models/plan");
const subscription = require("../../models/subscription");
const Team = require("../../models/team");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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

        // // const product = await stripe.products.create({
        // //     name: data.name,
        // //     description: data.description,
        // //     metadata: data.metadata || {},
        // // });

        // const interval_count = await intervalCount(data.interval)
        // console.log("interval_count : ", interval_count)
        // // const price = await stripe.prices.create({
        // //     unit_amount: data.price,
        // //     currency: "USD",
        // //     recurring: {
        // //         interval: data.interval,
        // //         interval_count,
        // //     },
        // //     product: product.id,
        // // });

        const product = await stripe.products.create({
            name: data.plan_name,
            description: data.plan_description || '',
            metadata: data.metadata || {
            },
        });

        const interval_count = await intervalCount(data.interval);
        let newinterval = ''
        switch (data.interval) {
            case 'monthly': newinterval = 'month'; break;
            case 'yearly': newinterval = 'year'; break;
            case 'weekly': newinterval = 'week'; break;
            case 'daily': newinterval = 'day'; break;
            default: newinterval = 'month'; break;
        }
        console.log("newinterval : ", newinterval)
        const price = await stripe.prices.create({
            unit_amount: data.price * 100,
            currency: data.currency || 'usd',
            recurring: {
                interval: newinterval,
                interval_count: interval_count,
            },
            product: product.id,
        });

        console.log("product : ", product, " price : ", price)

        data.plan_id = planId
        data.interval_count = interval_count
        data.stripe_product_id = product.id
        data.stripe_price_id = price.id
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

        if (data.name || data.description) {
            await stripe.products.update(plandata.stripe_product_id, {
                name: data.name || plandata.name,
                description: data.description || plandata.description,
                ...(data.metadata ? { metadata: data.metadata } : plandata.metadata)
            });
        }

        if (data.price || data.interval || data.currency) {
            const interval_count = data.interval ?
                await intervalCount(data.interval) :
                plandata.interval_count;

            const newPrice = await stripe.prices.create({
                unit_amount: (data.price || plandata.price) * 100,
                currency: data.currency || plandata.currency || 'usd',
                recurring: {
                    interval: data.interval || plandata.interval,
                    interval_count: interval_count,
                },
                product: plandata.stripe_product_id,
            });

            data.stripe_price_id = newPrice.id;
            data.interval_count = interval_count;
        }

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

    const subscriptionCount = await subscription.countDocuments({
        plan_id: plandata.plan_id,
        status: 'active'
    });

    if (subscriptionCount > 0) {
        return utils.handleError(res, {
            message: "Cannot delete plan with active subscriptions",
            code: 400,
        });
    }

    await stripe.products.update(plandata.stripe_product_id, {
        active: false
    });

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
                                    price: 1,
                                    is_auto_renewal: 1
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

        const count = await subscription.aggregate(
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
                    $count: "total"
                }
            ]
        )
        // console.log("count : ", count, " data : ", data)

        return res.status(200).json({
            message: "Subscription data fetched successfully",
            data,
            count: count.length !== 0 ? count[0].total : 0,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.exportSubscription = async (req, res) => {
    try {
        const { format } = req.body
        console.log("file format is ", format)

        if (!['excel', 'csv', 'pdf'].includes(format)) {
            return utils.handleError(res, {
                message: "unavailable download format",
                code: 404,
            });
        }

        let dataList = []
        if (req.body.fromDate && req.body.toDate) {
            const newFromDate = new Date(req.body.fromDate);
            const newToDate = new Date(req.body.toDate);
            if (isNaN(newFromDate) || isNaN(newToDate)) {
                return res.status(400).json({ error: "Invalid date format" });
            }
            // dataList = await subscription.find({
            //     createdAt: { $gte: newFromDate, $lte: newToDate }
            // })

            dataList = await subscription.aggregate(
                [
                    {
                        $match: {
                            createdAt: { $gte: newFromDate, $lte: newToDate }
                        }
                    },
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
                        $sort: {
                            createdAt: -1
                        }
                    }
                ]
            )
        } else {
            dataList = await subscription.aggregate(
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
                        $sort: {
                            createdAt: -1
                        }
                    }
                ]
            )
        }
        console.log("data list is", dataList);

        if (dataList.length === 0) {
            return res.status(401).json({
                message: "No subscription data found",
                code: 401
            })
        }

        const claendataList = dataList.map((data) => ({
            'User Name': data?.user?.full_name ? data?.user?.full_name : `${data?.user?.first_name} ${data?.user?.last_name}`,
            'Email': data?.user?.email,
            'Company Name': data?.user?.company_data?.name,
            'Subscription Id': data?.subscription_id,
            'Plan Name': data?.plan?.plan_name,
            'Price': data?.plan?.price,
            'Plan Id': data?.plan?.plan_id,
            'Subscription Status': data?.status,
            'Start Date': data?.start_at,
            'End Date': data?.end_at
        }))

        if (format === "excel") {
            return utils.generateExcel(claendataList, res)
        } else if (format === "csv") {
            return utils.generateCSV(claendataList, res)
        } else {
            return res.send(claendataList)
        }

    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.getTeamMember = async (req, res) => {
    try {
        const teamId = req.params.id;
        const teamdata = await Team.findOne({
            $or: [
                {
                    admin_id: new mongoose.Types.ObjectId(teamId)
                },
                {
                    members: { $in: [new mongoose.Types.ObjectId(teamId)] }
                }
            ]
        }).populate('admin_id members')
        console.log("teamdata : ", teamdata)

        return res.status(200).json({
            message: "Team fetched successfully",
            data: teamdata,
            code: 200
        })

    } catch (error) {
        utils.handleError(res, error);
    }
}