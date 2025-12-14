const mongoose = require("mongoose");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const utils = require("../../utils/utils");
const SavedPaymentMethod = require("../../models/saved_payment_methods");
const User = require("../../models/user");
const AdminLogs = require("../../models/admin_logs");
const billingManagementUser = require("../user/billingManagement");
const logAdminAction = billingManagementUser.logAdminAction;

/**
 * Search users for billing management
 * GET /admin/searchUsersForBilling
 */
exports.searchUsersForBilling = async (req, res) => {
  try {
    const { 
      search = '', 
      user_type = '', 
      status = '', 
      page = 1, 
      limit = 10 
    } = req.query;

    const query = {
      is_deleted: false,
      trashed: false
    };

    // Search by email, name, or unique_user_id
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { full_name: { $regex: search, $options: 'i' } },
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { unique_user_id: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by user type
    if (user_type) {
      query.user_type = { $in: [user_type] };
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query)
      .select('_id email full_name first_name last_name unique_user_id user_type status stripe_customer_id default_payment_method_id createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await User.countDocuments(query);

    // Get billing method counts for each user
    const userIds = users.map(u => u._id);
    const billingCounts = await SavedPaymentMethod.aggregate([
      {
        $match: {
          user_id: { $in: userIds },
          is_deleted: false,
          is_active: true
        }
      },
      {
        $group: {
          _id: '$user_id',
          total_cards: { $sum: 1 },
          default_cards: {
            $sum: { $cond: ['$is_default', 1, 0] }
          }
        }
      }
    ]);

    const countsMap = {};
    billingCounts.forEach(count => {
      countsMap[count._id.toString()] = count;
    });

    const usersWithCounts = users.map(user => ({
      ...user,
      billing_methods_count: countsMap[user._id.toString()]?.total_cards || 0,
      has_default: (countsMap[user._id.toString()]?.default_cards || 0) > 0
    }));

    return res.status(200).json({
      message: "Users retrieved successfully",
      data: usersWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      code: 200
    });

  } catch (error) {
    console.error("Error searching users for billing:", error);
    utils.handleError(res, error);
  }
};

/**
 * Get user's billing methods (admin view)
 * GET /admin/getUserBillingMethods/:userId
 */
exports.getUserBillingMethods = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return utils.handleError(res, {
        message: "Invalid user ID",
        code: 400
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return utils.handleError(res, {
        message: "User not found",
        code: 404
      });
    }

    // Use the user controller's method
    const savedMethods = await SavedPaymentMethod.find({
      user_id: userId,
      is_deleted: false,
      is_active: true
    }).sort({ is_default: -1, createdAt: -1 });

    return res.status(200).json({
      message: "User billing methods retrieved successfully",
      data: {
        user: {
          _id: user._id,
          email: user.email,
          full_name: user.full_name || `${user.first_name} ${user.last_name}`,
          unique_user_id: user.unique_user_id,
          stripe_customer_id: user.stripe_customer_id,
          default_payment_method_id: user.default_payment_method_id
        },
        billing_methods: savedMethods
      },
      code: 200
    });

  } catch (error) {
    console.error("Error getting user billing methods:", error);
    utils.handleError(res, error);
  }
};

/**
 * Add billing method for user (admin action)
 * POST /admin/addUserBillingMethod/:userId
 */
exports.addUserBillingMethod = async (req, res) => {
  try {
    const { userId } = req.params;
    const { payment_method_id, set_as_default = false } = req.body;
    const adminId = req.admin._id;
    const adminInfo = req.admin;

    if (!payment_method_id) {
      return utils.handleError(res, {
        message: "Payment method ID is required",
        code: 400
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return utils.handleError(res, {
        message: "User not found",
        code: 404
      });
    }

    // Get or create Stripe customer
    const customer = await billingManagementUser.getOrCreateStripeCustomer(user);

    // Retrieve payment method from Stripe
    let paymentMethod;
    try {
      paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);
    } catch (error) {
      return utils.handleError(res, {
        message: "Invalid payment method ID",
        code: 400
      });
    }

    // Check if payment method already exists
    const existingMethod = await SavedPaymentMethod.findOne({
      user_id: userId,
      stripe_payment_method_id: payment_method_id,
      is_deleted: false
    });

    if (existingMethod) {
      return utils.handleError(res, {
        message: "Payment method already exists",
        code: 400
      });
    }

    // Attach payment method to customer
    try {
      await stripe.paymentMethods.attach(payment_method_id, {
        customer: customer.id
      });
    } catch (error) {
      if (error.code !== 'resource_already_exists') {
        throw error;
      }
    }

    // Extract card details
    const details = await billingManagementUser.extractCardDetails(payment_method_id);

    // If setting as default, unset other defaults
    if (set_as_default) {
      await SavedPaymentMethod.updateMany(
        { user_id: userId, is_default: true },
        { is_default: false }
      );
      
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: payment_method_id
        }
      });

      user.default_payment_method_id = payment_method_id;
      await user.save();
    }

    // Create saved payment method
    const savedMethod = await SavedPaymentMethod.create({
      user_id: userId,
      stripe_payment_method_id: payment_method_id,
      stripe_customer_id: customer.id,
      payment_method_type: details.payment_method_type,
      card_details: details.card_details,
      bank_details: details.bank_details,
      billing_details: details.billing_details,
      is_default: set_as_default,
      is_active: true,
      added_by: {
        type: "admin",
        admin_id: adminId,
        user_id: userId
      }
    });

    // Log admin action
    await logAdminAction(
      adminId,
      adminInfo,
      'create',
      {
        payment_method_id: savedMethod._id.toString(),
        stripe_payment_method_id: payment_method_id,
        is_default: set_as_default,
        user_email: user.email
      },
      userId,
      req
    );

    return res.status(200).json({
      message: "Payment method added successfully",
      data: savedMethod,
      code: 200
    });

  } catch (error) {
    console.error("Error adding user billing method:", error);
    utils.handleError(res, error);
  }
};

/**
 * Set default billing method for user (admin action)
 * PUT /admin/setUserDefaultBillingMethod/:userId/:methodId
 */
exports.setUserDefaultBillingMethod = async (req, res) => {
  try {
    const { userId, methodId } = req.params;
    const adminId = req.admin._id;
    const adminInfo = req.admin;

    const user = await User.findById(userId);
    if (!user) {
      return utils.handleError(res, {
        message: "User not found",
        code: 404
      });
    }

    const savedMethod = await SavedPaymentMethod.findOne({
      _id: methodId,
      user_id: userId,
      is_deleted: false,
      is_active: true
    });

    if (!savedMethod) {
      return utils.handleError(res, {
        message: "Payment method not found",
        code: 404
      });
    }

    // Unset other defaults
    await SavedPaymentMethod.updateMany(
      { user_id: userId, is_default: true, _id: { $ne: methodId } },
      { is_default: false }
    );

    // Set this as default
    savedMethod.is_default = true;
    await savedMethod.save();

    // Update Stripe customer
    const customer = await billingManagementUser.getOrCreateStripeCustomer(user);
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: savedMethod.stripe_payment_method_id
      }
    });

    // Update all active subscriptions to use this default payment method
    try {
      const activeSubscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 100
      });

      for (const subscription of activeSubscriptions.data) {
        await stripe.subscriptions.update(subscription.id, {
          default_payment_method: savedMethod.stripe_payment_method_id
        });
      }
    } catch (error) {
      console.error("Error updating subscriptions with default payment method:", error);
      // Don't fail the request if subscription update fails
    }

    // Update user
    user.default_payment_method_id = savedMethod.stripe_payment_method_id;
    await user.save();

    // Log admin action
    await logAdminAction(
      adminId,
      adminInfo,
      'set_default',
      {
        payment_method_id: methodId,
        stripe_payment_method_id: savedMethod.stripe_payment_method_id,
        is_default: true,
        user_email: user.email
      },
      userId,
      req
    );

    return res.status(200).json({
      message: "Default payment method updated successfully",
      data: savedMethod,
      code: 200
    });

  } catch (error) {
    console.error("Error setting default billing method:", error);
    utils.handleError(res, error);
  }
};

/**
 * Update billing method for user (admin action)
 * PUT /admin/updateUserBillingMethod/:userId/:methodId
 */
exports.updateUserBillingMethod = async (req, res) => {
  try {
    const { userId, methodId } = req.params;
    const { billing_details } = req.body;
    const adminId = req.admin._id;
    const adminInfo = req.admin;

    const user = await User.findById(userId);
    if (!user) {
      return utils.handleError(res, {
        message: "User not found",
        code: 404
      });
    }

    const savedMethod = await SavedPaymentMethod.findOne({
      _id: methodId,
      user_id: userId,
      is_deleted: false
    });

    if (!savedMethod) {
      return utils.handleError(res, {
        message: "Payment method not found",
        code: 404
      });
    }

    // Update billing details if provided
    if (billing_details) {
      savedMethod.billing_details = {
        ...savedMethod.billing_details,
        ...billing_details
      };

      // Also update in Stripe
      try {
        await stripe.paymentMethods.update(savedMethod.stripe_payment_method_id, {
          billing_details: savedMethod.billing_details
        });
      } catch (error) {
        console.error("Error updating Stripe payment method:", error);
      }
    }

    await savedMethod.save();

    // Log admin action
    await logAdminAction(
      adminId,
      adminInfo,
      'update',
      {
        payment_method_id: methodId,
        stripe_payment_method_id: savedMethod.stripe_payment_method_id,
        user_email: user.email
      },
      userId,
      req
    );

    return res.status(200).json({
      message: "Payment method updated successfully",
      data: savedMethod,
      code: 200
    });

  } catch (error) {
    console.error("Error updating user billing method:", error);
    utils.handleError(res, error);
  }
};

/**
 * Delete billing method for user (admin action)
 * DELETE /admin/deleteUserBillingMethod/:userId/:methodId
 */
exports.deleteUserBillingMethod = async (req, res) => {
  try {
    const { userId, methodId } = req.params;
    const adminId = req.admin._id;
    const adminInfo = req.admin;

    const user = await User.findById(userId);
    if (!user) {
      return utils.handleError(res, {
        message: "User not found",
        code: 404
      });
    }

    const savedMethod = await SavedPaymentMethod.findOne({
      _id: methodId,
      user_id: userId,
      is_deleted: false
    });

    if (!savedMethod) {
      return utils.handleError(res, {
        message: "Payment method not found",
        code: 404
      });
    }

    // Check if it's the default method
    if (savedMethod.is_default) {
      // Find another method to set as default
      const otherMethod = await SavedPaymentMethod.findOne({
        user_id: userId,
        is_deleted: false,
        is_active: true,
        _id: { $ne: methodId }
      });

      if (otherMethod) {
        otherMethod.is_default = true;
        await otherMethod.save();

        user.default_payment_method_id = otherMethod.stripe_payment_method_id;
        await user.save();

        const customer = await billingManagementUser.getOrCreateStripeCustomer(user);
        await stripe.customers.update(customer.id, {
          invoice_settings: {
            default_payment_method: otherMethod.stripe_payment_method_id
          }
        });
      } else {
        // No other method, clear default
        user.default_payment_method_id = null;
        await user.save();
      }
    }

    // Detach from Stripe customer
    try {
      await stripe.paymentMethods.detach(savedMethod.stripe_payment_method_id);
    } catch (error) {
      console.log("Error detaching payment method:", error.message);
    }

    // Soft delete in database
    savedMethod.is_deleted = true;
    savedMethod.is_active = false;
    savedMethod.deleted_at = new Date();
    savedMethod.deleted_by = {
      type: "admin",
      admin_id: adminId,
      user_id: userId
    };
    await savedMethod.save();

    // Log admin action
    await logAdminAction(
      adminId,
      adminInfo,
      'delete',
      {
        payment_method_id: methodId,
        stripe_payment_method_id: savedMethod.stripe_payment_method_id,
        is_default: savedMethod.is_default,
        user_email: user.email
      },
      userId,
      req
    );

    return res.status(200).json({
      message: "Payment method deleted successfully",
      code: 200
    });

  } catch (error) {
    console.error("Error deleting user billing method:", error);
    utils.handleError(res, error);
  }
};

