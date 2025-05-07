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

exports.createSubscription = async (req, res) => {
    try {
        const userid = req.user._id
        const data = req.body
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

        if (!plandata?.stripe_price_id) {
            return utils.handleError(res, {
                message: "Plan is not properly configured for payments",
                code: 400,
            });
        }

        let customer = await getCustomerByEmail(userdata.email);
        if (!customer) {
            customer = await createStripeCustomer(userdata);
        }

        // // Attach the selected payment method to customer (but don't set as default)
        // await stripe.paymentMethods.attach(payment_method_id, {
        //     customer: customer.id,
        // });

        const stripeSubscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: plandata?.stripe_price_id }],
            expand: ['latest_invoice.payment_intent'],
            metadata: {
                userId: userid.toString(),
                planId: plandata._id.toString()
            },
        });


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
            start_at: start,
            end_at: end,
            status: stripeSubscription.status,
            type: plandata.type
        }

        console.log("newdata : ", newdata)
        const result = await Subscription.updateMany({ user_id: new mongoose.Types.ObjectId(userid), type: plandata.type }, { status: 'terminated' }, { new: true })
        console.log("result : ", result)
        const newsubscription = await Subscription.create(newdata);
        console.log("subscription : ", newsubscription)


        // admin notification
        const admins = await Admin.findOne({ role: 'super_admin' });
        console.log("admins : ", admins)

        if (admins) {
            const notificationMessage = {
                title: 'New Subscription created',
                description: `${userdata.full_name} has created a new subscription . Plan ID : ${newsubscription.plan_id}`,
                subscription_id: newsubscription._id
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
                    related_to: newsubscription._id,
                    related_to_type: "subscription",
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

