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
        if (user_data.user_type !== 'company') {
            return utils.handleError(res, {
                message: "Only authorised company can create job",
                code: 404,
            });
        }
        const data = req.body
        const job_id = await generateUniqueJobId()

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
        /*
        jobs.find(filter).sort({ createdAt: -1 }).skip(parseInt(offset)).limit(parseInt(limit))
        */
        const jobs_data = await jobs.aggregate(
            [
                {
                    $match : filter
                },
                {
                    $lookup
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
        const data = await job_applications.find({ canditate_id: userId })
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

