const fcm_devices = require("../../models/fcm_devices");
const Adminnotification = require("../../models/admin_notification");
const Notification = require("../../models/notification");
const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const User = require("../../models/user");

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

        let filter = {};
        if (Array.isArray(sent_to) && sent_to.length !== 0) {
            filter['_id'] = { $in: sent_to }
        }
        if ((Array.isArray(sent_to) && sent_to.length === 0) && (all === true || all === "true")) {
            filter = {}
        }

        const users = await User.aggregate([
            {
                $match: filter
            },
            {
                $lookup: {
                    from: "fcmdevices",
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
        ])

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
            if (element.notification === true && element?.device_token) {
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
        if (all === true || all === "true") {
            const notificaitons = await Adminnotification.create({
                sender_id: admin_id,
                type: "by_admin",
                title: title,
                body: body,
                send_to: "all"
            });
            console.log("notificaitons", notificaitons)
        } else {
            const notificaitons = await Adminnotification.insertMany(notificationToCreate);
            console.log("notificaitons", notificaitons)
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

exports.getNotificationList = async (req, res) => {
    try {
        const admin_id = req.user._id;
        const { offset = 0, limit = 10 } = req.query;
        const notifications = await Adminnotification.find({ sender_id: admin_id }).populate('receiver_id').sort({ createdAt: -1 }).skip(offset).limit(limit);
        const totalCount = await Adminnotification.countDocuments({ sender_id: admin_id });
        res.json({ notifications, totalCount, code: 200 })
    } catch (error) {
        console.log(error)
        utils.handleError(res, error)
    }
}


exports.getAllUsers = async (req, res) => {
    try {
        const { offset = 0, limit = 10 } = req.query;
        const users = await User.find().skip(Number(offset)).limit(Number(limit)).select('_id full_name first_name last_name email');
        console.log("users : ", users)
        return res.json({ users, code: 200 })
    } catch (error) {
        console.log(error)
        utils.handleError(res, error)
    }
}