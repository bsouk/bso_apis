const { default: mongoose } = require("mongoose");
const utils = require("../../utils/utils");
const jobs = require("../../models/jobs");
const User = require("../../models/user")

async function generateUniqueJobId() {
    const id = await Math.floor(Math.random() * 1000000)
    return `#${id}`
}

exports.createJob = async (req, res) => {
    try {
        const userId = req.user._id
        console.log('user id : ', userId)

        const user_data = await User.findOne({ _id: userId })
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