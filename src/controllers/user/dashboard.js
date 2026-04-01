const { handleError } = require("../../utils/utils")
const utils = require("../../utils/utils")
const Enquiry = require("../../models/Enquiry");
const EnquiryQuotes = require("../../models/EnquiryQuotes");
const logistics_quotes = require("../../models/logistics_quotes");
const Job = require("../../models/jobs")
const JobApplication = require("../../models/job_applications");
const client_testimonials = require("../../models/client_testimonials");

exports.getDashboardData = async (req, res) => {
    try {
        const userId = req.user._id;
        console.log("userid is", userId);
        const { chartof } = req.query

        if (!chartof) {
            utils.handleError(res, {
                message: 'chart property is required',
                code: 400
            })
        }

        let data = []
        let chart = []

        switch (chartof) {
            case "queries":
                {
                    const enquiries = await Enquiry.find({ user_id: userId }).sort({ createdAt: -1 }).limit(5).lean();
                    const ids = enquiries.map((e) => e._id);
                    let quoteCountByEnquiry = {};
                    if (ids.length > 0) {
                        const [eqAgg, lqAgg] = await Promise.all([
                            EnquiryQuotes.aggregate([
                                { $match: { enquiry_id: { $in: ids } } },
                                { $group: { _id: "$enquiry_id", n: { $sum: 1 } } },
                            ]),
                            logistics_quotes.aggregate([
                                { $match: { enquiry_id: { $in: ids } } },
                                { $group: { _id: "$enquiry_id", n: { $sum: 1 } } },
                            ]),
                        ]);
                        for (const row of eqAgg) {
                            const k = row._id?.toString();
                            if (k) quoteCountByEnquiry[k] = (quoteCountByEnquiry[k] || 0) + row.n;
                        }
                        for (const row of lqAgg) {
                            const k = row._id?.toString();
                            if (k) quoteCountByEnquiry[k] = (quoteCountByEnquiry[k] || 0) + row.n;
                        }
                    }
                    data = enquiries.map((e) => ({
                        ...e,
                        total_quotes: quoteCountByEnquiry[e._id.toString()] || 0,
                    }));
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
                    const eqRows = await EnquiryQuotes.find({ user_id: userId }).sort({ createdAt: -1 }).limit(10).lean()
                    const lqRows = await logistics_quotes.find({ user_id: userId }).sort({ createdAt: -1 }).limit(10).lean()
                    const merged = [
                        ...eqRows.map((r) => ({
                            ...r,
                            _quoteKind: "supplier",
                            expiry_date: r.expiry_date || r.quotation_end_date || r.createdAt,
                            grand_total: r.grand_total ?? 0,
                            currency: r.currency || "GBP",
                        })),
                        ...lqRows.map((r) => ({
                            ...r,
                            _quoteKind: "logistics",
                            expiry_date: r.createdAt,
                            grand_total: typeof r.shipping_fee === "number" ? r.shipping_fee : 0,
                            currency: "GBP",
                        })),
                    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
                    data = merged

                    const chEq = await EnquiryQuotes.aggregate([
                        { $match: { user_id: userId } },
                        { $group: { _id: "$status", total: { $sum: 1 } } },
                    ])
                    const chLq = await logistics_quotes.aggregate([
                        { $match: { user_id: userId } },
                        { $group: { _id: "$status", total: { $sum: 1 } } },
                    ])
                    const chartMap = {}
                    for (const row of chEq) {
                        const k = row._id || "unknown"
                        chartMap[k] = (chartMap[k] || 0) + row.total
                    }
                    for (const row of chLq) {
                        const k = row._id || "unknown"
                        chartMap[k] = (chartMap[k] || 0) + row.total
                    }
                    chart = Object.entries(chartMap).map(([_id, total]) => ({ _id, total }))
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
                    data = await JobApplication.find({ canditate_id: userId }).populate('job_id').populate({ path: 'company_id', select: "company_data" }).sort({ createdAt: -1 }).limit(5)
                    chart = await JobApplication.aggregate([
                        {
                            $match: { canditate_id: userId }
                        },
                        {
                            $group: {
                                _id: "$application_status",
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

exports.getClientTestimonial = async (req, res) => {
    try {
        const { offset = 0, limit = 10, search } = req.query
        let filter = {
            view: true
        }
        if (search) {
            filter[`$or`] = [
                {
                    name: { $regex: search, $options: "i" }
                },
                {
                    company_name: { $regex: search, $options: "i" }
                }
            ]
        }
        const newtestimonial = await client_testimonials.find(filter).sort({ createdAt: -1 }).skip(Number(offset)).limit(Number(limit))
        console.log("newtestimonial : ", newtestimonial)

        const count = await client_testimonials.countDocuments(filter)

        return res.status(200).json({
            message: "client testimonial fetched successfully",
            data: newtestimonial,
            count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}