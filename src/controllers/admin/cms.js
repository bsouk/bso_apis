const FAQ = require("../../models/faq");
const CMS = require("../../models/cms");
const utils = require("../../utils/utils");
const Walkthrough = require("../../models/walkthrough");
const ContactUs = require("../../models/contact_us");
const SupportDetails = require("../../models/support_details")

exports.addFaq = async (req, res) => {
  try {
    const { question, answer } = req.body;

    const faq = new FAQ({ question, answer });
    await faq.save();

    res.json({ message: "FAQ added successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.getFaqList = async (req, res) => {
  try {
    const { limit = 10, offset = 0, search = "" } = req.query;
    const condition = {
      question: { $regex: search, $options: "i" },
      answer: { $regex: search, $options: "i" }
    }

    const faqs = await FAQ.find(condition)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);
    const count = await FAQ.countDocuments(condition);

    res.json({ data: faqs, count: count, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.getSingleFaq = async (req, res) => {
  try {
    const id = req.params.id;
    const faq = await FAQ.findById(id);

    res.json({ data: faq, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.deleteFaq = async (req, res) => {
  try {
    const id = req.params.id;

    const faq = await FAQ.findById(id);
    if (!faq)
      return utils.handleError(res, { message: "FAQ not found", code: 404 });

    await FAQ.findByIdAndDelete(id);

    res.json({ message: "FAQ deleted successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};
exports.editFaq = async (req, res) => {
  try {
    const data = req.body;
    const id = req.params.id;

    await FAQ.findByIdAndUpdate(id, data);

    res.json({ message: "FAQ updated successfully", code: 200 });
  } catch (error) {
    console.log("editFaq");
    utils.handleError(res, error);
  }
};

exports.addCMS = async (req, res) => {
  try {
    const { type, content, images } = req.body;

    if (!["privacy_policy", "terms_and_conditions", "about_us", "support"].includes(type))
      return utils.handleError(res, {
        message: "Please provide valid type",
        code: 400,
      });

    const cmsResp = await CMS.findOne({ type });

    if (cmsResp) {
      await CMS.findByIdAndUpdate(cmsResp._id, { content: content, images: images });
    } else {
      const data = {
        type: type,
        content: content,
        images: images
      };

      const cms = new CMS(data);
      await cms.save();
    }

    res.json({ message: "Content saved successfully", code: 200 });
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
};

exports.getCMS = async (req, res) => {
  try {
    const { type } = req.query;

    if (!["privacy_policy", "terms_and_conditions", "about_us",].includes(type))
      return utils.handleError(res, {
        message: "Please provide valid type",
        code: 400,
      });

    const cmsResp = await CMS.findOne({ type });

    res.json({
      code: 200,
      data: cmsResp ? cmsResp : "",
    });
  } catch (error) {
    console.log("================error", error);
    utils.handleError(res, error);
  }
};

exports.addWalkthrough = async (req, res) => {
  try {
    const { first_screen, second_screen, third_screen } = req.body;

    const isWalkThroughExist = await Walkthrough.findOne({});

    const data = {
      first_screen,
      second_screen,
      third_screen,
    };

    if (isWalkThroughExist) {
      await Walkthrough.findByIdAndUpdate(isWalkThroughExist._id, data);
    } else {
      const walkthrough = new Walkthrough(data);
      await walkthrough.save();
    }

    res.json({ message: "Walkthrough saved successfully", code: 200 });
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
};

exports.getWalkthrough = async (req, res) => {
  try {
    const data = await Walkthrough.findOne({}).sort({ createdAt: -1 });
    res.json({ data: data, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.getContactUs = async (req, res) => {
  try {
    const { limit = 5, offset = 0, search } = req.query;
    const condition = {};

    if (search) {
      condition["$or"] = [
        { full_name: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }


    const count = await ContactUs.aggregate([
      {
        $match: condition,
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 }
        }
      }
    ]);


    const data = await ContactUs.aggregate([
      {
        $match: condition,
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $limit: +limit,
      },
      {
        $skip: +offset,
      },
    ]);

    res.json({ data: data, count: count?.[0]?.count ?? 0, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.getContactUsDetails = async (req, res) => {
  try {
    const data = await SupportDetails.findOne({});
    res.json({ data: data, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
}

exports.addContactUsDetails = async (req, res) => {
  try {
    const { phone_number, email, address } = req.body
    if (!phone_number || !email || !address) return res.json({ message: "Phone number, email and address  are required", code: 400 });
    const supportData = await SupportDetails.findOne({});
    if (supportData) {
      await SupportDetails.updateOne({ _id: supportData._id }, { $set: { phone_number, email, address } });
    } else {
      const data = {
        phone_number,
        email,
        address,
      }
      const saveData = new SupportDetails(data);
      await saveData.save();
    }

    res.json({ message: "Data updated successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
}
