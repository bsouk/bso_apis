const User = require("../../models/user");
const Address = require("../../models/address");
const bcrypt = require("bcrypt");

const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");

// Test email function
exports.testEmail = async (req, res) => {
  try {
    console.log("🧪 Testing email functionality...");
    
    const mailOptions = {
      to: "bsouk.ltd@gmail.com", // Test email
      subject: `Email Test - ${process.env.APP_NAME || 'BSO Services'}`,
      app_name: process.env.APP_NAME || 'BSO Services',
      email: "bsouk.ltd@gmail.com",
      name: "Test User",
      login_url: process.env.FRONTEND_PROD_URL || 'https://bsoservices.com/sign-in',
    };

    console.log("📧 Sending test email...");
    
    // Test with a simple email first
    const testMailOptions = {
      to: "bsouk.ltd@gmail.com",
      subject: "BSO Email Test",
      app_name: "BSO Services",
      email: "bsouk.ltd@gmail.com",
      name: "Test User",
      login_url: "https://bsoservices.com/sign-in",
    };

    await emailer.sendEmail(null, testMailOptions, "passwordUpdated");
    
    res.json({
      message: "✅ Test email sent successfully!",
      code: 200,
      data: {
        sent_to: "bsouk.ltd@gmail.com",
        template: "passwordUpdated"
      }
    });
    
  } catch (error) {
    console.error("❌ Email test failed:", error);
    res.status(500).json({
      message: "❌ Email test failed",
      code: 500,
      error: error.message
    });
  }
};
const mongoose = require("mongoose");
const generatePassword = require("generate-password");
const { generateUniqueUserId } = require("../../utils/userIdGenerator");
const product = require("../../models/product");
const commision = require("../../models/commision");
const EnquiryQuotes = require("../../models/EnquiryQuotes")
const AdminQuotes = require("../../models/admin_quotes")
const Enquiry = require("../../models/Enquiry")
const subscription = require("../../models/subscription");
const logistics_quotes = require("../../models/logistics_quotes");
const fcm_devices = require("../../models/fcm_devices");
const BusinessCategory = require("../../models/business_category");
const Rating = require("../../models/rating");
const payment = require("../../models/payment");
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');


async function genQuoteId() {
  let token = Math.floor(Math.random() * 100000000)
  return `quote-${token}`
}


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

exports.uploadMediaToBucket = async (req, res) => {
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
          let media = await utils.uploadImageToBucket({
            file: element,
            path: `${process.env.STORAGE_PATH}/${req.body.path}`,
          });
          mediaArray.push(`${req.body.path}/${media}`);
        } else if (supportedOtherTypes.includes(element.mimetype)) {
          let media = await utils.uploadFileToS3Bucket({
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
        let media = await utils.uploadImageToBucket({
          file: element,
          path: `${process.env.STORAGE_PATH}/${req.body.path}`,
        });
        const url = `${req.body.path}/${media}`;
        return res.status(200).json({
          code: 200,
          data: isArray === "true" ? [url] : url,
        });
      } else if (supportedOtherTypes.includes(element.mimetype)) {
        let media = await utils.uploadFileToS3Bucket({
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
    console.log(`📝 Starting addCustomer for email: ${data.email}`);

    // Validate required fields
    if (!data.email || !data.first_name || !data.last_name) {
      console.log(`❌ Missing required fields for ${data.email}`);
      return utils.handleError(res, {
        message: "Email, first name, and last name are required",
        code: 400,
      });
    }

    // Check if email already exists
    console.log(`🔍 Checking if email exists: ${data.email}`);
    const doesEmailExists = await emailer.emailExists(data.email);
    if (doesEmailExists) {
      console.log(`❌ Email already exists: ${data.email}`);
      return utils.handleError(res, {
        message: "This email address is already registered",
        code: 400,
      });
    }
    console.log(`✅ Email is available: ${data.email}`);

    // Check if phone number already exists
    if (data.phone_number) {
      const doesPhoneNumberExist = await emailer.checkMobileExists(data.phone_number);
      if (doesPhoneNumberExist) {
        return utils.handleError(res, {
          message: "This phone number is already registered",
          code: 400,
        });
      }
    }

    // Generate unique user ID with new pattern
    const uniqueUserId = await generateUniqueUserId(
      data.first_name,
      data.last_name,
      data.email,
      data.phone_number
    );

    // Password logic: use provided password, otherwise generate new one
    const password = data.password || createNewPassword();
    console.log(`🔐 Customer password: ${data.password ? 'Using provided password' : 'Auto-generated password'}`);

    // Prepare user data
    const userData = {
      ...data,
      unique_user_id: uniqueUserId,
      password,
      decoded_password: password,
      profile_completed: true,
      status: data.status || 'active', // Default to active if not provided
      is_user_approved_by_admin: true, // Auto-approve admin-created users
    };

    // Set user type based on company data
    // Only set as company if ALL required company fields are provided
    if (data.company_data && data.company_data.name && data.company_data.registration_number && 
        data.company_data.vat_number && data.company_data.incorporation_date) {
      userData.user_type = ["company"];
      userData.current_user_type = "company";
    } else {
      // Default to buyer for customer management
      userData.user_type = ["buyer"];
      userData.current_user_type = "buyer";
    }

    console.log(`💾 Saving user data for: ${data.email}`);
    const user = new User(userData);
    await user.save();
    console.log(`✅ User saved successfully: ${user.email}`);

    // Send welcome email using direct nodemailer (working method)
    console.log(`📧 Starting email sending process for ${user.email}...`);
    try {
      const nodemailer = require('nodemailer');
      const ejs = require('ejs');
      const path = require('path');

      // Create transporter
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL,
          pass: process.env.PASS,
        },
      });

      console.log(`📧 Transporter created for ${user.email}`);

      // Render email template
      const templatePath = path.join(__dirname, '../../views/accountCreated.ejs');
      console.log(`📁 Template path: ${templatePath}`);
      
      const emailHtml = await ejs.renderFile(templatePath, {
        app_name: process.env.APP_NAME || 'BSO Services',
      email: user.email,
      password: password,
      name: user.full_name,
      account_type: "customer",
      user_id: uniqueUserId,
        website_url: process.env.FRONTEND_PROD_URL || 'http://localhost:3039',
      });

      console.log(`📧 Template rendered for ${user.email}`);

      // Send email (non-blocking)
      transporter.sendMail({
        from: `"${process.env.APP_NAME || 'BSO Services'}" <${process.env.EMAIL}>`,
        to: user.email,
        subject: `Welcome to ${process.env.APP_NAME || 'BSO Services'}! Your Customer Account Has Been Created`,
        html: emailHtml,
      })
        .then(() => {
          console.log(`✅ Welcome email sent successfully to ${user.email}`);
        })
        .catch((emailError) => {
          console.error(`❌ Error sending welcome email to ${user.email}:`, emailError.message);
          console.error(`❌ Full error:`, emailError);
        });
    } catch (emailError) {
      console.error(`❌ Error preparing welcome email for ${user.email}:`, emailError.message);
      console.error(`❌ Full error:`, emailError);
    }
    
    res.json({ 
      message: "User added successfully", 
      code: 200,
      data: {
        user_id: uniqueUserId,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Error adding customer:', error);
    utils.handleError(res, error);
  }
};

exports.getCustomerList = async (req, res) => {
  try {
    const { limit = 10, offset = 0, search = "" } = req.query;

    const condition = {
      user_type: { $in: ["buyer", "company"] },
      is_deleted: false,
      $and: [
        {
          $or: [
            { is_trashed: false },
            { is_trashed: { $exists: false } } // Include users where is_trashed field doesn't exist
          ]
        }
      ]
    };

    if (search) {
      condition.$and.push({
        $or: [
          {
            full_name: { $regex: search, $options: "i" },
          },
          {
            email: { $regex: search, $options: "i" },
          },
          {
            phone_number: { $regex: search, $options: "i" },
          },
          {
            unique_user_id: { $regex: search, $options: "i" }, // Search by user ID
          },
          {
            first_name: { $regex: search, $options: "i" },
          },
          {
            last_name: { $regex: search, $options: "i" },
          },
        ]
      });
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

    // Track if password was updated for email notification
    let passwordUpdated = false;
    let newPassword = null;

    // Handle password hashing if password is provided
    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      userData.password = hashedPassword;
      userData.decoded_password = data.password;
      passwordUpdated = true;
      newPassword = data.password;
    }

    if (data.company_data) {
      if (data.company_data.name && data.company_data.registration_number && data.company_data.vat_number && data.company_data.incorporation_date) {
        // userData.user_type = "company"
        // userData['$push'] = { user_type: "company" }
        // userData.current_user_type = "company"
      } else {
        // userData.user_type = "buyer"
        userData['$push'] = { user_type: "buyer" }
        userData.current_user_type = "buyer"
      }
    }

    console.log("userData is ", userData)

    await User.findByIdAndUpdate(id, userData);

    // Send email notification if password was updated (non-blocking)
    if (passwordUpdated) {
      try {
        const nodemailer = require('nodemailer');
        const ejs = require('ejs');
        const path = require('path');

        // Create transporter
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: process.env.EMAIL,
            pass: process.env.PASS,
          },
        });

        // Render email template
        const templatePath = path.join(__dirname, '../../views/passwordUpdated.ejs');
        const emailHtml = await ejs.renderFile(templatePath, {
          app_name: process.env.APP_NAME || 'BSO Services',
          email: user.email,
          password: newPassword,
          name: user.full_name || `${user.first_name} ${user.last_name}`,
          login_url: process.env.FRONTEND_PROD_URL || 'http://localhost:3039',
          website_url: process.env.FRONTEND_PROD_URL || 'http://localhost:3039',
        });

        // Send email (non-blocking)
        transporter.sendMail({
          from: `"${process.env.APP_NAME || 'BSO Services'}" <${process.env.EMAIL}>`,
          to: user.email,
          subject: `Password Updated Successfully - ${process.env.APP_NAME || 'BSO Services'}`,
          html: emailHtml,
        })
          .then(() => {
            console.log(`✅ Password update email sent to ${user.email}`);
          })
          .catch((emailError) => {
            console.error(`❌ Error sending password update email to ${user.email}:`, emailError.message);
          });
      } catch (emailError) {
        console.error(`❌ Error preparing password update email for ${user.email}:`, emailError.message);
      }
    }

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
    // const isAllDeleted = await User.find({ _id: user_ids, is_deleted: true });

    // if (isAllDeleted.length == user_ids.length)
    //   return utils.handleError(res, {
    //     message: "All selected customers are already deleted",
    //     code: 400,
    //   });

    await User.deleteMany({ _id: user_ids });

    res.json({ message: "Selected customer have been deleted", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.addResource = async (req, res) => {
  try {
    const { createResource } = require('../../utils/createUserWithRole');
    const result = await createResource(req.body, res);
    
    if (result.success) {
      res.json({
        message: result.message,
        code: result.code,
        data: result.user
      });
    }
  } catch (error) {
    console.error('Error adding resource:', error);
    utils.handleError(res, error);
  }
};

exports.getResourceList = async (req, res) => {
  try {
    const { limit = 10, offset = 0, search = "" } = req.query;

    const condition = {
      user_type: { $in: ["resource"] },
      // profile_completed: true,
      is_deleted: false,
      is_trashed: { $ne: true },
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
exports.deleteRecruiter = async (req, res) => {
  try {
    const { ids } = req.body
    console.log('ids : ', req.body)
    const result = await User.deleteMany({ _id: { $in: ids } })
    // const allja = await job_applications.deleteMany({job_id : { $in : ids } })

    console.log('deleted Recruiter : ', result, allja, allsj)
    return res.status(200).json({
      message: "Resource deleted successfully",
      code: 200
    })
  } catch (error) {
    utils.handleError(res, error);
  }
}
exports.getRecruiterList = async (req, res) => {
  try {
    const { limit = 10, offset = 0, search = "" } = req.query;

    const condition = {
      user_type: { $in: ["recruiter"] },
      // profile_completed: true,
      is_deleted: false,
      is_trashed: { $ne: true },
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
          _id: 1,
          unique_user_id: 1,
          full_name: 1,
          email: 1,
          phone_number: 1,
          profile_image: 1,
          company_data: 1,
          status: 1,
          recruiter_status: 1, // Include role-specific status
          createdAt: 1,
          updatedAt: 1,
          user_type: 1,
          current_user_type: 1,
          profile_completed: 1,
          is_user_approved_by_admin: 1,
          recruiter_company_details: 1,
          recruiter_specializations: 1,
        },
      },
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

// exports.editResource = async (req, res) => {
//   try {
//     const data = req.body;
//     const id = req.params.id;

//     const user = await User.findById(id);
//     if (!user)
//       return utils.handleError(res, {
//         message: "Resource not found",
//         code: 404,
//       });

//     if (user.is_deleted)
//       return utils.handleError(res, {
//         message: "You cannot edit an account that has been deleted",
//         code: 400,
//       });

//     if (data.email) {
//       const doesEmailExists = await User.findOne({
//         email: data.email,
//         _id: { $ne: new mongoose.Types.ObjectId(id) },
//       });

//       if (doesEmailExists)
//         return utils.handleError(res, {
//           message: "This email address is already registered",
//           code: 400,
//         });
//     }

//     if (data.phone_number) {
//       const doesPhoneNumberExist = await User.findOne({
//         phone_number: data.phone_number,
//         _id: { $ne: new mongoose.Types.ObjectId(id) },
//       });
//       if (doesPhoneNumberExist)
//         return utils.handleError(res, {
//           message: "This phone number is already registered",
//           code: 400,
//         });
//     }

//     const updatedUser = await User.findByIdAndUpdate(id, data);
//     const requiredFields = [
//       "full_name",
//       "email",
//       "phone_number",
//       "profile_image",
//       "profile_title",
//       "profile_description",
//       "specialisations",
//       "rate_per_hour",
//       "project_pricing_model",
//       "resource_availability"
//     ]

//     console.log("resource check fields is ", requiredFields)

//     const isProfileComplete = requiredFields.map(field => isFieldPopulated(updatedUser, field));

//     const hasRequiredArrays =
//       Array.isArray(updatedUser.work_exprience) && updatedUser.work_exprience.length > 0 &&
//       Array.isArray(updatedUser.education) && updatedUser.education.length > 0 &&
//       Array.isArray(updatedUser.portfolio) && updatedUser.portfolio.length > 0 &&
//       Array.isArray(updatedUser.skills) && updatedUser.skills.length > 0 &&
//       Array.isArray(updatedUser.certifications) && updatedUser.certifications.length > 0 &&
//       Array.isArray(updatedUser.languages) && updatedUser.languages.length > 0 &&
//       Array.isArray(updatedUser.testimonials) && updatedUser.testimonials.length > 0 &&
//       Array.isArray(updatedUser.employement_history) && updatedUser.employement_history.length > 0;

//     console.log("isProfileComplete is ", isProfileComplete, " hasRequiredArrays is ", hasRequiredArrays)

//     if (isProfileComplete && hasRequiredArrays) {
//       updatedUser.profile_completed = true;
//     } else {
//       updatedUser.profile_completed = false;
//     }

//     await updatedUser.save();

//     res.json({ message: "Resource edit successfully", code: 200 });
//   } catch (error) {
//     utils.handleError(res, error);
//   }
// };

exports.editResource = async (req, res) => {
  try {
    const data = req.body;
    const id = req.params.id;

    const user = await User.findById(id);
    console.log("user is ", user)
    if (!user)
      return utils.handleError(res, {
        message: "Profile not found",
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

    if (data.switch_to) {
      let types = user.user_type
      if (types.includes(data.switch_to.trim()) && user.profile_completed === true) {
        return utils.handleError(res, {
          message: `You are already ${data.switch_to} user`,
          code: 400,
        });
      }
      if (!types.includes(data.switch_to.trim())) {
        types.push(data.switch_to.trim())
      }
      data.user_type = types
      data.current_user_type = data.switch_to
    }
    console.log("data : ", data)
    const updatedUser = await User.findByIdAndUpdate(id, data);
    console.log("updated user is ", updatedUser);

    // if (updatedUser.full_name && updatedUser.phone_number && updatedUser.email && updatedUser.first_name && updatedUser.last_name) {
    //     console.log("condition data is ", updatedUser.profile_completed)
    //     updatedUser.profile_completed = true;
    //     await updatedUser.save()
    // }
    // else {
    //     updatedUser.profile_completed = false
    //     await updatedUser.save()
    // }

    //function for checking field values 
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

    switch (updatedUser.current_user_type) {
      case "buyer": {
        // if (updatedUser.full_name && updatedUser.phone_number && updatedUser.email && updatedUser.first_name && updatedUser.last_name) {
        //     console.log("condition data is ", updatedUser.profile_completed)
        //     updatedUser.profile_completed = true;
        //     await updatedUser.save()
        // }

        const requiredFields = [
          'full_name',
          'email',
          'phone_number',
          "first_name",
          "last_name"
        ];

        console.log("buyer check fields is ", requiredFields)

        const isProfileComplete = requiredFields.map(field => isFieldPopulated(updatedUser, field));

        console.log("isProfileComplete is ", isProfileComplete)

        if (isProfileComplete) {
          updatedUser.profile_completed = true;
        } else {
          updatedUser.profile_completed = false;
        }

        await updatedUser.save();
      }
        break;
      case "supplier": {
        const requiredFields = [
          'full_name',
          'email',
          'phone_number',
          'bank_details.account_holder_name',
          'bank_details.account_number',
          'bank_details.bank_name',
          'bank_details.swift_code',
          'bank_details.iban_number',
          'bank_details.address.line1',
          'bank_details.address.city',
          'bank_details.address.state',
          'bank_details.address.zip_code',
          'bank_details.address.country',

          'company_data.name',
          'company_data.business_category',
          'company_data.phone_number',
          'company_data.name',
          'company_data.registration_number',
          'company_data.incorporation_date',
          'company_data.vat_number',
          'company_data.email',
          'company_data.address.line1',
          'company_data.address.city',
          'company_data.address.state',
          'company_data.address.zip_code',
          'company_data.address.country',
          'beneficiary_address.line1',
          'beneficiary_address.city',
          'beneficiary_address.state',
          'beneficiary_address.zip_code',
          'beneficiary_address.country',
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
      }
        break;
      case "logistics": {
        const requiredFields = [
          'full_name',
          'email',
          'phone_number',
          'company_data.name',
          'company_data.business_category',
          'company_data.phone_number',
          'company_data.email',
          'company_data.address.line1',
          'company_data.address.city',
          'company_data.address.zip_code',
          'company_data.address.state',
          'company_data.address.country',
          'company_data.address.service_area',
          'delivery_type'
        ];

        console.log("logistics check fields is ", requiredFields)

        const isProfileComplete = requiredFields.map(field => isFieldPopulated(updatedUser, field));

        const hasRequiredArrays =
          Array.isArray(updatedUser.insurances) && updatedUser.insurances.length > 0 &&
          Array.isArray(updatedUser.licenses) && updatedUser.licenses.length > 0;

        console.log("isProfileComplete is ", isProfileComplete, " hasRequiredArrays is ", hasRequiredArrays)

        if (isProfileComplete && hasRequiredArrays) {
          updatedUser.profile_completed = true;
        } else {
          updatedUser.profile_completed = false;
        }

        await updatedUser.save();

      }
        break;
      case "resource": {
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
          Array.isArray(updatedUser.testimonials) && updatedUser.testimonials.length > 0
        // Array.isArray(updatedUser.employement_history) && updatedUser.employement_history.length > 0;

        console.log("isProfileComplete is ", isProfileComplete, " hasRequiredArrays is ", hasRequiredArrays)

        if (isProfileComplete && hasRequiredArrays) {
          updatedUser.profile_completed = true;
        } else {
          updatedUser.profile_completed = false;
        }

        await updatedUser.save();

      }
        break;
      case "recruiter": {
        const requiredFields = [
          'company_data.name',
          'company_data.business_category',
          'company_data.phone_number',
          'company_data.name',
          'company_data.registration_number',
          'company_data.incorporation_date',
          'company_data.vat_number',
          'company_data.email',
          'company_data.address.line1',
          'company_data.address.city',
          'company_data.address.state',
          'company_data.address.zip_code',
          'company_data.address.country',
        ];

        console.log("supplier check fields is ", requiredFields)

        const isProfileComplete = requiredFields.map(field => isFieldPopulated(updatedUser, field));

        console.log("isProfileComplete is ", isProfileComplete)

        if (isProfileComplete) {
          updatedUser.profile_completed = true;
        } else {
          updatedUser.profile_completed = false;
        }

        await updatedUser.save();
      }
      default: {
        updatedUser.profile_completed = false
        await updatedUser.save()
      }
    }

    // updatedUser.user_type.forEach(async i => {
    //     switch (i) {
    //         case "buyer": {
    //             if (updatedUser.full_name && updatedUser.phone_number && updatedUser.email && updatedUser.first_name && updatedUser.last_name) {
    //                 console.log("condition data is ", updatedUser.profile_completed)
    //                 updatedUser.profile_completed = true;
    //                 await updatedUser.save()
    //             }
    //         }
    //             break;
    //         case "supplier": {
    //             const requiredFields = [
    //                 'full_name',
    //                 'profile_image',
    //                 'email',
    //                 'phone_number',
    //                 'bank_details.account_holder_name',
    //                 'bank_details.account_number',
    //                 'bank_details.bank_name',
    //                 'bank_details.swift_code',
    //                 'bank_details.iban_number',
    //                 'bank_details.address.line1',
    //                 'bank_details.address.line2',
    //                 'bank_details.address.city',
    //                 'bank_details.address.state',
    //                 'bank_details.address.zip_code',
    //                 'bank_details.address.country',
    //                 'company_data.company_logo',
    //                 'company_data.name',
    //                 'company_data.business_category',
    //                 'company_data.phone_number',
    //                 'company_data.name',
    //                 'company_data.registration_number',
    //                 'company_data.incorporation_date',
    //                 'company_data.vat_number',
    //                 'company_data.business_category',
    //                 'company_data.phone_number',
    //                 'company_data.email',
    //                 'company_data.address.line1',
    //                 'company_data.address.line2',
    //                 'company_data.address.city',
    //                 'company_data.address.state',
    //                 'company_data.address.zip_code',
    //                 'company_data.address.country',
    //                 'beneficiary_address.line1',
    //                 'beneficiary_address.line2',
    //                 'beneficiary_address.city',
    //                 'beneficiary_address.state',
    //                 'beneficiary_address.zip_code',
    //                 'beneficiary_address.country',
    //                 'additional_notes',
    //             ];

    //             console.log("supplier check fields is ", requiredFields)

    //             const isProfileComplete = requiredFields.map(field => isFieldPopulated(updatedUser, field));

    //             const hasRequiredArrays =
    //                 Array.isArray(updatedUser.sample_products) && updatedUser.sample_products.length > 0 &&
    //                 Array.isArray(updatedUser.business_certificates) && updatedUser.business_certificates.length > 0 &&
    //                 Array.isArray(updatedUser.licenses) && updatedUser.licenses.length > 0;

    //             console.log("isProfileComplete is ", isProfileComplete, " hasRequiredArrays is ", hasRequiredArrays)

    //             if (isProfileComplete && hasRequiredArrays) {
    //                 updatedUser.profile_completed = true;
    //             } else {
    //                 updatedUser.profile_completed = false;
    //             }

    //             await updatedUser.save();
    //         }
    //             break;
    //         case "logistics": {
    //             const requiredFields = [
    //                 'full_name',
    //                 'profile_image',
    //                 'email',
    //                 'phone_number',
    //                 'company_data.company_logo',
    //                 'company_data.name',
    //                 'company_data.business_category',
    //                 'company_data.phone_number',
    //                 'company_data.email',
    //                 'company_data.address.line1',
    //                 'company_data.address.line2',
    //                 'company_data.address.city',
    //                 'company_data.address.zip_code',
    //                 'company_data.address.state',
    //                 'company_data.address.country',
    //                 'company_data.address.service_area',
    //                 'delivery_type'
    //             ];

    //             console.log("logistics check fields is ", requiredFields)

    //             const isProfileComplete = requiredFields.map(field => isFieldPopulated(updatedUser, field));

    //             const hasRequiredArrays =
    //                 Array.isArray(updatedUser.insurances) && updatedUser.insurances.length > 0 &&
    //                 Array.isArray(updatedUser.licenses) && updatedUser.licenses.length > 0;

    //             console.log("isProfileComplete is ", isProfileComplete, " hasRequiredArrays is ", hasRequiredArrays)

    //             if (isProfileComplete && hasRequiredArrays) {
    //                 updatedUser.profile_completed = true;
    //             } else {
    //                 updatedUser.profile_completed = false;
    //             }

    //             await updatedUser.save();

    //         }
    //             break;
    //         case "resource": {
    //             const requiredFields = [
    //                 "full_name",
    //                 "email",
    //                 "phone_number",
    //                 "profile_image",
    //                 "profile_title",
    //                 "profile_description",
    //                 "specialisations",
    //                 "rate_per_hour",
    //                 "project_pricing_model",
    //                 "resource_availability"
    //             ]

    //             console.log("resource check fields is ", requiredFields)

    //             const isProfileComplete = requiredFields.map(field => isFieldPopulated(updatedUser, field));

    //             const hasRequiredArrays =
    //                 Array.isArray(updatedUser.work_exprience) && updatedUser.work_exprience.length > 0 &&
    //                 Array.isArray(updatedUser.education) && updatedUser.education.length > 0 &&
    //                 Array.isArray(updatedUser.portfolio) && updatedUser.portfolio.length > 0 &&
    //                 Array.isArray(updatedUser.skills) && updatedUser.skills.length > 0 &&
    //                 Array.isArray(updatedUser.certifications) && updatedUser.certifications.length > 0 &&
    //                 Array.isArray(updatedUser.languages) && updatedUser.languages.length > 0 &&
    //                 Array.isArray(updatedUser.testimonials) && updatedUser.testimonials.length > 0 &&
    //                 Array.isArray(updatedUser.employement_history) && updatedUser.employement_history.length > 0;

    //             console.log("isProfileComplete is ", isProfileComplete, " hasRequiredArrays is ", hasRequiredArrays)

    //             if (isProfileComplete && hasRequiredArrays) {
    //                 updatedUser.profile_completed = true;
    //             } else {
    //                 updatedUser.profile_completed = false;
    //             }

    //             await updatedUser.save();

    //         }
    //             break;
    //         default: {
    //             updatedUser.profile_completed = false
    //             await updatedUser.save()
    //         }
    //     }
    // })


    if (data?.company_data?.address) {
      const checkaddress = await Address.findOne({ user_id: id, address_type: "Company" });
      console.log("checkaddress : ", checkaddress)
      if (checkaddress) {
        const newAddress = await Address.findOneAndUpdate(
          {
            user_id: id,
            address_type: "Company"
          },
          {
            $set: {
              first_name: req?.user?.full_name,
              company_name: data?.company_data?.name,
              phone_number: data?.company_data?.phone_number,
              email: data?.company_data?.email,
              address: {
                city: {
                  name: data?.company_data?.address?.city,
                },
                state: {
                  name: data?.company_data?.address?.state,
                },
                country: {
                  name: data?.company_data?.address?.country,
                },
                address_line_1: data?.company_data?.address?.line1,
                address_line_2: data?.company_data?.address?.line2,
                pin_code: data?.company_data?.address?.zip_code
              },
              address_type: "Company",
            }
          },
          { new: true }
        )
        console.log("newAddress : ", newAddress)
      } else {
        const newAddress = await Address.create(
          {
            user_id: id,
            first_name: req?.user?.full_name,
            company_name: data?.company_data?.name,
            phone_number: data?.company_data?.phone_number,
            email: data?.company_data?.email,
            address: {
              city: {
                name: data?.company_data?.address?.city,
              },
              state: {
                name: data?.company_data?.address?.state,
              },
              country: {
                name: data?.company_data?.address?.country,
              },
              address_line_1: data?.company_data?.address?.line1,
              address_line_2: data?.company_data?.address?.line2,
              pin_code: data?.company_data?.address?.zip_code
            },
            default_address: true,
            is_primary: true,
            address_type: "Company",
          }
        )
        console.log("newAddress : ", newAddress)
      }
    }

    res.json({ message: "Profile edit successfully", code: 200 });
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
    // if (user.is_deleted)
    //   return utils.handleError(res, {
    //     message: "Resource has been already deleted",
    //     code: 400,
    //   });

    // user.is_deleted = true;
    // await user.save();

    await User.deleteOne({ _id: id });

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
    // const isAllDeleted = await User.find({ _id: user_ids, is_deleted: true });

    // if (isAllDeleted.length == user_ids.length)
    //   return utils.handleError(res, {
    //     message: "All selected resource are already deleted",
    //     code: 400,
    //   });

    // await User.updateMany({ _id: user_ids }, { is_deleted: true });

    await User.deleteMany({ _id: user_ids });

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
    const { createSupplier } = require('../../utils/createUserWithRole');
    const result = await createSupplier(req.body, res);
    
    if (result.success) {
      res.json({
        message: result.message,
        code: result.code,
        data: result.user
      });
    }
  } catch (error) {
    console.error('Error adding supplier:', error);
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
    if (data.switch_to) {
      let types = updatedUser.user_type
      if (types.includes(data.switch_to.trim()) && updatedUser.profile_completed === true) {
        return utils.handleError(res, {
          message: `You are already ${data.switch_to} user`,
          code: 400,
        });
      }
      if (!types.includes(data.switch_to.trim())) {
        types.push(data.switch_to.trim())
      }
      data.user_type = types
      data.current_user_type = data.switch_to
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
    // if (user.is_deleted)
    //   return utils.handleError(res, {
    //     message: "Customer has been already deleted",
    //     code: 400,
    //   });

    // user.is_deleted = true;
    // await user.save();

    await User.deleteOne({ _id: id });

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
      // profile_completed: true,
      is_deleted: false,
      is_trashed: { $ne: true }, // Exclude trashed suppliers
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
        {
          unique_user_id: { $regex: search, $options: "i" },
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
          supplier_status: 1, // Include role-specific status
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
    console.log("users : ", users);

    const suppliers = await Promise.all(users.map(async user => {
      if (user.company_data?.business_category) {
        try {
          const categoryIds = user.company_data.business_category
            .split(',')
            .map(id => id.trim())
            .filter(id => mongoose.Types.ObjectId.isValid(id))
            .map(id => new mongoose.Types.ObjectId(id));

          if (categoryIds.length > 0) {
            const categories = await BusinessCategory.find(
              { _id: { $in: categoryIds } },
              { name: 1 }
            );
            user.company_data.business_category = categories.map(cat => cat.name).join(", ");
          } else {
            user.company_data.business_category = "";
          }
        } catch (error) {
          console.error("Error processing categories:", error);
          user.company_data.business_category = "";
        }
      }
      return user;
    }));
    console.log("suppliers : ", suppliers)
    return res.json({ data: suppliers, count, code: 200 });
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
    // const isAllDeleted = await User.find({ _id: user_ids, is_deleted: true });

    // if (isAllDeleted.length == user_ids.length)
    //   return utils.handleError(res, {
    //     message: "All selected customers are already deleted",
    //     code: 400,
    //   });

    // await User.updateMany({ _id: user_ids }, { is_deleted: true });

    await User.deleteMany({ _id: user_ids });
    res.json({ message: "Selected Supplier have been deleted", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

// Logistics User

exports.addLogisticsUser = async (req, res) => {
  try {
    const { createLogisticsUser } = require('../../utils/createUserWithRole');
    const result = await createLogisticsUser(req.body, res);
    
    if (result.success) {
      res.json({
        message: result.message,
        code: result.code,
        data: result.user
      });
    }
  } catch (error) {
    console.error('Error adding logistics user:', error);
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
    if (data.switch_to) {
      let types = user.user_type
      if (types.includes(data.switch_to.trim()) && user.profile_completed === true) {
        return utils.handleError(res, {
          message: `You are already ${data.switch_to} user`,
          code: 400,
        });
      }
      if (!types.includes(data.switch_to.trim())) {
        types.push(data.switch_to.trim())
      }
      data.user_type = types
      data.current_user_type = data.switch_to
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
      // profile_completed: true,
      is_deleted: false,
      is_trashed: { $ne: true },
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
          logistics_status: 1, // Include role-specific status
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
    // if (user.is_deleted)
    //   return utils.handleError(res, {
    //     message: "Logistics has been already deleted",
    //     code: 400,
    //   });

    // user.is_deleted = true;
    // await user.save();

    await User.deleteOne({ _id: id });

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
    // const isAllDeleted = await User.find({ _id: user_ids, is_deleted: true });

    // if (isAllDeleted.length == user_ids.length)
    //   return utils.handleError(res, {
    //     message: "All selected Logistics are already deleted",
    //     code: 400,
    //   });

    // await User.updateMany({ _id: user_ids }, { is_deleted: true });

    await User.deleteMany({ _id: user_ids });

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


exports.sendProfileReply = async (req, res) => {
  try {
    const { user_id, reply } = req.body
    console.log("body : ", req.body)
    const Userdata = await User.findById({ _id: user_id });
    console.log("user is ", Userdata);

    if (!Userdata) {
      return utils.handleError(res, {
        message: "User Not Found",
        code: 400,
      });
    }

    const mailOptions = {
      to: Userdata.email,
      subject: "Profile Review Request",
      user_name: Userdata.full_name,
      app_url: process.env.APP_URL,
      storage_url: process.env.STORAGE_BASE_URL,
      message: reply
    }

    emailer.sendEmail(null, mailOptions, "profileReply");
    return res.status(200).json({
      message: "Email Sent Successfully",
      code: 200
    })
  } catch (error) {
    utils.handleError(res, error);
  }
}

//change Profile status (Legacy - affects global status)
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

// Role-based status toggle functions
exports.changeSupplierStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    console.log("Changing supplier status for user:", userId);

    const userData = await User.findById(userId);
    if (!userData) {
      return utils.handleError(res, {
        message: "User Not Found",
        code: 400,
      });
    }

    // Check if user has supplier role
    if (!userData.user_type.includes('supplier')) {
      return utils.handleError(res, {
        message: "User is not a supplier",
        code: 400,
      });
    }

    // Toggle supplier-specific status
    if (userData.supplier_status === "active") {
      userData.supplier_status = "inactive";
    } else {
      userData.supplier_status = "active";
    }

    await userData.save();

    res.status(200).json({
      success: true,
      message: "Supplier Status Changed Successfully",
      code: 200,
      data: {
        supplier_status: userData.supplier_status
      }
    });
  } catch (err) {
    utils.handleError(res, err);
  }
};

exports.changeLogisticsStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    console.log("Changing logistics status for user:", userId);

    const userData = await User.findById(userId);
    if (!userData) {
      return utils.handleError(res, {
        message: "User Not Found",
        code: 400,
      });
    }

    // Check if user has logistics role
    if (!userData.user_type.includes('logistics')) {
      return utils.handleError(res, {
        message: "User is not a logistics user",
        code: 400,
      });
    }

    // Toggle logistics-specific status
    if (userData.logistics_status === "active") {
      userData.logistics_status = "inactive";
    } else {
      userData.logistics_status = "active";
    }

    await userData.save();

    res.status(200).json({
      success: true,
      message: "Logistics Status Changed Successfully",
      code: 200,
      data: {
        logistics_status: userData.logistics_status
      }
    });
  } catch (err) {
    utils.handleError(res, err);
  }
};

exports.changeRecruiterStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    console.log("Changing recruiter status for user:", userId);

    const userData = await User.findById(userId);
    if (!userData) {
      return utils.handleError(res, {
        message: "User Not Found",
        code: 400,
      });
    }

    // Check if user has recruiter role
    if (!userData.user_type.includes('recruiter')) {
      return utils.handleError(res, {
        message: "User is not a recruiter",
        code: 400,
      });
    }

    // Toggle recruiter-specific status
    if (userData.recruiter_status === "active") {
      userData.recruiter_status = "inactive";
    } else {
      userData.recruiter_status = "active";
    }

    await userData.save();

    res.status(200).json({
      success: true,
      message: "Recruiter Status Changed Successfully",
      code: 200,
      data: {
        recruiter_status: userData.recruiter_status
      }
    });
  } catch (err) {
    utils.handleError(res, err);
  }
};


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
        { $match: { user_type: { $in: ['supplier'] }, _id: new mongoose.Types.ObjectId(productData?.user_id), is_deleted: false, is_trashed: { $ne: true } } },
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
        { $match: { user_type: { $in: ['supplier'] }, is_deleted: false, is_trashed: { $ne: true } } },
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
    console.log("enquiry id : ", id)

    const data = await EnquiryQuotes.find({ enquiry_id: new mongoose.Types.ObjectId(id), is_merged_quote: false })
      .populate('user_id', 'full_name email user_type current_user_type').populate('enquiry_items.quantity.unit').populate("pickup_address")
    console.log("data : ", data)

    const count = await EnquiryQuotes.countDocuments({ enquiry_id: new mongoose.Types.ObjectId(id), is_merged_quote: false })

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
    const data = await EnquiryQuotes.findOne({ _id: new mongoose.Types.ObjectId(id) }).populate('admin_payment_terms').populate('payment_terms').populate("enquiry_items.quantity.unit").populate({
      path: "enquiry_id",
      select: "enquiry_unique_id user_id priority shipping_address expiry_date",
      populate: {
        path: "shipping_address",
        select: "address"
      }
    }).populate("pickup_address", "address")

    console.log("data : ", data)

    const subscriptiondata = await subscription.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(data.enquiry_id.user_id),
          status: "active",
          type: "buyer"
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
            // {
            //   $project: {
            //     plan_id: 1,
            //     name: 1,
            //     duration: 1,
            //     price: 1,
            //     plan_step: 1
            //     // Add or remove fields here as needed
            //   }
            // }
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
      // {
      //   $project: {
      //     plan: 1,
      //     _id: 0
      //   }
      // },
      {
        $sort: {
          createdAt: -1
        }
      },
      {
        $limit: 1
      }
    ]);

    console.log("subscriptiondata : ", subscriptiondata)
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
      { $set: { is_admin_approved: is_selected } },
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
    const supplier = await EnquiryQuotes.find({ enquiry_id: new mongoose.Types.ObjectId(id), is_admin_approved: true }).populate("enquiry_items.quantity.unit").populate({
      path: "enquiry_id",
      select: "enquiry_unique_id user_id priority shipping_address expiry_date",
      populate: {
        path: "shipping_address",
        select: "address"
      }
    }).populate("pickup_address", "address")
    const adminquote = await AdminQuotes.findOne({ enquiry_id: new mongoose.Types.ObjectId(id) }).populate("enquiry_items.quantity.unit")

    const suppiertotalprice = supplier.reduce((sum, quote) => {
      return sum + (quote.final_price || 0);
    }, 0);
    return res.status(200).json({
      message: `Query accepted successfully.`,
      // data: result,
      data: {
        enquiry,
        supplier,
        adminquote,
        suppiertotalprice
      },
      code: 200
    });
  } catch (error) {
    utils.handleError(res, error);
  }
};
exports.updateSubmitQuery = async (req, res) => {
  const { updated_data, admin_price, logistics_price, grand_total, payment_terms, enq_id, items, pickup_address } = req.body
  console.log('data: ', req.body)
  const enquiry = await Enquiry.findOne({ _id: new mongoose.Types.ObjectId(enq_id) })
  console.log("enquiry : ", enquiry)

  let updatedItem
  for (const item of items) {
    if (item.admin_quote_id) {
      updatedItem = await AdminQuotes.findOneAndUpdate(
        {
          _id: item.admin_quote_id,
          'enquiry_items._id': item.item_id
        },
        {
          $set: {
            'enquiry_items.$.admin_unit_price': item.newUnitPrice,
            'enquiry_items.$.admin_margin_type': item.margin_type,
            'enquiry_items.$.admin_margin_value': item.margin_value,
            'enquiry_items.$.admin_quantity': item.admin_quantity,
            is_admin_updated: true,// Optional, based on your logic
            admin_price,
            logistics_price,
            admin_grand_total: grand_total,
            admin_payment_terms: payment_terms,
            ...req.body
          }
        },
        { new: true }
      );
    } else {
      updatedItem = await EnquiryQuotes.findOneAndUpdate(
        {
          _id: item.quote_id,
          'enquiry_items._id': item.item_id
        },
        {
          $set: {
            'enquiry_items.$.admin_unit_price': item.newUnitPrice,
            'enquiry_items.$.admin_margin_type': item.margin_type,
            'enquiry_items.$.admin_margin_value': item.margin_value,
            'enquiry_items.$.admin_quantity': item.admin_quantity,
            is_admin_updated: true,// Optional, based on your logic
            admin_price,
            logistics_price,
            admin_grand_total: grand_total,
            admin_payment_terms: payment_terms,
            ...req.body
          }
        },
        { new: true }
      );
    }
  }

  console.log('updatedItem', updatedItem)

  if (!updatedItem) {
    return res.status(400).json({
      message: 'Failed to update quote',
      code: 400
    })
  }

  enquiry.admin_grand_total = grand_total
  enquiry.logistics_charges = logistics_price
  enquiry.admin_price = admin_price
  await enquiry.save()

  // const quotedata = await EnquiryQuotes.create(updated_data)
  // console.log("quotedata : ", quotedata)

  // quotedata.admin_price = admin_price
  // quotedata.logistics_price = logistics_price
  // quotedata.admin_grand_total = grand_total
  // quotedata.admin_payment_terms = payment_terms
  // await quotedata.save()

  delete updated_data._id
  delete updated_data.quote_unique_id
  if (req.body.admin_included) {
    let quote_unique_id = await genQuoteId()

    const quotePayload = {
      ...updated_data,
      quote_unique_id,
      enquiry_id: enq_id,
      user_id: updated_data?.user_id,
      pickup_address: pickup_address,
      admin_price: Number(admin_price),
      logistics_price: Number(logistics_price),
      admin_grand_total: Number(grand_total),
      admin_payment_terms: payment_terms,
      is_admin_updated: true,
      is_admin_approved: true,
      is_merged_quote: true,
      type: "admin"
    };

    // Ensure `enquiry_items` are mapped properly
    quotePayload.enquiry_items = updated_data.enquiry_items.map(item => ({
      variant_id: item.variant_id ?? null,
      admin_unit_price: item.admin_unit_price?.custom_price ?? null,
      admin_margin_type: item.admin_unit_price?.charge_type ?? "flat",
      admin_margin_value: item.admin_unit_price?.marginvalue ?? 0,
      brand: item.brand,
      part_no: item.part_no,
      description: item.description,
      notes: item.notes || "",
      attachment: item.attachment || [],
      supplier_attachment: item.supplier_attachment || [],
      available_quantity: item.available_quantity,
      unit_price: item.unit_price,
      amount: item.unit_price * item.quantity.value,
      quantity: item.quantity,
      admin_quantity: item.admin_quantity,
      unit_weight: item.unit_weight,
      manufacturer: item.manufacturer
    }));

    // Create new supplier quote
    console.log("quotePayload : ", quotePayload)
    const newQuote = await EnquiryQuotes.create(quotePayload);
    console.log("New Quote Created:", newQuote);
  }

  return res.status(200).json({
    message: 'Quote updated successfully',
    data: updatedItem,
    code: 200
  })
}
exports.getlogisticquote = async (req, res) => {
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
exports.viewLogisticQuote = async (req, res) => {
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
        as: "enquiry",
        pipeline: [
          {
            $lookup: {
              from: "payment_terms",
              localField: "selected_payment_terms",
              foreignField: "_id",
              as: "selected_payment_terms"
            }
          },
          {
            $unwind: {
              path: "$selected_payment_terms",
              preserveNullAndEmptyArrays: true
            }
          }
        ]
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
  console.log('logistic', logistic)
  let logistic_id = logistic[0].enquiry.user_id;
  const subscriptiondata = await subscription.aggregate([
    {
      $match: {
        user_id: new mongoose.Types.ObjectId(logistic_id),
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
          // {
          //   $project: {
          //     plan_id: 1,
          //     name: 1,
          //     duration: 1,
          //     price: 1,
          //     plan_step: 1
          //     // Add or remove fields here as needed
          //   }
          // }
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

  console.log('subscriptiondata', subscriptiondata)

  const plan_step = subscriptiondata[0]?.plan?.plan_step || null;

  return res.status(200).json({
    message: "Logistics quote fetched successfully",
    data: logistic[0],
    plan_step,
    code: 200
  });
}
exports.acceptLogisticQuote = async (req, res) => {
  const id = req.params.id
  const updatelogisticQuote = await logistics_quotes.findByIdAndUpdate(id, { $set: { is_selected: true } }, { new: true })
  const selected = await Enquiry.findByIdAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(updatelogisticQuote?.enquiry_id)
    },
    {
      $set: {
        selected_logistics: {
          quote_id: new mongoose.Types.ObjectId(id)
        },
        shipment_type: "delivery"
      }
    }, { new: true }
  )
  console.log("selected : ", selected)
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



exports.addFCMDevice = async (req, res) => {
  try {
    const { device_id, device_type, token } = req.body;
    const user_id = req.user._id;

    const data = {
      user_id: user_id,
      device_id: device_id,
      device_type: device_type,
      token: token,
      user_type: "admin"
    };
    const item = new fcm_devices(data);
    await item.save();

    res.json({
      message: "Admin Token added successfully",
      code: 200,
    });
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
};

exports.deleteFCMDevice = async (req, res) => {
  try {
    const { token } = req.body;
    const user_id = req.user._id;

    const fcmToken = await fcm_devices.findOne({
      user_id: user_id,
      token: token,
    });

    if (!fcmToken)
      return utils.handleError(res, {
        message: "Token not found",
        code: 404,
      });

    await fcm_devices.deleteOne({ user_id: user_id, token: token });

    res.json({
      message: "Admin Token deleted successfully",
      code: 200,
    });
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
};



exports.deleteAdminQuote = async (req, res) => {
  try {
    const { id, item_id } = req.body
    console.log('data', req.body)
    const result = await AdminQuotes.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        'enquiry_items._id': new mongoose.Types.ObjectId(item_id)
      },
      {
        $pull: {
          enquiry_items: { _id: new mongoose.Types.ObjectId(item_id) }
        },
      },
      { new: true }
    );
    console.log('result', result)
    return res.status(200).json({
      message: "Admin quote deleted successfully",
      code: 200,
    });
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
}


exports.editAdminQuote = async (req, res) => {
  try {
    const data = req.body
    console.log('data', req.body)
    const result = await AdminQuotes.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(data?.id),
        'enquiry_items._id': new mongoose.Types.ObjectId(data?.item_id)
      },
      {
        $set: {
          'enquiry_items.$.unit_weight': data?.unit_weight,
          'enquiry_items.$.unit_price': data?.unit_price,
          'enquiry_items.$.available_quantity': data?.available_quantity
        }
      },
      { new: true }
    )
    console.log('result', result)
    res.json({
      message: "Admin quote edited successfully",
      data: result,
      code: 200,
    });
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
}




async function uploadBufferToFile({ buffer, path: dirPath, filename }) {
  return new Promise((resolve, reject) => {
    const name = filename || Date.now() + '.pdf';
    const filePath = path.join(dirPath, name);

    // Ensure the directory exists
    try {
      fs.mkdirSync(dirPath, { recursive: true });
    } catch (err) {
      console.error('Failed to create directory:', err);
      return reject(err);
    }

    // Write the buffer to disk
    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        console.error('Failed to write buffer to file:', err);
        return reject(err);
      }
      resolve(name); // or resolve({ name, filePath }) if you want full path
    });
  });
}


exports.generateResumePDF = async (req, res) => {
  try {
    const { htmlContent } = req.body;

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '3mm', bottom: '3mm', left: '3mm', right: '3mm' }
    });

    await browser.close();

    const fileName = Date.now() + 'resume.pdf';

    const savedFileName = await uploadBufferToFile({
      buffer: pdfBuffer,
      path: path.join(process.env.STORAGE_PATH, "resume"),
      filename: fileName,
    });

    const fileUrl = `${process.env.BASE_URL}/resume/${savedFileName}`;

    return res.status(200).json({
      message: 'PDF generated and uploaded successfully',
      data: `resume/${savedFileName}`
    });

  } catch (error) {
    console.error('Error generating resume PDF:', error);
    return res.status(500).json({ error: 'Failed to generate PDF' });
  }
};


exports.ratingandreview = async (req, res) => {
  try {
    const user_id = req.params.id;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    // 1️⃣ Paginated review data
    const data = await Rating.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(user_id),
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'company_id',
          foreignField: '_id',
          as: 'company_details',
        },
      },
      {
        $unwind: {
          path: '$company_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          count: 1,
          comment: 1,
          createdAt: 1,
          company_id: 1,
          user_id: 1,
          company_details: {
            _id: '$company_details._id',
            full_name: '$company_details.full_name',
            email: '$company_details.email',
            profile_image: '$company_details.profile_image',
          },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: offset },
      { $limit: limit },
    ]);

    // 2️⃣ Stats based on `count` field
    const stats = await Rating.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(user_id),
        },
      },
      {
        $group: {
          _id: '$count', // 👈 use 'count' as rating value
          count: { $sum: 1 },
        },
      },
    ]);

    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRatings = 0;
    let ratingSum = 0;

    stats.forEach((stat) => {
      const rate = Math.round(stat._id); // rating value
      if (rate >= 1 && rate <= 5) {
        ratingBreakdown[rate] = stat.count;
        totalRatings += stat.count;
        ratingSum += rate * stat.count;
      }
    });

    const averageRating = totalRatings ? (ratingSum / totalRatings).toFixed(2) : 0;

    // ✅ Response
    res.json({
      data,
      averageRating: Number(averageRating),
      totalRatings,
      ratingBreakdown,

      code: 200,
    });
  } catch (error) {
    utils.handleError(res, error);
  }
};

// ===============================
// TRASH FUNCTIONALITY - SOFT DELETE
// ===============================

// Trash customer (soft delete)
exports.trashCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id;

    const user = await User.findById(id);
    if (!user) {
      return utils.handleError(res, {
        message: "User not found",
        code: 404,
      });
    }

    if (user.is_trashed) {
      return utils.handleError(res, {
        message: "User is already trashed",
        code: 400,
      });
    }

    // Update user to trashed status
    await User.findByIdAndUpdate(id, {
      is_trashed: true,
      trashed_at: new Date(),
      trashed_by: adminId,
      status: 'inactive'
    });

    res.json({
      message: "User moved to trash successfully",
      code: 200,
    });
  } catch (error) {
    console.error('Error trashing customer:', error);
    utils.handleError(res, error);
  }
};

// Restore customer from trash
exports.restoreCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return utils.handleError(res, {
        message: "User not found",
        code: 404,
      });
    }

    if (!user.is_trashed) {
      return utils.handleError(res, {
        message: "User is not trashed",
        code: 400,
      });
    }

    // Restore user
    await User.findByIdAndUpdate(id, {
      is_trashed: false,
      trashed_at: null,
      trashed_by: null,
      status: 'active'
    });

    res.json({
      message: "User restored successfully",
      code: 200,
    });
  } catch (error) {
    console.error('Error restoring customer:', error);
    utils.handleError(res, error);
  }
};

// Permanently delete customer from trash
exports.deleteCustomerPermanently = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return utils.handleError(res, {
        message: "User not found",
        code: 404,
      });
    }

    if (!user.is_trashed) {
      return utils.handleError(res, {
        message: "User is not trashed",
        code: 400,
      });
    }

    // Permanently delete user from database
    await User.findByIdAndDelete(id);

    res.json({ 
      message: "Customer permanently deleted successfully", 
      code: 200
    });
  } catch (error) {
    console.error('Error permanently deleting customer:', error);
    utils.handleError(res, error);
  }
};

// Get trashed customers list
exports.getTrashedCustomerList = async (req, res) => {
  try {
    const { limit = 10, offset = 0, search = "" } = req.query;

    const condition = {
      user_type: { $in: ["buyer", "company"] },
      is_deleted: false,
      is_trashed: true, // Only trashed users
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
        {
          unique_user_id: { $regex: search, $options: "i" },
        },
        {
          first_name: { $regex: search, $options: "i" },
        },
        {
          last_name: { $regex: search, $options: "i" },
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
          trashed_at: -1,
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
          unique_user_id: 1,
          createdAt: 1,
          last_login: 1,
          trashed_at: 1,
          trashed_by: 1,
          user_type: 1,
          current_user_type: 1,
          company_data: 1,
        },
      },
    ]);

    const [count, users] = await Promise.all([countPromise, usersPromise]);

    res.json({
      message: "Trashed customers retrieved successfully",
      code: 200,
      data: users,
      count: count,
    });
  } catch (error) {
    console.error('Error getting trashed customers:', error);
    utils.handleError(res, error);
  }
};

// ================================
// SUPPLIER TRASH FUNCTIONALITY
// ================================

// Trash supplier (role-based soft delete)
exports.trashSupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const adminId = req.user._id;

    const { trashUserRole } = require('../../utils/roleBasedDeletion');
    const result = await trashUserRole(supplierId, 'supplier', adminId);
    
    if (result.success) {
      res.json({
        message: result.message,
        code: result.code,
        data: result.data
      });
    } else {
      res.status(result.code).json({
        message: result.message,
        code: result.code
      });
    }

  } catch (error) {
    console.error('Error trashing supplier:', error);
    utils.handleError(res, error);
  }
};

// Restore supplier from trash (role-based restoration)
exports.restoreSupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;

    const { restoreUserRole } = require('../../utils/roleBasedDeletion');
    const result = await restoreUserRole(supplierId, 'supplier');
    
    if (result.success) {
    res.json({
        message: result.message,
        code: result.code,
        data: result.data
      });
    } else {
      res.status(result.code).json({
        message: result.message,
        code: result.code
      });
    }

  } catch (error) {
    console.error('Error restoring supplier:', error);
    utils.handleError(res, error);
  }
};

// Delete supplier permanently (role-based deletion)
exports.deleteSupplierPermanently = async (req, res) => {
  try {
    const { supplierId } = req.params;

    const { deleteUserRolePermanently } = require('../../utils/roleBasedDeletion');
    const result = await deleteUserRolePermanently(supplierId, 'supplier');
    
    if (result.success) {
    res.json({
        message: result.message,
        code: result.code,
        data: result.data
      });
    } else {
      res.status(result.code).json({
        message: result.message,
        code: result.code
      });
    }

  } catch (error) {
    console.error('Error deleting supplier permanently:', error);
    utils.handleError(res, error);
  }
};

// Get trashed suppliers list
exports.getTrashedSupplierList = async (req, res) => {
  try {
    const { search = '', limit = 10, offset = 0 } = req.query;

    const query = {
      user_type: { $in: ['supplier'] },
      is_trashed: true, // Only trashed users
    };

    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { unique_user_id: { $regex: search, $options: 'i' } }
      ];
    }

    const suppliers = await User.find(query)
      .populate('trashed_by', 'full_name email')
      .sort({
        trashed_at: -1,
      })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .select('full_name email phone_number unique_user_id status createdAt last_login profile_image company_data trashed_at trashed_by');

    const totalCount = await User.countDocuments(query);

    res.json({
      data: suppliers,
      count: totalCount,
      message: "Trashed suppliers retrieved successfully",
      code: 200
    });

  } catch (error) {
    console.error('Error getting trashed suppliers:', error);
    utils.handleError(res, error);
  }
};

// Switch supplier to customer (add customer role while keeping supplier role)
exports.switchSupplierToCustomer = async (req, res) => {
  try {
    const { supplierId } = req.params;

    const supplier = await User.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({
        message: "Supplier not found",
        code: 404
      });
    }

    // Check if supplier has supplier role
    if (!supplier.user_type.includes('supplier')) {
      return res.status(400).json({
        message: "User is not a supplier",
        code: 400
      });
    }

    // Add customer role while keeping supplier role
    const updatedUserType = [...supplier.user_type]; // Keep existing roles
    if (!updatedUserType.includes('buyer')) {
      updatedUserType.push('buyer'); // Add buyer role (customer)
    }

    // Update user type (keep current_user_type as supplier)
    await User.findByIdAndUpdate(supplierId, {
      user_type: updatedUserType,
      updated_at: new Date()
    });

    // Send role update email notification
    try {
      const emailer = require('../../utils/emailer');
      const mailOptions = {
        to: supplier.email,
        subject: `Role Updated - You now have Customer access on ${process.env.APP_NAME || 'BSO Services'}`,
        app_name: process.env.APP_NAME || 'BSO Services',
        email: supplier.email,
        name: supplier.full_name,
        new_role: 'Customer',
      };

      await emailer.sendEmail(null, mailOptions, "roleUpdated");
      console.log(`✅ Role update email sent to ${supplier.email}`);
    } catch (emailError) {
      console.error(`❌ Error sending role update email to ${supplier.email}:`, emailError.message);
    }

    res.json({
      message: "Customer role added successfully. User now has both supplier and customer roles.",
      code: 200,
      data: {
        user_id: supplier.unique_user_id,
        email: supplier.email,
        user_type: updatedUserType,
        current_user_type: supplier.current_user_type
      }
    });
  } catch (error) {
    console.error('Error adding customer role to supplier:', error);
    utils.handleError(res, error);
  }
};

// Switch supplier to logistic (add logistic role while keeping supplier role)
exports.switchSupplierToLogistic = async (req, res) => {
  try {
    const { supplierId } = req.params;

    const supplier = await User.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({
        message: "Supplier not found",
        code: 404
      });
    }

    // Check if supplier has supplier role
    if (!supplier.user_type.includes('supplier')) {
      return res.status(400).json({
        message: "User is not a supplier",
        code: 400
      });
    }

    // Add logistic role while keeping supplier role
    const updatedUserType = [...supplier.user_type]; // Keep existing roles
    if (!updatedUserType.includes('logistics')) {
      updatedUserType.push('logistics'); // Add logistics role
    }

    // Update user type (keep current_user_type as supplier)
    await User.findByIdAndUpdate(supplierId, {
      user_type: updatedUserType,
      updated_at: new Date()
    });

    // Send role update email notification
    try {
      const emailer = require('../../utils/emailer');
      const mailOptions = {
        to: supplier.email,
        subject: `Role Updated - You now have Logistics access on ${process.env.APP_NAME || 'BSO Services'}`,
        app_name: process.env.APP_NAME || 'BSO Services',
        email: supplier.email,
        name: supplier.full_name,
        new_role: 'Logistics',
      };

      await emailer.sendEmail(null, mailOptions, "roleUpdated");
      console.log(`✅ Role update email sent to ${supplier.email}`);
    } catch (emailError) {
      console.error(`❌ Error sending role update email to ${supplier.email}:`, emailError.message);
    }

    res.json({
      message: "Logistic role added successfully. User now has both supplier and logistic roles.",
      code: 200,
      data: {
        user_id: supplier.unique_user_id,
        email: supplier.email,
        user_type: updatedUserType,
        current_user_type: supplier.current_user_type
      }
    });
  } catch (error) {
    console.error('Error adding logistic role to supplier:', error);
    utils.handleError(res, error);
  }
};

// Switch supplier to recruiter (add recruiter role while keeping supplier role)
exports.switchSupplierToRecruiter = async (req, res) => {
  try {
    const { supplierId } = req.params;

    const supplier = await User.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({
        message: "Supplier not found",
        code: 404
      });
    }

    // Check if supplier has supplier role
    if (!supplier.user_type.includes('supplier')) {
      return res.status(400).json({
        message: "User is not a supplier",
        code: 400
      });
    }

    // Add recruiter role while keeping supplier role
    const updatedUserType = [...supplier.user_type]; // Keep existing roles
    if (!updatedUserType.includes('recruiter')) {
      updatedUserType.push('recruiter'); // Add recruiter role
    }

    // Update user type (keep current_user_type as supplier)
    await User.findByIdAndUpdate(supplierId, {
      user_type: updatedUserType,
      updated_at: new Date()
    });

    // Send role update email notification
    try {
      const emailer = require('../../utils/emailer');
      const mailOptions = {
        to: supplier.email,
        subject: `Role Updated - You now have Recruiter access on ${process.env.APP_NAME || 'BSO Services'}`,
        app_name: process.env.APP_NAME || 'BSO Services',
        email: supplier.email,
        name: supplier.full_name,
        new_role: 'Recruiter',
      };

      await emailer.sendEmail(null, mailOptions, "roleUpdated");
      console.log(`✅ Role update email sent to ${supplier.email}`);
    } catch (emailError) {
      console.error(`❌ Error sending role update email to ${supplier.email}:`, emailError.message);
    }

    res.json({
      message: "Recruiter role added successfully. User now has both supplier and recruiter roles.",
      code: 200,
      data: {
        user_id: supplier.unique_user_id,
        email: supplier.email,
        user_type: updatedUserType,
        current_user_type: supplier.current_user_type
      }
    });
  } catch (error) {
    console.error('Error adding recruiter role to supplier:', error);
    utils.handleError(res, error);
  }
};

// Switch supplier to resource (add resource role while keeping supplier role)
exports.switchSupplierToResource = async (req, res) => {
  try {
    const { supplierId } = req.params;

    const supplier = await User.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({
        message: "Supplier not found",
        code: 404
      });
    }

    // Check if supplier has supplier role
    if (!supplier.user_type.includes('supplier')) {
      return res.status(400).json({
        message: "User is not a supplier",
        code: 400
      });
    }

    // Add resource role while keeping supplier role
    const updatedUserType = [...supplier.user_type]; // Keep existing roles
    if (!updatedUserType.includes('resource')) {
      updatedUserType.push('resource'); // Add resource role
    }

    // Update user type (keep current_user_type as supplier)
    await User.findByIdAndUpdate(supplierId, {
      user_type: updatedUserType,
      updated_at: new Date()
    });

    // Send role update email notification
    try {
      const emailer = require('../../utils/emailer');
      const mailOptions = {
        to: supplier.email,
        subject: `Role Updated - You now have Resource access on ${process.env.APP_NAME || 'BSO Services'}`,
        app_name: process.env.APP_NAME || 'BSO Services',
        email: supplier.email,
        name: supplier.full_name,
        new_role: 'Resource',
      };

      await emailer.sendEmail(null, mailOptions, "roleUpdated");
      console.log(`✅ Role update email sent to ${supplier.email}`);
    } catch (emailError) {
      console.error(`❌ Error sending role update email to ${supplier.email}:`, emailError.message);
    }

    res.json({
      message: "Resource role added successfully. User now has both supplier and resource roles.",
      code: 200,
      data: {
        user_id: supplier.unique_user_id,
        email: supplier.email,
        user_type: updatedUserType,
        current_user_type: supplier.current_user_type
      }
    });
  } catch (error) {
    console.error('Error adding resource role to supplier:', error);
    utils.handleError(res, error);
  }
};

// ================================
// LOGISTICS TRASH FUNCTIONALITY
// ================================

// Trash logistics user (soft delete)
exports.trashLogistics = async (req, res) => {
  try {
    const { logisticsId } = req.params;
    const adminId = req.user._id;

    const logistics = await User.findById(logisticsId);
    if (!logistics) {
      return res.status(404).json({
        message: "Logistics user not found",
        code: 404
      });
    }

    if (!logistics.user_type.includes('logistics')) {
      return res.status(400).json({
        message: "User is not a logistics user",
        code: 400
      });
    }

    if (logistics.is_trashed) {
      return res.status(400).json({
        message: "Logistics user is already trashed",
        code: 400
      });
    }

    await User.findByIdAndUpdate(logisticsId, {
      is_trashed: true,
      trashed_at: new Date(),
      trashed_by: adminId,
    });

    res.json({
      message: "Logistics user moved to trash successfully",
      code: 200
    });

  } catch (error) {
    console.error('Error trashing logistics user:', error);
    utils.handleError(res, error);
  }
};

// Restore logistics user from trash
exports.restoreLogistics = async (req, res) => {
  try {
    const { logisticsId } = req.params;

    const logistics = await User.findById(logisticsId);
    if (!logistics) {
      return res.status(404).json({
        message: "Logistics user not found",
        code: 404
      });
    }

    if (!logistics.is_trashed) {
      return res.status(400).json({
        message: "Logistics user is not trashed",
        code: 400
      });
    }

    await User.findByIdAndUpdate(logisticsId, {
      is_trashed: false,
      trashed_at: null,
      trashed_by: null,
    });

    res.json({
      message: "Logistics user restored successfully",
      code: 200
    });

  } catch (error) {
    console.error('Error restoring logistics user:', error);
    utils.handleError(res, error);
  }
};

// Delete logistics permanently (role-based deletion)
exports.deleteLogisticsPermanently = async (req, res) => {
  try {
    const { logisticsId } = req.params;

    const { deleteUserRolePermanently } = require('../../utils/roleBasedDeletion');
    const result = await deleteUserRolePermanently(logisticsId, 'logistics');
    
    if (result.success) {
      res.json({
        message: result.message,
        code: result.code,
        data: result.data
      });
    } else {
      res.status(result.code).json({
        message: result.message,
        code: result.code
      });
    }

  } catch (error) {
    console.error('Error deleting logistics permanently:', error);
    utils.handleError(res, error);
  }
};

// Get trashed logistics users list
exports.getTrashedLogisticsList = async (req, res) => {
  try {
    const { search = '', limit = 10, offset = 0 } = req.query;

    const query = {
      user_type: { $in: ['logistics'] },
      is_trashed: true,
    };

    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { unique_user_id: { $regex: search, $options: 'i' } }
      ];
    }

    const logistics = await User.find(query)
      .populate('trashed_by', 'full_name email')
      .sort({ trashed_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .select('full_name email phone_number unique_user_id status createdAt last_login profile_image company_data address trashed_at trashed_by');

    const totalCount = await User.countDocuments(query);

    res.json({
      data: logistics,
      count: totalCount,
      message: "Trashed logistics users retrieved successfully",
      code: 200
    });

  } catch (error) {
    console.error('Error getting trashed logistics users:', error);
    utils.handleError(res, error);
  }
};

// Switch logistics to customer (add customer role while keeping logistics role)
exports.switchLogisticsToCustomer = async (req, res) => {
  try {
    const { logisticsId } = req.params;

    const logistics = await User.findById(logisticsId);
    if (!logistics) {
      return res.status(404).json({
        message: "Logistics user not found",
        code: 404
      });
    }

    if (!logistics.user_type.includes('logistics')) {
      return res.status(400).json({
        message: "User is not a logistics user",
        code: 400
      });
    }

    // Add customer role while keeping logistics role
    const updatedUserType = [...logistics.user_type];
    if (!updatedUserType.includes('buyer')) {
      updatedUserType.push('buyer');
    }

    await User.findByIdAndUpdate(logisticsId, {
      user_type: updatedUserType,
      updated_at: new Date()
    });

    // Send role update email notification
    try {
      const emailer = require('../../utils/emailer');
      const mailOptions = {
        to: logistics.email,
        subject: `Role Updated - You now have Customer access on ${process.env.APP_NAME || 'BSO Services'}`,
        app_name: process.env.APP_NAME || 'BSO Services',
        email: logistics.email,
        name: logistics.full_name,
        new_role: 'Customer',
      };

      await emailer.sendEmail(null, mailOptions, "roleUpdated");
      console.log(`✅ Role update email sent to ${logistics.email}`);
    } catch (emailError) {
      console.error(`❌ Error sending role update email to ${logistics.email}:`, emailError.message);
    }

    res.json({
      message: "Customer role added successfully. User now has both logistics and customer roles.",
      code: 200,
      data: {
        user_id: logistics.unique_user_id,
        email: logistics.email,
        user_type: updatedUserType,
        current_user_type: logistics.current_user_type
      }
    });
  } catch (error) {
    console.error('Error adding customer role to logistics:', error);
    utils.handleError(res, error);
  }
};

// Switch logistics to supplier (add supplier role while keeping logistics role)
exports.switchLogisticsToSupplier = async (req, res) => {
  try {
    const { logisticsId } = req.params;

    const logistics = await User.findById(logisticsId);
    if (!logistics) {
      return res.status(404).json({
        message: "Logistics user not found",
        code: 404
      });
    }

    if (!logistics.user_type.includes('logistics')) {
      return res.status(400).json({
        message: "User is not a logistics user",
        code: 400
      });
    }

    // Add supplier role while keeping logistics role
    const updatedUserType = [...logistics.user_type];
    if (!updatedUserType.includes('supplier')) {
      updatedUserType.push('supplier');
    }

    await User.findByIdAndUpdate(logisticsId, {
      user_type: updatedUserType,
      updated_at: new Date()
    });

    // Send role update email notification
    try {
      const emailer = require('../../utils/emailer');
      const mailOptions = {
        to: logistics.email,
        subject: `Role Updated - You now have Supplier access on ${process.env.APP_NAME || 'BSO Services'}`,
        app_name: process.env.APP_NAME || 'BSO Services',
        email: logistics.email,
        name: logistics.full_name,
        new_role: 'Supplier',
      };

      await emailer.sendEmail(null, mailOptions, "roleUpdated");
      console.log(`✅ Role update email sent to ${logistics.email}`);
    } catch (emailError) {
      console.error(`❌ Error sending role update email to ${logistics.email}:`, emailError.message);
    }

    res.json({
      message: "Supplier role added successfully. User now has both logistics and supplier roles.",
      code: 200,
      data: {
        user_id: logistics.unique_user_id,
        email: logistics.email,
        user_type: updatedUserType,
        current_user_type: logistics.current_user_type
      }
    });
  } catch (error) {
    console.error('Error adding supplier role to logistics:', error);
    utils.handleError(res, error);
  }
};

// Switch logistics to recruiter (add recruiter role while keeping logistics role)
exports.switchLogisticsToRecruiter = async (req, res) => {
  try {
    const { logisticsId } = req.params;

    const logistics = await User.findById(logisticsId);
    if (!logistics) {
      return res.status(404).json({
        message: "Logistics user not found",
        code: 404
      });
    }

    if (!logistics.user_type.includes('logistics')) {
      return res.status(400).json({
        message: "User is not a logistics user",
        code: 400
      });
    }

    // Add recruiter role while keeping logistics role
    const updatedUserType = [...logistics.user_type];
    if (!updatedUserType.includes('recruiter')) {
      updatedUserType.push('recruiter');
    }

    await User.findByIdAndUpdate(logisticsId, {
      user_type: updatedUserType,
      updated_at: new Date()
    });

    // Send role update email notification
    try {
      const emailer = require('../../utils/emailer');
      const mailOptions = {
        to: logistics.email,
        subject: `Role Updated - You now have Recruiter access on ${process.env.APP_NAME || 'BSO Services'}`,
        app_name: process.env.APP_NAME || 'BSO Services',
        email: logistics.email,
        name: logistics.full_name,
        new_role: 'Recruiter',
      };

      await emailer.sendEmail(null, mailOptions, "roleUpdated");
      console.log(`✅ Role update email sent to ${logistics.email}`);
    } catch (emailError) {
      console.error(`❌ Error sending role update email to ${logistics.email}:`, emailError.message);
    }

    res.json({
      message: "Recruiter role added successfully. User now has both logistics and recruiter roles.",
      code: 200,
      data: {
        user_id: logistics.unique_user_id,
        email: logistics.email,
        user_type: updatedUserType,
        current_user_type: logistics.current_user_type
      }
    });
  } catch (error) {
    console.error('Error adding recruiter role to logistics:', error);
    utils.handleError(res, error);
  }
};

// List logistics profile
exports.listLogisticsProfile = async (req, res) => {
  try {
    const { logisticsId } = req.params;

    const logistics = await User.findById(logisticsId);
    if (!logistics) {
      return res.status(404).json({
        message: "Logistics user not found",
        code: 404
      });
    }

    await User.findByIdAndUpdate(logisticsId, {
      profile_listed: true,
      updated_at: new Date()
    });

    res.json({
      message: "Logistics profile listed successfully",
      code: 200
    });
  } catch (error) {
    console.error('Error listing logistics profile:', error);
    utils.handleError(res, error);
  }
};

// ================================
// RESOURCE TRASH FUNCTIONALITY
// ================================

// Trash resource user (soft delete)
exports.trashResource = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const adminId = req.user._id;

    const resource = await User.findById(resourceId);
    if (!resource) {
      return res.status(404).json({
        message: "Resource user not found",
        code: 404
      });
    }

    if (!resource.user_type.includes('resource')) {
      return res.status(400).json({
        message: "User is not a resource user",
        code: 400
      });
    }

    if (resource.is_trashed) {
      return res.status(400).json({
        message: "Resource user is already trashed",
        code: 400
      });
    }

    await User.findByIdAndUpdate(resourceId, {
      is_trashed: true,
      trashed_at: new Date(),
      trashed_by: adminId,
    });

    res.json({
      message: "Resource user moved to trash successfully",
      code: 200
    });

  } catch (error) {
    console.error('Error trashing resource user:', error);
    utils.handleError(res, error);
  }
};

// Restore resource user from trash
exports.restoreResource = async (req, res) => {
  try {
    const { resourceId } = req.params;

    const resource = await User.findById(resourceId);
    if (!resource) {
      return res.status(404).json({
        message: "Resource user not found",
        code: 404
      });
    }

    if (!resource.is_trashed) {
      return res.status(400).json({
        message: "Resource user is not trashed",
        code: 400
      });
    }

    await User.findByIdAndUpdate(resourceId, {
      is_trashed: false,
      trashed_at: null,
      trashed_by: null,
    });

    res.json({
      message: "Resource user restored successfully",
      code: 200
    });

  } catch (error) {
    console.error('Error restoring resource user:', error);
    utils.handleError(res, error);
  }
};

// Get trashed resource users list
exports.getTrashedResourceList = async (req, res) => {
  try {
    const { search = '', limit = 10, offset = 0 } = req.query;

    const query = {
      user_type: { $in: ['resource'] },
      is_trashed: true,
    };

    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { unique_user_id: { $regex: search, $options: 'i' } }
      ];
    }

    const resources = await User.find(query)
      .populate('address.city')
      .populate('address.state')
      .populate('address.country')
      .populate('trashed_by', 'full_name email')
      .sort({ trashed_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .select('full_name email phone_number unique_user_id status createdAt last_login profile_image company_data address trashed_at trashed_by');

    const totalCount = await User.countDocuments(query);

    res.json({
      data: resources,
      count: totalCount,
      message: "Trashed resource users retrieved successfully",
      code: 200
    });

  } catch (error) {
    console.error('Error getting trashed resource users:', error);
    utils.handleError(res, error);
  }
};

// ================================
// RECRUITER TRASH FUNCTIONALITY
// ================================

// Trash recruiter user (soft delete)
exports.trashRecruiter = async (req, res) => {
  try {
    const { recruiterId } = req.params;
    const adminId = req.user._id;

    const recruiter = await User.findById(recruiterId);
    if (!recruiter) {
      return res.status(404).json({
        message: "Recruiter user not found",
        code: 404
      });
    }

    if (!recruiter.user_type.includes('recruiter')) {
      return res.status(400).json({
        message: "User is not a recruiter user",
        code: 400
      });
    }

    if (recruiter.is_trashed) {
      return res.status(400).json({
        message: "Recruiter user is already trashed",
        code: 400
      });
    }

    await User.findByIdAndUpdate(recruiterId, {
      is_trashed: true,
      trashed_at: new Date(),
      trashed_by: adminId,
    });

    res.json({
      message: "Recruiter user moved to trash successfully",
      code: 200
    });

  } catch (error) {
    console.error('Error trashing recruiter user:', error);
    utils.handleError(res, error);
  }
};

// Restore recruiter user from trash
exports.restoreRecruiter = async (req, res) => {
  try {
    const { recruiterId } = req.params;

    const recruiter = await User.findById(recruiterId);
    if (!recruiter) {
      return res.status(404).json({
        message: "Recruiter user not found",
        code: 404
      });
    }

    if (!recruiter.is_trashed) {
      return res.status(400).json({
        message: "Recruiter user is not trashed",
        code: 400
      });
    }

    await User.findByIdAndUpdate(recruiterId, {
      is_trashed: false,
      trashed_at: null,
      trashed_by: null,
    });

    res.json({
      message: "Recruiter user restored successfully",
      code: 200
    });

  } catch (error) {
    console.error('Error restoring recruiter user:', error);
    utils.handleError(res, error);
  }
};

// Get trashed recruiter users list
exports.getTrashedRecruiterList = async (req, res) => {
  try {
    const { search = '', limit = 10, offset = 0 } = req.query;

    const query = {
      user_type: { $in: ['recruiter'] },
      is_trashed: true,
    };

    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { unique_user_id: { $regex: search, $options: 'i' } }
      ];
    }

    const recruiters = await User.find(query)
      .populate('trashed_by', 'full_name email')
      .sort({ trashed_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .select('full_name email phone_number unique_user_id status createdAt last_login profile_image company_data address trashed_at trashed_by');

    const totalCount = await User.countDocuments(query);

    res.json({
      data: recruiters,
      count: totalCount,
      message: "Trashed recruiter users retrieved successfully",
      code: 200
    });

  } catch (error) {
    console.error('Error getting trashed recruiter users:', error);
    utils.handleError(res, error);
  }
};

// Delete recruiter permanently (role-based deletion)
exports.deleteRecruiterPermanently = async (req, res) => {
  try {
    const { recruiterId } = req.params;

    const { deleteUserRolePermanently } = require('../../utils/roleBasedDeletion');
    const result = await deleteUserRolePermanently(recruiterId, 'recruiter');
    
    if (result.success) {
      res.json({
        message: result.message,
        code: result.code,
        data: result.data
      });
    } else {
      res.status(result.code).json({
        message: result.message,
        code: result.code
      });
    }

  } catch (error) {
    console.error('Error deleting recruiter permanently:', error);
    utils.handleError(res, error);
  }
};

// Switch recruiter to customer (add customer role while keeping recruiter role)
exports.switchRecruiterToCustomer = async (req, res) => {
  try {
    const { recruiterId } = req.params;

    const recruiter = await User.findById(recruiterId);
    if (!recruiter) {
      return res.status(404).json({
        message: "Recruiter user not found",
        code: 404
      });
    }

    if (!recruiter.user_type.includes('recruiter')) {
      return res.status(400).json({
        message: "User is not a recruiter user",
        code: 400
      });
    }

    // Add customer role while keeping recruiter role
    const updatedUserType = [...recruiter.user_type];
    if (!updatedUserType.includes('buyer')) {
      updatedUserType.push('buyer');
    }

    await User.findByIdAndUpdate(recruiterId, {
      user_type: updatedUserType,
      updated_at: new Date()
    });

    // Send role update email notification
    try {
      const emailer = require('../../utils/emailer');
      const mailOptions = {
        to: recruiter.email,
        subject: `Role Updated - You now have Customer access on ${process.env.APP_NAME || 'BSO Services'}`,
        app_name: process.env.APP_NAME || 'BSO Services',
        email: recruiter.email,
        name: recruiter.full_name,
        new_role: 'Customer',
      };

      await emailer.sendEmail(null, mailOptions, "roleUpdated");
      console.log(`✅ Role update email sent to ${recruiter.email}`);
    } catch (emailError) {
      console.error(`❌ Error sending role update email to ${recruiter.email}:`, emailError.message);
    }

    res.json({
      message: "Customer role added successfully. User now has both recruiter and customer roles.",
      code: 200,
      data: {
        user_id: recruiter.unique_user_id,
        email: recruiter.email,
        user_type: updatedUserType,
        current_user_type: recruiter.current_user_type
      }
    });
  } catch (error) {
    console.error('Error adding customer role to recruiter:', error);
    utils.handleError(res, error);
  }
};

// Switch recruiter to supplier (add supplier role while keeping recruiter role)
exports.switchRecruiterToSupplier = async (req, res) => {
  try {
    const { recruiterId } = req.params;

    const recruiter = await User.findById(recruiterId);
    if (!recruiter) {
      return res.status(404).json({
        message: "Recruiter user not found",
        code: 404
      });
    }

    if (!recruiter.user_type.includes('recruiter')) {
      return res.status(400).json({
        message: "User is not a recruiter user",
        code: 400
      });
    }

    // Add supplier role while keeping recruiter role
    const updatedUserType = [...recruiter.user_type];
    if (!updatedUserType.includes('supplier')) {
      updatedUserType.push('supplier');
    }

    await User.findByIdAndUpdate(recruiterId, {
      user_type: updatedUserType,
      updated_at: new Date()
    });

    // Send role update email notification
    try {
      const emailer = require('../../utils/emailer');
      const mailOptions = {
        to: recruiter.email,
        subject: `Role Updated - You now have Supplier access on ${process.env.APP_NAME || 'BSO Services'}`,
        app_name: process.env.APP_NAME || 'BSO Services',
        email: recruiter.email,
        name: recruiter.full_name,
        new_role: 'Supplier',
      };

      await emailer.sendEmail(null, mailOptions, "roleUpdated");
      console.log(`✅ Role update email sent to ${recruiter.email}`);
    } catch (emailError) {
      console.error(`❌ Error sending role update email to ${recruiter.email}:`, emailError.message);
    }

    res.json({
      message: "Supplier role added successfully. User now has both recruiter and supplier roles.",
      code: 200,
      data: {
        user_id: recruiter.unique_user_id,
        email: recruiter.email,
        user_type: updatedUserType,
        current_user_type: recruiter.current_user_type
      }
    });
  } catch (error) {
    console.error('Error adding supplier role to recruiter:', error);
    utils.handleError(res, error);
  }
};

// Switch recruiter to logistic (add logistic role while keeping recruiter role)
exports.switchRecruiterToLogistic = async (req, res) => {
  try {
    const { recruiterId } = req.params;

    const recruiter = await User.findById(recruiterId);
    if (!recruiter) {
      return res.status(404).json({
        message: "Recruiter user not found",
        code: 404
      });
    }

    if (!recruiter.user_type.includes('recruiter')) {
      return res.status(400).json({
        message: "User is not a recruiter user",
        code: 400
      });
    }

    // Add logistic role while keeping recruiter role
    const updatedUserType = [...recruiter.user_type];
    if (!updatedUserType.includes('logistics')) {
      updatedUserType.push('logistics');
    }

    await User.findByIdAndUpdate(recruiterId, {
      user_type: updatedUserType,
      updated_at: new Date()
    });

    // Send role update email notification
    try {
      const emailer = require('../../utils/emailer');
    const mailOptions = {
        to: recruiter.email,
        subject: `Role Updated - You now have Logistics access on ${process.env.APP_NAME || 'BSO Services'}`,
        app_name: process.env.APP_NAME || 'BSO Services',
        email: recruiter.email,
        name: recruiter.full_name,
        new_role: 'Logistics',
      };

      await emailer.sendEmail(null, mailOptions, "roleUpdated");
      console.log(`✅ Role update email sent to ${recruiter.email}`);
    } catch (emailError) {
      console.error(`❌ Error sending role update email to ${recruiter.email}:`, emailError.message);
    }

    res.json({
      message: "Logistic role added successfully. User now has both recruiter and logistic roles.",
      code: 200,
      data: {
        user_id: recruiter.unique_user_id,
        email: recruiter.email,
        user_type: updatedUserType,
        current_user_type: recruiter.current_user_type
      }
    });
  } catch (error) {
    console.error('Error adding logistic role to recruiter:', error);
    utils.handleError(res, error);
  }
};

// List recruiter profile
exports.listRecruiterProfile = async (req, res) => {
  try {
    const { recruiterId } = req.params;

    const recruiter = await User.findById(recruiterId);
    if (!recruiter) {
      return res.status(404).json({
        message: "Recruiter user not found",
        code: 404
      });
    }

    await User.findByIdAndUpdate(recruiterId, {
      profile_listed: true,
      updated_at: new Date()
    });

    res.json({
      message: "Recruiter profile listed successfully",
      code: 200
    });
  } catch (error) {
    console.error('Error listing recruiter profile:', error);
    utils.handleError(res, error);
  }
};

// ================================
// ADD RECRUITER FUNCTIONALITY
// ================================

// Add new recruiter using the new unified approach
exports.addRecruiter = async (req, res) => {
  try {
    const { createRecruiter } = require('../../utils/createUserWithRole');
    const result = await createRecruiter(req.body, res);
    
    if (result.success) {
      res.json({
        message: result.message,
        code: result.code,
        data: result.user
      });
    }
  } catch (error) {
    console.error('Error adding recruiter:', error);
    utils.handleError(res, error);
  }
};

// ================================
// UNITS MANAGEMENT FUNCTIONALITY
// ================================

const quantity_units = require("../../models/quantity_units");

// Get all units with pagination and search
exports.getUnits = async (req, res) => {
  try {
    const { search, limit = 10, offset = 0 } = req.query;
    const filter = {};
    
    if (search) {
      filter.unit = { $regex: search, $options: "i" };
    }
    
    const data = await quantity_units.find(filter)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .sort({ createdAt: -1 });
      
    const count = await quantity_units.countDocuments(filter);
    
    return res.status(200).json({
      code: 200,
      message: "Units fetched successfully",
      data,
      count
    });
  } catch (error) {
    console.error('Error fetching units:', error);
    utils.handleError(res, error);
  }
};

// Get single unit by ID
exports.getUnitById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        code: 400,
        message: "Invalid unit ID"
      });
    }
    
    const data = await quantity_units.findById(id);
    
    if (!data) {
      return res.status(404).json({
        code: 404,
        message: "Unit not found"
      });
    }
    
    return res.status(200).json({
      code: 200,
      message: "Unit fetched successfully",
      data
    });
  } catch (error) {
    console.error('Error fetching unit:', error);
    utils.handleError(res, error);
  }
};

// Add new unit
exports.addUnit = async (req, res) => {
  try {
    const { unit, isActive } = req.body;
    
    if (!unit || !unit.trim()) {
      return res.status(400).json({
        code: 400,
        message: "Unit name is required"
      });
    }
    
    // Check if unit already exists (case-insensitive)
    const existing = await quantity_units.findOne({ 
      unit: { $regex: new RegExp(`^${unit.trim()}$`, 'i') }
    });
    
    if (existing) {
      return res.status(400).json({
        code: 400,
        message: "Unit already exists"
      });
    }
    
    const payload = { unit: unit.trim() };
    if (typeof isActive === 'boolean') payload.isActive = isActive;
    const data = await quantity_units.create(payload);
    
    return res.status(200).json({
      code: 200,
      message: "Unit created successfully",
      data
    });
  } catch (error) {
    console.error('Error creating unit:', error);
    utils.handleError(res, error);
  }
};

// Update unit
exports.updateUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { unit, isActive } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        code: 400,
        message: "Invalid unit ID"
      });
    }
    
    if (!unit || !unit.trim()) {
      return res.status(400).json({
        code: 400,
        message: "Unit name is required"
      });
    }
    
    // Check if new unit name already exists (excluding current unit)
    const existing = await quantity_units.findOne({ 
      unit: { $regex: new RegExp(`^${unit.trim()}$`, 'i') },
      _id: { $ne: id } 
    });
    
    if (existing) {
      return res.status(400).json({
        code: 400,
        message: "Unit already exists"
      });
    }
    
    const update = { unit: unit.trim() };
    if (typeof isActive === 'boolean') update.isActive = isActive;
    const data = await quantity_units.findByIdAndUpdate(id, update, { new: true });
    
    if (!data) {
      return res.status(404).json({
        code: 404,
        message: "Unit not found"
      });
    }
    
    return res.status(200).json({
      code: 200,
      message: "Unit updated successfully",
      data
    });
  } catch (error) {
    console.error('Error updating unit:', error);
    utils.handleError(res, error);
  }
};

// Delete single unit
exports.deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        code: 400,
        message: "Invalid unit ID"
      });
    }
    
    // Check if unit is being used in any enquiry
    const inUse = await Enquiry.findOne({ 
      "enquiry_items.quantity.unit": id 
    });
    
    if (inUse) {
      return res.status(400).json({
        code: 400,
        message: "Cannot delete unit. It is being used in enquiries."
      });
    }
    
    const data = await quantity_units.findByIdAndDelete(id);
    
    if (!data) {
      return res.status(404).json({
        code: 404,
        message: "Unit not found"
      });
    }
    
    return res.status(200).json({
      code: 200,
      message: "Unit deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting unit:', error);
    utils.handleError(res, error);
  }
};

// Delete multiple units
exports.deleteMultipleUnits = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        code: 400,
        message: "Unit IDs array is required"
      });
    }
    
    // Validate all IDs
    const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        code: 400,
        message: "Invalid unit IDs provided"
      });
    }
    
    // Check if any unit is being used in enquiries
    const unitsInUse = await Enquiry.find({ 
      "enquiry_items.quantity.unit": { $in: ids }
    }).distinct("enquiry_items.quantity.unit");
    
    if (unitsInUse.length > 0) {
      const unitsInUseNames = await quantity_units.find({
        _id: { $in: unitsInUse }
      }).select('unit');
      
      return res.status(400).json({
        code: 400,
        message: `Cannot delete units: ${unitsInUseNames.map(u => u.unit).join(', ')}. They are being used in enquiries.`,
        unitsInUse: unitsInUseNames
      });
    }
    
    const result = await quantity_units.deleteMany({ _id: { $in: ids } });
    
    return res.status(200).json({
      code: 200,
      message: `${result.deletedCount} unit(s) deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting multiple units:', error);
    utils.handleError(res, error);
  }
};

// Toggle unit status (active/inactive)
exports.toggleUnitStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!id) {
      return res.status(400).json({
        code: 400,
        message: "Unit ID is required"
      });
    }
    
    if (typeof status !== 'boolean') {
      return res.status(400).json({
        code: 400,
        message: "Status must be a boolean value (true/false)"
      });
    }
    
    const unit = await quantity_units.findById(id);
    if (!unit) {
      return res.status(404).json({
        code: 404,
        message: "Unit not found"
      });
    }
    
    unit.isActive = status;
    await unit.save();
    
    return res.status(200).json({
      code: 200,
      message: `Unit ${status ? 'activated' : 'deactivated'} successfully`,
      data: {
        _id: unit._id,
        unit: unit.unit,
        isActive: unit.isActive,
        updatedAt: unit.updatedAt
      }
    });
  } catch (error) {
    console.error('Error toggling unit status:', error);
    utils.handleError(res, error);
  }
};

