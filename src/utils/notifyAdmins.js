'use strict';
/**
 * Notify all super_admin users: save to admin_received_notification (always)
 * and optionally send FCM. Works in development even when no FCM devices are registered.
 */
const Admin = require('../models/admin');
const fcm_devices = require('../models/fcm_devices');
const admin_received_notification = require('../models/admin_received_notification');
const utils = require('./utils');

/**
 * @param {Object} options
 * @param {string} options.title - Notification title (e.g. "New Enquiry – #ENQ123")
 * @param {string} options.description - Notification description/body text
 * @param {string} options.type - type for admin_received_notification (e.g. "new_enquiry", "supplier_quote", "logistics_quote")
 * @param {mongoose.Types.ObjectId} [options.related_to] - related_to ID (enquiry, quote, etc.)
 * @param {string} [options.related_to_type] - "enquiry" | "quote" | "order" | "user" etc.
 * @returns {Promise<{ saved: number, fcmSent: number }>}
 */
async function notifyAllSuperAdmins({ title, description, type, related_to, related_to_type }) {
    let saved = 0;
    let fcmSent = 0;
    try {
        const admins = await Admin.find({ role: 'super_admin' }).lean();
        if (!admins || admins.length === 0) {
            console.log('[notifyAdmins] No super_admin users found.');
            return { saved: 0, fcmSent: 0 };
        }

        for (const admin of admins) {
            const payload = {
                title,
                description,
                type,
                receiver_id: admin._id,
                related_to: related_to || null,
                related_to_type: related_to_type || null,
            };

            // Always save to DB (works in dev without FCM)
            try {
                await admin_received_notification.create(payload);
                saved++;
            } catch (dbErr) {
                console.error('[notifyAdmins] DB save error for admin', admin._id, dbErr.message);
            }

            // Optional: send FCM if device tokens exist
            try {
                const devices = await fcm_devices.find({ user_id: admin._id });
                if (devices && devices.length > 0) {
                    const notificationMessage = { title, description };
                    for (const d of devices) {
                        if (d.token) {
                            await utils.sendNotification(d.token, notificationMessage);
                            fcmSent++;
                        }
                    }
                }
            } catch (fcmErr) {
                console.error('[notifyAdmins] FCM error for admin', admin._id, fcmErr.message);
            }
        }

        return { saved, fcmSent };
    } catch (error) {
        console.error('[notifyAdmins] Error:', error);
        return { saved, fcmSent };
    }
}

module.exports = { notifyAllSuperAdmins };
