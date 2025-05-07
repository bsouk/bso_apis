const User = require("../../models/user");
const Address = require("../../models/address");
const Order = require("../../models/order")

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

// exports.getRevenueChartData = async (req, res) => {
//     try {
//         const { selectedPeriod } = req.query;
//         let currentDate = new Date();
//         let startOfPeriod, endOfPeriod;

//         if (selectedPeriod === 'daily') {
//             startOfPeriod = new Date(currentDate.setHours(0, 0, 0, 0));
//             endOfPeriod = new Date(currentDate.setHours(23, 59, 59, 999));
//         } else if (selectedPeriod === 'weekly') {
//             const startOfWeek = new Date();
//             startOfWeek.setDate(currentDate.getDate() - 6);
//             startOfWeek.setHours(0, 0, 0, 0);

//             const endOfWeek = new Date(startOfWeek);
//             endOfWeek.setDate(startOfWeek.getDate() + 6);
//             endOfWeek.setHours(23, 59, 59, 999);

//             startOfPeriod = startOfWeek;
//             endOfPeriod = endOfWeek;
//         } else if (selectedPeriod === 'monthly') {
//             const today = new Date();
//             endOfPeriod = new Date(currentDate.setHours(0, 0, 0, 0));
//             startOfPeriod = new Date(today.setMonth(today.getMonth() - 1));
//         }
//         else if (selectedPeriod === 'yearly') {
//             const year = currentDate.getFullYear();
//             const month = currentDate.getMonth()
//             const date = currentDate.getDate()
//             startOfPeriod = new Date(year - 1, month, date);
//             // endOfPeriod = new Date(year, 11, 31, 23, 59, 59, 999);
//             endOfPeriod = new Date(year, month, date);
//         }

//         console.log("start date:", startOfPeriod, "end date:", endOfPeriod);

//         let filter = {
//             user_type: 'personal'
//         };
//         let data = [];
//         if (selectedPeriod) {
//             filter.createdAt = { $gte: startOfPeriod, $lte: endOfPeriod };
//         }

//         console.log("filter:", filter);

//         if (selectedPeriod === 'daily') {
//             const dailyData = await Order.aggregate([
//                 { $match: filter },
//                 { $project: { hour: { $hour: "$createdAt" } } },
//                 { $group: { _id: "$hour", count: { $sum: 1 } } },
//                 { $sort: { _id: 1 } }
//             ]);

//             console.log("daily data:", dailyData);

//             data = Array(24).fill(0);
//             dailyData.forEach(item => {
//                 data[item._id - 1] = item.count;
//             });

//         } else if (selectedPeriod === 'weekly') {
//             const month = currentDate.getMonth();
//             const year = currentDate.getFullYear();

//             const startOfMonth = new Date(year, month, 1);
//             const endOfMonth = new Date(year, month + 1, 0);
//             console.log("startOfMonth : ", startOfMonth)
//             console.log("endOfMonth : ", endOfMonth)
//             // console.log("endOfMonth.getDate() + startOfMonth.getDay()) / 7 : ", (endOfMonth.getDate() + startOfMonth.getDay()) / 7)

//             const weeksInMonth = Math.ceil((endOfMonth.getDate() + startOfMonth.getDay()) / 7);
//             console.log("weeksInMonth : ", weeksInMonth)

//             const weeklyData = await Order.aggregate([
//                 { $match: filter },
//                 {
//                     $project: {
//                         weekOfMonth: {
//                             $ceil: {
//                                 $divide: [
//                                     { $subtract: ["$createdAt", startOfMonth] },
//                                     1000 * 60 * 60 * 24 * 7
//                                 ]
//                             }
//                         }
//                     }
//                 },
//                 { $group: { _id: "$weekOfMonth", count: { $sum: 1 } } },
//                 { $sort: { _id: 1 } }
//             ]);

//             console.log("weekly data:", weeklyData);

//             data = Array(weeksInMonth).fill(0);
//             weeklyData.forEach(item => {
//                 data[item._id - 1] = item.count;
//             });

//         } else if (selectedPeriod === "monthly") {
//             const daysInMonth = new Date(
//                 currentDate.getFullYear(),
//                 currentDate.getMonth() + 1,
//                 0
//             ).getDate();
//             console.log("daysInMonth : ", daysInMonth)

//             const monthlyData = await Order.aggregate([
//                 { $match: filter },
//                 { $project: { day: { $dayOfMonth: "$createdAt" } } },
//                 { $group: { _id: "$day", count: { $sum: 1 } } },
//                 { $sort: { _id: 1 } }
//             ]);

//             console.log("Monthly data:", monthlyData);

//             data = Array(daysInMonth).fill(0);
//             monthlyData.forEach(item => {
//                 data[item._id - 1] = item.count;
//             });
//         }

//         else if (selectedPeriod === 'yearly') {
//             const yearlyData = await Order.aggregate([
//                 { $match: filter },
//                 { $project: { month: { $month: "$createdAt" } } },
//                 { $group: { _id: "$month", count: { $sum: 1 } } },
//                 { $sort: { _id: 1 } }
//             ]);

//             console.log("yearly data:", yearlyData);
//             data = Array(12).fill(0);
//             yearlyData.forEach(item => {
//                 data[item._id - 1] = item.count;
//             });
//         }

//         return res.json({
//             message: "User overview fetched successfully",
//             data,
//             code: 200
//         });

//     } catch (error) {
//         utils.handleError(res, error);
//     }
// }

exports.getRevenueChartData = async (req, res) => {
    try {
        const { selectedPeriod } = req.query;
        if (!selectedPeriod) {
            utils.handleError(res, {
                message: "Time period is required",
                code: 200
            })
        }
        let currentDate = new Date();
        let startOfPeriod, endOfPeriod;

        // Calculate date ranges based on selected period
        if (selectedPeriod === 'daily') {
            startOfPeriod = new Date(currentDate.setHours(0, 0, 0, 0));
            endOfPeriod = new Date(currentDate.setHours(23, 59, 59, 999));
        } else if (selectedPeriod === 'weekly') {
            startOfPeriod = new Date();
            startOfPeriod.setDate(currentDate.getDate() - 6);
            startOfPeriod.setHours(0, 0, 0, 0);

            endOfPeriod = new Date();
            endOfPeriod.setHours(23, 59, 59, 999);
        } else if (selectedPeriod === 'monthly') {
            startOfPeriod = new Date();
            startOfPeriod.setMonth(currentDate.getMonth() - 1);
            startOfPeriod.setHours(0, 0, 0, 0);

            endOfPeriod = new Date();
            endOfPeriod.setHours(23, 59, 59, 999);
        } else if (selectedPeriod === 'yearly') {
            startOfPeriod = new Date();
            startOfPeriod.setFullYear(currentDate.getFullYear() - 1);
            startOfPeriod.setHours(0, 0, 0, 0);

            endOfPeriod = new Date();
            endOfPeriod.setHours(23, 59, 59, 999);
        }

        console.log("Date range:", startOfPeriod, "to", endOfPeriod);

        let filter = {
            createdAt: { $gte: startOfPeriod, $lte: endOfPeriod },
            order_status: { $ne: 'cancelled' } // Exclude cancelled orders
        };

        let data = [];

        if (selectedPeriod === 'daily') {
            // const dailyData = await Order.aggregate([
            //     { $match: filter },
            //     {
            //         $project: {
            //             hour: { $hour: "$createdAt" },
            //             total_amount: 1
            //         }
            //     },
            //     {
            //         $group: {
            //             _id: "$hour",
            //             total: { $sum: "$total_amount" }
            //         }
            //     },
            //     { $sort: { _id: 1 } }
            // ]);
            // console.log("dailyData :", dailyData);

            // data = Array({ length: 24 }, (_, i) => ({
            //     hour: i,
            //     total: 0
            // }));
            // dailyData.forEach(item => {
            //     data[item._id] = {
            //         hour: item._id,
            //         total: parseFloat(item.total.toFixed(2))
            //     }
            // });

            const dailyData = await Order.aggregate([
                { $match: filter },
                {
                    $project: {
                        hour: { $hour: "$createdAt" },
                        total_amount: 1
                    }
                },
                {
                    $group: {
                        _id: "$hour",
                        total: { $sum: "$total_amount" }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
            console.log("dailyData:", dailyData);
        
            data = Array.from({ length: 24 }, (_, i) => ({
                hour: i,
                total: 0
            }));
        
            dailyData.forEach(item => {
                if (item._id >= 0 && item._id <= 23) {
                    data[item._id] = {
                        hour: item._id,
                        total: parseFloat(item.total.toFixed(2))
                    };
                }
            });

        } else if (selectedPeriod === 'weekly') {
            // const month = currentDate.getMonth();
            // const year = currentDate.getFullYear();

            // const startOfMonth = new Date(year, month, 1);
            // const endOfMonth = new Date(year, month + 1, 0);
            // console.log("startOfMonth : ", startOfMonth)
            // console.log("endOfMonth : ", endOfMonth)
            // // console.log("endOfMonth.getDate() + startOfMonth.getDay()) / 7 : ", (endOfMonth.getDate() + startOfMonth.getDay()) / 7)

            // const weeksInMonth = Math.ceil((endOfMonth.getDate() + startOfMonth.getDay()) / 7);
            // console.log("weeksInMonth : ", weeksInMonth)
            // const weeksData = await Order.aggregate([
            //     { $match: filter },
            //     {
            //         $project: {
            //             weekOfMonth: {
            //                 $ceil: {
            //                     $divide: [
            //                         { $subtract: ["$createdAt", startOfMonth] },
            //                         1000 * 60 * 60 * 24 * 7
            //                     ]
            //                 }
            //             }
            //         }
            //     },
            //     { $group: { _id: "$weekOfMonth", total: { $sum: "$total_amount" } } },
            //     { $sort: { _id: 1 } }
            // ]);
            // console.log("weeksData :", weeksData);

            // data = Array({ length: weeksInMonth }, (_, i) => ({
            //     week: i,
            //     total: 0
            // }));
            // weeksData.forEach(item => {
            //     data[item._id - 1] = {
            //         week: item._id,
            //         total: item.total
            //     }
            // });

            const currentDate = new Date();
            const month = currentDate.getMonth();
            const year = currentDate.getFullYear();

            const startOfMonth = new Date(year, month, 1);
            const endOfMonth = new Date(year, month + 1, 0);

            const firstDayOfWeek = startOfMonth.getDay(); // 0 (Sunday) to 6 (Saturday)
            const daysInMonth = endOfMonth.getDate();
            const weeksInMonth = Math.ceil((daysInMonth + firstDayOfWeek) / 7);

            const weeksData = await Order.aggregate([
                { $match: filter },
                {
                    $project: {
                        createdAt: 1,
                        total_amount: 1,
                        weekOfMonth: {
                            $ceil: {
                                $divide: [
                                    {
                                        $add: [
                                            { $subtract: ["$createdAt", startOfMonth] },
                                            firstDayOfWeek * 24 * 60 * 60 * 1000
                                        ]
                                    },
                                    7 * 24 * 60 * 60 * 1000
                                ]
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: "$weekOfMonth",
                        total: { $sum: "$total_amount" }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            data = Array.from({ length: weeksInMonth }, (_, i) => ({
                week: i + 1,
                total: 0
            }));

            weeksData.forEach(item => {
                if (item._id >= 1 && item._id <= weeksInMonth) {
                    data[item._id - 1] = {
                        week: item._id,
                        total: parseFloat(item.total.toFixed(2))
                    };
                }
            });

        } else if (selectedPeriod === 'monthly') {
            const daysInMonth = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth() + 1,
                0
            ).getDate();
            console.log("daysInMonth : ", daysInMonth)
            const monthlyData = await Order.aggregate([
                { $match: filter },
                { $project: { day: { $dayOfMonth: "$createdAt" }, total_amount: 1 } },
                { $group: { _id: "$day", total: { $sum: "$total_amount" } } },
                { $sort: { _id: 1 } }
            ]);
            console.log("monthlyData : ", monthlyData)

            data = Array.from({ length: daysInMonth }, (_, i) => ({
                day: i + 1,
                total: 0
            }));
            monthlyData.forEach(item => {
                data[item._id - 1] = {
                    day: item._id,
                    total: item.total
                };
            });
        } else if (selectedPeriod === 'yearly') {
            const yearlyData = await Order.aggregate([
                { $match: filter },
                { $project: { month: { $month: "$createdAt" }, total_amount: 1 } },
                { $group: { _id: "$month", total: { $sum: "$total_amount" } } },
                { $sort: { _id: 1 } }
            ]);
            console.log("yearlyData : ", yearlyData)

            data = Array.from({ length: 12 }, (_, i) => ({
                month: i + 1,
                total: 0
            }));

            yearlyData.forEach(item => {
                data[item._id - 1] = {
                    month: item._id,
                    total: item.total
                };
            });
        }

        return res.json({
            message: "Revenue data fetched successfully",
            data,
            code: 200
        });

    } catch (error) {
        console.error("Error fetching revenue data:", error);
        utils.handleError(res, error);
    }
};