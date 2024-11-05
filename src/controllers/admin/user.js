const User = require("../../models/user");
const Address = require("../../models/address");

const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require('generate-password');

function createNewPassword() {
  const password = generatePassword.generate({
    length: 8,
    numbers: true,
    uppercase: true,
    lowercase: true,
    strict: true
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

exports.uploadMedia = async (req, res) => {
  try {

    if (!req.files.media || !req.body.path) return utils.handleError(res, { message: "MEDIA OR PATH MISSING", code: 400 });
    let isArray = req.body.isArray
    if (Array.isArray(req.files.media)) {
      let mediaArray = [];
      for (let index = 0; index < req.files.media.length; index++) {
        const element = req.files.media[index];
        let media = await utils.uploadImage({
          file: element,
          path: `${process.env.STORAGE_PATH}/${req.body.path}`,
        });
        mediaArray.push(`${req.body.path}/${media}`);
      }

      return res.status(200).json({
        code: 200,
        data: mediaArray,
      });
    } else {
      let media = await utils.uploadImage({
        file: req.files.media,
        path: `${process.env.STORAGE_PATH}/${req.body.path}`,
      });

      const url = `${req.body.path}/${media}`
      return res.status(200).json({
        code: 200,
        data: isArray === "true" ? [url] : url,
      });
    }
  } catch (error) {
    utils.handleError(res, error);
  }
};
exports.addUser = async (req, res) => {
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
    const password = createNewPassword()
    const userData = {
      ...data,
      unique_user_id: await getUniqueId(),
      password,
      decoded_password: password,
      user_type: "user",
      profile_completed: true
    };

    const user = new User(userData);

    const addressData = {
      user_id: user._id,
      address: data.address,
      phone_number: data.phone_number,
      is_primary: true,
      default_address: true
    }

    const address = new Address(addressData);
    await user.save();
    await address.save();

    const mailOptions = {
      to: user.email,
      subject: `Welcome to ${process.env.APP_NAME}! Your Account Has Been Created`,
      app_name: process.env.APP_NAME,
      email: user.email,
      password: password,
      name: user.full_name,
    };

    emailer.sendEmail(null, mailOptions, "accountCreated");
    res.json({ message: "User added successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.users = async (req, res) => {
  try {
    const { limit = 10, offset = 0, search = "" } = req.query;

    const condition = {
      profile_completed: true,
      is_deleted: false
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
          unique_user_id: 1,
          full_name: 1,
          company_name: 1,
          email: 1,
          createdAt: 1,
          profile_image: 1,
          last_login: 1,
          status: 1
        },
      },
    ]);

    const [count, users] = await Promise.all([countPromise, usersPromise])

    res.json({ data: users, count, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.singleUser = async (req, res) => {
  try {
    const user_id = req.params.id;
    const user = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(user_id)
        }
      },
      {
        $lookup: {
          from: "addresses",
          let: { user_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$user_id", "$$user_id"] },
                is_primary: true
              }
            },
          ],
          as: "address"
        }
      },
      {
        $unwind: {
          path: "$address",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          address: "$address.address"
        }
      }
    ]);
    res.json({ data: user[0], code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.editUser = async (req, res) => {
  try {
    const data = req.body;
    const id = req.params.id;

    const user = await User.findById(id);
    if (!user)
      return utils.handleError(res, { message: "User not found", code: 404 });

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

    if (data.phone_number || data.address) {
      const is_primary_address = await Address.findOne({ user_id: new mongoose.Types.ObjectId(id), is_primary: true });
      if (is_primary_address) {
        await Address.updateOne({ user_id: new mongoose.Types.ObjectId(id), is_primary: true }, { phone_number: data.phone_number, address: data.address });
      } else {
        const addressData = {
          user_id: user._id,
          address: data.address,
          phone_number: data.phone_number,
          is_primary: true,
          default_address: false
        }
        const address = new Address(addressData);
        await address.save()
      }
    }

    res.json({ message: "User edit successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const id = req.params.id;

    const user = await User.findById(id);
    if (!user) return utils.handleError(res, { message: "User not found", code: 404 });
    if (user.is_deleted) return utils.handleError(res, { message: "User has been already deleted", code: 400 });

    user.is_deleted = true;
    await user.save();

    res.json({ message: "User has been deleted successfully", code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.activeSelectedUsers = async (req, res) => {
  try {
    const { user_ids = [] } = req.body;

    if (user_ids.length == 0) return utils.handleError(res, { message: "Please select at least one user", code: 400 });
    const isAllActive = await User.find({ _id: user_ids, status: "active" });

    if (isAllActive.length == user_ids.length) return utils.handleError(res, { message: "All selected users are already active", code: 400 });

    await User.updateMany({ _id: user_ids }, { status: "active" });

    res.json({ message: "Selected users are active", code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.inactiveSelectedUsers = async (req, res) => {
  try {
    const { user_ids = [] } = req.body;

    if (user_ids.length == 0) return utils.handleError(res, { message: "Please select at least one user", code: 400 });
    const isAllInactive = await User.find({ _id: user_ids, status: "inactive" });

    if (isAllInactive.length == user_ids.length) return utils.handleError(res, { message: "All selected users are already inactive", code: 400 });

    await User.updateMany({ _id: user_ids }, { status: "inactive" });

    res.json({ message: "Selected users are inactive", code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.deleteSelectedUsers = async (req, res) => {
  try {
    const { user_ids = [] } = req.body;

    if (user_ids.length == 0) return utils.handleError(res, { message: "Please select at least one user", code: 400 });
    const isAllDeleted = await User.find({ _id: user_ids, is_deleted: true });

    if (isAllDeleted.length == user_ids.length) return utils.handleError(res, { message: "All selected users are already deleted", code: 400 });

    await User.updateMany({ _id: user_ids }, { is_deleted: true });

    res.json({ message: "Selected users have been deleted", code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.shareCrendentials = async (req, res) => {
  try {
    const user_id = req.body.id;

    const user = await User.findOne({ _id: new mongoose.Types.ObjectId(user_id) }, "+decoded_password");
    if (!user) return utils.handleError(res, { message: "User not found", code: 404 });

    const password = user.decoded_password;

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

async function checkDataIsNotEmptyAndConvertUser(data) {
  return new Promise((resolve, reject) => {
    try {
      const modifiedData = [];
      for (let index = 0; index < data.length; index++) {
        const element = data[index];

        const full_name = element["Name"]?.toString().trim();
        if (!full_name)
          return reject({
            message: `Empty 'Name' at row ${index + 2}`,
            code: 400,
          });

        const email = element["Email"]?.toString().trim();
        if (!email)
          return reject({
            message: `Empty 'Email' at row ${index + 2}`,
            code: 400,
          });

        const phone_number = element["Phone Number"]?.toString().trim();
        if (!phone_number)
          return reject({
            message: `Empty 'Phone Number' at row ${index + 2}`,
            code: 400,
          });

        const company_name = element["Company Name"]?.toString().trim();
        if (!company_name)
          return reject({
            message: `Empty 'Company Name' at row ${index + 2}`,
            code: 400,
          });

        const address_line_1 = element["Address Line 1"]?.toString().trim();
        if (!address_line_1)
          return reject({
            message: `Empty 'Address Line 1' at row ${index + 2}`,
            code: 400,
          });

        const address_line_2 = element["Address Line 2"]?.toString().trim();

        const city = element["City"]?.toString().trim();
        if (!city)
          return reject({
            message: `Empty 'City' at row ${index + 2}`,
            code: 400,
          });


        const state = element["State"]?.toString().trim();
        if (!state)
          return reject({
            message: `Empty 'State' at row ${index + 2}`,
            code: 400,
          });

        const country = element["Country"]?.toString().trim();
        if (!country)
          return reject({
            message: `Empty 'Country' at row ${index + 2}`,
            code: 400,
          });


        const pin_code = element["Pincode"]?.toString().trim();
        if (!pin_code)
          return reject({
            message: `Empty 'Pincode' at row ${index + 2}`,
            code: 400,
          });

        const status = element["Status"]
          ?.toString()
          .trim();
        if (!status)
          return reject({
            message: `Empty 'Status' at row ${index + 2}`,
            code: 400,
          });

        if (!["active", "inactive"].includes(status))
          return reject({
            message: `'Status' can contain only 'active' or 'inactive' at row ${index + 2
              }`,
            code: 400,
          });

        modifiedData.push({
          full_name,
          email,
          phone_number,
          company_name,
          address: {
            address_line_1,
            address_line_2,
            city,
            state,
            country,
            pin_code,
          },
          status
        });
      }
      resolve(modifiedData);
    } catch (error) {
      reject(error);
    }
  });
}

async function validateDataAndConvertUser(data) {
  return new Promise(async (resolve, reject) => {
    try {

      for (let index = 0; index < data.length; index++) {
        const element = data[index];

        // Validate user email
        const isEmailExists = await User.findOne({ email: element.email });
        if (isEmailExists) {
          return reject({
            message: `Email at row ${index + 2} is already registered with another account`,
            code: 400,
          });
        }


        const isPhoneExists = await User.findOne({ phone_number: element.phone_number });
        if (isPhoneExists) {
          return reject({
            message: `Phone number at row ${index + 2} is already registered with another account`,
            code: 400,
          });
        }
      }

      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
}

async function convertAndSave(data) {
  return new Promise(async (resolve, reject) => {
    try {
      const password = createNewPassword()
      const userData = {
        ...data,
        unique_user_id: await getUniqueId(),
        password,
        decoded_password: password,
        user_type: "user",
        profile_completed: true
      };

      const user = new User(userData);

      const addressData = {
        user_id: user._id,
        address: data.address,
        phone_number: data.phone_number,
        is_primary: true,
        default_address: true
      }

      const address = new Address(addressData);
      await user.save();
      await address.save();
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
}

exports.bulkUploadUserWithExcel = async (req, res) => {
  try {
    const files = req.files;
    const type = req.body.type;
    if (!["excel", "csv"].includes(type)) return utils.handleError(res, { message: "Invalid type", code: 400 })
    if (!files)
      return utils.handleError(res, { message: "No file uploaded", code: 400 });
    const productFileData = req.files.users.data;

    let data = null;

    if (type === "excel") {
      data = utils.jsonConverterFromExcel(productFileData);
    } else {
      data = await utils.jsonConverterFromCsv(productFileData);
    }

    await utils.validateColumns(data, [
      "Name",
      "Email",
      "Phone Number",
      "Company Name",
      "Address Line 1",
      "Address Line 2",
      "City",
      "State",
      "Country",
      "Pincode",
      "Status",
    ]);

    let convertedData = await checkDataIsNotEmptyAndConvertUser(data);
    convertedData = await validateDataAndConvertUser(convertedData);

    for (let i = 0; i < convertedData.length; i++) {
      let element = convertedData[i];
      await convertAndSave(element);
    }

    res.json({ message: "Uploaded Successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

