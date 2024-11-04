const FAQ = require("../../models/faq");
const CMS = require("../../models/cms");
const SupportDetail = require("../../models/support_details")
const ContactUs = require('../../models/contact_us')

const utils = require("../../utils/utils");

exports.getCMS = async (req, res) => {
  try {
    const { type } = req.query;

    if (!["privacy_policy", "terms_and_conditions", "about_us", "cookie_policy"].includes(type))
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
    const { email, full_name, message } = req.body;
    // const user_id = req.user._id

    const data = {
      // user_id,
      email,
      full_name,
      message
    }

    const contactUs = await ContactUs(data);
    await contactUs.save();

    res.json({ message: "Thank you for reaching out to us. We have received your message and will get back to you soon", code: 200 })
  } catch (error) {
    utils.handleError(res, error);
  }
}