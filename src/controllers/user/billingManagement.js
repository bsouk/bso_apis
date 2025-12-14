const mongoose = require("mongoose");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const utils = require("../../utils/utils");
const SavedPaymentMethod = require("../../models/saved_payment_methods");
const User = require("../../models/user");
const AdminLogs = require("../../models/admin_logs");

/**
 * Get or create Stripe customer for user
 */
exports.getOrCreateStripeCustomer = async function getOrCreateStripeCustomer(user) {
  try {
    // Check if user already has stripe_customer_id
    if (user.stripe_customer_id) {
      try {
        const customer = await stripe.customers.retrieve(user.stripe_customer_id);
        if (customer && !customer.deleted) {
          return customer;
        }
      } catch (error) {
        // Customer doesn't exist in Stripe, create new one
        console.log("Stripe customer not found, creating new one");
      }
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.full_name || `${user.first_name} ${user.last_name}`,
      metadata: {
        userId: user._id.toString(),
        userEmail: user.email
      }
    });

    // Update user with customer ID
    user.stripe_customer_id = customer.id;
    await user.save();

    return customer;
  } catch (error) {
    console.error("Error getting/creating Stripe customer:", error);
    throw error;
  }
}

/**
 * Extract card details from Stripe payment method
 */
exports.extractCardDetails = async function extractCardDetails(paymentMethodId) {
  try {
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    
    const details = {
      payment_method_type: paymentMethod.type,
      card_details: null,
      bank_details: null,
      billing_details: paymentMethod.billing_details || {}
    };

    if (paymentMethod.type === 'card' && paymentMethod.card) {
      details.card_details = {
        card_last4: paymentMethod.card.last4,
        card_brand: paymentMethod.card.brand,
        card_exp_month: paymentMethod.card.exp_month,
        card_exp_year: paymentMethod.card.exp_year,
        card_funding: paymentMethod.card.funding,
        card_country: paymentMethod.card.country
      };
    }

    if (paymentMethod.type === 'us_bank_account' && paymentMethod.us_bank_account) {
      details.bank_details = {
        bank_name: paymentMethod.us_bank_account.bank_name,
        account_last4: paymentMethod.us_bank_account.last4,
        account_type: paymentMethod.us_bank_account.account_type,
        routing_number: paymentMethod.us_bank_account.routing_number
      };
    }

    return details;
  } catch (error) {
    console.error("Error extracting card details:", error);
    throw error;
  }
}

/**
 * Log admin action for billing management
 */
exports.logAdminAction = async function logAdminAction(adminId, adminInfo, action, details, userId = null, req = null) {
  try {
    await AdminLogs.create({
      admin_id: adminId,
      admin_name: adminInfo?.full_name || adminInfo?.name || 'Unknown',
      admin_email: adminInfo?.email || 'unknown@example.com',
      admin_role: adminInfo?.role || 'sub_admin',
      feature: 'billing_management',
      action: action, // create, update, delete, set_default
      related_id: details.payment_method_id || userId || null,
      related_collection: 'saved_payment_methods',
      status: 'success',
      details: {
        action_type: action,
        payment_method_id: details.payment_method_id,
        stripe_payment_method_id: details.stripe_payment_method_id,
        is_default: details.is_default,
        user_email: details.user_email,
        user_id: userId,
        ...details
      },
      metadata: {
        user_id: userId,
        user_email: details.user_email,
        payment_method_id: details.payment_method_id,
        stripe_payment_method_id: details.stripe_payment_method_id
      },
      ip_address: req?.ip || req?.connection?.remoteAddress || null,
      user_agent: req?.headers?.['user-agent'] || null,
      request_method: req?.method || null,
      request_endpoint: req?.originalUrl || req?.url || null
    });
  } catch (error) {
    console.error("Error logging admin action:", error);
    // Don't throw error, just log it
  }
}

/**
 * Get all saved payment methods for user
 * GET /user/getBillingMethods
 */
exports.getBillingMethods = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return utils.handleError(res, {
        message: "User not found",
        code: 404
      });
    }

    // Get or create Stripe customer
    const customer = await exports.getOrCreateStripeCustomer(user);

    // Get saved payment methods from database
    const savedMethods = await SavedPaymentMethod.find({
      user_id: userId,
      is_deleted: false,
      is_active: true
    }).sort({ is_default: -1, createdAt: -1 });

    // Also get payment methods from Stripe (in case some are missing in DB)
    const stripePaymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card'
    });

    // Merge and sync
    const allMethods = [];
    const savedMethodIds = savedMethods.map(m => m.stripe_payment_method_id);

    // Add saved methods from database
    for (const savedMethod of savedMethods) {
      allMethods.push({
        _id: savedMethod._id,
        stripe_payment_method_id: savedMethod.stripe_payment_method_id,
        payment_method_type: savedMethod.payment_method_type,
        card_details: savedMethod.card_details,
        bank_details: savedMethod.bank_details,
        billing_details: savedMethod.billing_details,
        is_default: savedMethod.is_default,
        is_active: savedMethod.is_active,
        added_by: savedMethod.added_by,
        createdAt: savedMethod.createdAt,
        updatedAt: savedMethod.updatedAt
      });
    }

    // Add any Stripe methods not in database
    for (const stripeMethod of stripePaymentMethods.data) {
      if (!savedMethodIds.includes(stripeMethod.id)) {
        // Extract details and save to database
        const details = await extractCardDetails(stripeMethod.id);
        const newSavedMethod = await SavedPaymentMethod.create({
          user_id: userId,
          stripe_payment_method_id: stripeMethod.id,
          stripe_customer_id: customer.id,
          payment_method_type: details.payment_method_type,
          card_details: details.card_details,
          bank_details: details.bank_details,
          billing_details: details.billing_details,
          is_default: false,
          is_active: true,
          added_by: {
            type: "user",
            user_id: userId
          }
        });

        allMethods.push({
          _id: newSavedMethod._id,
          stripe_payment_method_id: newSavedMethod.stripe_payment_method_id,
          payment_method_type: newSavedMethod.payment_method_type,
          card_details: newSavedMethod.card_details,
          bank_details: newSavedMethod.bank_details,
          billing_details: newSavedMethod.billing_details,
          is_default: newSavedMethod.is_default,
          is_active: newSavedMethod.is_active,
          added_by: newSavedMethod.added_by,
          createdAt: newSavedMethod.createdAt,
          updatedAt: newSavedMethod.updatedAt
        });
      }
    }

    // Sort: default first, then by creation date
    allMethods.sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return res.status(200).json({
      message: "Billing methods retrieved successfully",
      data: allMethods,
      count: allMethods.length,
      code: 200
    });

  } catch (error) {
    console.error("Error getting billing methods:", error);
    utils.handleError(res, error);
  }
};

/**
 * Add new payment method
 * POST /user/addBillingMethod
 */
exports.addBillingMethod = async (req, res) => {
  try {
    const userId = req.user._id;
    const { payment_method_id, set_as_default = false } = req.body;

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
    const customer = await exports.getOrCreateStripeCustomer(user);

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
      if (error.code === 'resource_already_exists') {
        // Payment method already attached, continue
      } else {
        throw error;
      }
    }

    // Extract card details
    const details = await exports.extractCardDetails(payment_method_id);

    // If setting as default, unset other defaults
    if (set_as_default) {
      await SavedPaymentMethod.updateMany(
        { user_id: userId, is_default: true },
        { is_default: false }
      );
      
      // Update Stripe customer default
      await stripe.customers.update(customer.id, {
        default_source: null,
        invoice_settings: {
          default_payment_method: payment_method_id
        }
      });

      // Update user default payment method
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
        type: "user",
        user_id: userId
      }
    });

    // If this is the first payment method, set as default
    const totalMethods = await SavedPaymentMethod.countDocuments({
      user_id: userId,
      is_deleted: false
    });

    if (totalMethods === 1 && !set_as_default) {
      savedMethod.is_default = true;
      await savedMethod.save();
      
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: payment_method_id
        }
      });

      user.default_payment_method_id = payment_method_id;
      await user.save();
    }

    return res.status(200).json({
      message: "Payment method added successfully",
      data: savedMethod,
      code: 200
    });

  } catch (error) {
    console.error("Error adding billing method:", error);
    utils.handleError(res, error);
  }
};

/**
 * Set payment method as default
 * PUT /user/setDefaultBillingMethod/:id
 */
exports.setDefaultBillingMethod = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return utils.handleError(res, {
        message: "User not found",
        code: 404
      });
    }

    const savedMethod = await SavedPaymentMethod.findOne({
      _id: id,
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
      { user_id: userId, is_default: true, _id: { $ne: id } },
      { is_default: false }
    );

    // Set this as default
    savedMethod.is_default = true;
    await savedMethod.save();

    // Update Stripe customer
    const customer = await getOrCreateStripeCustomer(user);
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
 * Update payment method (billing details)
 * PUT /user/updateBillingMethod/:id
 */
exports.updateBillingMethod = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { billing_details } = req.body;

    const savedMethod = await SavedPaymentMethod.findOne({
      _id: id,
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

    return res.status(200).json({
      message: "Payment method updated successfully",
      data: savedMethod,
      code: 200
    });

  } catch (error) {
    console.error("Error updating billing method:", error);
    utils.handleError(res, error);
  }
};

/**
 * Delete payment method
 * DELETE /user/deleteBillingMethod/:id
 */
exports.deleteBillingMethod = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const savedMethod = await SavedPaymentMethod.findOne({
      _id: id,
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
        _id: { $ne: id }
      });

      if (otherMethod) {
        otherMethod.is_default = true;
        await otherMethod.save();

        const user = await User.findById(userId);
        if (user) {
          user.default_payment_method_id = otherMethod.stripe_payment_method_id;
          await user.save();

          const customer = await getOrCreateStripeCustomer(user);
          await stripe.customers.update(customer.id, {
            invoice_settings: {
              default_payment_method: otherMethod.stripe_payment_method_id
            }
          });
        }
      } else {
        // No other method, clear default
        const user = await User.findById(userId);
        if (user) {
          user.default_payment_method_id = null;
          await user.save();
        }
      }
    }

    // Detach from Stripe customer
    try {
      await stripe.paymentMethods.detach(savedMethod.stripe_payment_method_id);
    } catch (error) {
      // Payment method might already be detached, continue
      console.log("Error detaching payment method (might already be detached):", error.message);
    }

    // Soft delete in database
    savedMethod.is_deleted = true;
    savedMethod.is_active = false;
    savedMethod.deleted_at = new Date();
    savedMethod.deleted_by = {
      type: "user",
      user_id: userId
    };
    await savedMethod.save();

    return res.status(200).json({
      message: "Payment method deleted successfully",
      code: 200
    });

  } catch (error) {
    console.error("Error deleting billing method:", error);
    utils.handleError(res, error);
  }
};

/**
 * Get default payment method
 * GET /user/getDefaultBillingMethod
 */
exports.getDefaultBillingMethod = async (req, res) => {
  try {
    const userId = req.user._id;

    const defaultMethod = await SavedPaymentMethod.findOne({
      user_id: userId,
      is_default: true,
      is_deleted: false,
      is_active: true
    });

    if (!defaultMethod) {
      return res.status(200).json({
        message: "No default payment method found",
        data: null,
        code: 200
      });
    }

    return res.status(200).json({
      message: "Default payment method retrieved successfully",
      data: defaultMethod,
      code: 200
    });

  } catch (error) {
    console.error("Error getting default billing method:", error);
    utils.handleError(res, error);
  }
};

