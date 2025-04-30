const { default: mongoose } = require("mongoose");
const utils = require("../../utils/utils");
const jobs = require("../../models/jobs");
const User = require("../../models/user");
const job_applications = require("../../models/job_applications");

async function generateUniqueId() {
    const id = await Math.floor(Math.random() * 1000000)
    return `#${id}`
}
const isFieldPopulated = (obj, path) => {
    console.log("object is ", obj, " and path is ", path)
    const keys = path.split('.');
    console.log("keys is ", keys)
    let current = obj;
    for (let key of keys) {
        console.log("cond is ", current, "key is ", current[key])
        if (!current || !current[key] || current[key] === "" || current[key] === null || current[key] === undefined) {
            return { path, code: false };
        }
        current = current[key];
    }
    return { path, code: true };
};
exports.createJob = async (req, res) => {
    try {
        const userId = req.user._id
        console.log('user id : ', userId)

        const user_data = await User.findOne({ _id: userId })
        console.log("user data : ", user_data)
        if (!user_data.company_data) {
            return utils.handleError(res, {
                message: "Only authorised company can create job",
                code: 404,
            });
        }

        const requiredFields = [
            'company_data.name',
            'company_data.business_category',
            'company_data.phone_number',
            'company_data.name',
            'company_data.registration_number',
            'company_data.incorporation_date',
            'company_data.vat_number',
            'company_data.business_category',
            'company_data.phone_number',
            'company_data.email',
            'company_data.address.line1',
            'company_data.address.city',
            'company_data.address.state',
            'company_data.address.zip_code',
            'company_data.address.country',
        ];

        const checkResults = requiredFields.map(field => isFieldPopulated(user_data, field));
        const incompleteFields = checkResults.filter(result => result.code === false);

        if (incompleteFields.length > 0) {
            const missingPaths = incompleteFields.map(f => f.path);
            return utils.handleError(res, {
                message: `Please complete your company profile. Missing fields: ${missingPaths.join(', ')}`,
                code: 400,
            });
        }

        const data = req.body
        const job_id = await generateUniqueId()

        const job_data = {
            ...data,
            job_unique_id: job_id,
            company_id: user_data._id,
            status: 'active'
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

exports.createJobApplication = async (req, res) => {
    try {
        const userId = req.user._id
        console.log('user id : ', userId)
        const data = req.body
        const jobdata = await jobs.findOne({ _id: data.job_id })
        console.log('job data : ', jobdata)
        const application_id = await generateUniqueId()
        const new_application = await job_applications.create({ application_id, ...data, company_id: jobdata.company_id, canditate_id: userId, status: 'active' })
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


exports.getCompanyPostedJobs = async (req, res) => {
    try {
        const userId = req.user._id
        console.log('user id : ', userId)
        const { offset = 0, limit = 10, search, job_type, industry_id } = req.query
        let filter = {
            company_id: new mongoose.Types.ObjectId(userId)
        }
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


exports.getJobAppliedResources = async (req, res) => {
    try {
        const companyId = req.user._id
        console.log('company id : ', companyId)
        const { job_id, offset = 0, limit = 10 } = req.query
        const job_data = await jobs.findOne({ _id: job_id, company_id: companyId })
        console.log('job data : ', job_data)
        if (!job_data) {
            return utils.handleError(res, {
                message: "Job data not found",
                code: 404,
            });
        }
        const applicants = await job_applications.find({ job_id, company_id: companyId }).populate('canditate_id').sort({ createdAt: -1 }).skip(parseInt(offset)).limit(parseInt(limit))
        const count = await job_applications.countDocuments({ job_id, company_id: companyId })
        if (!applicants || applicants.length === 0) {
            return utils.handleError(res, {
                message: "No record found",
                code: 404,
            });
        }
        return res.status(200).json({
            message: "resources fetched successfully",
            data: applicants,
            count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}