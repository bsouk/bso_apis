const User = require("../../models/user");
const Address = require("../../models/address");

const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require("generate-password");
const product = require("../../models/product");
const commision = require("../../models/commision");
const EnquiryQuotes = require("../../models/EnquiryQuotes")
const Enquiry = require("../../models/Enquiry")
const subscription = require("../../models/subscription");
const logistics_quotes = require("../../models/logistics_quotes");
function createNewPassword() {
  const password = generatePassword.generate({
    length: 8,
    numbers: true,
    uppercase: true,
    lowercase: true,
    strict: true,
  });
  return password;
}

const getUniqueId = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      const lastUser = await User.findOne({}).sort({ createdAt: -1 });
      if (lastUser && lastUser.unique_user_id) {
        resolve((+lastUser.unique_user_id) + 1);
      } else {
        resolve(100000);
      }
    } catch (error) {
      reject(error);
    }
  });
};

// exports.uploadMedia = async (req, res) => {
//   try {
//     if (!req.files.media || !req.body.path)
//       return utils.handleError(res, {
//         message: "MEDIA OR PATH MISSING",
//         code: 400,
//       });

//     let isArray = req.body.isArray;
//     if (Array.isArray(req.files.media)) {
//       let mediaArray = [];
//       for (let index = 0; index < req.files.media.length; index++) {
//         const element = req.files.media[index];
//         let media = await utils.uploadImage({
//           file: element,
//           path: `${process.env.STORAGE_PATH}/${req.body.path}`,
//         });
//         mediaArray.push(`${req.body.path}/${media}`);
//       }

//       return res.status(200).json({
//         code: 200,
//         data: mediaArray,
//       });
//     } else {
//       let media = await utils.uploadImage({
//         file: req.files.media,
//         path: `${process.env.STORAGE_PATH}/${req.body.path}`,
//       });

//       const url = `${req.body.path}/${media}`;
//       return res.status(200).json({
//         code: 200,
//         data: isArray === "true" ? [url] : url,
//       });
//     }
//   } catch (error) {
//     utils.handleError(res, error);
//   }
// };

async function uploadFile(object) {
  return new Promise((resolve, reject) => {
    var obj = object.file;
    var name = Date.now() + obj.name;
    obj.mv(object.path + "/" + name, function (err) {
      if (err) {
        console.log(err)
        reject(err);
      }
      resolve(name);
    });
  });
}

exports.uploadMedia = async (req, res) => {
  try {
    if (!req.files.media || !req.body.path) {
      return utils.handleError(res, {
        message: "MEDIA OR PATH MISSING",
        code: 400,
      });
    }

    let isArray = req.body.isArray;
    let supportedImageTypes = ["image/png", "image/jpeg", "image/jpg", "image/avif", "image/webp", "image/svg", "image/bmp"];
    let supportedOtherTypes = [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/pdf",
      "audio/mpeg",
      "audio/wav",
      "audio/mp3",
      "audio/ogg",
      "video/mp4",
      "video/quicktime",
      "video/x-m4v",
      "video/webm",
      "video/mov"
    ];

    if (Array.isArray(req.files.media)) {
      let mediaArray = [];

      for (let index = 0; index < req.files.media.length; index++) {
        const element = req.files.media[index];
        console.log("element:", element);
        console.log("type:", element.mimetype);

        if (supportedImageTypes.includes(element.mimetype)) {
          let media = await utils.uploadImage({
            file: element,
            path: `${process.env.STORAGE_PATH}/${req.body.path}`,
          });
          mediaArray.push(`${req.body.path}/${media}`);
        } else if (supportedOtherTypes.includes(element.mimetype)) {
          let media = await uploadFile({
            file: element,
            path: `${process.env.STORAGE_PATH}/${req.body.path}`,
          });
          mediaArray.push(`${req.body.path}/${media}`);
        } else {
          return utils.handleError(res, {
            message: `Unsupported file type: ${element.mimetype}`,
            code: 400,
          });
        }
      }

      return res.status(200).json({
        code: 200,
        data: mediaArray,
      });
    } else {
      const element = req.files.media;
      console.log("element:", element);
      console.log("type:", element.mimetype);

      if (supportedImageTypes.includes(element.mimetype)) {
        let media = await utils.uploadImage({
          file: element,
          path: `${process.env.STORAGE_PATH}/${req.body.path}`,
        });
        const url = `${req.body.path}/${media}`;
        return res.status(200).json({
          code: 200,
          data: isArray === "true" ? [url] : url,
        });
      } else if (supportedOtherTypes.includes(element.mimetype)) {
        let media = await uploadFile({
          file: element,
          path: `${process.env.STORAGE_PATH}/${req.body.path}`,
        });
        const url = `${req.body.path}/${media}`;
        return res.status(200).json({
          code: 200,
          data: isArray === "true" ? [url] : url,
        });
      } else {
        return utils.handleError(res, {
          message: `Unsupported file type: ${element.mimetype}`,
          code: 400,
        });
      }
    }
  } catch (error) {
    console.error("Error:", error);
    utils.handleError(res, error);
  }
};


exports.addCustomer = async (req, res) => {
  try {
    const data = req.body;

    const doesEmailExists = await emailer.emailExists(data.email);
    if (doesEmailExists)
      return utils.handleError(res, {
        message: "This email address is already registered",
        code: 400,
      });

    if (data.phone_number) {
      const doesPhoneNumberExist = await emailer.checkMobileExists(
        data.phone_number
      );
      if (doesPhoneNumberExist)
        return utils.handleError(res, {
          message: "This phone number is already registered",
          code: 400,
        });
    }

    const password = createNewPassword();
    const userData = {
      ...data,
      unique_user_id: await getUniqueId(),
      password,
      decoded_password: password,
      // user_type: "buyer",
      profile_completed: true,
      // is_user_approved_by_admin: true,
    };

    if (data.company_data) {
      if (data.company_data.name && data.company_data.registration_number && data.company_data.vat_number && data.company_data.incorporation_date) {
        userData.user_type = ["company"]
        userData.current_user_type = "company"
      } else {
        userData.user_type = ["buyer"]
        userData.current_user_type = "buyer"
      }
    }
    const user = new User(userData);

    const addressData = {
      user_id: user._id,
      address: data.address,
      location: data.location,
      phone_number_code: data.phone_number_code,
      phone_number: data.phone_number,
      is_primary: true,
      default_address: true,
    };

    const address = new Address(addressData);
    await user.save();
    await address.save();

    const mailOptions = {
      to: user.email,
      subject: `Welcome to ${process.env.APP_NAME}! Your Customer Account Has Been Created`,
      app_name: process.env.APP_NAME,
      email: user.email,
      password: password,
      name: user.full_name,
      account_type: "customer",
    };

    emailer.sendEmail(null, mailOptions, "accountCreated");
    res.json({ message: "User added successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.getCustomerList = async (req, res) => {
  try {
    const { limit = 10, offset = 0, search = "" } = req.query;

    const condition = {
      // $or: [{ user_type: "buyer" }, { user_type: "company" }],
      user_type: { $in: ["buyer", "company"] },
      profile_completed: true,
      is_deleted: false,
    };

    if (search) {
      condition["$or"] = [
        {
          full_name: { $regex: search, $options: "i" },
        },
        {
          email: { $regex: search, $options: "i" },
        },
        {
          phone_number: { $regex: search, $options: "i" },
        },
      ];
    }

    const countPromise = User.countDocuments(condition);

    const usersPromise = User.aggregate([
      {
        $match: condition,
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $skip: +offset,
      },
      {
        $limit: +limit,
      },
      {
        $project: {
          full_name: 1,
          profile_image: 1,
          email: 1,
          phone_number_code: 1,
          phone_number: 1,
          status: 1,
          joining_date: 1,
          createdAt: 1,
          last_login: 1,
          unique_user_id: 1,
          is_company_approved: 1,
          is_user_approved_by_admin: 1,
          user_type: 1,
          current_user_type: 1
        },
      },
    ]);

    const [count, users] = await Promise.all([countPromise, usersPromise]);

    res.json({ data: users, count, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.getCustomer = async (req, res) => {
  try {
    const user_id = req.params.id;
    const user = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(user_id),
        },
      },
      {
        $lookup: {
          from: "addresses",
          let: { user_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$user_id", "$$user_id"] },
                is_primary: true,
              },
            },
          ],
          as: "address",
        },
      },
      {
        $unwind: {
          path: "$address",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          address: "$address.address",
        },
      },
    ]);
    res.json({ data: user[0], code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.editCustomer = async (req, res) => {
  try {
    const data = req.body;
    const id = req.params.id;

    const user = await User.findById(id);
    if (!user)
      return utils.handleError(res, {
        message: "Customer not found",
        code: 404,
      });

    if (user.is_deleted)
      return utils.handleError(res, {
        message: "You cannot edit an account that has been deleted",
        code: 400,
      });

    if (data.email) {
      const doesEmailExists = await User.findOne({
        email: data.email,
        _id: { $ne: new mongoose.Types.ObjectId(id) },
      });

      if (doesEmailExists)
        return utils.handleError(res, {
          message: "This email address is already registered",
          code: 400,
        });
    }

    if (data.phone_number) {
      const doesPhoneNumberExist = await User.findOne({
        phone_number: data.phone_number,
        _id: { $ne: new mongoose.Types.ObjectId(id) },
      });
      if (doesPhoneNumberExist)
        return utils.handleError(res, {
          message: "This phone number is already registered",
          code: 400,
        });
    }

    let userData = {
      ...data
    }

    if (data.company_data) {
      if (data.company_data.name && data.company_data.registration_number && data.company_data.vat_number && data.company_data.incorporation_date) {
        // userData.user_type = "company"
        userData['$push'] = { user_type: "company" }
        userData.current_user_type = "company"
      } else {
        // userData.user_type = "buyer"
        userData['$push'] = { user_type: "buyer" }
        userData.current_user_type = "buyer"
      }
    }

    console.log("userData is ", userData)

    await User.findByIdAndUpdate(id, userData);

    if (
      data.phone_number_code ||
      data.phone_number ||
      data.address ||
      data.location
    ) {
      const is_primary_address = await Address.findOne({
        user_id: new mongoose.Types.ObjectId(id),
        is_primary: true,
      });
      if (is_primary_address) {
        await Address.updateOne(
          { user_id: new mongoose.Types.ObjectId(id), is_primary: true },
          {
            phone_number_code: data.phone_number_code,
            phone_number: data.phone_number,
            address: data.address,
            location: data.location,
          }
        );
      } else {
        const addressData = {
          user_id: user._id,
          address: data.address,
          location: data.location,
          phone_number_code: data.phone_number_code,
          phone_number: data.phone_number,
          is_primary: true,
          default_address: false,
        };
        const address = new Address(addressData);
        await address.save();
      }
    }

    res.json({ message: "Customer edit successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const id = req.params.id;

    const user = await User.findById(id);
    if (!user)
      return utils.handleError(res, {
        message: "Customer not found",
        code: 404,
      });
    if (user.is_deleted)
      return utils.handleError(res, {
        message: "Customer has been already deleted",
        code: 400,
      });

    user.is_deleted = true;
    await user.save();

    res.json({ message: "Customer has been deleted successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.deleteSelectedCustomer = async (req, res) => {
  try {
    const { user_ids = [] } = req.body;

    if (user_ids.length == 0)
      return utils.handleError(res, {
        message: "Please select at least one user",
        code: 400,
      });
    const isAllDeleted = await User.find({ _id: user_ids, is_deleted: true });

    if (isAllDeleted.length == user_ids.length)
      return utils.handleError(res, {
        message: "All selected customers are already deleted",
        code: 400,
      });

    await User.updateMany({ _id: user_ids }, { is_deleted: true });

    res.json({ message: "Selected customer have been deleted", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.addResource = async (req, res) => {
  try {
    const data = req.body;

    const doesEmailExists = await emailer.emailExists(data.email);
    if (doesEmailExists)
      return utils.handleError(res, {
        message: "This email address is already registered",
        code: 400,
      });

    if (data.phone_number) {
      const doesPhoneNumberExist = await emailer.checkMobileExists(
        data.phone_number
      );
      if (doesPhoneNumberExist)
        return utils.handleError(res, {
          message: "This phone number is already registered",
          code: 400,
        });
    }

    const password = createNewPassword();
    const userData = {
      ...data,
      unique_user_id: await getUniqueId(),
      password,
      decoded_password: password,
      user_type: ["resource"],
      current_user_type: "resource",
      profile_completed: true,
      //is_user_approved_by_admin: true,
    };

    const user = new User(userData);
    const requiredFields = [
      "full_name",
      "email",
      "phone_number",
      "profile_image",
      "profile_title",
      "profile_description",
      "specialisations",
      "rate_per_hour",
      "project_pricing_model",
      "resource_availability"
    ]

    console.log("resource check fields is ", requiredFields)

    const isProfileComplete = requiredFields.map(field => isFieldPopulated(user, field));

    const hasRequiredArrays =
      Array.isArray(user.work_exprience) && user.work_exprience.length > 0 &&
      Array.isArray(user.education) && user.education.length > 0 &&
      Array.isArray(user.portfolio) && user.portfolio.length > 0 &&
      Array.isArray(user.skills) && user.skills.length > 0 &&
      Array.isArray(user.certifications) && user.certifications.length > 0 &&
      Array.isArray(user.languages) && user.languages.length > 0 &&
      Array.isArray(user.testimonials) && user.testimonials.length > 0 &&
      Array.isArray(user.employement_history) && user.employement_history.length > 0;

    console.log("isProfileComplete is ", isProfileComplete, " hasRequiredArrays is ", hasRequiredArrays)

    if (isProfileComplete && hasRequiredArrays) {
      user.profile_completed = true;
    } else {
      user.profile_completed = false;
    }

    await user.save();

    const mailOptions = {
      to: user.email,
      subject: `Welcome to ${process.env.APP_NAME}! Your Resource Account Has Been Created`,
      app_name: process.env.APP_NAME,
      email: user.email,
      password: password,
      name: user.full_name,
      account_type: "resource",
    };

    emailer.sendEmail(null, mailOptions, "accountCreated");
    res.json({ message: "Resource added successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.getResourceList = async (req, res) => {
  try {
    const { limit = 10, offset = 0, search = "" } = req.query;

    const condition = {
      user_type: { $in: ["resource"] },
      profile_completed: true,
      is_deleted: false,
    };

    if (search) {
      condition["$or"] = [
        {
          full_name: { $regex: search, $options: "i" },
        },
        {
          email: { $regex: search, $options: "i" },
        },
        {
          phone_number: { $regex: search, $options: "i" },
        },
      ];
    }

    const countPromise = User.countDocuments(condition);

    const usersPromise = User.aggregate([
      {
        $match: condition,
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $skip: +offset,
      },
      {
        $limit: +limit,
      },
      // {
      //   $project: {
      //     full_name: 1,
      //     profile_image: 1,
      //     email: 1,
      //     phone_number_code: 1,
      //     phone_number: 1,
      //     status: 1,
      //     availability_status: 1,
      //     createdAt: 1,
      //     last_login: 1,
      //     unique_user_id: 1,
      //     is_company_approved: 1,
      //     is_user_approved_by_admin: 1
      //   },
      // },
    ]);

    const [count, users] = await Promise.all([countPromise, usersPromise]);

    res.json({ data: users, count, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.getResource = async (req, res) => {
  try {
    const user_id = req.params.id;
    const user = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(user_id),
        },
      },
    ]);
    console.log("user", user);
    res.json({ data: user[0], code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.editResource = async (req, res) => {
  try {
    const data = req.body;
    const id = req.params.id;

    const user = await User.findById(id);
    if (!user)
      return utils.handleError(res, {
        message: "Resource not found",
        code: 404,
      });

    if (user.is_deleted)
      return utils.handleError(res, {
        message: "You cannot edit an account that has been deleted",
        code: 400,
      });

    if (data.email) {
      const doesEmailExists = await User.findOne({
        email: data.email,
        _id: { $ne: new mongoose.Types.ObjectId(id) },
      });

      if (doesEmailExists)
        return utils.handleError(res, {
          message: "This email address is already registered",
          code: 400,
        });
    }

    if (data.phone_number) {
      const doesPhoneNumberExist = await User.findOne({
        phone_number: data.phone_number,
        _id: { $ne: new mongoose.Types.ObjectId(id) },
      });
      if (doesPhoneNumberExist)
        return utils.handleError(res, {
          message: "This phone number is already registered",
          code: 400,
        });
    }

    const updatedUser = await User.findByIdAndUpdate(id, data);
    const requiredFields = [
      "full_name",
      "email",
      "phone_number",
      "profile_image",
      "profile_title",
      "profile_description",
      "specialisations",
      "rate_per_hour",
      "project_pricing_model",
      "resource_availability"
    ]

    console.log("resource check fields is ", requiredFields)

    const isProfileComplete = requiredFields.map(field => isFieldPopulated(updatedUser, field));

    const hasRequiredArrays =
      Array.isArray(updatedUser.work_exprience) && updatedUser.work_exprience.length > 0 &&
      Array.isArray(updatedUser.education) && updatedUser.education.length > 0 &&
      Array.isArray(updatedUser.portfolio) && updatedUser.portfolio.length > 0 &&
      Array.isArray(updatedUser.skills) && updatedUser.skills.length > 0 &&
      Array.isArray(updatedUser.certifications) && updatedUser.certifications.length > 0 &&
      Array.isArray(updatedUser.languages) && updatedUser.languages.length > 0 &&
      Array.isArray(updatedUser.testimonials) && updatedUser.testimonials.length > 0 &&
      Array.isArray(updatedUser.employement_history) && updatedUser.employement_history.length > 0;

    console.log("isProfileComplete is ", isProfileComplete, " hasRequiredArrays is ", hasRequiredArrays)

    if (isProfileComplete && hasRequiredArrays) {
      updatedUser.profile_completed = true;
    } else {
      updatedUser.profile_completed = false;
    }

    await updatedUser.save();

    res.json({ message: "Resource edit successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.deleteResource = async (req, res) => {
  try {
    const id = req.params.id;

    const user = await User.findById(id);
    if (!user)
      return utils.handleError(res, {
        message: "Resource not found",
        code: 404,
      });
    if (user.is_deleted)
      return utils.handleError(res, {
        message: "Resource has been already deleted",
        code: 400,
      });

    user.is_deleted = true;
    await user.save();

    res.json({ message: "Resource has been deleted successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.deleteSelectedResource = async (req, res) => {
  try {
    const { user_ids = [] } = req.body;

    if (user_ids.length == 0)
      return utils.handleError(res, {
        message: "Please select at least one user",
        code: 400,
      });
    const isAllDeleted = await User.find({ _id: user_ids, is_deleted: true });

    if (isAllDeleted.length == user_ids.length)
      return utils.handleError(res, {
        message: "All selected resource are already deleted",
        code: 400,
      });

    await User.updateMany({ _id: user_ids }, { is_deleted: true });

    res.json({ message: "Selected resource have been deleted", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

//supplier

//helper function
const isFieldPopulated = (obj, path) => {
  console.log("object is ", obj, " and path is ", path)
  const keys = path.split('.');
  console.log("keys is ", keys)
  let current = obj;
  for (let key of keys) {
    console.log("cond is ", current, "key is ", current[key])
    if (!current || !current[key]) {
      return { path, code: false };
    }
    current = current[key];
  }
  return { path, code: true };
};


exports.addSupplier = async (req, res) => {
  try {
    const data = req.body;

    console.log("userdata ------->", data);

    const doesEmailExists = await emailer.emailExists(data.email);

    if (doesEmailExists)
      return utils.handleError(res, {
        message: "This email address is already registered",
        code: 400,
      });

    if (data.phone_number) {
      const doesPhoneNumberExist = await emailer.checkMobileExists(
        data.phone_number
      );
      if (doesPhoneNumberExist)
        return utils.handleError(res, {
          message: "This phone number is already registered",
          code: 400,
        });
    }

    const password = createNewPassword();

    // console.log("userData ---->",data)
    const userData = {
      ...data,
      unique_user_id: await getUniqueId(),
      password,
      decoded_password: password,
      user_type: ["supplier"],
      current_user_type: "supplier",
      profile_completed: true,
      // is_user_approved_by_admin: true,
    };

    const user = new User(userData);

    //complete profile if necessary fields are present
    const requiredFields = [
      'full_name',
      'profile_image',
      'email',
      'phone_number',
      'bank_details.account_holder_name',
      'bank_details.account_number',
      'bank_details.bank_name',
      'bank_details.swift_code',
      'bank_details.iban_number',
      'bank_details.address.line1',
      'bank_details.address.line2',
      'bank_details.address.city',
      'bank_details.address.state',
      'bank_details.address.zip_code',
      'bank_details.address.country',
      'company_data.company_logo',
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
      'company_data.address.line2',
      'company_data.address.city',
      'company_data.address.state',
      'company_data.address.zip_code',
      'company_data.address.country',
      'beneficiary_address.line1',
      'beneficiary_address.line2',
      'beneficiary_address.city',
      'beneficiary_address.state',
      'beneficiary_address.zip_code',
      'beneficiary_address.country',
      'additional_notes',
    ];

    console.log("supplier check fields is ", requiredFields)

    const isProfileComplete = requiredFields.map(field => isFieldPopulated(user, field));

    const hasRequiredArrays =
      Array.isArray(user.sample_products) && user.sample_products.length > 0 &&
      Array.isArray(user.business_certificates) && user.business_certificates.length > 0 &&
      Array.isArray(user.licenses) && user.licenses.length > 0;

    console.log("isProfileComplete is ", isProfileComplete, " hasRequiredArrays is ", hasRequiredArrays)

    if (isProfileComplete && hasRequiredArrays) {
      user.profile_completed = true;
    } else {
      user.profile_completed = false;
    }

    await user.save();

    const addressData = {
      user_id: user._id,
      address: data.address,
      location: data.location,
      phone_number_code: data.phone_number_code,
      phone_number: data.phone_number,
      is_primary: true,
      default_address: true,

      //supplier
      // address:data.address,
      // categories_id:data.categories_id,
      // sub_categories_id:data.categories_id,
      // bank_details:data.bank_details,
      // certification:data.certification,
      // quality_procedures:data.quality_procedures,
      // health_and_saftey_procedures:data.health_and_saftey_procedures,
      // anti_correcuptin_procedures:data.anti_correcuptin_procedures,
      // categories_id : {
      //   type : mongoose.Schema.Types.ObjectId
      // },
      // sub_categories_id:{
      //   type : mongoose.Schema.Types.ObjectId

      // },

      // bank_details:{
      //   type:string
      // },
      // certification:{
      //   type:string
      // },
      // health_and_saftey_procedures:{
      //   type:string
      // },
      // quality_procedures:{
      //   type:string
      // },
      // anti_correcuptin_procedures:{
      //   type:string
      // },
      // business_document:{
      //   type:string
      // }
    };

    const address = new Address(addressData);
    await user.save();
    await address.save();

    const mailOptions = {
      to: user.email,
      subject: `Welcome to ${process.env.APP_NAME}! Your Customer Account Has Been Created`,
      app_name: process.env.APP_NAME,
      email: user.email,
      password: password,
      name: user.full_name,
      account_type: "customer",
    };

    emailer.sendEmail(null, mailOptions, "accountCreated");
    res.json({ message: "User added successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};


//edit supplier

exports.editSupplier = async (req, res) => {
  try {
    const data = req.body;
    const id = req.params.id;

    const user = await User.findById(id);
    if (!user)
      return utils.handleError(res, {
        message: "Supplier not found",
        code: 404,
      });

    if (user.is_deleted)
      return utils.handleError(res, {
        message: "You cannot edit an account that has been deleted",
        code: 400,
      });

    if (data.email) {
      const doesEmailExists = await User.findOne({
        email: data.email,
        _id: { $ne: new mongoose.Types.ObjectId(id) },
      });

      if (doesEmailExists)
        return utils.handleError(res, {
          message: "This email address is already registered",
          code: 400,
        });
    }

    if (data.phone_number) {
      const doesPhoneNumberExist = await User.findOne({
        phone_number: data.phone_number,
        _id: { $ne: new mongoose.Types.ObjectId(id) },
      });
      if (doesPhoneNumberExist)
        return utils.handleError(res, {
          message: "This phone number is already registered",
          code: 400,
        });
    }

    const updatedUser = await User.findByIdAndUpdate(id, data);

    if (
      data.phone_number_code ||
      data.phone_number ||
      data.address ||
      data.location
    ) {
      const is_primary_address = await Address.findOne({
        user_id: new mongoose.Types.ObjectId(id),
        is_primary: true,
      });
      if (is_primary_address) {
        await Address.updateOne(
          { user_id: new mongoose.Types.ObjectId(id), is_primary: true },
          {
            phone_number_code: data.phone_number_code,
            phone_number: data.phone_number,
            address: data.address,
            location: data.location,
          }
        );
      } else {
        const addressData = {
          user_id: user._id,
          address: data.address,
          location: data.location,
          phone_number_code: data.phone_number_code,
          phone_number: data.phone_number,
          is_primary: true,
          default_address: false,
        };
        const address = new Address(addressData);
        await address.save();
      }
    }

    const requiredFields = [
      'full_name',
      'profile_image',
      'email',
      'phone_number',
      'bank_details.account_holder_name',
      'bank_details.account_number',
      'bank_details.bank_name',
      'bank_details.swift_code',
      'bank_details.iban_number',
      'bank_details.address.line1',
      'bank_details.address.line2',
      'bank_details.address.city',
      'bank_details.address.state',
      'bank_details.address.zip_code',
      'bank_details.address.country',
      'company_data.company_logo',
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
      'company_data.address.line2',
      'company_data.address.city',
      'company_data.address.state',
      'company_data.address.zip_code',
      'company_data.address.country',
      'beneficiary_address.line1',
      'beneficiary_address.line2',
      'beneficiary_address.city',
      'beneficiary_address.state',
      'beneficiary_address.zip_code',
      'beneficiary_address.country',
      'additional_notes',
    ];

    console.log("supplier check fields is ", requiredFields)

    const isProfileComplete = requiredFields.map(field => isFieldPopulated(updatedUser, field));

    const hasRequiredArrays =
      Array.isArray(updatedUser.sample_products) && updatedUser.sample_products.length > 0 &&
      Array.isArray(updatedUser.business_certificates) && updatedUser.business_certificates.length > 0 &&
      Array.isArray(updatedUser.licenses) && updatedUser.licenses.length > 0;

    console.log("isProfileComplete is ", isProfileComplete, " hasRequiredArrays is ", hasRequiredArrays)

    if (isProfileComplete && hasRequiredArrays) {
      updatedUser.profile_completed = true;
    } else {
      updatedUser.profile_completed = false;
    }

    await updatedUser.save();

    res.json({ message: "supplier edit successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    const id = req.params.id;

    const user = await User.findById(id);
    if (!user)
      return utils.handleError(res, {
        message: "Customer not found",
        code: 404,
      });
    if (user.is_deleted)
      return utils.handleError(res, {
        message: "Customer has been already deleted",
        code: 400,
      });

    user.is_deleted = true;
    await user.save();

    res.json({ message: "Customer has been deleted successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.getSupplierList = async (req, res) => {
  try {
    const { limit = 10, offset = 0, search = "" } = req.query;

    const condition = {
      user_type: { $in: ["supplier"] },
      profile_completed: true,
      is_deleted: false,
    };

    if (search) {
      condition["$or"] = [
        {
          full_name: { $regex: search, $options: "i" },
        },
        {
          email: { $regex: search, $options: "i" },
        },
        {
          phone_number: { $regex: search, $options: "i" },
        },
      ];
    }

    const countPromise = User.countDocuments(condition);

    const usersPromise = User.aggregate([
      {
        $match: condition,
      },
      {
        $lookup: {
          from: "addresses",
          let: { user_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$user_id", "$$user_id"] },
                is_primary: true,
              },
            },
          ],
          as: "address",
        },
      },
      {
        $unwind: {
          path: "$address",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          address: "$address.address",
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $skip: +offset,
      },
      {
        $limit: +limit,
      },
      {
        $project: {
          full_name: 1,
          profile_image: 1,
          email: 1,
          phone_number_code: 1,
          phone_number: 1,
          status: 1,
          joining_date: 1,
          createdAt: 1,
          address: 1,
          business_name: 1,
          categories_id: 1,
          sub_categories_id: 1,
          'company_data.business_category': 1,
          last_login: 1,
          unique_user_id: 1,
          is_company_approved: 1,
          is_user_approved_by_admin: 1
        },
      },
    ]);

    const [count, users] = await Promise.all([countPromise, usersPromise]);

    res.json({ data: users, count, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.getSupplier = async (req, res) => {
  try {
    const user_id = req.params.id;
    const user = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(user_id),
        },
      },
      {
        $lookup: {
          from: "addresses",
          let: { user_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$user_id", "$$user_id"] },
                is_primary: true,
              },
            },
          ],
          as: "address",
        },
      },
      {
        $unwind: {
          path: "$address",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          address: "$address.address",
        },
      },
    ]);
    res.json({ data: user[0] ? user[0] : null, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.deleteSelectedSupplier = async (req, res) => {
  try {
    const { user_ids = [] } = req.body;

    if (user_ids.length == 0)
      return utils.handleError(res, {
        message: "Please select at least one user",
        code: 400,
      });
    const isAllDeleted = await User.find({ _id: user_ids, is_deleted: true });

    if (isAllDeleted.length == user_ids.length)
      return utils.handleError(res, {
        message: "All selected customers are already deleted",
        code: 400,
      });

    await User.updateMany({ _id: user_ids }, { is_deleted: true });

    res.json({ message: "Selected Supplier have been deleted", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

// Logistics User

exports.addLogisticsUser = async (req, res) => {
  try {
    const data = req.body;

    console.log("userdata ------->", data);

    const doesEmailExists = await emailer.emailExists(data.email);
    if (doesEmailExists)
      return utils.handleError(res, {
        message: "This email address is already registered",
        code: 400,
      });

    if (data.phone_number) {
      const doesPhoneNumberExist = await emailer.checkMobileExists(
        data.phone_number
      );
      if (doesPhoneNumberExist)
        return utils.handleError(res, {
          message: "This phone number is already registered",
          code: 400,
        });
    }

    const password = createNewPassword();

    // console.log("userData ---->",data)
    const userData = {
      ...data,
      unique_user_id: await getUniqueId(),
      password,
      decoded_password: password,
      user_type: ["logistics"],
      current_user_type: "logistics",
      profile_completed: true,
      // is_user_approved_by_admin: true,
    };

    const user = new User(userData);

    const addressData = {
      user_id: user._id,
      address: data.address,
      location: data.location,
      phone_number_code: data.phone_number_code,
      phone_number: data.phone_number,
      is_primary: true,
      default_address: true,
    };

    const address = new Address(addressData);
    await user.save();
    await address.save();

    const mailOptions = {
      to: user.email,
      subject: `Welcome to ${process.env.APP_NAME}! Your Customer Account Has Been Created`,
      app_name: process.env.APP_NAME,
      email: user.email,
      password: password,
      name: user.full_name,
      account_type: "customer",
    };

    emailer.sendEmail(null, mailOptions, "accountCreated");
    res.json({ message: "User added successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

// edit Logistics User
exports.editLogisticsUser = async (req, res) => {
  try {
    const data = req.body;
    const id = req.params.id;

    const user = await User.findById(id);
    if (!user)
      return utils.handleError(res, {
        message: "Logistics not found",
        code: 404,
      });

    if (user.is_deleted)
      return utils.handleError(res, {
        message: "You cannot edit an account that has been deleted",
        code: 400,
      });

    if (data.email) {
      const doesEmailExists = await User.findOne({
        email: data.email,
        _id: { $ne: new mongoose.Types.ObjectId(id) },
      });

      if (doesEmailExists)
        return utils.handleError(res, {
          message: "This email address is already registered",
          code: 400,
        });
    }

    if (data.phone_number) {
      const doesPhoneNumberExist = await User.findOne({
        phone_number: data.phone_number,
        _id: { $ne: new mongoose.Types.ObjectId(id) },
      });
      if (doesPhoneNumberExist)
        return utils.handleError(res, {
          message: "This phone number is already registered",
          code: 400,
        });
    }

    await User.findByIdAndUpdate(id, data);

    if (
      data.phone_number_code ||
      data.phone_number ||
      data.address ||
      data.location
    ) {
      const is_primary_address = await Address.findOne({
        user_id: new mongoose.Types.ObjectId(id),
        is_primary: true,
      });
      if (is_primary_address) {
        await Address.updateOne(
          { user_id: new mongoose.Types.ObjectId(id), is_primary: true },
          {
            phone_number_code: data.phone_number_code,
            phone_number: data.phone_number,
            address: data.address,
            location: data.location,
          }
        );
      } else {
        const addressData = {
          user_id: user._id,
          address: data.address,
          location: data.location,
          phone_number_code: data.phone_number_code,
          phone_number: data.phone_number,
          is_primary: true,
          default_address: false,
        };
        const address = new Address(addressData);
        await address.save();
      }
    }

    res.json({ message: "Logistics edit successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

//get Logistics User list
exports.getLogisticsUserList = async (req, res) => {
  try {
    const { limit = 10, offset = 0, search = "" } = req.query;

    const condition = {
      user_type: { $in: ["logistics"] },
      profile_completed: true,
      is_deleted: false,
    };

    if (search) {
      condition["$or"] = [
        {
          full_name: { $regex: search, $options: "i" },
        },
        {
          email: { $regex: search, $options: "i" },
        },
        {
          phone_number: { $regex: search, $options: "i" },
        },
      ];
    }

    const countPromise = User.countDocuments(condition);

    const usersPromise = User.aggregate([
      {
        $match: condition,
      },
      {
        $lookup: {
          from: "addresses",
          let: { user_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$user_id", "$$user_id"] },
                is_primary: true,
              },
            },
          ],
          as: "address",
        },
      },
      {
        $unwind: {
          path: "$address",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          address: "$address.address",
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $skip: +offset,
      },
      {
        $limit: +limit,
      },
      {
        $project: {
          full_name: 1,
          profile_image: 1,
          email: 1,
          phone_number_code: 1,
          phone_number: 1,
          status: 1,
          joining_date: 1,
          createdAt: 1,
          address: 1,
          last_login: 1,
          'company_data.business_category': 1,
          unique_user_id: 1,
          is_company_approved: 1,
          is_user_approved_by_admin: 1
        },
      },
    ]);

    const [count, users] = await Promise.all([countPromise, usersPromise]);

    res.json({ data: users, count, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};


// get LOgistics User by id
exports.getLogisticsUserById = async (req, res) => {
  try {
    const user_id = req.params.id;
    const user = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(user_id),
        },
      },
      {
        $lookup: {
          from: "addresses",
          let: { user_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$user_id", "$$user_id"] },
                is_primary: true,
              },
            },
          ],
          as: "address",
        },
      },
      {
        $unwind: {
          path: "$address",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          address: "$address.address",
        },
      },
    ]);
    res.json({ data: user[0] ? user[0] : null, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};


// delete single logistics User BY Id
exports.deleteLogisticsUser = async (req, res) => {
  try {
    const id = req.params.id;

    const user = await User.findById(id);
    if (!user)
      return utils.handleError(res, {
        message: "Logistics not found",
        code: 404,
      });
    if (user.is_deleted)
      return utils.handleError(res, {
        message: "Logistics has been already deleted",
        code: 400,
      });

    user.is_deleted = true;
    await user.save();

    res.json({ message: "Logistics has been deleted successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

// delete Multiple Logistics User
exports.deleteSelectedLogisticsUser = async (req, res) => {
  try {
    const { user_ids = [] } = req.body;

    if (user_ids.length == 0)
      return utils.handleError(res, {
        message: "Please select at least one Logistics",
        code: 400,
      });
    const isAllDeleted = await User.find({ _id: user_ids, is_deleted: true });

    if (isAllDeleted.length == user_ids.length)
      return utils.handleError(res, {
        message: "All selected Logistics are already deleted",
        code: 400,
      });

    await User.updateMany({ _id: user_ids }, { is_deleted: true });

    res.json({ message: "Selected Logistics have been deleted", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};


//Approve User By admin
exports.ApproveUser = async (req, res) => {
  try {
    const userId = req.params.id
    console.log("user is ", userId);

    const Userdata = await User.findById(userId);
    console.log("user is ", Userdata);

    if (!Userdata) {
      return utils.handleError(res, {
        message: "User Not Found",
        code: 400,
      });
    }

    Userdata.is_user_approved_by_admin = true;
    await Userdata.save();

    res.status(200).json({
      success: true,
      message: "Profile Approved By Admin Successfully",
      code: 200
    })
  } catch (err) {
    utils.handleError(res, err);
  }
}

//reject profile by admin
exports.RejectUser = async (req, res) => {
  try {
    const userId = req.params.id
    console.log("user is ", userId);

    console.log("req.body is ", req.body)

    const Userdata = await User.findById(userId);
    console.log("user is ", Userdata);

    if (!Userdata) {
      return utils.handleError(res, {
        message: "User Not Found",
        code: 400,
      });
    }

    Userdata.is_user_approved_by_admin = false;
    Userdata.reject_reason = req.body?.reason
    await Userdata.save();

    res.status(200).json({
      success: true,
      message: "Profile Rejected By Admin Successfully",
      code: 200
    })
  } catch (err) {
    utils.handleError(res, err);
  }
}

//change Profile status
exports.changeStatus = async (req, res) => {
  try {
    const userId = req.params.id
    console.log("user is ", userId);

    const Userdata = await User.findById(userId);
    console.log("user is ", Userdata);

    if (!Userdata) {
      return utils.handleError(res, {
        message: "User Not Found",
        code: 400,
      });
    }

    if (Userdata.status === "active") {
      Userdata.status = "inactive"
    } else {
      Userdata.status = "active"
    }
    await Userdata.save();

    res.status(200).json({
      success: true,
      message: "Profile Status Changed Successfully",
      code: 200
    })
  } catch (err) {
    utils.handleError(res, err);
  }
}


//change Profile availability status
exports.changeAvailabilityStatus = async (req, res) => {
  try {
    const userId = req.params.id
    console.log("user is ", userId);

    console.log("req.body is ", req.body)

    const Userdata = await User.findById(userId);
    console.log("user is ", Userdata);

    if (!Userdata) {
      return utils.handleError(res, {
        message: "User Not Found",
        code: 400,
      });
    }

    if (Userdata.user_type.includes("resource")) {
      Userdata.availability_status = req.body.status
    } else {
      return utils.handleError(res, {
        message: "Only Resource status can be changed",
        code: 400,
      });
    }

    await Userdata.save();

    res.status(200).json({
      success: true,
      message: "Profile Status Changed Successfully",
      code: 200
    })
  } catch (err) {
    utils.handleError(res, err);
  }
}


// get supplier list for listing in forms
exports.supplierListForm = async (req, res) => {
  try {
    const { id } = req.query
    // if (!id) {
    //   return utils.handleError(res, {
    //     message: "Id is required",
    //     code: 400,
    //   });
    // }
    let data = []
    if (id) {
      const productData = await product.findById({ _id: id });
      if (!productData) {
        return utils.handleError(res, {
          message: "product not found",
          code: 400,
        });
      }

      data = await User.aggregate([
        { $match: { user_type: { $in: ['supplier'] }, _id: new mongoose.Types.ObjectId(productData?.user_id), is_deleted: false } },
        {
          $project: {
            _id: 1,
            full_name: 1,
            first_name: 1,
            last_name: 1
          }
        }
      ])
      console.log("data is ", data)
    } else {
      data = await User.aggregate([
        { $match: { user_type: { $in: ['supplier'] }, is_deleted: false } },
        {
          $project: {
            _id: 1,
            full_name: 1,
            first_name: 1,
            last_name: 1
          }
        }
      ])
    }

    return res.status(200).json({
      message: "supplier list fetched succesfully",
      data: data,
      code: 200
    })
  } catch (error) {
    utils.handleError(res, err);
  }
}

//share credentials
exports.shareUserCrendentials = async (req, res) => {
  try {
    const user_id = req.body.id;
    console.log("user_id", user_id)

    const user = await User.findOne({ _id: new mongoose.Types.ObjectId(user_id) }, "+decoded_password");
    if (!user) return utils.handleError(res, { message: "user not found", code: 404 });

    const password = user.decoded_password;
    console.log("password : ", password)

    const mailOptions = {
      to: user.email,
      subject: "Your Account Credentials",
      name: user.full_name,
      email: user.email,
      password: password,
      app_name: process.env.APP_NAME
    }

    emailer.sendEmail(null, mailOptions, "shareCredential");

    res.json({ message: "Credential has been shared successfully", code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.getQuantitiesUnits = async (req, res) => {
  try {
    const { search, offset = 0, limit = 10 } = req.query
    let filter = {}
    if (search) {
      filter.unit = { $regex: search, $options: "i" }
    }
    const data = await quantity_units.aggregate([
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

    const count = await quantity_units.countDocuments(filter)
    res.status(200).json({
      message: "Quantities unit fetched successfully",
      data,
      count,
      code: 200
    })
  } catch (error) {
    utils.handleError(res, error);
  }
}


exports.editAddCommision = async (req, res) => {
  try {
    const data = req.body
    console.log("data : ", data)
    let commisiondata = await commision.findOne()
    console.log("commisiondata : ", commisiondata)
    if (!commisiondata) {
      commisiondata = await commision.create(data);
      console.log("commisiondata : ", commisiondata)

      return res.status(200).json({
        message: "Commission added successfully",
        data: commisiondata,
        code: 200
      })
    }
    const result = await commision.findOneAndUpdate({ _id: commisiondata._id }, { $set: data }, { new: true })
    console.log("result : ", result)

    return res.status(200).json({
      message: "Commission updated successfully",
      data: result,
      code: 200
    })
  } catch (error) {
    utils.handleError(res, error);
  }
}

exports.getCommission = async (req, res) => {
  try {
    let commisiondata = await commision.findOne()
    console.log("commisiondata : ", commisiondata)

    return res.status(200).json({
      message: "Commission data fetched successfully",
      data: commisiondata,
      code: 200
    })
  } catch (error) {
    utils.handleError(res, error);
  }
}


exports.getAllSupplierQuotes = async (req, res) => {
  try {
    const { id } = req.params
    console.log("id : ", id)

    const data = await EnquiryQuotes.find({ enquiry_id: new mongoose.Types.ObjectId(id) }).populate('user_id', 'full_name email user_type current_user_type').populate('enquiry_items.quantity.unit').populate("pickup_address")
    console.log("data : ", data)

    const count = await EnquiryQuotes.countDocuments({ enquiry_id: new mongoose.Types.ObjectId(id) })

    return res.status(200).json({
      message: "Supplier quotes fetched successfully",
      data,
      count,
      code: 200
    })
  } catch (error) {
    utils.handleError(res, error);
  }
}


exports.getQuotesdata = async (req, res) => {
  try {
    const { id } = req.params
    const data = await EnquiryQuotes.findOne({ _id: new mongoose.Types.ObjectId(id) }).populate("enquiry_items.quantity.unit").populate({
      path: "enquiry_id",
      select: "enquiry_unique_id user_id priority shipping_address expiry_date",
      populate: {
        path: "shipping_address",
        select: "address"
      }
    }).populate("pickup_address", "address")


    const subscriptiondata = await subscription.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(data.enquiry_id.user_id),
          status: "active"
        }
      },
      {
        $lookup: {
          from: 'plans',
          let: { plan_id: '$plan_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$plan_id', '$$plan_id'] }
              }
            },
            {
              $project: {
                plan_id: 1,
                name: 1,
                duration: 1,
                price: 1,
                plan_step: 1
                // Add or remove fields here as needed
              }
            }
          ],
          as: 'plan'
        }
      },
      {
        $unwind: {
          path: '$plan',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          plan: 1,
          _id: 0
        }
      },
      {
        $sort: {
          createdAt: -1
        }
      },
      {
        $limit: 1
      }
    ]);

    console.log("data : ", data)
    data._doc.plan_step = subscriptiondata[0]?.plan?.plan_step || null;
    return res.status(200).json({
      message: "quotes data fetched successfully",
      data,
      // subscriptiondata,
      code: 200
    })
  } catch (error) {
    utils.handleError(res, error);
  }
}


exports.acceptsupplierEnquiry = async (req, res) => {
  try {
    const { id, is_selected } = req.body;



    const result = await EnquiryQuotes.findOneAndUpdate(
      { _id: id },
      { $set: { is_selected } },
      { new: true }
    );
    if (!result) {
      return res.status(404).json({
        message: "Quote not found.",
        code: 404
      });
    }
    let totalprice = 0;

    // Calculate total item price
    result.enquiry_items.forEach(i => {
      totalprice += (i.unit_price * i.quantity.value);
    });

    // Add custom charges (if they exist) and subtract discount
    totalprice += (result?.custom_charges_one?.value || 0);
    totalprice += (result?.custom_charges_two?.value || 0);
    totalprice -= (result?.discount?.value || 0);

    console.log("Total Price:", totalprice);

    // Update the result with final price
    result.final_price = totalprice;
    result.is_selected = true;
    await result.save();
    // await Enquiry.findOneAndUpdate(
    //   { _id: result.enquiry_id },
    //   {
    //     $set: {
    //       selected_supplier: {
    //         quote_id: id
    //       }
    //     }
    //   }
    // );
    return res.status(200).json({
      message: `Query accepted successfully.`,
      data: result,
      code: 200
    });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.finalquotes = async (req, res) => {
  try {
    const id = req.params.enquiry_id;

    const enquiry = await Enquiry.findOne(
      { _id: new mongoose.Types.ObjectId(id) },
    );
    if (!enquiry) {
      return res.status(404).json({
        message: "Quote not found.",
        code: 404
      });
    }
    const supplier = await EnquiryQuotes.find({ enquiry_id: new mongoose.Types.ObjectId(id), is_selected: true }).populate("enquiry_items.quantity.unit").populate({
      path: "enquiry_id",
      select: "enquiry_unique_id user_id priority shipping_address expiry_date",
      populate: {
        path: "shipping_address",
        select: "address"
      }
    }).populate("pickup_address", "address")
    // await Enquiry.findOneAndUpdate(
    //   { _id: result.enquiry_id },
    //   {
    //     $set: {
    //       selected_supplier: {
    //         quote_id: id
    //       }
    //     }
    //   }
    // );
    const suppiertotalprice = supplier.reduce((sum, quote) => {
      return sum + (quote.final_price || 0);
    }, 0);
    return res.status(200).json({
      message: `Query accepted successfully.`,
      // data: result,
      data: {
        enquiry,
        supplier,
        suppiertotalprice
      },
      code: 200
    });
  } catch (error) {
    utils.handleError(res, error);
  }
};
exports.updateSubmitQuery=async (req, res) => {
  const enq_id=req.params.id
  const {items,admin_price,logistics_price,margin_type,margin_value,grand_total}=req.body
  console.log('dataaaaaaaaaaaaa',req.body)
  // const exist=await EnquiryQuotes.findOne({_id:items.})
  // if(!exist) {
  //   return res.status(404).json({ 
  //     message: 'Quote not found',
  //     code: 404
  //   })
  // }
  let updatedItem
  for(const item of items){
     updatedItem = await EnquiryQuotes.findOneAndUpdate(
      {
        _id: item.quote_id,
        'enquiry_items._id': item.item_id 
      },
      {
        $set: {
          'enquiry_items.$.admin_unit_price': item.newUnitPrice,
          is_admin_updated: true,// Optional, based on your logic
          admin_price,
          logistics_price,
          margin_type,
          margin_value,
          grand_total
  
        }
      },
      { new: true }
    );

  }
 
  console.log('updatedItem',updatedItem)
  
  if(!updatedItem) {
    return res.status(400).json({
      message: 'Failed to update quote',
      code: 400
    })
  }
  return res.status(200).json({
    message: 'Quote updated successfully',
    data: updatedItem,
    code: 200
  })



}
exports.getlogisticquote=async (req, res) => {
  try {
          const { id } = req.params
          console.log("id : ", id)
  
          const data = await logistics_quotes.find({ enquiry_id: id })
              .populate({
                  path: 'enquiry_id',
                  populate: [
                      {
                          path: "selected_supplier.quote_id",
                          populate: { path: "pickup_address", strictPopulate: false }
                      },
                      {
                          path: "enquiry_items.quantity.unit"
                      }
                  ]
              });
          console.log("data : ", data)
  
          const count = await logistics_quotes.countDocuments({ enquiry_id: new mongoose.Types.ObjectId(id) })
  
          return res.status(200).json({
              message: "Logistics quotes fetched successfully",
              data,
              count,
              code: 200
          })
      } catch (error) {
          utils.handleError(res, error);
      }

}
exports.viewLogisticQuote=async (req, res) => {
  const { id } = req.params
  const logistic = await logistics_quotes.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(id) }
    },
    {
      $lookup: {
        from: "enquires",
        localField: "enquiry_id",
        foreignField: "_id",
        as: "enquiry"
      }
    },
    {
      $unwind: {
        path: "$enquiry",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: "enquiry_quotes",
        localField: "enquiry.selected_supplier.quote_id",
        foreignField: "_id",
        as: "quote"
      }
    },
    {
      $unwind: {
        path: "$quote",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: "addresses",
        localField: "quote.pickup_address",
        foreignField: "_id",
        as: "pickup_address"
      }
    },
    {
      $unwind: {
        path: "$pickup_address",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: "addresses",
        localField: "enquiry.shipping_address",
        foreignField: "_id",
        as: "shipping_address"
      }
    }
  ]);
  const subscriptiondata = await subscription.aggregate([
    {
      $match: {
        user_id: new mongoose.Types.ObjectId(data.enquiry_id.user_id),
        status: "active"
      }
    },
    {
      $lookup: {
        from: 'plans',
        let: { plan_id: '$plan_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$plan_id', '$$plan_id'] }
            }
          },
          {
            $project: {
              plan_id: 1,
              name: 1,
              duration: 1,
              price: 1,
              plan_step: 1
              // Add or remove fields here as needed
            }
          }
        ],
        as: 'plan'
      }
    },
    {
      $unwind: {
        path: '$plan',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        plan: 1,
        _id: 0
      }
    },
    {
      $sort: {
        createdAt: -1
      }
    },
    {
      $limit: 1
    }
  ]);

  console.log("data : ", data)
  const plan_step = subscriptiondata[0]?.plan?.plan_step || null;
  

 
  return res.status(200).json({
    message: "Logistics quote fetched successfully",
    data:logistic[0],
    plan_step,
    code: 200
  });
}
exports.acceptLogisticQuote=async (req, res) => {
  const id= req.params.id
  const updatelogisticQuote=await logistics_quotes.findByIdAndUpdate(id, { $set: { is_selected: true } }, { new: true })
  if (!updatelogisticQuote) {
    return res.status(404).json({
      message: "Logistics quote not found.",
      code: 404
    });
  }
  return res.status(200).json({
    message: "Logistics quote accepted successfully.",
    data: updatelogisticQuote,
    code: 200
  });
}
