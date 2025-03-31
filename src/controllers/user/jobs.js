const { default: mongoose } = require("mongoose");
const utils = require("../../utils/utils");
const jobs = require("../../models/jobs");
const User = require("../../models/user");
const job_applications = require("../../models/job_applications");

async function generateUniqueId() {
    const id = await Math.floor(Math.random() * 1000000)
    return `#${id}`
}

exports.createJob = async (req, res) => {
    try {
        const userId = req.user._id
        console.log('user id : ', userId)

        const user_data = await User.findOne({ _id: userId })
        console.log("user data : ", user_data)
        if (!user_data.user_type.includes("company")) {
            return utils.handleError(res, {
                message: "Only authorised company can create job",
                code: 404,
            });
        }
        const data = req.body
        const job_id = await generateUniqueId()

        const job_data = {
            ...data,
            job_unique_id: job_id
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
                        from: "company_datas",
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
                                    company_name: 1,
                                    company_logo: 1
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
        const job_data = await jobs.findOne({ _id: id })
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

exports.createJobApplication = async (req, res) => {
    try {
        const userId = req.user._id
        console.log('user id : ', userId)
        const data = req.body
        const application_id = await generateUniqueId()
        const new_application = await job_applications.create({ application_id, ...data })
        console.log('new application : ', new_application)
        return res.status(200).json({
            message: "Job applied successfully",
            data: new_application,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.getappliedJobs = async (req, res) => {
    try {
        const userId = req.user._id
        console.log('user id : ', userId)
        const data = await job_applications.aggregate(
            [
                {
                    $match: {
                        canditate_id: new mongoose.Types.ObjectId(userId)
                    }
                },
                {
                    $lookup: {
                        from: "jobs",
                        let: { id: "$job_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$$id", "$_id"]
                                    }
                                }
                            }
                        ],
                        as: "job_data"
                    }
                },
                {
                    $unwind: {
                        path: "$job_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "company_datas",
                        let: { id: "$job_data.company_id" },
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
                                    company_name: 1,
                                    company_logo: 1
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
                    $project: {
                        job_data: 0
                    }
                }
            ]
        )
        console.log("data : ", data)

        if (!data || data.length === 0) {
            return utils.handleError(res, {
                message: "No job applied yet",
                code: 404,
            });
        }
        return res.status(200).json({
            message: "Applied jobs fetched successfully",
            data,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.acceptApplication = async (req, res) => {
    try {
        const userId = req.user._id
        const user_data = await User.findOne({ _id: userId })
        console.log("user data : ", user_data)

        const { job_application_id, status } = req.body

        if (!user_data.user_type.includes("company")) {
            return utils.handleError(res, {
                message: "Only valid company accept applications",
                code: 404,
            });
        }
        const job_application_data = await job_applications.findOne({ _id: job_application_id, company_id: userId })
        if (!job_application_data) {
            return utils.handleError(res, {
                message: "Job application record not found",
                code: 404,
            });
        }
        const data = await job_applications.findOneAndUpdate(
            { _id: job_application_id, company_id: userId },
            {
                $set: {
                    is_accepted_by_company: (status === true || status === "true") ? true : false
                }
            }, { new: true }
        )

        return res.status(200).json({
            message: "job application accepted successfully",
            data,
            code: 200
        })

    } catch (error) {
        utils.handleError(res, error);
    }
}
