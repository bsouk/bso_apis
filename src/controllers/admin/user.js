const User = require("../../models/user");
const Address = require("../../models/address");

const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require("generate-password");

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

exports.uploadMedia = async (req, res) => {
  try {
    if (!req.files.media || !req.body.path)
      return utils.handleError(res, {
        message: "MEDIA OR PATH MISSING",
        code: 400,
      });
    let isArray = req.body.isArray;
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

      const url = `${req.body.path}/${media}`;
      return res.status(200).json({
        code: 200,
        data: isArray === "true" ? [url] : url,
      });
    }
  } catch (error) {
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
      user_type: "buyer",
      profile_completed: true,
      is_user_approved_by_admin: true,
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

exports.getCustomerList = async (req, res) => {
  try {
    const { limit = 10, offset = 0, search = "" } = req.query;

    const condition = {
      user_type: "buyer",
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
          is_user_approved_by_admin : 1
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
      user_type: "resource",
      profile_completed: true,
      is_user_approved_by_admin: true,
    };

    const user = new User(userData);
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
      user_type: "resource",
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
          availability_status: 1,
          createdAt: 1,
          last_login: 1,
          unique_user_id: 1,
          is_company_approved: 1,
          is_user_approved_by_admin : 1
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

    await User.findByIdAndUpdate(id, data);

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
      user_type: "supplier",
      profile_completed: true,
      is_user_approved_by_admin: true,
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
      user_type: "supplier",
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
          last_login: 1,
          unique_user_id: 1,
          is_company_approved: 1,
          is_user_approved_by_admin : 1
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
    res.json({ data: user[0], code: 200 });
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
      user_type: "logistics",
      profile_completed: true,
      is_user_approved_by_admin: true,
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
      user_type: "logistics",
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
          unique_user_id: 1,
          is_company_approved: 1,
          is_user_approved_by_admin : 1
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
    res.json({ data: user[0], code: 200 });
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
    console.log("login user is ", userId);

    const Userdata = await User.findById(userId);
    console.log("user is ", Userdata);

    if (Object.keys(Userdata).length === 0) {
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
    console.log("login user is ", userId);

    console.log("req.body is ", req.body)

    const Userdata = await User.findById(userId);
    console.log("user is ", Userdata);

    if (Object.keys(Userdata).length === 0) {
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
    console.log("login user is ", userId);

    const Userdata = await User.findById(userId);
    console.log("user is ", Userdata);

    if (Object.keys(Userdata).length === 0) {
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