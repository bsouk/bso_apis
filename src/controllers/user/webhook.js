const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fs = require('fs');
const path = require('path');

const User = require("../../models/user");
const Address = require("../../models/address");
const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require('generate-password');
const Brand = require("../../models/brand");
const crypto = require("crypto");
const Plan = require("../../models/plan");
const Subscription = require("../../models/subscription");
const Admin = require("../../models/admin");
const fcm_devices = require("../../models/fcm_devices");
const admin_notification = require("../../models/admin_notification");
const admin_received_notification = require("../../models/admin_received_notification");

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// ✅ Log file path
const LOG_FILE = path.join(__dirname, '../../logs/stripe_webhook_logs.txt');


// create log directory if not exist
const logDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// ✅ Logging function
function logStripeEvent(event) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${event.type}\n${JSON.stringify(event.data, null, 2)}\n\n`;

    fs.appendFile(LOG_FILE, logEntry, (err) => {
        if (err) {
            console.error("❌ Failed to write log:", err);
        }
    });
}

// ✅ Webhook Handler
exports.handleStripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
        // Stripe requires the raw body for signature verification
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.warn("⚠️ Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ✅ Log the event
    logStripeEvent(event);

    try {
        switch (event.type) {
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                await Subscription.updateOne(
                    { stripe_subscription_id: invoice.subscription },
                    {
                        status: 'active',
                        end_at: new Date(invoice.lines.data[0].period.end * 1000),
                    }
                );
                break;
            }

            case 'invoice.payment_failed': {
                const failedInvoice = event.data.object;
                await Subscription.updateOne(
                    { stripe_subscription_id: failedInvoice.subscription },
                    { status: 'payment_failed' }
                );
                break;
            }

            case 'customer.subscription.deleted': {
                const deletedSubscription = event.data.object;
                await Subscription.updateOne(
                    { stripe_subscription_id: deletedSubscription.id },
                    {
                        status: 'terminated',
                        end_at: new Date(deletedSubscription.current_period_end * 1000),
                    }
                );
                break;
            }

            default:
                console.log(`ℹ️ Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error("❌ Error processing webhook event:", error);
        res.status(500).send("Webhook handler failed.");
    }
};
