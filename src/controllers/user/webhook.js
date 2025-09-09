const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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

exports.handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.log(`⚠️  Webhook signature verification failed.`, err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('event in webhooks :>> ', event);

    switch (event.type) {
        case 'invoice.payment_succeeded':
            const invoice = event.data.object;
            await Subscription.updateOne(
                { stripe_subscription_id: invoice.subscription },
                {
                    status: 'active',
                    end_at: new Date(invoice.period_end * 1000)
                }
            );
            break;

        case 'invoice.payment_failed':
            const failedInvoice = event.data.object;
            await Subscription.updateOne(
                { stripe_subscription_id: failedInvoice.subscription },
                { status: 'payment_failed' }
            );
            break;

        case 'customer.subscription.deleted':
            const deletedSubscription = event.data.object;
            await Subscription.updateOne(
                { stripe_subscription_id: deletedSubscription.id },
                {
                    status: 'terminated',
                    end_at: new Date(deletedSubscription.current_period_end * 1000)
                }
            );
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
};