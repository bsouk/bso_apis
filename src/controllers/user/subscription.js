const User = require("../../models/user");
const Address = require("../../models/address");
const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require('generate-password');
const Brand = require("../../models/brand");
const crypto = require("crypto");
const plan = require("../../models/plan");
const Subscription = require("../../models/subscription")
const Admin = require("../../models/admin");
const fcm_devices = require("../../models/fcm_devices");
const admin_notification = require("../../models/admin_notification");
const admin_received_notification = require("../../models/admin_received_notification");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function genrateSubscriptionId() {
    const token = crypto.randomBytes(5).toString('hex')
    return `sub-${token}`
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

exports.genrateClientScretKey = async (req, res) => {
    try {
        const userid = req.user._id;
        const { plan_id } = req.body;

        if (!plan_id) {
            return res.status(400).json({
                message: "Plan ID is required",
                code: 400
            });
        }

        const [user, plandata] = await Promise.all([
            User.findById(userid),
            plan.findOne({ plan_id })
        ]);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                code: 404
            });
        }
        if (!plandata) {
            return res.status(404).json({
                message: "Plan not found",
                code: 404
            });
        }

        const result = await Subscription.aggregate([
            {
                $match: {
                    user_id: new mongoose.Types.ObjectId(userid),
                    type: plandata.type
                }
            },
            {
                $lookup: {
                    from: 'plans',
                    localField: 'plan_id',
                    foreignField: 'plan_id',
                    as: 'plan'
                }
            },
            {
                $unwind: {
                    path: "$plan",
                    preserveNullAndEmptyArrays: true
                }
            }
        ])
        console.log("result : ", result)

        if (result.length !== 0) {
            if (result[0]?.plan?.interval === "lifetime") {
                return res.status(404).json({
                    message: "Already have a lifetime access",
                    code: 404
                });
            }
        }
        let customer = await getCustomerByEmail(user.email);
        if (!customer) {
            customer = await createStripeCustomer(user);
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: plandata.price * 100,
            currency: plandata.currency || 'usd',
            customer: customer.id,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                userId: userid.toString(),
                planId: plandata._id.toString()
            }
        });


        const setupIntent = await stripe.setupIntents.create({
            customer: customer.id,
            payment_method_types: ['card', 'link', 'us_bank_account'],
            metadata: {
                userId: userid.toString(),
                planId: plandata._id.toString()
            }
        });

        return res.status(200).json({
            message: "Payment intent created",
            data: {
                client_secret: paymentIntent.client_secret,
                setup_intent: setupIntent.client_secret,
                customer_id: customer.id,
                plan_id: plan_id,
                requires_payment_method: true
            },
            code: 200
        });

    } catch (error) {
        console.error("Subscription error:", error);

        if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({
                message: error.message,
                code: 400,
                details: error.raw || null
            });
        }

        res.status(500).json({
            message: "Subscription creation failed",
            error: error.message,
            code: 500
        });
    }
};

exports.createSubscription = async (req, res) => {
    try {
        const userid = req.user._id
        const data = req.body
        const { plan_id, payment_method_id } = req.body;

        if (!plan_id || !payment_method_id) {
            return res.status(400).json({
                message: "Plan ID and payment method ID are required",
                code: 400
            });
        }
        const userdata = await User.findOne({ _id: userid })
        console.log("userdata : ", userdata)
        if (!userdata) {
            return utils.handleError(res, {
                message: "user not found",
                code: 404,
            });
        }

        const plandata = await plan.findOne({ plan_id: data?.plan_id })
        console.log("plandata : ", plandata)
        if (!plandata) {
            return utils.handleError(res, {
                message: "Plan not found",
                code: 404,
            });
        }

        const result = await Subscription.findOne({ user_id: new mongoose.Types.ObjectId(userid), type: plandata.type })
        console.log("result : ", result)

        if (result) {
            return utils.handleError(res, {
                message: "Already have an active Subscription. cancel it first !",
                code: 404,
            });
        }

        if (!plandata?.stripe_price_id) {
            return utils.handleError(res, {
                message: "Plan is not properly configured for payments",
                code: 400,
            });
        }

        const pricefetch = await stripe.prices.retrieve(plandata.stripe_price_id);
        console.log("pricefetch : ", pricefetch)

        let customer = await getCustomerByEmail(userdata.email);
        if (!customer) {
            customer = await createStripeCustomer(userdata);
        }

        // Attach the selected payment method to customer (but don't set as default)
        await stripe.paymentMethods.attach(payment_method_id, {
            customer: customer.id,
        });

        // let paymentMethod = {}
        // paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);
        // console.log("paymentMethod : ", paymentMethod)

        // if (paymentMethod.customer && paymentMethod.customer !== customer.id) {
        //     return utils.handleError(res, {
        //         message: 'Payment method belongs to another customer',
        //         code: 400
        //     })
        // }

        // if (!paymentMethod.customer) {
        //     paymentMethod = await stripe.paymentMethods.attach(payment_method_id, {
        //         customer: customer.id
        //     });
        // }

        const stripeSubscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: plandata?.stripe_price_id }],
            // payment_settings: {
            //     payment_method_types: ['card', 'paypal', 'link', 'us_bank_account', 'amazon_pay'],
            //     save_default_payment_method: 'on_subscription' // Let Stripe handle retention
            // },
            default_payment_method: payment_method_id,
            expand: ['latest_invoice.payment_intent'],
            metadata: {
                userId: userid.toString(),
                planId: plandata._id.toString()
            },
        });

        const paymentIntent = stripeSubscription.latest_invoice.payment_intent;
        let requiresAction = false;
        let clientSecret = null;

        if (['requires_action', 'requires_confirmation'].includes(paymentIntent.status)) {
            requiresAction = true;
            clientSecret = paymentIntent.client_secret;
        }

        let today = new Date();
        let start = new Date(today);
        let end
        if (plandata?.interval === "monthly") {
            end = new Date(today);
            end.setMonth(today.getMonth() + 1);
        } else if (plandata?.interval === "yearly") {
            end = new Date(today);
            end.setFullYear(today.getFullYear() + 1);
        }

        let newdata = {
            user_id: userdata?._id,
            subscription_id: await genrateSubscriptionId(),
            plan_id: data.plan_id,
            stripe_subscription_id: stripeSubscription.id,
            stripe_payment_method_id: payment_method_id,
            stripe_customer_id: customer.id,
            start_at: start,
            end_at: end,
            status: stripeSubscription.status,
            type: plandata.type,
            payment_method_type: paymentIntent.payment_method_types[0]
        }

        console.log("newdata : ", newdata)
        // const result = await Subscription.updateMany({ user_id: new mongoose.Types.ObjectId(userid), type: plandata.type }, { status: 'terminated' }, { new: true })
        // console.log("result : ", result)
        const newsubscription = await Subscription.create(newdata);
        console.log("subscription : ", newsubscription)


        // admin notification
        const admins = await Admin.findOne({ role: 'super_admin' });
        console.log("admins : ", admins)

        if (admins) {
            const notificationMessage = {
                title: 'New Subscription created',
                description: `${userdata.full_name} has created a new subscription . Plan ID : ${newsubscription.plan_id}`,
                user_id: userid
            };

            const adminFcmDevices = await fcm_devices.find({ user_id: admins._id });
            console.log("adminFcmDevices : ", adminFcmDevices)

            if (adminFcmDevices && adminFcmDevices.length > 0) {
                adminFcmDevices.forEach(async i => {
                    const token = i.token
                    console.log("token : ", token)
                    await utils.sendNotification(token, notificationMessage);
                })
                const adminNotificationData = {
                    title: notificationMessage.title,
                    body: notificationMessage.description,
                    // description: notificationMessage.description,
                    type: "new_subscription",
                    receiver_id: admins._id,
                    related_to: userid,
                    related_to_type: "user",
                    user_type: plandata.type
                };
                const newAdminNotification = new admin_received_notification(adminNotificationData);
                console.log("newAdminNotification : ", newAdminNotification)
                await newAdminNotification.save();
            }
        }
        return res.status(200).json({
            message: "Subscription created successfully",
            data: {
                subscription: newsubscription,
                requires_action: requiresAction,
                client_secret: clientSecret,
                payment_method_type: paymentIntent.payment_method_types[0]
            },
            code: 200
        })
    } catch (error) {
        if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({
                message: error.message,
                code: 400,
                stripe_code: error.code,
                payment_method_type: error.payment_method?.type
            });
        }
        utils.handleError(res, error);
    }
}

exports.createFreeSubscription = async (req, res) => {
    try {
        const { plan_id } = req.body;
        const userid = req.user._id

        const userdata = await User.findOne({ _id: userid })
        console.log("userdata : ", userdata)
        if (!userdata) {
            return utils.handleError(res, {
                message: "user not found",
                code: 404,
            });
        }

        const plandata = await plan.findOne({ plan_id: plan_id })
        console.log("plandata : ", plandata)
        if (!plandata) {
            return utils.handleError(res, {
                message: "Plan not found",
                code: 404,
            });
        }

        const result = await Subscription.findOne({ user_id: new mongoose.Types.ObjectId(userid), type: plandata.type })
        console.log("result : ", result)

        if (result) {
            return utils.handleError(res, {
                message: "Already have an active Subscription",
                code: 404,
            });
        }

        if (plandata.type !== "buyer" && plandata.type !== "resource") {
            return utils.handleError(res, {
                message: `Invalid plan`,
                code: 404,
            });
        }

        let newdata = {
            user_id: userdata?._id,
            subscription_id: await genrateSubscriptionId(),
            plan_id: plan_id,
            start_at: new Date(),
            end_at: "",
            end_at: null,
            status: "active",
            type: plandata.type,
            subscription_type: "unpaid"
        }

        console.log("newdata : ", newdata)
        const newsubscription = await Subscription.create(newdata);
        console.log("subscription : ", newsubscription)


        // admin notification
        const admins = await Admin.findOne({ role: 'super_admin' });
        console.log("admins : ", admins)

        if (admins) {
            const notificationMessage = {
                title: 'New Subscription created',
                description: `${userdata.full_name} has created a new subscription . Plan ID : ${newsubscription.plan_id}`,
                user_id: userid
            };

            const adminFcmDevices = await fcm_devices.find({ user_id: admins._id });
            console.log("adminFcmDevices : ", adminFcmDevices)

            if (adminFcmDevices && adminFcmDevices.length > 0) {
                adminFcmDevices.forEach(async i => {
                    const token = i.token
                    console.log("token : ", token)
                    await utils.sendNotification(token, notificationMessage);
                })
                const adminNotificationData = {
                    title: notificationMessage.title,
                    body: notificationMessage.description,
                    // description: notificationMessage.description,
                    type: "new_subscription",
                    receiver_id: admins._id,
                    related_to: userid,
                    related_to_type: "user",
                    user_type: plandata.type
                };
                const newAdminNotification = new admin_received_notification(adminNotificationData);
                console.log("newAdminNotification : ", newAdminNotification)
                await newAdminNotification.save();
            }
        }
        return res.status(200).json({
            message: "Subscription created successfully",
            data: newsubscription,
            code: 200
        })

    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.cancelSubscription = async (req, res) => {
    try {
        const { subscription_id } = req.body;

        const subscription = await Subscription.findOne({ _id: subscription_id });

        if (!subscription) {
            return utils.handleError(res, {
                message: "Subscription not found",
                code: 404,
            });
        }

        const userdata = await User.findById(subscription.user_id);

        const plandata = await plan.findById(subscription.plan_id);

        const stripeSub = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
            cancel_at_period_end: true
        });

        subscription.status = 'cancelled_scheduled';
        // subscription.end_at = new Date(stripeSub.current_period_end * 1000);
        await subscription.save();

        // admin notification
        const admins = await Admin.findOne({ role: 'super_admin' });
        console.log("admins : ", admins)

        if (admins) {
            const notificationMessage = {
                title: 'Existing Subscription cancelled',
                description: `${userdata.full_name} has cancelled an existing subscription . Plan ID : ${subscription.plan_id}`,
                user_id: subscription.user_id
            };

            const adminFcmDevices = await fcm_devices.find({ user_id: admins._id });
            console.log("adminFcmDevices : ", adminFcmDevices)

            if (adminFcmDevices && adminFcmDevices.length > 0) {
                adminFcmDevices.forEach(async i => {
                    const token = i.token
                    console.log("token : ", token)
                    await utils.sendNotification(token, notificationMessage);
                })
                const adminNotificationData = {
                    title: notificationMessage.title,
                    body: notificationMessage.description,
                    // description: notificationMessage.description,
                    type: "canceled_subscription",
                    receiver_id: admins._id,
                    related_to: subscription.user_id,
                    related_to_type: "user",
                    user_type: plandata.type
                };
                const newAdminNotification = new admin_received_notification(adminNotificationData);
                console.log("newAdminNotification : ", newAdminNotification)
                await newAdminNotification.save();
            }
        }

        return res.status(200).json({
            message: 'Subscription cancellation scheduled at period end.',
            data: stripeSub
        });

    } catch (err) {
        console.error('Cancel subscription error:', err);
        utils.handleError(res, error);
    }
}


exports.getAllPlan = async (req, res) => {
    try {
        const { offset = 0, limit = 10, type } = req.query
        let query = { selected: true, status: 'active' };
        if (type) {
            query.type = type;
        }

        const plandata = await plan.find(query)
            .skip(Number(offset))
            .limit(Number(limit))
            .sort({ createdAt: -1 });
        // const plandata = await plan.find({ selected: true }).skip(Number(offset)).limit(Number(limit)).sort({ createdAt: -1 });
        console.log("plandata : ", plandata)
        const count = await plan.countDocuments()
        return res.status(200).json({
            message: "plan data fetched successfully", data: plandata, count, code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.getSinglePlan = async (req, res) => {
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
        return res.status(200).json({
            message: "plan data fetched successfully", data: plandata, code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

