const FAQ = require("../../models/faq");
const CMS = require("../../models/cms");
const SupportDetail = require("../../models/support_details");
const ContactUs = require('../../models/contact_us');
const Walkthrough = require("../../models/walkthrough");
const client_testimonials = require("../../models/client_testimonials");
const emailer = require("../../utils/emailer");

const utils = require("../../utils/utils");

exports.getCMS = async (req, res) => {
  try {
    const { type } = req.query;

    if (!['privacy_policy', 'terms_and_conditions', 'about_us', "support", "quality_procedures", "health_and_safety_procedures", "anti_corruption_policy", "environmental_policy", "declaration"].includes(type))
      return utils.handleError(res, {
        message: "Please provide valid type",
        code: 400,
      });

    const cmsResp = await CMS.findOne({ type });

    res.json({
      code: 200,
      content: cmsResp,
    });

  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.getFAQ = async (req, res) => {
  try {
    const faqResp = await FAQ.find().sort({ createdAt: -1 });
    res.json({
      code: 200,
      data: faqResp,
    });
  } catch (error) {
    console.log("================error", error);
    utils.handleError(res, error);
  }
};

exports.getContactUsDetails = async (req, res) => {
  try {
    const data = await SupportDetail.findOne({});
    res.json({ data: data, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
}

exports.contactUs = async (req, res) => {
  try {
    const { email, full_name, message, phone_number, subject } = req.body;

    const data = {
      email,
      full_name,
      message,
      phone_number,
      subject
    };

    const contactUs = await ContactUs(data);
    await contactUs.save();

    const submittedAt = contactUs.createdAt
      ? new Date(contactUs.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
      : new Date().toLocaleString();

    // Send confirmation email to the user
    try {
      await emailer.sendEmail(null, {
        to: email,
        subject: `We received your message – ${subject || 'Contact enquiry'}`,
        full_name: full_name || 'Customer',
        message_subject: subject || '',
        message: message || '',
        submitted_at: submittedAt,
      }, 'ContactFormConfirmationToUser');
    } catch (emailErr) {
      console.error('Contact form: failed to send confirmation email to user:', emailErr?.message || emailErr);
    }

    // Send notification email to admin (support email from settings or env)
    try {
      const supportData = await SupportDetail.findOne({}).lean();
      const adminEmail = supportData?.email || process.env.SUPPORT_EMAIL || process.env.EMAIL;
      if (adminEmail) {
        await emailer.sendEmail(null, {
          to: adminEmail,
          subject: `[Contact Us] New message from ${full_name || email} – ${subject || 'No subject'}`,
          full_name: full_name || '—',
          email: email || '—',
          phone_number: phone_number || '—',
          message_subject: subject || '—',
          message: message || '—',
          submitted_at: submittedAt,
        }, 'ContactFormSubmissionToAdmin');
      }
    } catch (emailErr) {
      console.error('Contact form: failed to send notification email to admin:', emailErr?.message || emailErr);
    }

    res.json({ message: "Thank you for reaching out to us. We have received your message and will get back to you soon", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.contactUsList = async (req, res) => {
  try {
    const data = await ContactUs.find();
    console.log("data is ", data)
    res.status(200).json({
      success: true,
      message: "Contact Us data fetched successfully",
      data: data,
      code: 200
    })
  } catch (error) {
    utils.handleError(res, error);
  }
}

exports.getWalkthrough = async (req, res) => {
  try {
    const data = await Walkthrough.findOne({}).sort({ createdAt: -1 });
    res.json({ data: data, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};


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
