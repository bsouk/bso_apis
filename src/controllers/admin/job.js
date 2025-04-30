const { default: mongoose } = require("mongoose");
const utils = require("../../utils/utils");
const jobs = require("../../models/jobs");
const User = require("../../models/user");
const job_applications = require("../../models/job_applications");
const industry_type = require("../../models/industry_type");
const industry_sub_type = require("../../models/industry_sub_type");
const user = require("../../models/user");

async function generateUniqueId() {
    const id = await Math.floor(Math.random() * 1000000)
    return `#${id}`
}

exports.createJob = async (req, res) => {
    try {
        const data = req.body
        const job_id = await generateUniqueId()

        const job_data = {
            ...data,
            job_unique_id: job_id,
            status: 'active',
            created_by: "admin",
        }

        const new_job = await jobs.create(job_data)
        console.log("new job : ", new_job)
        return res.status(200).json({
            message: "Job created successfully",
            data: new_job,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.getJobs = async (req, res) => {
    try {
        const { offset = 0, limit = 10, search, job_type, industry_id } = req.query
        let filter = {}
        if (search) {
            filter.job_title = { $regex: search, $options: "i" }
        }
        if (job_type) {
            filter.job_type = job_type
        }
        if (industry_id) {
            filter.job_category = industry_id
        }
        const jobs_data = await jobs.aggregate(
            [
                {
                    $match: filter
                },
                {
                    $lookup: {
                        from: "users",
                        let: { id: "$company_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$$id", "$_id"]
                                    }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    company_data: 1
                                }
                            }
                        ],
                        as: "company_data"
                    }
                },
                {
                    $unwind: {
                        path: "$company_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $addFields: {
                        company: "$company_data.company_data"
                    }
                },
                {
                    $project: {
                        company_data: 0
                    }
                },
                {
                    $sort: {
                        createdAt: -1
                    }
                },
                {
                    $skip: parseInt(offset)
                },
                {
                    $limit: parseInt(limit)
                }
            ]
        )
        console.log('jobs : ', jobs_data)
        const count = await jobs.countDocuments(filter)

        return res.status(200).json({
            message: "jobs fetched successfully",
            data: jobs_data,
            count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.getJobData = async (req, res) => {
    try {
        const { id } = req.params
        console.log('id : ', id)
        const job_data = await jobs.findOne({ _id: id }).populate('company_id', 'company_data')
        console.log('job data : ', job_data)
        if (!job_data) {
            return utils.handleError(res, {
                message: "Job data not found",
                code: 404,
            });
        }
        return res.status(200).json({
            message: 'job data fetched successfully',
            data: job_data,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}



exports.getIndustryTypes = async (req, res) => {
    try {
        const { search, offset = 0, limit = 10 } = req.query
        let filter = {}
        if (search) {
            filter.name = { $regex: search, $options: "i" }
        }
        const data = await industry_type.aggregate([
            {
                $match: filter
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $skip: parseInt(offset) || 0
            },
            {
                $limit: parseInt(limit) || 10
            }
        ])

        const count = await industry_type.countDocuments(filter)
        res.status(200).json({
            message: "Industry category fetched successfully",
            data,
            count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}



exports.getIndustrySubTypes = async (req, res) => {
    try {
        const { id } = req.params
        const { search, offset = 0, limit = 10 } = req.query
        let filter = {
            parent_category: new mongoose.Types.ObjectId(id)
        }
        if (search) {
            filter.name = { $regex: search, $options: "i" }
        }
        const data = await industry_sub_type.aggregate([
            {
                $match: filter
            },
            // {
            //     $lookup: {
            //         from: "industry_types",
            //         localField: "parent_category",
            //         foreignField: "_id",
            //         as: "parent_category",
            //         pipeline: [
            //             {
            //                 $project: {
            //                     name: 1
            //                 }
            //             }
            //         ]
            //     }
            // },
            // {
            //     $unwind: "$parent_category"
            // },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $skip: parseInt(offset) || 0
            },
            {
                $limit: parseInt(limit) || 10
            }
        ])

        const count = await industry_sub_type.countDocuments(filter)
        res.status(200).json({
            message: "Industry sub category fetched successfully",
            data,
            count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.getCompanyListing = async (req, res) => {
    try {
        const { search, offset = 0, limit = 10 } = req.query
        let filter = {}
        if (search) {
            filter[`or`] = [
                {
                    'company_data.name': { $regex: search, $options: "i" }
                },
                {
                    'company_data.email': { $regex: search, $options: "i" }
                }
            ]
        }
        const data = await user.aggregate([
            {
                $match: {
                    company_data: { $exists: true }
                }
            },
            {
                $match: filter
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $project: {
                    company_data: 1,
                    _id: 1
                }
            },
            {
                $skip: parseInt(offset) || 0
            },
            {
                $limit: parseInt(limit) || 10
            }
        ])

        const count = await user.countDocuments(filter)
        res.status(200).json({
            message: "Company data fetched successfully",
            data,
            count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}