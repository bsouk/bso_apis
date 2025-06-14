const { default: mongoose } = require("mongoose");
const utils = require("../../utils/utils");
const jobs = require("../../models/jobs");
const User = require("../../models/user");
const job_applications = require("../../models/job_applications");
const saved_job = require("../../models/saved_job");
const saved_resources = require("../../models/saved_resources");
const fcm_devices = require("../../models/fcm_devices");
const Notification = require("../../models/notification")
const Subscription = require("../../models/subscription")
const moment = require("moment");
const emailer = require("../../utils/emailer");

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
        const data = req.body
        console.log('data : ', data)

        const user_data = await User.findOne({ _id: userId })
        console.log("user data : ", user_data)
        if (!user_data.company_data) {
            return utils.handleError(res, {
                message: "Only authorised company can create job",
                code: 404,
            });
        }

        const activeSubscription = await Subscription.findOne({ user_id: new mongoose.Types.ObjectId(userId), status: "active", type: "recruiter" });
        console.log("activeSubscription : ", activeSubscription)

        if (!activeSubscription) {
            return utils.handleError(res, {
                message: "No subscription found",
                code: 400,
            });
        }

        const requiredFields = [
            'company_data.name',
            'company_data.registration_number',
            'company_data.incorporation_date',
            'company_data.vat_number',
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
        const { offset = 0, limit = 10, search, job_type, industry_id, skills, location } = req.query
        let filter = {}
        if (search) {
            filter.job_title = { $regex: search, $options: "i" }
        }
        if (job_type) {
            filter.job_type = job_type
        }
        if (industry_id) {
            filter.job_category = { $in: industry_id }
        }
        if (skills) {
            filter.skills = { $in: skills }
        }
        if (location) {
            filter['$or'] = [
                { 'office_address.address_line_1': { $regex: location, $options: "i" } },
                { 'office_address.city': { $regex: location, $options: "i" } },
                { 'office_address.pincode': { $regex: location, $options: "i" } },
            ]
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
        const user_id = req.user._id
        const { id } = req.params
        console.log('id : ', id, " user id : ", user_id)
        const job_data = await jobs.findOne({ _id: id }).populate('company_id', 'company_data')
        console.log('job data : ', job_data)
        const saved_job_data = await saved_job.findOne({ candidate_id: user_id, job_id: id })
        console.log('saved job data : ', saved_job_data)
        const application = await job_applications.findOne({ job_id: id, canditate_id: user_id })
        console.log('application : ', application)
        if (!job_data) {
            return utils.handleError(res, {
                message: "Job data not found",
                code: 404,
            });
        }
        return res.status(200).json({
            message: 'job data fetched successfully',
            data: job_data,
            application: application,
            saved_status: saved_job_data?.status ? saved_job_data?.status : 'unsaved',
            application_status: application?.status ? "applied" : 'unapplied',
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.createJobApplication = async (req, res) => {
    try {
        const userId = req.user._id
        console.log('user data : ', req.user)
        // if (!req?.user?.user_type?.includes('resource')) {
        //     return utils.handleError(res, {
        //         message: "Only resource user can apply for a job",
        //         code: 403,
        //     });
        // }
        const data = req.body
        const jobdata = await jobs.findOne({ _id: data.job_id }).populate('company_id')
        console.log('job data : ', jobdata)

        const check = await job_applications.findOne({ job_id: data.job_id, canditate_id: userId, company_id: jobdata?.company_id?._id })
        console.log('check : ', check)
        if (check) {
            return utils.handleError(res, {
                message: "You have already applied for this job",
                code: 400,
            });
        }

        const application_id = await generateUniqueId()
        const new_application = await job_applications.create({ application_id, ...data, company_id: jobdata?.company_id?._id, canditate_id: userId, status: 'active' })
        console.log('new application : ', new_application)


        if (jobdata.get_individual_email) {
            //send notification 
            const mailOptions = {
                to: jobdata?.email,
                subject: "New Application Notification - Blue Sky",
                recruiter_name: jobdata?.company_id?.company_data?.name,
                job_title: jobdata?.job_title,
                applicant_name: req?.user?.full_name,
                applicant_email: req?.user?.email,
                applicant_phone: req?.user?.phone_number,
                application_date: moment(new Date()).format('DD-MM-YYYY'),
                portal_url: `${process.env.APP_URL}/freelance-profile/${new_application?.canditate_id}`,
            }
            emailer.sendEmail(null, mailOptions, "jobapplicationNotification");
            //send notification
            const notificationMessage = {
                title: 'New Application Notification',
                description: `${req.user?.full_name} has applied for ${jobdata?.job_title} job ${jobdata?.job_unique_id}`,
                job_application: new_application?._id
            };

            const fcm = await fcm_devices.find({ user_id: jobdata?.company_id?._id });
            console.log("fcm : ", fcm)

            if (fcm && fcm.length > 0) {
                fcm.forEach(async i => {
                    const token = i.token
                    console.log("token : ", token)
                    await utils.sendNotification(token, notificationMessage);
                })
                const NotificationData = {
                    title: notificationMessage.title,
                    // body: notificationMessage.description,
                    description: notificationMessage.description,
                    type: "new_job_application",
                    receiver_id: jobdata?.company_id?._id,
                    related_to: jobdata?.company_id?._id,
                    related_to_type: "company",
                };
                const newNotification = new Notification(NotificationData);
                console.log("newNotification : ", newNotification)
                await newNotification.save();
            }

        }

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

        let { offset = 0, limit = 10, skills, job_type, industries, search = "", location } = req.query
        console.log("req.query : ", req.query)
        let newfilter = {};

        if (search) {
            newfilter["job_data.job_title"] = { $regex: search, $options: "i" };
        }
        if (skills) {
            skills = JSON.parse(skills);
            newfilter["job_data.skills"] = { $in: skills };
        }
        if (job_type) {
            job_type = JSON.parse(job_type);
            newfilter["job_data.job_type"] = { $in: job_type };
        }
        if (industries) {
            industries = JSON.parse(industries);
            newfilter["job_data.job_category_data.name"] = { $in: industries };
        }
        if (location) {
            newfilter['$or'] = [
                { 'job_data.office_address.address_line_1': { $regex: location, $options: "i" } },
                { 'job_data.office_address.city': { $regex: location, $options: "i" } },
                { 'job_data.office_address.pincode': { $regex: location, $options: "i" } },
            ]
        }
        console.log("new filter : ", newfilter)

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
                            },
                            {
                                $lookup: {
                                    from: "industry_types",
                                    localField: "job_category",
                                    foreignField: "_id",
                                    as: "job_category_data"
                                }
                            },
                            {
                                $unwind: {
                                    path: "$job_category_data",
                                    preserveNullAndEmptyArrays: true
                                }
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
                                                company_data: 1,
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
                    $match: newfilter
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
        console.log("data : ", data)

        // if (!data) {
        //     return utils.handleError(res, {
        //         message: "No job data found",
        //         code: 404,
        //     });
        // }
        // if (data.length === 0) {
        //     return res.status(200).json({
        //         message: "No job applied yet",
        //         data: [],
        //         success: true,
        //     });
        // }
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

        if (!user_data.company_data) {
            return utils.handleError(res, {
                message: "Only authorised company can accept job",
                code: 404,
            });
        }

        const activeSubscription = await Subscription.findOne({ user_id: new mongoose.Types.ObjectId(userId), status: "active", type: "recruiter" });
        console.log("activeSubscription : ", activeSubscription)

        if (!activeSubscription) {
            return utils.handleError(res, {
                message: "No subscription found",
                code: 400,
            });
        }

        const requiredFields = [
            'company_data.name',
            'company_data.registration_number',
            'company_data.incorporation_date',
            'company_data.vat_number',
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

        const job_application_data = await job_applications.findOne({ _id: job_application_id, company_id: userId }).populate('canditate_id').populate('job_id')
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
                    is_accepted_by_company: (status === true || status === "true") ? true : false,
                    application_status: status === true || status === "true" ? "accepted" : "rejected",
                }
            }, { new: true }
        )


        //notification
        const mailOptions = {
            to: job_application_data?.canditate_id?.email,
            subject: "Application Status - Blue Sky Careers",
            applicant_name: job_application_data?.canditate_id?.full_name,
            portal_url: `${process.env.APP_URL}/job-details/${job_application_data?.job_id?._id}`,
            job_title: job_application_data?.job_id?.title,
            status: status === true || status === "true" ? "shortlisted" : "rejected",
            application_id: job_application_data?.application_id,
        }
        emailer.sendEmail(null, mailOptions, "jobsStatus");
        //send notification
        const notificationMessage = {
            title: `Application ${status === true || status === "true" ? "shortlisted" : "rejected"} - Blue Sky Careers`,
            description: `${job_application_data?.canditate_id?.full_name} your accplication has been ${status === true || status === "true" ? "shortlisted" : "rejected"} for ${job_application_data?.job_id?.job_title}.`,
            user_id: job_application_data?.canditate_id?._id
        };

        const fcm = await fcm_devices.find({ user_id: job_application_data?.canditate_id?._id });
        console.log("fcm : ", fcm)

        if (fcm && fcm.length > 0) {
            fcm.forEach(async i => {
                const token = i.token
                console.log("token : ", token)
                await utils.sendNotification(token, notificationMessage);
            })
            const NotificationData = {
                title: notificationMessage.title,
                // body: notificationMessage.description,
                description: notificationMessage.description,
                type: "job_status",
                receiver_id: SuspendedMember?._id,
                related_to: SuspendedMember?._id,
                related_to_type: "user",
            };
            const newNotification = new Notification(NotificationData);
            console.log("newNotification : ", newNotification)
            await newNotification.save();
        }

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
        const { offset = 0, limit = 10, search, job_type, industry_id, skills, location } = req.query
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
            filter.job_category = { $in: JSON.parse(industry_id) };
        }
        if (skills) {
            skills = JSON.parse(skills);
            filter.skills = { $in: skills }
        }
        // if (location) {
        //     filter.location = { $regex: location, $options: "i" };
        // }
        if (location) {
            filter['$or'] = [
                { 'office_address.address_line_1': { $regex: location, $options: "i" } },
                { 'office_address.city': { $regex: location, $options: "i" } },
                { 'office_address.pincode': { $regex: location, $options: "i" } },
            ]
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
        if (!job_id) {
            return utils.handleError(res, {
                message: "Job id is required",
                code: 400,
            });
        }
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
        // if (!applicants || applicants.length === 0) {
        //     return utils.handleError(res, {
        //         message: "No record found",
        //         code: 404,
        //     });
        // }
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


exports.saveUnsavedJobs = async (req, res) => {
    try {
        const userId = req.user._id
        console.log('user id : ', userId)
        const { job_id } = req.body
        if (!job_id) {
            return utils.handleError(res, {
                message: "Job id is required",
                code: 400,
            });
        }
        let job_data = await saved_job.findOne({ job_id, candidate_id: userId })
        if (!job_data) {
            job_data = await saved_job.create({
                job_id,
                candidate_id: userId,
                status: "saved"
            })
            return res.status(200).json({
                message: "Job saved successfully",
                data: job_data,
                code: 200
            })
        } else {
            if (job_data && job_data.status === "saved") {
                job_data.status = "unsaved"
                await job_data.save()
            } else {
                job_data.status = "saved"
                await job_data.save()
            }
            return res.status(200).json({
                message: "Job status updated successfully",
                data: job_data,
                code: 200
            })
        }
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.getSavedJobs = async (req, res) => {
    try {
        const userId = req.user._id
        console.log('user id : ', userId)
        let { offset = 0, limit = 10, skills, job_type, industries, search = "", location } = req.query
        console.log("req.query : ", req.query)
        let filter = {
            candidate_id: userId, status: "saved"
        }
        let newfilter = {};

        if (search) {
            newfilter["job_data.job_title"] = { $regex: search, $options: "i" };
        }
        if (skills) {
            skills = JSON.parse(skills);
            newfilter["job_data.skills"] = { $in: skills };
        }
        if (job_type) {
            job_type = JSON.parse(job_type);
            newfilter["job_data.job_type"] = { $in: job_type };
        }
        if (industries) {
            industries = JSON.parse(industries);
            newfilter["job_data.job_category_data.name"] = { $in: industries };
        }
        if (location) {
            newfilter["job_data.location"] = { $regex: location, $options: "i" };
        }
        console.log('filter : ', filter, "new filter : ", newfilter)
        const data = await saved_job.aggregate(
            [
                {
                    $match: filter
                },
                {
                    $lookup: {
                        from: "jobs",
                        localField: "job_id",
                        foreignField: "_id",
                        as: "job_data",
                        pipeline: [
                            {
                                $lookup: {
                                    from: "industry_types",
                                    localField: "job_category",
                                    foreignField: "_id",
                                    as: "job_category_data"
                                }
                            },
                            {
                                $unwind: {
                                    path: "$job_category_data",
                                    preserveNullAndEmptyArrays: true
                                }
                            },
                            {
                                $lookup: {
                                    from: "users",
                                    localField: "company_id",
                                    foreignField: "_id",
                                    as: "company_data",
                                    pipeline: [
                                        {
                                            $project: {
                                                company_data: 1,
                                            }
                                        }
                                    ]
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
                                    'company': "$company_data.company_data"
                                }
                            },
                            {
                                $project: {
                                    company_data: 0
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: {
                        path: "$job_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $addFields: {
                        job: "$job_data"
                    }
                },
                {
                    $match: newfilter
                },
                {
                    $project: {
                        job_data: 0
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
        console.log('data : ', data)
        const count = await saved_job.countDocuments({ candidate_id: userId, status: "saved" })
        // if (!data || data.length === 0) {
        //     return utils.handleError(res, {
        //         message: "No saved jobs found",
        //         code: 404,
        //     });
        // }
        return res.status(200).json({
            message: "Saved jobs fetched successfully",
            data,
            count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}



//save unsave resources
exports.saveUnsavedResources = async (req, res) => {
    try {
        const companyId = req.user._id
        console.log('company id : ', companyId)

        const user_data = await User.findOne({ _id: companyId })
        console.log("user data : ", user_data)
        if (!user_data.company_data) {
            return utils.handleError(res, {
                message: "Only authorised company can save resources",
                code: 404,
            });
        }

        const requiredFields = [
            'company_data.name',
            'company_data.registration_number',
            'company_data.incorporation_date',
            'company_data.vat_number',
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

        const { candidate_id } = req.body
        if (!candidate_id) {
            return utils.handleError(res, {
                message: "Candidate id is required",
                code: 400,
            });
        }
        let saved_data = await saved_resources.findOne({ company_id: companyId, candidate_id: candidate_id })
        if (!saved_data) {
            saved_data = await saved_resources.create({
                ...req.body,
                status: "saved",
                company_id: companyId,
            })
            return res.status(200).json({
                message: "Resource saved successfully",
                data: saved_data,
                code: 200
            })
        } else {
            if (saved_data && saved_data.status === "saved") {
                saved_data.status = "unsaved"
                await saved_data.save()
            } else {
                saved_data.status = "saved"
                await saved_data.save()
            }
            return res.status(200).json({
                message: "Resource status updated successfully",
                data: saved_data,
                code: 200
            })
        }
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.getSavedResources = async (req, res) => {
    try {
        const companyId = req.user._id
        console.log('company id : ', companyId)
        let { offset = 0, limit = 10, skills, search = "" } = req.query
        console.log("req.query : ", req.query)
        let filter = {
            company_id: companyId, status: "saved"
        }
        let newfilter = {};

        if (search) {
            newfilter["$or"] = [
                {
                    full_name: { $regex: search, $options: "i" },
                    email: { $regex: search, $options: "i" }
                }
            ];
        }
        if (skills) {
            skills = JSON.parse(skills);
            newfilter["skills"] = { $in: skills };
        }
        console.log('filter : ', filter, "new filter : ", newfilter)
        const data = await saved_resources.aggregate(
            [
                {
                    $match: {
                        ...filter,
                        ...newfilter
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "candidate_id",
                        foreignField: "_id",
                        as: "candidate_data"
                    }
                },
                {
                    $unwind: {
                        path: "$candidate_data",
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
        console.log('data : ', data)
        const count = await saved_resources.countDocuments({
            ...filter,
            ...newfilter
        })
        // if (!data || data.length === 0) {
        //     return utils.handleError(res, {
        //         message: "No saved jobs found",
        //         code: 404,
        //     });
        // }
        return res.status(200).json({
            message: "Saved resources fetched successfully",
            data,
            count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}



exports.getAppliedApplicantDetails = async (req, res) => {
    try {
        const application_id = req.params.id
        console.log('application id : ', application_id)
        const data = await job_applications.findOne({ _id: application_id }).populate('canditate_id').populate('company_id', '_id company_data')
        console.log('data : ', data)
        return res.status(200).json({
            message: "Applied applicant details fetched successfully",
            data,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}



exports.getJobHiredResources = async (req, res) => {
    try {
        const companyId = req.user._id
        console.log('company id : ', companyId)
        const { job_id } = req.params
        const { offset = 0, limit = 10 } = req.query
        if (!job_id) {
            return utils.handleError(res, {
                message: "Job id is required",
                code: 400,
            });
        }
        const job_data = await jobs.findOne({ _id: job_id, company_id: companyId })
        console.log('job data : ', job_data)
        if (!job_data) {
            return utils.handleError(res, {
                message: "Job data not found",
                code: 404,
            });
        }
        const applicants = await job_applications.find({ job_id, company_id: companyId, is_accepted_by_company: true, application_status: "accepted" }).populate('canditate_id').sort({ createdAt: -1 }).skip(parseInt(offset)).limit(parseInt(limit))
        const count = await job_applications.countDocuments({ job_id, company_id: companyId, is_accepted_by_company: true, application_status: "accepted" })
        // if (!applicants || applicants.length === 0) {
        //     return utils.handleError(res, {
        //         message: "No record found",
        //         code: 404,
        //     });
        // }
        return res.status(200).json({
            message: "Hired resources fetched successfully",
            data: applicants,
            count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.getAllJobHiredResources = async (req, res) => {
    try {
        const companyId = req.user._id
        console.log('company id : ', companyId)
        const { offset = 0, limit = 10 } = req.query
        const applicants = await job_applications.aggregate([
            {
                $match: {
                    company_id: new mongoose.Types.ObjectId(companyId), is_accepted_by_company: true, application_status: "accepted"
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'canditate_id',
                    foreignField: '_id',
                    as: 'candidate_id'
                }
            },
            {
                $lookup: {
                    from: 'ratings',
                    localField: 'canditate_id',
                    foreignField: 'user_id',
                    as: 'company_rating'
                }
            },
            {
                $unwind: {
                    path: "$candidate_id",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: "$company_rating",
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
        ])

        // find({ company_id: companyId, is_accepted_by_company: true, application_status: "accepted" }).populate('canditate_id').sort({ createdAt: -1 }).skip(parseInt(offset)).limit(parseInt(limit))
        const count = await job_applications.countDocuments({ company_id: companyId, is_accepted_by_company: true, application_status: "accepted" })
        return res.status(200).json({
            message: "Hired resources fetched successfully",
            data: applicants,
            count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.editJob = async (req, res) => {
    try {
        const companyId = req.user._id
        console.log("company is : ", companyId)
        const data = req.body
        console.log('data : ', data)

        const activeSubscription = await Subscription.findOne({ user_id: new mongoose.Types.ObjectId(companyId), status: "active", type: "recruiter" });
        console.log("activeSubscription : ", activeSubscription)

        if (!activeSubscription) {
            return utils.handleError(res, {
                message: "No subscription found",
                code: 400,
            });
        }

        const jobdata = await jobs.findOne({ _id: new mongoose.Types.ObjectId(data.id), company_id: new mongoose.Types.ObjectId(companyId) })
        console.log("jobdata : ", jobdata)
        if (!jobdata) {
            return utils.handleError(res, {
                message: "Authorised Company can edit this job",
                code: 404,
            });
        }
        const updated_job = await jobs.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(data.id), company_id: new mongoose.Types.ObjectId(companyId) }, { $set: data }, { new: true })
        console.log('updated_job : ', updated_job)

        const applicantsid = await job_applications.find({ job_id: new mongoose.Types.ObjectId(data.id) })
        console.log("applicantsid : ", applicantsid)

        applicantsid.forEach(async i => {
            const token = await fcm_devices.find({ user_id: new mongoose.Types.ObjectId(i.canditate_id) })
            console.log("token : ", token)

            let notificationMessage = {
                title: "Job data updated",
                description: `${jobdata?.job_unique_id} has been updated by ${req?.user?.company_data?.name}`
            }
            let dbnotificationbody = {
                title: "Job data updated",
                description: `${jobdata?.job_unique_id} has been updated by ${req?.user?.company_data?.name}`,
                type: "job_updated",
                receiver_id: i.canditate_id,
                related_to: data.id,
                related_to_type: "job",
            }

            token.forEach(async i => {
                const token = i.token
                console.log("token : ", token)
                await utils.sendNotification(token, notificationMessage);
            })
            const newuserNotification = new Notification(dbnotificationbody);
            console.log("newuserNotification : ", newuserNotification)
            await newuserNotification.save();
        })

        return res.status(200).json({
            message: "Job updated successfully",
            data: updated_job,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}