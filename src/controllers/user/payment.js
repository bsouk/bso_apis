const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const Order = require("../../models/order")
const utils = require("../../utils/utils");
const Payment = require("../../models/payment")
const User = require("../../models/user")
const enquiry = require("../../models/Enquiry")
const tracking_order = require("../../models/tracking_order");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


exports.getPaymentListing = async (req, res) => {
    try {
        const { status, from_date, to_date, offset = 0, limit = 10 } = req.query
        const userId = req.user._id
        console.log("userId : ", userId)
        const filter = { buyer_id: new mongoose.Types.ObjectId(userId) }
        if (status) {
            filter.status = status
        }
        if (from_date && to_date) {
            const newFromDate = new Date(from_date);
            const newToDate = new Date(to_date);
            if (isNaN(newFromDate) || isNaN(newToDate)) {
                return res.status(400).json({ error: "Invalid date format" });
            }
            filter.createdAt = { $gte: newFromDate, $lte: newToDate }
        }
        const data = await Payment.aggregate(
            [
                {
                    $match: { ...filter }
                },
                {
                    $lookup: {
                        from: "enquires",
                        localField: "enquiry_id",
                        foreignField: "_id",
                        as: "enquiry_data"
                    }
                },
                {
                    $unwind: {
                        path: "$enquiry_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $addFields: {
                        enquiry_unique_id: '$enquiry_data.enquiry_unique_id',
                    }
                },
                {
                    $lookup: {
                        from: "orders",
                        let: { id: "$order_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$_id", "$$id"] }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    order_unique_id: 1
                                }
                            }
                        ],
                        as: "order_data"
                    }
                },
                {
                    $unwind: {
                        path: "$order_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        enquiry_data: 0
                    }
                },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $skip: parseInt(offset)
                },
                {
                    $limit: parseInt(limit)
                }
            ]
        )

        const count = await Payment.countDocuments(filter)
        return res.status(200).json({
            message: "Payment data fetched successfully",
            data,
            count,
            code: 200
        })
    }
    catch (error) {
        utils.handleError(res, error);
    }
}

exports.paymentDetails = async (req, res) => {
    try {
        const { id } = req.params
        const payment_data = await Payment.aggregate(
            [
                {
                    $match: { _id: new mongoose.Types.ObjectId(id) }
                },
                {
                    $lookup: {
                        from: "enquires",
                        localField: "enquiry_id",
                        foreignField: "_id",
                        as: "enquiry_data"
                    }
                },
                {
                    $unwind: {
                        path: "$enquiry_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $addFields: {
                        enquiry_unique_id: '$enquiry_data.enquiry_unique_id',
                    }
                },
                {
                    $lookup: {
                        from: "orders",
                        let: { id: "$order_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$_id", "$$id"] }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    order_unique_id: 1
                                }
                            }
                        ],
                        as: "order_data"
                    }
                },
                {
                    $unwind: {
                        path: "$order_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        enquiry_data: 0
                    }
                }
            ]
        )

        return res.status(200).json({
            message: "Payment details fetched successfully",
            data: payment_data,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


async function getCustomerByEmail(email) {
    const customers = await stripe.customers.list({
        email: email,
        limit: 1,
    });
    return customers.data.length > 0 ? customers.data[0] : null;
}

async function createStripeCustomer(user) {
    return await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: {
            userId: user._id.toString()
        }
    });
}


exports.createPaymentIntent = async (req, res) => {
    try {
        const userId = req.user._id;
        const { enquiry_id } = req.body;

        if (!enquiry_id) {
            return res.status(400).json({ error: "Enquiry ID is required", code: 400 });
        }

        const enquiry_data = await enquiry.findOne({ _id: enquiry_id })
            .populate('selected_supplier.quote_id')
            .populate('selected_logistics.quote_id');

        if (!enquiry_data) {
            return res.status(404).json({ error: "Enquiry not found", code: 404 });
        }

        const user = await User.findById(userId);
        console.log("user : ", user)
        if (!user) {
            return res.status(404).json({ error: "User not found", code: 404 });
        }

        let customer = await getCustomerByEmail(user.email);
        if (!customer) {
            customer = await createStripeCustomer(user);
        }

        const totalAmount = enquiry_data?.grand_total;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(totalAmount * 100),
            currency: 'usd',
            customer: customer.id,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                userId: userId.toString(),
                enquiryId: enquiry_id,
                orderType: "one-time"
            },
        });

        const setupIntent = await stripe.setupIntents.create({
            customer: customer.id,
            payment_method_types: ['card', 'paypal', 'link', 'us_bank_account'],
            metadata: {
                userId: userId.toString(),
                enquiryId: enquiry_id
            }
        });

        return res.status(200).json({
            message: "Payment intent created",
            data: {
                client_secret: paymentIntent.client_secret,
                setup_client_secret: setupIntent.client_secret,
                payment_intent_id: paymentIntent.id,
                customer_id: customer.id,
                amount: totalAmount,
                currency: 'usd'
            },
            code: 200
        });

    } catch (error) {
        console.error("Payment intent error:", error);

        if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({
                error: error.message,
                code: 400,
                stripe_code: error.code
            });
        }

        utils.handleError(res, error);
    }
};

async function generateUniqueId() {
    const id = await Math.floor(Math.random() * 10000000000)
    console.log('unique id : ', id)
    return `#${id}`
}
exports.paynow = async (req, res) => {
    try {
        const data = req.body
        const userId = req.user._id
        console.log("userId : ", userId)

        if (!data.enquiry_id || !data.payment_intent_id || !data.payment_method_id) {
            return res.status(400).json({
                error: "Enquiry ID, Payment Intent ID and Payment Method ID are required",
                code: 400
            });
        }

        const enquiry_data = await enquiry.findOne({ _id: data.enquiry_id }).populate('selected_supplier.quote_id').populate('selected_logistics.quote_id')
        console.log("enquiry_data : ", enquiry_data)

        if (!enquiry_data) {
            return res.status(404).json({ error: "Enquiry not found", code: 404 })
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found", code: 404 });
        }

        let customer = await getCustomerByEmail(user.email);
        if (!customer) {
            customer = await createStripeCustomer(user);
        }

        await stripe.paymentMethods.attach(data.payment_method_id, {
            customer: customer.id,
        });

        // await stripe.customers.update(customer.id, {
        //     invoice_settings: {
        //         default_payment_method: data.payment_method_id
        //     }
        // });

        const paymentIntent = await stripe.paymentIntents.retrieve(data.payment_intent_id);

        if (paymentIntent.status === 'succeeded') {
            return res.status(400).json({
                error: "Payment already completed",
                code: 400
            });
        }

        const confirmedIntent = await stripe.paymentIntents.confirm(
            data.payment_intent_id,
            { payment_method: data.payment_method_id }
        );

        if (confirmedIntent.status === 'requires_action') {
            return res.status(200).json({
                message: "Payment requires additional action",
                requires_action: true,
                client_secret: confirmedIntent.client_secret,
                code: 200
            });
        }

        if (confirmedIntent.status !== 'succeeded') {
            return res.status(400).json({
                error: `Payment failed: ${confirmedIntent.last_payment_error?.message || 'Unknown error'}`,
                code: 400
            });
        }

        const orderdata = {
            order_unique_id: await generateUniqueId(),
            enquiry_id: data.enquiry_id,
            buyer_id: userId,
            total_amount: enquiry_data?.grand_total,
            shipping_address: enquiry_data?.shipping_address,
            billing_address: enquiry_data?.shipping_address,
            logistics_id: enquiry_data?.selected_logistics?.quote_id?.user_id,
            order_pickup: "delivery",
        }

        const neworder = await Order.create(orderdata)
        console.log("neworder : ", neworder)

        enquiry_data.order_id = neworder._id
        await enquiry_data.save()

        const payment_data = await Payment.create({
            enquiry_id: data.enquiry_id,
            order_id: neworder._id,
            buyer_id: userId,
            total_amount: data.total_amount,
            txn_id: confirmedIntent.id,
            service_charges: data.service_charges,
            logistics_charges: data.logistics_charges,
            supplier_charges: data.supplier_charges,
            payment_method: confirmedIntent.payment_method_types[0],
            payment_status: 'success',
            stripe_payment_intent: confirmedIntent.id,
            stripe_payment_method: data.payment_method_id,
            stripe_customer_id : customer.id,
        }
        )

        const tracking_data = {
            tracking_unique_id: await generateUniqueId(),
            order_id: neworder._id,
            logistics_id: enquiry_data?.selected_logistics?.quote_id?.user_id,
            order_shipment_dates: [
                {
                    order_status: "order created",
                    date: new Date(),
                },
            ]
        }

        const newtracking = await tracking_order.create(tracking_data)
        console.log("newtracking : ", newtracking)

        neworder.payment_id = payment_data._id
        neworder.tracking_id = newtracking._id

        await neworder.save()

        return res.status(200).json({
            message: "checkout successfull!",
            data: {
                order: neworder,
                payment: payment_data,
                tracking: newtracking
            },
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}