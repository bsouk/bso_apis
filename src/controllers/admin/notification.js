const fcm_devices = require("../../models/fcm_devices");
const Adminnotification = require("../../models/admin_notification");
const admin_received_notification = require("../../models/admin_received_notification");
const Notification = require("../../models/notification");
const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const User = require("../../models/user");
const { default: mongoose } = require("mongoose");

const sendUsernotificationhelper = async (user_id, notificationbody, dbnotificationbody) => {
    try {
        // Validate inputs
        if (!user_id || !notificationbody || !dbnotificationbody) {
            console.warn("sendUsernotificationhelper: Missing required parameters");
            return false;
        }

        //user notification
        const userFcmDevices = await fcm_devices.find({ user_id });
        console.log("userFcmDevices : ", userFcmDevices)
        const notificationMessage = notificationbody
        
        if (userFcmDevices && userFcmDevices.length > 0) {
            // Use Promise.all to properly handle async operations
            await Promise.all(
                userFcmDevices.map(async (i) => {
                    try {
                        const token = i.token;
                        console.log("token : ", token);
                        if (token) {
                            await utils.sendNotification(token, notificationMessage);
                        }
                    } catch (notifError) {
                        console.error('Error sending FCM notification in helper:', notifError);
                        // Continue with other notifications even if one fails
                    }
                })
            );

            // Save notification to database
            try {
                const userNotificationData = dbnotificationbody;
                const newuserNotification = new Notification(userNotificationData);
                console.log("newuserNotification : ", newuserNotification);
                await newuserNotification.save();
            } catch (dbError) {
                console.error('Error saving notification to database in helper:', dbError);
                // Continue even if database save fails
            }
        } else {
            console.log(`No active FCM tokens found for user`);
        }
        
        return true;
    } catch (error) {
        console.error('Error in sendUsernotificationhelper:', error);
        // Return false instead of throwing to prevent crashes
        return false;
    }
}

exports.sendNotification = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "Unauthorized", code: 401 });
        }

        const admin_id = req.user._id;
        const { sent_to, title, body, all } = req.body;
        console.log("body : ", req.body)

        let filter = {};
        if (sent_to.length > 0) {
            let ids = sent_to.map(id => new mongoose.Types.ObjectId(id));
            filter['_id'] = { $in: ids }
        } else {
            filter = {}
        }
        // if ((Array.isArray(sent_to) && sent_to.length === 0) && (all === true || all === "true")) {
        //     filter = {}
        // }

        console.log("filter : ", filter)
        const users = await User.aggregate([
            {
                $match: filter
            },
            {
                $lookup: {
                    from: "fcm_devices",
                    localField: "_id",
                    foreignField: "user_id",
                    as: "device_token"
                }
            },
            {
                $unwind: {
                    path: "$device_token",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $sort: {
                    createdAt: -1
                }
            }
        ])
        console.log("users : ", users)

        const device_tokens = [];

        const notificationToCreate = []

        for (let index = 0; index < users.length; index++) {
            const element = users[index];
            const notificationData = {
                sender_id: admin_id,
                receiver_id: element._id,
                type: "by_admin",
                title: title,
                body: body
            }
            notificationToCreate.push(notificationData);
            if (element?.device_token) {
                device_tokens.push(element?.device_token?.token)
                let notificationbody = {
                    title: title,
                    description: body
                }
                let dbnotificationbody = {
                    title: title,
                    description: body,
                    type: "admin_action",
                    receiver_id: element?._id,
                    related_to: element?._id,
                    related_to_type: "user",
                }
                try {
                    await sendUsernotificationhelper(element?._id, notificationbody, dbnotificationbody)
                } catch (notifError) {
                    console.error('Error sending user notification:', notifError);
                    // Continue with other notifications even if one fails
                }
            }
        }
        console.log("device_token", device_tokens)
        if (Array.isArray(sent_to) && sent_to.length !== 0) {
            const notifications = await Adminnotification.insertMany(notificationToCreate);
            console.log("Admin notifications (individual):", notifications);
        } else {
            const notification = await Adminnotification.create({
                sender_id: admin_id,
                type: "by_admin",
                title: title,
                body: body,
                send_to: "all"
            });
            console.log("Admin notification (all):", notification);
        }
        //push notification - wrapped in try-catch to prevent crashes
        if (device_tokens.length !== 0) {
            try {
                // Note: sendPushNotification expects different parameters
                // This is a legacy call - we'll handle it gracefully
                await utils.sendPushNotification(device_tokens, title, body).catch((error) => {
                    console.error('Error in sendPushNotification:', error);
                    // Continue even if push notification fails
                });
            } catch (pushError) {
                console.error('Error sending push notifications:', pushError);
                // Continue even if push notification fails - don't crash the server
            }
        }
        return res.json({ message: "Notification sent successfully", code: 200 });
    } catch (error) {
        console.error('Error in sendNotification:', error);
        utils.handleError(res, error);
    }
}

exports.getReceivedNotificationList = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "Unauthorized", code: 401 });
        }

        const admin_id = req.user._id;
        const offset = parseInt(req.query.offset) || 0;
        const limit = parseInt(req.query.limit) || 10;

        const notifications = await admin_received_notification
            .find({ receiver_id: admin_id })
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .lean();

        const totalCount = await admin_received_notification.countDocuments({ receiver_id: admin_id });
        const unreadCount = await admin_received_notification.countDocuments({ 
            receiver_id: admin_id, 
            is_read: { $ne: true },
            is_seen: { $ne: true }
        });

        return res.status(200).json({ 
            notifications: notifications || [], 
            totalCount: totalCount || 0, 
            unreadCount: unreadCount || 0, 
            code: 200 
        });
    } catch (error) {
        console.error('Error in getReceivedNotificationList:', error);
        utils.handleError(res, error);
    }
}


exports.getNotificationList = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "Unauthorized", code: 401 });
        }

        const admin_id = req.user._id;
        const offset = parseInt(req.query.offset) || 0;
        const limit = parseInt(req.query.limit) || 10;

        const notifications = await Adminnotification
            .find({ sender_id: admin_id })
            .populate('receiver_id')
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .lean();

        const totalCount = await Adminnotification.countDocuments({ sender_id: admin_id });
        
        return res.status(200).json({ 
            notifications: notifications || [], 
            totalCount: totalCount || 0, 
            code: 200 
        });
    } catch (error) {
        console.error('Error in getNotificationList:', error);
        utils.handleError(res, error);
    }
}


exports.getAllUsers = async (req, res) => {
    try {
        const { offset = 0, limit = 10, search, user_type, buyer_type } = req.query;
        
        const searchFilter = {};
        
        // If specific buyer_type is requested (direct-buyer or indirect-buyer)
        if (buyer_type && buyer_type !== 'all') {
            searchFilter.buyer_type = buyer_type;
        }
        // Add user_type filter if provided
        // For 'buyer' type, we also include 'company' and users with buyer_type set
        // This is because customers can be companies that are also buyers
        else if (user_type === 'buyer') {
            searchFilter.$or = [
                { user_type: { $in: ['buyer'] } },
                { user_type: { $in: ['company'] } },
                { buyer_type: { $in: ['direct-buyer', 'indirect-buyer'] } }
            ];
        } else if (user_type) {
            searchFilter.user_type = { $in: [user_type] };
        }
        
        // Only get active users (not deactivated or trashed)
        // This excludes users with status 'inactive', 'deleted', 'trashed', etc.
        searchFilter.status = { $nin: ['inactive', 'deleted', 'trashed', 'deactivated'] };
        searchFilter.is_deleted = { $ne: true };
        searchFilter.is_trashed = { $ne: true };
        
        // Add search filter - search by name, email, phone, user ID, or company
        if (search) {
            // If we already have $or from user_type, we need to use $and
            const searchConditions = [
                { full_name: { $regex: search, $options: 'i' } },
                { first_name: { $regex: search, $options: 'i' } },
                { last_name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { unique_user_id: { $regex: search, $options: 'i' } },
                { phone_number: { $regex: search, $options: 'i' } },
                { 'company_data.name': { $regex: search, $options: 'i' } },
            ];
            
            if (searchFilter.$or) {
                // Combine user type filter with search filter using $and
                const userTypeFilter = searchFilter.$or;
                delete searchFilter.$or;
                searchFilter.$and = [
                    { $or: userTypeFilter },
                    { $or: searchConditions }
                ];
            } else {
                searchFilter.$or = searchConditions;
            }
        }
        
        console.log("getAllUsers - searchFilter:", JSON.stringify(searchFilter, null, 2));
        console.log("getAllUsers - Params: search:", search, "user_type:", user_type, "buyer_type:", buyer_type);
        
        const users = await User.find(searchFilter)
            .skip(Number(offset))
            .limit(Number(limit))
            .select('_id full_name first_name last_name email unique_user_id company_data phone_number status buyer_type user_type')
            .sort({ createdAt: -1 });
            
        console.log("getAllUsers - Found", users.length, "users");
        return res.json({ users: users || [], code: 200 });
    } catch (error) {
        console.error('Error in getAllUsers:', error);
        utils.handleError(res, error);
    }
}


exports.ReadAllNotification = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "Unauthorized", code: 401 });
        }

        const admin_id = req.user._id;
        const result = await admin_received_notification.updateMany(
            { receiver_id: admin_id }, 
            { is_read: true, is_seen: true }
        );
        
        console.log("notification : ", result);
        return res.status(200).json({ 
            message: "Notification read successfully", 
            updatedCount: result.modifiedCount || 0,
            code: 200 
        });
    } catch (error) {
        console.error('Error in ReadAllNotification:', error);
        utils.handleError(res, error);
    }
}