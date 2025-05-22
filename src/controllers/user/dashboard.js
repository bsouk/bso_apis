const { handleError } = require("../../utils/utils")
const utils = require("../../utils/utils")
const Enquiry = require("../../models/Enquiry");
const EnquiryQuotes = require("../../models/EnquiryQuotes");
const Job = require("../../models/jobs")
const JobApplication = require("../../models/job_applications")

exports.getDashboardData = async (req, res) => {
    try {
        const userId = req.user._id;
        console.log("userid is", userId);
        const { chartof } = req.query

        if (!chartof) {
            utils.handleError(res, {
                message: 'chart property is required',
                code : 400
            })
        }

        let data = []
        let chart = []

        switch (chartof) {
            case "queries":
                {
                    data = await Enquiry.find({ user_id: userId }).sort({ createdAt: -1 }).limit(5)
                    chart = await Enquiry.aggregate([
                        {
                            $match: { user_id: userId }
                        },
                        {
                            $group: {
                                _id: "$status",
                                total: { $sum: 1 }
                            }
                        }
                    ])
                };
                break;
            case "quotes":
                {
                    data = await EnquiryQuotes.find({ user_id: userId }).sort({ createdAt: -1 }).limit(5)
                    chart = await EnquiryQuotes.aggregate([
                        {
                            $match: { user_id: userId }
                        },
                        {
                            $group: {
                                _id: "$status",
                                total: { $sum: 1 }
                            }
                        }
                    ])
                };
                break;
            case "jobposted":
                {
                    data = await Job.find({ company_id: userId }).sort({ createdAt: -1 }).limit(5)
                    chart = await Job.aggregate([
                        {
                            $match: { company_id: userId }
                        },
                        {
                            $group: {
                                _id: "$status",
                                total: { $sum: 1 }
                            }
                        }
                    ])
                };
                break;
            case "jobapplied":
                {
                    data = await JobApplication.find({ canditate_id: userId }).sort({ createdAt: -1 }).limit(5)
                    chart = await JobApplication.aggregate([
                        {
                            $match: { canditate_id: userId }
                        },
                        {
                            $group: {
                                _id: "$status",
                                total: { $sum: 1 }
                            }
                        }
                    ])
                };
                break;
            default: return utils.handleError(res, {
                message: "Invalid chart type",
                code: 404,
            });
        }

        return res.status(200).json({
            message: "dashboard data fetched successfully",
            data,
            chart,
            code: 200
        })

    } catch (error) {
        handleError(res, error)
    }
}