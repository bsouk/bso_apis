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
        const applicants = await job_applications.find({ job_id: id }).populate('canditate_id').sort({ createdAt: -1 })
        console.log('applicants : ', applicants)
        if (Array.isArray(applicants) && applicants.length > 0) {
            const hiredapplicants = applicants.filter(app => app.application_status === 'accepted')
            console.log('hired applicants : ', hiredapplicants)
            if (Array.isArray(hiredapplicants) && hiredapplicants.length > 0) {
                applicants = hiredapplicants
            }
        }
        console.log('applicants : ', applicants)
        return res.status(200).json({
            message: 'job data fetched successfully',
            data: job_data,
            applicants,
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
            filter[`$or`] = [
                {
                    'company_data.name': { $regex: search, $options: "i" }
                },
                {
                    'company_data.email': { $regex: search, $options: "i" }
                }
            ]
        }
        console.log('filter : ', filter)
        const data = await user.aggregate([
            {
                $match: {
                    company_data: { $exists: true, $ne: null, $ne: {} },
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

        const count = await user.countDocuments(
            {
                company_data: { $exists: true }
            },
            filter
        )
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


exports.deleteJobs = async (req, res) => {
    try {
        const { ids } = req.body
        console.log('ids : ', req.body)
        const result = await jobs.deleteMany({ _id: { $in: ids } })
        console.log('deleted jobs : ', result)
        return res.status(200).json({
            message: "Job deleted successfully",
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.editJob = async (req, res) => {
    try {
        const { id } = req.params
        const data = req.body
        console.log('data : ', data)
        const updated_job = await jobs.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(id) }, { $set: data }, { new: true })
        console.log('updated_job : ', updated_job)
        if (!updated_job) {
            return utils.handleError(res, {
                message: "Job not found",
                code: 404,
            });
        }
        return res.status(200).json({
            message: "Job updated successfully",
            data: updated_job,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.getApllicantDetails = async (req, res) => {
    try {
        const { id } = req.params
        const applicant_data = await job_applications.findOne({ _id: new mongoose.Types.ObjectId(id) }).populate('canditate_id').populate('company_id', '_id company_data')
        console.log('applicant_data : ', applicant_data)
        if (!applicant_data) {
            return utils.handleError(res, {
                message: "Applicant data not found",
                code: 404,
            });
        }
        return res.status(200).json({
            message: "Applicant data fetched successfully",
            data: applicant_data,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}
