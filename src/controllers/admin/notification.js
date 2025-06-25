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
        //user notification
        const userFcmDevices = await fcm_devices.find({ user_id });
        console.log("userFcmDevices : ", userFcmDevices)
        const notificationMessage = notificationbody
        if (userFcmDevices && userFcmDevices.length > 0) {
            userFcmDevices.forEach(async i => {
                const token = i.token
                console.log("token : ", token)
                await utils.sendNotification(token, notificationMessage);
            })
            const userNotificationData = dbnotificationbody
            const newuserNotification = new Notification(userNotificationData);
            console.log("newuserNotification : ", newuserNotification)
            await newuserNotification.save();
        } else {
            console.log(`No active FCM tokens found for user`);
        }
    } catch (error) {
        console.log(error)
    }
}

exports.sendNotification = async (req, res) => {
    try {
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
                await sendUsernotificationhelper(element?._id, notificationbody, dbnotificationbody)
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
        //push notification
        if (device_tokens.length !== 0) {
            utils.sendPushNotification(device_tokens, title, body)
        }
        res.json({ message: "Notification sent successfully", code: 200 })
    } catch (error) {
        console.log(error)
        utils.handleError(res, error)
    }
}

exports.getReceivedNotificationList = async (req, res) => {
    try {
        const admin_id = req.user._id;
        const { offset = 0, limit = 10 } = req.query;
        const notifications = await admin_received_notification.find({ receiver_id: admin_id }).sort({ createdAt: -1 }).skip(offset).limit(limit);
        const totalCount = await admin_received_notification.countDocuments({ receiver_id: admin_id });
        const unreadCount = await admin_received_notification.countDocuments({ receiver_id: admin_id, is_read: false, is_seen: false });
        return res.status(200).json({ notifications, totalCount, unreadCount, code: 200 })
    } catch (error) {
        console.log(error)
        utils.handleError(res, error)
    }
}


exports.getNotificationList = async (req, res) => {
    try {
        const admin_id = req.user._id;
        const { offset = 0, limit = 10 } = req.query;
        const notifications = await Adminnotification.find({ sender_id: admin_id }).populate('receiver_id').sort({ createdAt: -1 }).skip(offset).limit(limit);
        const totalCount = await Adminnotification.countDocuments({ sender_id: admin_id });
        return res.status(200).json({ notifications, totalCount, code: 200 })
    } catch (error) {
        console.log(error)
        utils.handleError(res, error)
    }
}


exports.getAllUsers = async (req, res) => {
    try {
        const { offset = 0, limit = 10,search } = req.query;
          const searchFilter = search
      ? {
          $or: [
            { full_name: { $regex: search, $options: 'i' } },
            { first_name: { $regex: search, $options: 'i' } },
            { last_name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ],
        }
      : {};
        const users = await User.find(searchFilter).skip(Number(offset)).limit(Number(limit)).select('_id full_name first_name last_name email');
        console.log("users : ", users)
        return res.json({ users, code: 200 })
    } catch (error) {
        console.log(error)
        utils.handleError(res, error)
    }
}


exports.ReadAllNotification = async (req, res) => {
    try {
        const admin_id = req.user._id;
        const notification = await admin_received_notification.updateMany({ receiver_id: admin_id }, { is_read: true, is_seen: true }, { new: true });
        console.log("notification : ", notification)
        return res.status(200).json({ message: "Notification read successfully", code: 200 })
    } catch (error) {
        console.log(error)
        utils.handleError(res, error)
    }
}