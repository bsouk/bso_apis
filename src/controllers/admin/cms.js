const FAQ = require("../../models/faq");
const CMS = require("../../models/cms");
const utils = require("../../utils/utils");
const Walkthrough = require("../../models/walkthrough");
const mongoose = require("mongoose");
const ContactUs = require("../../models/contact_us");
const SupportDetails = require("../../models/support_details");
const { response } = require("express");
const payment_terms = require("../../models/payment_terms");
const client_testimonials = require("../../models/client_testimonials");

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

    if (!["privacy_policy", "terms_and_conditions", "about_us", "support", "quality_procedures", "health_and_safety_procedures", "anti_corruption_policy", "environmental_policy"].includes(type))
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

    if (!["privacy_policy", "terms_and_conditions", "about_us", "support", "quality_procedures", "health_and_safety_procedures", "anti_corruption_policy", "environmental_policy"].includes(type))
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
        $skip: +offset,
      },
      {
        $limit: +limit,
      },
    ]);

    res.json({ data: data, count: count?.[0]?.count ?? 0, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};
exports.queryReply = async (req, res) => {
  try {
    const data = await ContactUs.findById(req.body.id);
    if (!data) return res.json({ message: "Query not found", code: 404 });
    await data.updateOne({ $set: { reply: req.body.reply, status: 'Replied' } });
    await data.save();
    return res.json({ code: 200, message: 'Your reply for query has been sent successfully' })
  } catch (error) {
    utils.handleError(res, error);
  }
};
exports.deleteQuery = async (req, res) => {
  try {
    await ContactUs.findByIdAndDelete(req.params.id);
    return res.json({ message: "Query deleted successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
}
exports.changeQueryStatus = async (req, res) => {
  try {
    const data = await ContactUs.findByIdAndUpdate(req.body.id, {
      $set: {
        status: req.body.status
      }
    });
    if (!data) {
      return utils.handleError(res, {
        message: "Query Not Found",
        code: 404,
      });
    }
    return res.status(200).json({
      message: "Status updated successfully",
      code: 200
    })
  } catch (error) {
    utils.handleError(res, error);
  }
}
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


exports.addPaymentTerm = async (req, res) => {
  try {
    const data = req.body
    console.log("data : ", data)

    const newterms = await payment_terms.create(data)
    console.log("newterms : ", newterms)

    return res.status(200).json({
      message: "Payment terms added successfully",
      data: newterms,
      code: 200
    })
  } catch (error) {
    utils.handleError(res, error);
  }
}

exports.editPaymentTerm = async (req, res) => {
  try {
    const data = req.body
    console.log("data : ", data)

    const updatedata = await payment_terms.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(data.id) }, { $set: data }, { new: true })
    console.log("updatedata : ", updatedata)

    if (!updatedata) {
      return utils.handleError(res, { message: "data not found", code: 404 });
    }

    return res.status(200).json({
      message: "Payment terms edited successfully",
      data: updatedata,
      code: 200
    })
  } catch (error) {
    utils.handleError(res, error);
  }
}

exports.getPaymentTerms = async (req, res) => {
  try {
    const { offset = 0, limit = 10, search } = req.query
    let filter = {}

    if (search) {
      filter.name = new RegExp(search, 'i')
    }
    const data = await payment_terms.find(filter).sort({ createdAt: -1 }).skip(Number(offset)).limit(Number(limit))
    const count = await payment_terms.countDocuments(filter)
    console.log("data : ", data)
    return res.status(200).json({
      message: "Payment terms fetched successfully",
      data,
      count,
      code: 200
    })
  } catch (error) {
    utils.handleError(res, error);
  }
}


exports.deletePaymentTerm = async (req, res) => {
  try {
    const { id } = req.params
    console.log("id : ", id)

    const deletedata = await payment_terms.findOneAndDelete({ _id: new mongoose.Types.ObjectId(id) })
    console.log("deletedata : ", deletedata)

    if (!deletedata) {
      return utils.handleError(res, { message: "data not found", code: 404 });
    }

    return res.status(200).json({
      message: "Payment terms deleted successfully",
      code: 200
    })
  } catch (error) {
    utils.handleError(res, error);
  }
}



exports.addClientTestimonial = async (req, res) => {
  try {
    const data = req.body
    console.log("reqbody : ", data)

    const newtestimonial = await client_testimonials.create(data)
    console.log("newtestimonial : ", newtestimonial)

    return res.status(200).json({
      message: "client testimonial added successfully",
      data: newtestimonial,
      code: 200
    })
  } catch (error) {
    utils.handleError(res, error);
  }
}


exports.editClientTestimonial = async (req, res) => {
  try {
    const data = req.body
    console.log("reqbody : ", data)

    const newtestimonial = await client_testimonials.findOneAndUpdate(
      {
        _id: data.id
      },
      {
        $set: data
      },
      {
        new: true
      }
    )
    console.log("newtestimonial : ", newtestimonial)

    return res.status(200).json({
      message: "client testimonial edited successfully",
      data: newtestimonial,
      code: 200
    })
  } catch (error) {
    utils.handleError(res, error);
  }
}



exports.viewClientTestimonial = async (req, res) => {
  try {
    const { id } = req.params
    const newtestimonial = await client_testimonials.findOne({
      _id: id
    })
    console.log("newtestimonial : ", newtestimonial)

    return res.status(200).json({
      message: "client testimonial fetched successfully",
      data: newtestimonial,
      code: 200
    })
  } catch (error) {
    utils.handleError(res, error);
  }
}


exports.getClientTestimonial = async (req, res) => {
  try {
    const { offset = 0, limit = 10, search } = req.query
    let filter = {
      view: true
    }
    if (search) {
      filter[`$or`] = [
        {
          name: { $regex: search, $$options: "i" }
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



exports.deleteClientTestimonial = async (req, res) => {
  try {
    const { ids } = req.body
    const newtestimonial = await client_testimonials.deleteMany({ _id: { $in: ids } })
    console.log("newtestimonial : ", newtestimonial)

    return res.status(200).json({
      message: "client testimonial deleted successfully",
      code: 200
    })
  } catch (error) {
    utils.handleError(res, error);
  }
}