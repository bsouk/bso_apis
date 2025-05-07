const User = require("../../models/user");
const Address = require("../../models/address");

const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require('generate-password');

const Ads = require("../../models/ads");

exports.dashboardChartData = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalBuyer = await User.countDocuments({ user_type: { $in: ["buyer"] } });
        const totalSupplier = await User.countDocuments({ user_type: { $in: ["supplier"] } });
        const totalLogistics = await User.countDocuments({ user_type: { $in: ["logistics"] } });
        const totalResource = await User.countDocuments({ user_type: { $in: ["resource"] } });
        return res.status(200).json({
            message: "Dashboard data fetched successfully",
            totalUsers,
            totalBuyer,
            totalSupplier,
            totalLogistics,
            totalResource
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}