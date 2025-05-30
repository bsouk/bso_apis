const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const Order = require("../../models/order")
const utils = require("../../utils/utils");
const Payment = require("../../models/payment")
const Plan = require("../../models/plan")
const Subscription = require("../../models/subscription")
const User = require("../../models/user")
const enquiry = require("../../models/Enquiry")
const tracking_order = require("../../models/tracking_order");
const payment_terms = require("../../models/payment_terms");
const team = require("../../models/team");
const payment = require("../../models/payment");
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
            

        console.log("===========enquiry_data", enquiry_data)
        if (!enquiry_data) {
            return res.status(404).json({ error: "Enquiry not found", code: 404 });
        }

        const user = await User.findById(userId);
        console.log("user : ", user)
        if (!user) {
            return res.status(404).json({ error: "User not found", code: 404 });
        }

        if (userId.toString() !== enquiry_data.user_id.toString()) {
            return res.status(404).json({ error: "unauthorized access", code: 404 });
        }

        let customer = await getCustomerByEmail(user.email);
        if (!customer) {
            customer = await createStripeCustomer(user);
        }

        let selected_pay_term = enquiry_data.selected_payment_terms
        console.log("selected_pay_term : ", selected_pay_term)

        const fetch_term = await payment_terms.findOne({ _id: new mongoose.Types.ObjectId(selected_pay_term) })
        console.log("fetch_term : ", fetch_term)

        if (!fetch_term) {
            return utils.handleError(res, {
                message: "Payment term not found"
            });
        }

        // if (fetch_term.method != "scheduled") {
        //     return utils.handleError(res, {
        //         message: `Payment method is ${fetch_term.method}`
        //     })
        // }

        let paymenthistory = await Payment.findOne({ enquiry_id: enquiry_id, buyer_id: userId });
        console.log("paymenthistory : ", paymenthistory)

        let totalAmount = enquiry_data?.grand_total
        let paymentAmount = 0
        let my_schedule_id = ""
        if (!paymenthistory) {
            paymenthistory = await Payment.create({
                enquiry_id: enquiry_id,
                buyer_id: userId,
                total_amount: enquiry_data?.grand_total,
                payment_status: 'pending',
                stripe_customer_id: customer.id,
                currency: enquiry_data?.selected_supplier?.quote_id?.currency || 'usd'
            }
            )
            console.log("paymenthistory : ", paymenthistory)
        }

        if (fetch_term.method == "advanced") {
            paymentAmount = enquiry_data?.grand_total
        }

        if (fetch_term.method == "scheduled" && fetch_term.schedule && fetch_term.schedule.length > 0) {
            for (const i of fetch_term.schedule) {
                const alreadyPaid = paymenthistory.payment_stage.some(p => p.schedule_id.toString() === i.schedule_id.toString());
                if (!alreadyPaid) {
                    paymentAmount = i.value_type === "percentage"
                        ? (totalAmount * i.value) / 100
                        : i.value;
                    my_schedule_id = i.schedule_id
                    break;
                }
            }
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(paymentAmount * 100),
            currency: enquiry_data?.currency || 'usd',
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

        // const setupIntent = await stripe.setupIntents.create({
        //     customer: customer.id,
        //     payment_method_types: ['card', 'paypal', 'link', 'us_bank_account'],
        //     metadata: {
        //         userId: userId.toString(),
        //         enquiryId: enquiry_id
        //     }
        // });

        return res.status(200).json({
            message: "Payment intent created",
            data: {
                client_secret: paymentIntent.client_secret,
                // setup_client_secret: setupIntent.client_secret,
                payment_intent_id: paymentIntent.id,
                customer_id: customer.id,
                amount: paymentAmount,
                schedule_id: my_schedule_id,
                currency: paymentIntent?.currency || 'usd'
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
exports.createPaymentIntentlogisticsupplier = async (req, res) => {
    try {
        const userId = req.user._id;
        const { enquiry_id } = req.body;
        console.log("==========userId", userId)
        if (!enquiry_id) {
            return res.status(400).json({ error: "Enquiry ID is required", code: 400 });
        }

        const enquiry_data = await enquiry.findOne({ _id: enquiry_id })
            
            .populate('selected_logistics.quote_id');
        console.log("logistic:==", enquiry_data?.selected_logistics?.quote_id?.shipping_fee)

        let supplieramount = enquiry_data?.selected_logistics?.quote_id?.shipping_fee;

        if (!enquiry_data) {
            return res.status(404).json({ error: "Enquiry not found", code: 404 });
        }

        const user = await User.findById(userId);
        console.log("user : ", user)
        if (!user) {
            return res.status(404).json({ error: "User not found", code: 404 });
        }

        if (userId.toString() !== enquiry_data.user_id.toString()) {
            return res.status(404).json({ error: "unauthorized access", code: 404 });
        }

        let customer = await getCustomerByEmail(user.email);
        if (!customer) {
            customer = await createStripeCustomer(user);
        }

        // let selected_pay_term = enquiry_data.selected_payment_terms
        // console.log("selected_pay_term : ", selected_pay_term)

        // const fetch_term = await payment_terms.findOne({ _id: new mongoose.Types.ObjectId(selected_pay_term) })
        // console.log("fetch_term : ", fetch_term)

        // if (!fetch_term) {
        //     return utils.handleError(res, {
        //         message: "Payment term not found"
        //     });
        // }

        // if (fetch_term.method != "scheduled") {
        //     return utils.handleError(res, {
        //         message: `Payment method is ${fetch_term.method}`
        //     })
        // }

        let paymenthistory = await Payment.findOne({ enquiry_id: enquiry_id, supplier_id: userId });
        console.log("paymenthistory : ", paymenthistory)

        let totalAmount = enquiry_data?.grand_total
        let paymentAmount = 0
        let my_schedule_id = ""
        if (!paymenthistory) {
            paymenthistory = await Payment.create({
                enquiry_id: enquiry_id,
                supplier_id: userId,
                total_amount: supplieramount,
                payment_status: 'pending',
                stripe_customer_id: customer.id,
                currency: enquiry_data?.selected_supplier?.quote_id?.currency || 'usd'
            }
            )
            console.log("paymenthistory : ", paymenthistory)
        }
        paymentAmount = supplieramount
        // if (fetch_term.method == "advanced") {
        //     
        // }

        // if (fetch_term.method == "scheduled" && fetch_term.schedule && fetch_term.schedule.length > 0) {
        //     for (const i of fetch_term.schedule) {
        //         const alreadyPaid = paymenthistory.payment_stage.some(p => p.schedule_id.toString() === i.schedule_id.toString());
        //         if (!alreadyPaid) {
        //             paymentAmount = i.value_type === "percentage"
        //                 ? (totalAmount * i.value) / 100
        //                 : i.value;
        //             my_schedule_id = i.schedule_id
        //             break;
        //         }
        //     }
        // }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(paymentAmount * 100),
            currency: enquiry_data?.currency || 'usd',
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

        // const setupIntent = await stripe.setupIntents.create({
        //     customer: customer.id,
        //     payment_method_types: ['card', 'paypal', 'link', 'us_bank_account'],
        //     metadata: {
        //         userId: userId.toString(),
        //         enquiryId: enquiry_id
        //     }
        // });

        return res.status(200).json({
            message: "Payment intent created",
            data: {
                client_secret: paymentIntent.client_secret,
                // setup_client_secret: setupIntent.client_secret,
                payment_intent_id: paymentIntent.id,
                customer_id: customer.id,
                amount: paymentAmount,
                schedule_id: my_schedule_id,
                currency: paymentIntent?.currency || 'usd'
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



exports.createPaymentIntentlogisticbuyer = async (req, res) => {
    try {
        const userId = req.user._id;
        const { enquiry_id } = req.body;
        console.log("==========userId", userId)
        if (!enquiry_id) {
            return res.status(400).json({ error: "Enquiry ID is required", code: 400 });
        }

        const enquiry_data = await enquiry.findOne({ _id: enquiry_id })
            .populate('selected_supplier.quote_id');
        console.log("logistic:==", enquiry_data?.selected_supplier?.quote_id?.custom_charges_one)

        let buyeramount = enquiry_data.selected_supplier?.quote_id?.custom_charges_one.value;
        console.log("===========buyeramount", buyeramount)
        if (!enquiry_data) {
            return res.status(404).json({ error: "Enquiry not found", code: 404 });
        }

        const user = await User.findById(userId);
        console.log("user : ", user)
        if (!user) {
            return res.status(404).json({ error: "User not found", code: 404 });
        }

        if (userId.toString() !== enquiry_data.user_id.toString()) {
            return res.status(404).json({ error: "unauthorized access", code: 404 });
        }

        let customer = await getCustomerByEmail(user.email);
        if (!customer) {
            customer = await createStripeCustomer(user);
        }

        // let selected_pay_term = enquiry_data.selected_payment_terms
        // console.log("selected_pay_term : ", selected_pay_term)

        // const fetch_term = await payment_terms.findOne({ _id: new mongoose.Types.ObjectId(selected_pay_term) })
        // console.log("fetch_term : ", fetch_term)

        // if (!fetch_term) {
        //     return utils.handleError(res, {
        //         message: "Payment term not found"
        //     });
        // }

        // if (fetch_term.method != "scheduled") {
        //     return utils.handleError(res, {
        //         message: `Payment method is ${fetch_term.method}`
        //     })
        // }

        let paymenthistory = await Payment.findOne({ enquiry_id: enquiry_id, buyer_id: userId });
        console.log("paymenthistory : ", paymenthistory)

        let totalAmount = enquiry_data?.grand_total
        let paymentAmount = 0
        let my_schedule_id = ""
        if (!paymenthistory) {
            paymenthistory = await Payment.create({
                enquiry_id: enquiry_id,
                buyer_id: userId,
                total_amount: buyeramount,
                payment_status: 'pending',
                stripe_customer_id: customer.id,
                currency: enquiry_data?.selected_supplier?.quote_id?.currency || 'usd'
            }
            )
            console.log("paymenthistory : ", paymenthistory)
        }
        paymentAmount = buyeramount
        // if (fetch_term.method == "advanced") {
        //     
        // }

        // if (fetch_term.method == "scheduled" && fetch_term.schedule && fetch_term.schedule.length > 0) {
        //     for (const i of fetch_term.schedule) {
        //         const alreadyPaid = paymenthistory.payment_stage.some(p => p.schedule_id.toString() === i.schedule_id.toString());
        //         if (!alreadyPaid) {
        //             paymentAmount = i.value_type === "percentage"
        //                 ? (totalAmount * i.value) / 100
        //                 : i.value;
        //             my_schedule_id = i.schedule_id
        //             break;
        //         }
        //     }
        // }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(paymentAmount * 100),
            currency: enquiry_data?.currency || 'usd',
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

        // const setupIntent = await stripe.setupIntents.create({
        //     customer: customer.id,
        //     payment_method_types: ['card', 'paypal', 'link', 'us_bank_account'],
        //     metadata: {
        //         userId: userId.toString(),
        //         enquiryId: enquiry_id
        //     }
        // });

        return res.status(200).json({
            message: "Payment intent created",
            data: {
                client_secret: paymentIntent.client_secret,
                // setup_client_secret: setupIntent.client_secret,
                payment_intent_id: paymentIntent.id,
                customer_id: customer.id,
                amount: paymentAmount,
                schedule_id: my_schedule_id,
                currency: paymentIntent?.currency || 'usd'
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
exports.appPaymentIntent = async (req, res) => {
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

        if (userId.toString() !== enquiry_data.user_id.toString()) {
            return res.status(404).json({ error: "unauthorized access", code: 404 });
        }


        let customer = await getCustomerByEmail(user.email);
        if (!customer) {
            customer = await createStripeCustomer(user);
        }

        let selected_pay_term = enquiry_data.selected_payment_terms
        console.log("selected_pay_term : ", selected_pay_term)

        const fetch_term = await payment_terms.findOne({ _id: new mongoose.Types.ObjectId(selected_pay_term) })
        console.log("fetch_term : ", fetch_term)

        if (!fetch_term) {
            return utils.handleError(res, {
                message: "Payment term not found"
            });
        }

        // if (fetch_term.method != "scheduled") {
        //     return utils.handleError(res, {
        //         message: `Payment method is ${fetch_term.method}`
        //     })
        // }

        let paymenthistory = await Payment.findOne({ enquiry_id: enquiry_id, buyer_id: userId });
        console.log("paymenthistory : ", paymenthistory)

        let totalAmount = enquiry_data?.grand_total
        let paymentAmount = 0
        let my_schedule_id = ""
        if (!paymenthistory) {
            paymenthistory = await Payment.create({
                enquiry_id: enquiry_id,
                buyer_id: userId,
                total_amount: enquiry_data?.grand_total,
                payment_status: 'pending',
                stripe_customer_id: customer.id,
                currency: enquiry_data?.selected_supplier?.quote_id?.currency || 'usd'
            }
            )
            console.log("paymenthistory : ", paymenthistory)
        }

        if (fetch_term.method == "advanced") {
            paymentAmount = enquiry_data?.grand_total
        }

        if (fetch_term.method == "scheduled" && fetch_term.schedule && fetch_term.schedule.length > 0) {
            for (const i of fetch_term.schedule) {
                const alreadyPaid = paymenthistory.payment_stage.some(p => p.schedule_id.toString() === i.schedule_id.toString());
                if (!alreadyPaid) {
                    paymentAmount = i.value_type === "percentage"
                        ? (totalAmount * i.value) / 100
                        : i.value;
                    my_schedule_id = i.schedule_id
                    break;
                }
            }
        }


        return res.status(200).json({
            message: "Payment intent created",
            data: {
                // client_secret: paymentIntent.client_secret,
                // setup_client_secret: setupIntent.client_secret,
                // payment_intent_id: paymentIntent.id,
                customer_id: customer.id,
                amount: paymentAmount,
                schedule_id: my_schedule_id,
                currency: enquiry_data?.currency || "usd",
            },
            code: 200
        });

    } catch (error) {
        utils.handleError(res, error);
    }
}

async function generateUniqueId() {
    const id = await Math.floor(Math.random() * 10000000000)
    console.log('unique id : ', id)
    return `#${id}`
}
exports.paynow = async (req, res) => {
    try {
        const data = req.body
        console.log("body : ", data)
        const userId = req.user._id
        console.log("userId : ", userId)

        if (!data.enquiry_id || !data.payment_intent_id || !data.payment_method_id) {
            return res.status(400).json({
                error: "Enquiry ID, Payment Intent ID and Payment Method ID are required",
                code: 400
            });
        }

        const enquiry_data = await enquiry.findOne({ _id: data.enquiry_id }).populate('selected_supplier.quote_id').populate('selected_logistics.quote_id').populate('selected_payment_terms')
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

        // await stripe.paymentMethods.attach(data.payment_method_id, {
        //     customer: customer.id,
        // });

        // await stripe.customers.update(customer.id, {
        //     invoice_settings: {
        //         default_payment_method: data.payment_method_id
        //     }
        // });

        const paymentIntent = await stripe.paymentIntents.retrieve(data.payment_intent_id);
        let confirmedIntent = paymentIntent;

        // if (paymentIntent.status === 'succeeded') {
        //     return res.status(400).json({
        //         error: "Payment already completed",
        //         code: 400
        //     });
        // } 
        if (paymentIntent.status !== 'succeeded') {
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
        }

        let neworder = await Order.findOne({ enquiry_id: data.enquiry_id, buyer_id: userId })
        console.log("neworder : ", neworder)
        const payment_data = await Payment.findOne({ enquiry_id: data.enquiry_id, buyer_id: userId })
        console.log("payment_data : ", payment_data)

        if (!neworder) {
            const orderdata = {
                order_unique_id: await generateUniqueId(),
                enquiry_id: data.enquiry_id,
                buyer_id: userId,
                total_amount: enquiry_data?.grand_total,
                currency: enquiry_data?.selected_supplier?.quote_id?.currency || 'usd',
                shipping_address: enquiry_data?.shipping_address,
                billing_address: enquiry_data?.shipping_address,
                logistics_id: enquiry_data?.selected_logistics?.quote_id?.user_id,
                order_pickup: enquiry_data?.shipment_type,
            }

            neworder = await Order.create(orderdata)
            console.log("neworder : ", neworder)

            enquiry_data.order_id = neworder?._id
            await enquiry_data.save()
            payment_data.order_id = neworder?._id
        }

        // payment_data.total_amount = enquiry_data?.total_amount


        // let totalprice = 0
        // enquiry_data?.selected_supplier?.quote_id?.enquiry_items.forEach(i => totalprice += (i.unit_price * i.available_quantity))
        // console.log("totalprice : ", totalprice)

        // totalprice += (enquiry_data?.selected_supplier?.quote_id?.custom_charges_one?.value + enquiry_data?.selected_supplier?.quote_id?.custom_charges_two?.value) - enquiry_data?.selected_supplier?.quote_id?.discount?.value
        // console.log("totalprice : ", totalprice)

        // let servicefee = 1
        // if (enquiry_data?.selected_supplier?.quote_id?.admin_charge === "percentage") {
        //     if (enquiry_data > 0) {
        //         servicefee += (servicefee) * ((enquiry_data?.selected_supplier?.quote_id?.admin_charge?.value) / 100)
        //     }
        //     console.log("servicefee : ", servicefee)
        // } else {
        //     servicefee += enquiry_data?.selected_supplier?.quote_id?.admin_charge?.value
        //     console.log("servicefee : ", servicefee)
        // }

        // let amt_per = data?.schedule_id ? enquiry_data?.selected_payment_terms?.schedule.find(i => i?.schedule_id === data?.schedule_id) : {}
        // console.log("amt_per : ", amt_per)

        let per_amt = Math.floor(((confirmedIntent.amount / 100) / enquiry_data?.grand_total) * 100)

        payment_data.service_charges = enquiry_data?.service_charges
        payment_data.logistics_charges = enquiry_data?.logistics_charges
        payment_data.supplier_charges = enquiry_data?.supplier_charges
        payment_data.payment_stage.push({
            status: confirmedIntent.status || 'succeeded',
            stripe_payment_intent: confirmedIntent.id,
            stripe_payment_method: data?.payment_method_id,
            payment_method: confirmedIntent.payment_method_types[0],
            txn_id: confirmedIntent.id,
            schedule_id: data?.schedule_id,
            schedule_status: "completed",
            amount: confirmedIntent.amount ? confirmedIntent.amount / 100 : 0,
            payment_percentage: per_amt,
            receipt: confirmedIntent?.charges?.data?.[0]?.receipt_url || null,
            currency: confirmedIntent?.currency,
        })

        await payment_data.save()


        let newtracking = await tracking_order.findOne({ order_id: neworder?._id, logistics_id: enquiry_data?.selected_logistics?.quote_id?.user_id })
        console.log("newtracking : ", newtracking)

        if (!newtracking) {
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

            newtracking = await tracking_order.create(tracking_data)
            console.log("newtracking : ", newtracking)
        }

        newtracking.order_shipment_dates.push({
            order_status: "payment schedule completed",
            date: new Date(),
            schedule_id: data?.schedule_id
        })

        await newtracking.save()
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
exports.logisticpaynow = async (req, res) => {
    try {
        const data = req.body
        console.log("body : ", data)
        const userId = req.user._id
        console.log("userId : ", userId)

        if (!data.enquiry_id || !data.payment_intent_id || !data.payment_method_id) {
            return res.status(400).json({
                error: "Enquiry ID, Payment Intent ID and Payment Method ID are required",
                code: 400
            });
        }

        const enquiry_data = await enquiry.findOne({ _id: data.enquiry_id }).populate('selected_supplier.quote_id').populate('selected_logistics.quote_id').populate('selected_payment_terms')
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

        // await stripe.paymentMethods.attach(data.payment_method_id, {
        //     customer: customer.id,
        // });

        // await stripe.customers.update(customer.id, {
        //     invoice_settings: {
        //         default_payment_method: data.payment_method_id
        //     }
        // });

        const paymentIntent = await stripe.paymentIntents.retrieve(data.payment_intent_id);
        let confirmedIntent = paymentIntent;

        // if (paymentIntent.status === 'succeeded') {
        //     return res.status(400).json({
        //         error: "Payment already completed",
        //         code: 400
        //     });
        // } 
        if (paymentIntent.status !== 'succeeded') {
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
        }

        let neworder = await Order.findOne({ enquiry_id: data.enquiry_id, buyer_id: userId })
        console.log("neworder : ", neworder)
        const payment_data = await Payment.findOne({ enquiry_id: data.enquiry_id, buyer_id: userId })
        console.log("payment_data : ", payment_data)

        if (!neworder) {
            const orderdata = {
                order_unique_id: await generateUniqueId(),
                enquiry_id: data.enquiry_id,
                buyer_id: userId,
                total_amount: enquiry_data?.grand_total,
                currency: enquiry_data?.selected_supplier?.quote_id?.currency || 'usd',
                shipping_address: enquiry_data?.shipping_address,
                billing_address: enquiry_data?.shipping_address,
                logistics_id: enquiry_data?.selected_logistics?.quote_id?.user_id,
                order_pickup: enquiry_data?.shipment_type,
            }

            neworder = await Order.create(orderdata)
            console.log("neworder : ", neworder)

            enquiry_data.order_id = neworder?._id
            await enquiry_data.save()
            payment_data.order_id = neworder?._id
        }

        // payment_data.total_amount = enquiry_data?.total_amount


        // let totalprice = 0
        // enquiry_data?.selected_supplier?.quote_id?.enquiry_items.forEach(i => totalprice += (i.unit_price * i.available_quantity))
        // console.log("totalprice : ", totalprice)

        // totalprice += (enquiry_data?.selected_supplier?.quote_id?.custom_charges_one?.value + enquiry_data?.selected_supplier?.quote_id?.custom_charges_two?.value) - enquiry_data?.selected_supplier?.quote_id?.discount?.value
        // console.log("totalprice : ", totalprice)

        // let servicefee = 1
        // if (enquiry_data?.selected_supplier?.quote_id?.admin_charge === "percentage") {
        //     if (enquiry_data > 0) {
        //         servicefee += (servicefee) * ((enquiry_data?.selected_supplier?.quote_id?.admin_charge?.value) / 100)
        //     }
        //     console.log("servicefee : ", servicefee)
        // } else {
        //     servicefee += enquiry_data?.selected_supplier?.quote_id?.admin_charge?.value
        //     console.log("servicefee : ", servicefee)
        // }

        // let amt_per = data?.schedule_id ? enquiry_data?.selected_payment_terms?.schedule.find(i => i?.schedule_id === data?.schedule_id) : {}
        // console.log("amt_per : ", amt_per)

        let per_amt = Math.floor(((confirmedIntent.amount / 100) / enquiry_data?.grand_total) * 100)

        payment_data.service_charges = enquiry_data?.service_charges
        payment_data.logistics_charges = enquiry_data?.logistics_charges
        payment_data.supplier_charges = enquiry_data?.supplier_charges
        payment_data.logistic_payment.push({
            status: confirmedIntent.status || 'succeeded',
            stripe_payment_intent: confirmedIntent.id || null,
            stripe_payment_method: data?.payment_method_id || null,
            payment_method: confirmedIntent.payment_method_types[0] || null,
            txn_id: confirmedIntent.id || null,
            schedule_id: data?.schedule_id || null,
            schedule_status: "completed" ,
            amount: confirmedIntent.amount ? confirmedIntent.amount / 100 : 0,
            payment_percentage: per_amt || null,
            receipt: confirmedIntent?.charges?.data?.[0]?.receipt_url || null,
            currency: confirmedIntent?.currency || null,
        })

        await payment_data.save()
        

        let newtracking = await tracking_order.findOne({ order_id: neworder?._id, logistics_id: enquiry_data?.selected_logistics?.quote_id?.user_id })
        console.log("newtracking : ", newtracking)

        if (!newtracking) {
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

            newtracking = await tracking_order.create(tracking_data)
            console.log("newtracking : ", newtracking)
        }

        newtracking.order_shipment_dates.push({
            order_status: "payment schedule completed",
            date: new Date(),
            schedule_id: data?.schedule_id
        })

        await newtracking.save()
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

exports.checkoutOfflinePayment = async (req, res) => {
    try {
        const data = req.body
        const userId = req.user._id
        console.log("userId : ", userId)

        if (!data.enquiry_id) {
            return res.status(400).json({
                error: "Enquiry ID is required",
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

        const orderdata = {
            order_unique_id: await generateUniqueId(),
            enquiry_id: data.enquiry_id,
            buyer_id: userId,
            total_amount: enquiry_data?.grand_total,
            shipping_address: enquiry_data?.shipping_address,
            billing_address: enquiry_data?.shipping_address,
            logistics_id: enquiry_data?.selected_logistics?.quote_id?.user_id,
            order_pickup: enquiry_data?.shipment_type,
        }

        const neworder = await Order.create(orderdata)
        console.log("neworder : ", neworder)

        enquiry_data.order_id = neworder._id
        await enquiry_data.save()


        let paymentdata = await Payment.create({
            enquiry_id: data?.enquiry_id,
            buyer_id: userId,
            payment_status: 'pending',
            order_id: neworder._id,
            total_amount: data.total_amount,
            service_charges: data.service_charges,
            logistics_charges: data.logistics_charges,
            supplier_charges: data.supplier_charges,
            payment_stage: [
                {
                    status: 'pending',
                    payment_method: 'cash-on-delivery',
                }
            ]
        }
        )
        console.log("paymentdata : ", paymentdata)

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

        newtracking = await tracking_order.create(tracking_data)
        console.log("newtracking : ", newtracking)

        neworder.payment_id = paymentdata._id
        neworder.tracking_id = newtracking._id

        await neworder.save()

        return res.status(200).json({
            message: "checkout for cash on delivery is successfull!",
            data: {
                order: neworder,
                tracking: newtracking
            },
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.createTeamLimitIntent = async (req, res) => {
    try {
        const userId = req.user._id;
        const { quantity, total_amount, currency, plan_id } = req.body;

        const user = await User.findById(userId);
        console.log("user : ", user)
        if (!user) {
            return res.status(404).json({ error: "User not found", code: 404 });
        }

        const plandata = await Plan.findOne({ _id: plan_id })
        console.log("plandata : ", plandata)

        if (!plandata.stripe_per_user_price_id || !plandata.price_per_person) {
            return res.status(400).json({
                error: "This plan doesn't support adding additional members",
                code: 400
            });
        }

        let customer = await getCustomerByEmail(user.email);
        if (!customer) {
            customer = await createStripeCustomer(user);
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(total_amount * 100),
            currency: currency || 'usd',
            customer: customer.id,
            description: `Payment for ${quantity} additional team members`,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                userId: userId.toString(),
                planId: plan_id,
                additionalMembers: quantity,
                paymentType: 'additional_members',
                perUserPriceId: plandata.stripe_per_user_price_id,
                perUserPrice: plandata.price_per_person,
                paymentFor: "increasing team limit",
                orderType: "one-time"
            },
        });
        console.log("paymentIntent : ", paymentIntent)

        return res.status(200).json({
            message: "Payment intent created",
            data: {
                client_secret: paymentIntent.client_secret,
                payment_intent_id: paymentIntent.id,
                customer_id: customer.id,
                currency: paymentIntent?.currency || 'usd'
            },
            code: 200
        });

    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.createAppTeamLimitIntent = async (req, res) => {
    try {
        const userId = req.user._id;
        const { quantity, price_per_person, total_amount, currency } = req.body;

        const user = await User.findById(userId);
        console.log("user : ", user)
        if (!user) {
            return res.status(404).json({ error: "User not found", code: 404 });
        }

        let customer = await getCustomerByEmail(user.email);
        if (!customer) {
            customer = await createStripeCustomer(user);
        }

        // const paymentIntent = await stripe.paymentIntents.create({
        //     amount: Math.round(total_amount * 100),
        //     currency: currency || 'usd',
        //     customer: customer.id,
        //     automatic_payment_methods: {
        //         enabled: true,
        //     },
        //     metadata: {
        //         userId: userId.toString(),
        //         paymentFor: "increasing team limit",
        //         orderType: "one-time"
        //     },
        // });
        // console.log("paymentIntent : ", paymentIntent)


        return res.status(200).json({
            message: "Payment intent created",
            data: {
                // client_secret: paymentIntent.client_secret,
                // payment_intent_id: paymentIntent.id,
                customer_id: customer.id,
                // currency: paymentIntent?.currency || 'usd'
            },
            code: 200
        });

    } catch (error) {
        utils.handleError(res, error);
    }
}
exports.uploadReceipt = async (req, res) => {
    try {
        const userId = req.user._id;
        const { enquiry_id, receipt_image, txn_id } = req.body;

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

        let selected_pay_term = enquiry_data.selected_payment_terms
        console.log("selected_pay_term : ", selected_pay_term)

        const fetch_term = await payment_terms.findOne({ _id: new mongoose.Types.ObjectId(selected_pay_term) })
        console.log("fetch_term : ", fetch_term)

        if (!fetch_term) {
            return utils.handleError(res, {
                message: "Payment term not found"
            });
        }

        let paymenthistory = await Payment.findOne({ enquiry_id: enquiry_id, buyer_id: userId });
        console.log("paymenthistory : ", paymenthistory)

        let totalAmount = enquiry_data?.grand_total
        let paymentAmount = 0
        let my_schedule_id = fetch_term.schedule[0].schedule_id
        if (!paymenthistory) {
            paymenthistory = await Payment.create({
                enquiry_id: enquiry_id,
                buyer_id: userId,
                total_amount: enquiry_data?.grand_total,
                payment_status: 'pending',
            }
            )
            console.log("paymenthistory : ", paymenthistory)
        }

        if (fetch_term.method == "advanced") {
            paymentAmount = enquiry_data?.grand_total
        }

        if (fetch_term.method == "scheduled" && fetch_term.schedule && fetch_term.schedule.length > 0) {
            for (const i of fetch_term.schedule) {
                const alreadyPaid = paymenthistory.payment_stage.some(p => p.schedule_id === i.schedule_id);
                if (!alreadyPaid) {
                    paymentAmount = i.value_type === "percentage"
                        ? (totalAmount * i.value) / 100
                        : i.value;
                    my_schedule_id = i.schedule_id
                    break;
                }
            }
        }


        let neworder = await Order.findOne({ enquiry_id: enquiry_id, buyer_id: userId })
        console.log("neworder : ", neworder)
        if (!neworder) {
            const orderdata = {
                order_unique_id: await generateUniqueId(),
                enquiry_id: enquiry_id,
                buyer_id: userId,
                total_amount: enquiry_data?.grand_total,
                currency: enquiry_data?.selected_supplier?.quote_id?.currency || 'usd',
                shipping_address: enquiry_data?.shipping_address,
                billing_address: enquiry_data?.shipping_address,
                logistics_id: enquiry_data?.selected_logistics?.quote_id?.user_id,
                order_pickup: enquiry_data?.shipment_type,
            }

            neworder = await Order.create(orderdata)
            console.log("neworder : ", neworder)

            enquiry_data.order_id = neworder?._id
            await enquiry_data.save()
            payment_data.order_id = neworder?._id
        }

        paymenthistory.order_id = neworder?._id
        paymenthistory.service_charges = enquiry_data?.service_charges
        paymenthistory.logistics_charges = enquiry_data?.logistics_charges
        paymenthistory.supplier_charges = enquiry_data?.supplier_charges
        paymenthistory.payment_stage.push({
            // status: confirmedIntent.status || 'succeeded',
            // stripe_payment_intent: confirmedIntent.id,
            // stripe_payment_method: data?.payment_method_id,
            // payment_method: confirmedIntent.payment_method_types[0],
            // txn_id: confirmedIntent.id,
            // schedule_id: data?.schedule_id,
            // schedule_status: "completed",
            // amount: confirmedIntent.amount ? confirmedIntent.amount / 100 : 0,
            // receipt: confirmedIntent?.charges?.data?.[0]?.receipt_url || null,
            // currency: confirmedIntent?.currency,
            receipt_image,
            txn_id,
            schedule_id: my_schedule_id,
            status: "under_review",
            amount: paymentAmount,
            payment_method: "bank_transfer",
        })


        await paymenthistory.save()

        let newtracking = await tracking_order.findOne({ order_id: neworder?._id, logistics_id: enquiry_data?.selected_logistics?.quote_id?.user_id })
        console.log("newtracking : ", newtracking)

        if (!newtracking) {
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

            newtracking = await tracking_order.create(tracking_data)
            console.log("newtracking : ", newtracking)
        }

        newtracking.order_shipment_dates.push({
            order_status: "payment schedule completed",
            date: new Date(),
            schedule_id: my_schedule_id
        })

        await newtracking.save()
        neworder.payment_id = paymenthistory._id
        neworder.tracking_id = newtracking._id

        await neworder.save()

        return res.status(200).json({
            message: "payment receipt uploaded successfully",
            data: {
                amount: paymentAmount,
                schedule_id: my_schedule_id,
                receipt_image,
                txn_id
            },
            code: 200
        });
    }
    catch (error) {
        console.log(error);
        utils.handleError(res, error);
    }
}