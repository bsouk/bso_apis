const mongoose = require("mongoose");
const crypto = require("crypto");

const utils = require("../../utils/utils");
const Subscription = require("../../models/subscription");
const Plan = require("../../models/plan");
const User = require("../../models/user");
const { logSuccess, logFailure } = require("../../utils/logger");

const ADMIN_SOURCE = "admin";
const ADMIN_PAYMENT_MODE = "admin_manual";

function generateSubscriptionId() {
  const token = crypto.randomBytes(5).toString("hex");
  return `sub-${token}`;
}

function buildSubscriptionPipeline(match = {}) {
  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: "users",
        localField: "user_id",
        foreignField: "_id",
        as: "user",
        pipeline: [
          {
            $project: {
              _id: 1,
              unique_user_id: 1,
              full_name: 1,
              email: 1,
              phone_number: 1,
              phone_number_code: 1,
              user_type: 1,
              current_user_type: 1,
              status: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "plans",
        localField: "plan_id",
        foreignField: "plan_id",
        as: "plan",
        pipeline: [
          {
            $project: {
              plan_id: 1,
              plan_name: 1,
              plan_description: 1,
              price: 1,
              interval: 1,
              interval_count: 1,
              currency: 1,
              type: 1,
              plan_type: 1,
              is_auto_renewal: 1,
              features: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$plan",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "admins",
        localField: "assigned_by",
        foreignField: "_id",
        as: "assignedByUser",
        pipeline: [
          {
            $project: {
              _id: 1,
              first_name: 1,
              last_name: 1,
              email: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$assignedByUser",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "admins",
        localField: "last_updated_by",
        foreignField: "_id",
        as: "lastUpdatedByUser",
        pipeline: [
          {
            $project: {
              _id: 1,
              first_name: 1,
              last_name: 1,
              email: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$lastUpdatedByUser",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        subscription_id: 1,
        user_id: 1,
        plan_id: 1,
        start_at: 1,
        end_at: 1,
        type: 1,
        status: 1,
        subscription_type: 1,
        source: 1,
        payment_mode: 1,
        admin_note: 1,
        assigned_by: 1,
        last_updated_by: 1,
        is_active: 1,
        isPurchased: 1,
        createdAt: 1,
        updatedAt: 1,
        user: 1,
        plan: 1,
        assignedByUser: 1,
        lastUpdatedByUser: 1,
      },
    },
  ];
  return pipeline;
}

exports.searchUsers = async (req, res) => {
  try {
    const { search = "", types, limit = 10 } = req.query;
    const queryLimit = Math.min(parseInt(limit, 10) || 10, 50);

    const baseFilter = {
      trashed: false,
      is_deleted: false,
    };

    if (types) {
      const allowedTypes = types
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (allowedTypes.length > 0) {
        baseFilter.user_type = { $in: allowedTypes };
      }
    }

    if (search) {
      const regex = new RegExp(search, "i");
      baseFilter.$or = [
        { full_name: regex },
        { email: regex },
        { phone_number: regex },
        { unique_user_id: regex },
      ];
    }

    const users = await User.find(baseFilter)
      .select(
        "_id unique_user_id full_name email phone_number phone_number_code user_type current_user_type status"
      )
      .limit(queryLimit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Users fetched successfully",
      data: users,
      code: 200,
    });
  } catch (error) {
    return utils.handleError(res, error);
  }
};

exports.getPlans = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = { status: "active" };

    if (type) {
      filter.type = type;
    }

    const plans = await Plan.find(filter)
      .select(
        "plan_id plan_name plan_description price interval interval_count currency type plan_type is_auto_renewal access_level features"
      )
      .sort({ createdAt: 1 });

    return res.status(200).json({
      message: "Plans fetched successfully",
      data: plans,
      code: 200,
    });
  } catch (error) {
    return utils.handleError(res, error);
  }
};

// Helper function to automatically update expired subscriptions
async function updateExpiredSubscriptions() {
  try {
    const now = new Date();
    const result = await Subscription.updateMany(
      {
        status: 'active',
        end_at: { $exists: true, $lt: now } // end_at exists and is less than now
      },
      {
        $set: { status: 'expired' }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`✅ Auto-updated ${result.modifiedCount} expired subscription(s) to 'expired' status`);
    }
    return result.modifiedCount;
  } catch (error) {
    console.error('❌ Error updating expired subscriptions:', error);
    return 0;
  }
}

exports.listSubscriptions = async (req, res) => {
  try {
    // First, automatically update expired subscriptions in the database
    await updateExpiredSubscriptions();

    const {
      search,
      status,
      type: typeParam,
      source,
      subscription_type,
      offset = 0,
      limit = 10,
    } = req.query;

    const normalizedType =
      typeof typeParam === 'string' && typeParam.trim().toLowerCase() !== 'all'
        ? typeParam.trim().toLowerCase()
        : null;

    const matchStage = {};

    if (status) {
      matchStage.status = status;
    }

    if (source) {
      matchStage.source = source;
    }

    if (subscription_type) {
      matchStage.subscription_type = subscription_type;
    }

    const pipeline = buildSubscriptionPipeline(matchStage);

    if (normalizedType) {
      pipeline.push({
        $match: {
          $or: [
            {
              type: {
                $regex: new RegExp(`^${normalizedType}$`, 'i'),
              },
            },
            {
              'plan.type': {
                $regex: new RegExp(`^${normalizedType}$`, 'i'),
              },
            },
          ],
        },
      });
    }

    if (search) {
      const regex = new RegExp(search, "i");
      pipeline.push({
        $match: {
          $or: [
            { "user.full_name": regex },
            { "user.email": regex },
            { "user.phone_number": regex },
            { subscription_id: regex },
            { "plan.plan_name": regex },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: Number(offset) },
      { $limit: Number(limit) }
    );

    const data = await Subscription.aggregate(pipeline);

    const countPipeline = buildSubscriptionPipeline(matchStage);

    if (normalizedType) {
      countPipeline.push({
        $match: {
          $or: [
            {
              type: {
                $regex: new RegExp(`^${normalizedType}$`, 'i'),
              },
            },
            {
              'plan.type': {
                $regex: new RegExp(`^${normalizedType}$`, 'i'),
              },
            },
          ],
        },
      });
    }
    if (search) {
      const regex = new RegExp(search, "i");
      countPipeline.push({
        $match: {
          $or: [
            { "user.full_name": regex },
            { "user.email": regex },
            { "user.phone_number": regex },
            { subscription_id: regex },
            { "plan.plan_name": regex },
          ],
        },
      });
    }
    countPipeline.push({ $count: "total" });

    const countResult = await Subscription.aggregate(countPipeline);

    return res.status(200).json({
      message: "Subscription data fetched successfully",
      data,
      count: countResult.length > 0 ? countResult[0].total : 0,
      code: 200,
    });
  } catch (error) {
    return utils.handleError(res, error);
  }
};

exports.createSubscription = async (req, res) => {
  try {
    const {
      user_id,
      plan_id,
      start_at,
      end_at,
      payment_status,
      admin_note,
      payment_mode,
    } = req.body;

    if (!user_id || !plan_id || !start_at || !end_at) {
      return utils.handleError(res, utils.buildErrObject(400, "Missing fields"));
    }

    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return utils.handleError(res, utils.buildErrObject(400, "Invalid user id"));
    }

    if (!admin_note || !admin_note.trim()) {
      return utils.handleError(
        res,
        utils.buildErrObject(400, "Admin note is required")
      );
    }

    const parsedStart = new Date(start_at);
    const parsedEnd = new Date(end_at);

    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
      return utils.handleError(
        res,
        utils.buildErrObject(400, "Invalid start or end date")
      );
    }

    if (parsedStart > parsedEnd) {
      return utils.handleError(
        res,
        utils.buildErrObject(400, "Start date cannot be after end date")
      );
    }

    const [userDoc, planDoc] = await Promise.all([
      User.findById(user_id).select("user_type"),
      Plan.findOne({ plan_id, status: "active" }),
    ]);

    if (!userDoc) {
      return utils.handleError(res, utils.buildErrObject(404, "User not found"));
    }

    if (!planDoc) {
      return utils.handleError(res, utils.buildErrObject(404, "Plan not found"));
    }

    if (
      planDoc.type !== "all_in_one" &&
      Array.isArray(userDoc.user_type) &&
      !userDoc.user_type.includes(planDoc.type)
    ) {
      return utils.handleError(
        res,
        utils.buildErrObject(
          400,
          `User is not enrolled for ${planDoc.type} subscriptions`
        )
      );
    }

    const existingActive = await Subscription.findOne({
      user_id: new mongoose.Types.ObjectId(user_id),
      type: planDoc.type,
      is_active: true,
      status: "active",
    });

    if (existingActive) {
      return utils.handleError(
        res,
        utils.buildErrObject(
          400,
          "User already has an active subscription for this role"
        )
      );
    }

    const paymentModeValue = payment_mode || ADMIN_PAYMENT_MODE;
    const allowedPaymentModes = ["stripe", "iap", "admin_manual", "unknown"];
    if (!allowedPaymentModes.includes(paymentModeValue)) {
      return utils.handleError(
        res,
        utils.buildErrObject(400, "Invalid payment mode")
      );
    }

    const subscriptionPayload = {
      user_id: new mongoose.Types.ObjectId(user_id),
      subscription_id: generateSubscriptionId(),
      plan_id: planDoc.plan_id,
      start_at: parsedStart,
      end_at: parsedEnd,
      type: planDoc.type,
      status: "active",
      subscription_type: payment_status === "unpaid" ? "unpaid" : "paid",
      isPurchased: payment_status === "paid",
      source: ADMIN_SOURCE,
      payment_mode: paymentModeValue,
      admin_note: admin_note.trim(),
      assigned_by: req.user?._id,
      last_updated_by: req.user?._id,
      is_active: true,
    };

    const newSubscription = await Subscription.create(subscriptionPayload);

    await logSuccess(
      req.user,
      "user_subscriptions",
      "create",
      {
        related_id: newSubscription._id,
        related_collection: "subscriptions",
        details: {
          subscription_id: newSubscription.subscription_id,
          plan_id: planDoc.plan_id,
          plan_name: planDoc.plan_name,
          plan_type: planDoc.type,
          user_id,
          user_type: userDoc.user_type,
          start_at: newSubscription.start_at,
          end_at: newSubscription.end_at,
          payment_status: payment_status,
          payment_mode: newSubscription.payment_mode,
        },
        metadata: {
          user_email: userDoc.email,
          user_phone: userDoc.phone_number,
          admin_note: newSubscription.admin_note,
        },
      },
      req
    );

    return res.status(201).json({
      message: "Subscription created successfully",
      data: newSubscription,
      code: 200,
    });
  } catch (error) {
    await logFailure(
      req.user,
      "user_subscriptions",
      "create",
      error,
      {
        metadata: {
          user_id: req.body?.user_id,
          plan_id: req.body?.plan_id,
        },
      },
      req
    );
    return utils.handleError(res, error);
  }
};

exports.getSubscriptionDetail = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return utils.handleError(res, utils.buildErrObject(400, "Invalid id"));
    }

    const pipeline = buildSubscriptionPipeline({
      _id: new mongoose.Types.ObjectId(id),
    });

    const [subscription] = await Subscription.aggregate(pipeline);

    if (!subscription) {
      return utils.handleError(
        res,
        utils.buildErrObject(404, "Subscription not found")
      );
    }

    return res.status(200).json({
      message: "Subscription fetched successfully",
      data: subscription,
      code: 200,
    });
  } catch (error) {
    return utils.handleError(res, error);
  }
};

exports.updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      plan_id,
      start_at,
      end_at,
      payment_status,
      admin_note,
      payment_mode,
      status,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return utils.handleError(res, utils.buildErrObject(400, "Invalid id"));
    }

    const subscription = await Subscription.findById(id);

    if (!subscription) {
      return utils.handleError(
        res,
        utils.buildErrObject(404, "Subscription not found")
      );
    }

    const previousData = subscription.toObject();
    const updates = {};
    let updatedPlanInfo = null;

    if (plan_id && plan_id !== subscription.plan_id) {
      const planDoc = await Plan.findOne({ plan_id, status: "active" });
      if (!planDoc) {
        return utils.handleError(
          res,
          utils.buildErrObject(404, "Plan not found")
        );
      }

      if (
        planDoc.type !== "all_in_one" &&
        subscription.user_id &&
        !(await User.exists({
          _id: subscription.user_id,
          user_type: planDoc.type,
        }))
      ) {
        return utils.handleError(
          res,
          utils.buildErrObject(
            400,
            `User is not enrolled for ${planDoc.type} subscriptions`
          )
        );
      }

      updates.plan_id = planDoc.plan_id;
      updates.type = planDoc.type;
      updatedPlanInfo = planDoc;
    }

    if (start_at) {
      const parsedStart = new Date(start_at);
      if (Number.isNaN(parsedStart.getTime())) {
        return utils.handleError(
          res,
          utils.buildErrObject(400, "Invalid start date")
        );
      }
      updates.start_at = parsedStart;
    }

    if (end_at) {
      const parsedEnd = new Date(end_at);
      if (Number.isNaN(parsedEnd.getTime())) {
        return utils.handleError(
          res,
          utils.buildErrObject(400, "Invalid end date")
        );
      }
      updates.end_at = parsedEnd;
    }

    const effectiveStart = updates.start_at || subscription.start_at;
    const effectiveEnd = updates.end_at || subscription.end_at;

    if (effectiveStart && effectiveEnd && effectiveStart > effectiveEnd) {
      return utils.handleError(
        res,
        utils.buildErrObject(400, "Start date cannot be after end date")
      );
    }

    if (payment_status) {
      if (!["paid", "unpaid"].includes(payment_status)) {
        return utils.handleError(
          res,
          utils.buildErrObject(400, "Invalid payment status")
        );
      }
      updates.subscription_type = payment_status;
      updates.isPurchased = payment_status === "paid";
    }

    if (admin_note !== undefined) {
      if (!admin_note || !admin_note.trim()) {
        return utils.handleError(
          res,
          utils.buildErrObject(400, "Admin note is required")
        );
      }
      updates.admin_note = admin_note.trim();
    }

    if (payment_mode) {
      const allowedPaymentModes = ["stripe", "iap", "admin_manual", "unknown"];
      if (!allowedPaymentModes.includes(payment_mode)) {
        return utils.handleError(
          res,
          utils.buildErrObject(400, "Invalid payment mode")
        );
      }
      updates.payment_mode = payment_mode;
    }

    if (status) {
      const allowedStatuses = ["active", "disabled", "cancelled", "expired"];
      if (!allowedStatuses.includes(status)) {
        return utils.handleError(
          res,
          utils.buildErrObject(400, "Invalid status value")
        );
      }
      updates.status = status;
      updates.is_active = status === "active";
    }

    if (Object.keys(updates).length === 0) {
      return utils.handleError(
        res,
        utils.buildErrObject(400, "No updates provided")
      );
    }

    updates.last_updated_by = req.user?._id;

    const updatedSubscription = await Subscription.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    await logSuccess(
      req.user,
      "user_subscriptions",
      "update",
      {
        related_id: updatedSubscription?._id || id,
        related_collection: "subscriptions",
        details: {
          subscription_id: updatedSubscription?.subscription_id || previousData.subscription_id,
          plan_id: updatedSubscription?.plan_id,
          plan_name: updatedPlanInfo?.plan_name || previousData.plan_id,
          previous_plan_id: previousData.plan_id,
          previous_status: previousData.status,
          new_status: updatedSubscription?.status || previousData.status,
          previous_dates: {
            start_at: previousData.start_at,
            end_at: previousData.end_at,
          },
          updated_dates: {
            start_at: updatedSubscription?.start_at,
            end_at: updatedSubscription?.end_at,
          },
          payment_mode: updatedSubscription?.payment_mode,
          payment_status: updatedSubscription?.subscription_type,
        },
        metadata: {
          user_id: previousData.user_id,
          admin_note: updatedSubscription?.admin_note,
        },
      },
      req
    );

    return res.status(200).json({
      message: "Subscription updated successfully",
      data: updatedSubscription,
      code: 200,
    });
  } catch (error) {
    await logFailure(
      req.user,
      "user_subscriptions",
      "update",
      error,
      {
        metadata: {
          subscription_id: req.params?.id,
        },
      },
      req
    );
    return utils.handleError(res, error);
  }
};

exports.updateSubscriptionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return utils.handleError(res, utils.buildErrObject(400, "Invalid id"));
    }

    if (!status) {
      return utils.handleError(
        res,
        utils.buildErrObject(400, "Status is required")
      );
    }

    const allowedStatuses = ["active", "disabled"];
    if (!allowedStatuses.includes(status)) {
      return utils.handleError(
        res,
        utils.buildErrObject(400, "Invalid status value")
      );
    }

    const subscription = await Subscription.findById(id);

    if (!subscription) {
      return utils.handleError(
        res,
        utils.buildErrObject(404, "Subscription not found")
      );
    }

    const updated = await Subscription.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
          is_active: status === "active",
          last_updated_by: req.user?._id,
        },
      },
      { new: true }
    );

    if (!updated) {
      return utils.handleError(
        res,
        utils.buildErrObject(404, "Subscription not found")
      );
    }

    await logSuccess(
      req.user,
      "user_subscriptions",
      "status_update",
      {
        related_id: updated._id,
        related_collection: "subscriptions",
        details: {
          subscription_id: updated.subscription_id,
          previous_status: subscription.status,
          new_status: updated.status,
          plan_id: updated.plan_id,
        },
        metadata: {
          user_id: updated.user_id,
        },
      },
      req
    );

    return res.status(200).json({
      message: "Subscription status updated successfully",
      data: updated,
      code: 200,
    });
  } catch (error) {
    await logFailure(
      req.user,
      "user_subscriptions",
      "status_update",
      error,
      {
        metadata: {
          subscription_id: req.params?.id,
        },
      },
      req
    );
    return utils.handleError(res, error);
  }
};

exports.deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return utils.handleError(res, utils.buildErrObject(400, "Invalid id"));
    }

    const deleted = await Subscription.findByIdAndDelete(id);

    if (!deleted) {
      return utils.handleError(
        res,
        utils.buildErrObject(404, "Subscription not found")
      );
    }

    await logSuccess(
      req.user,
      "user_subscriptions",
      "delete",
      {
        related_id: deleted._id,
        related_collection: "subscriptions",
        details: {
          subscription_id: deleted.subscription_id,
          plan_id: deleted.plan_id,
          status: deleted.status,
        },
        metadata: {
          user_id: deleted.user_id,
        },
      },
      req
    );

    return res.status(200).json({
      message: "Subscription deleted successfully",
      code: 200,
    });
  } catch (error) {
    await logFailure(
      req.user,
      "user_subscriptions",
      "delete",
      error,
      {
        metadata: {
          subscription_id: req.params?.id,
        },
      },
      req
    );
    return utils.handleError(res, error);
  }
};

// Manually trigger expiration of all expired subscriptions
exports.expireSubscriptions = async (req, res) => {
  try {
    const now = new Date();
    
    // Find all active subscriptions that should be expired
    const result = await Subscription.updateMany(
      {
        status: 'active',
        end_at: { $exists: true, $ne: null, $lt: now }
      },
      {
        $set: { 
          status: 'expired',
          is_active: false,
          last_updated_by: req.user?._id
        }
      }
    );
    
    // Log the action
    await logSuccess(
      req.user,
      "user_subscriptions",
      "bulk_expire",
      {
        details: {
          expired_count: result.modifiedCount,
          triggered_at: now.toISOString(),
        },
        metadata: {
          action: "manual_bulk_expiration",
        },
      },
      req
    );
    
    return res.status(200).json({
      message: `Successfully expired ${result.modifiedCount} subscription(s)`,
      data: {
        expired_count: result.modifiedCount,
        checked_at: now.toISOString()
      },
      code: 200,
    });
  } catch (error) {
    await logFailure(
      req.user,
      "user_subscriptions",
      "bulk_expire",
      error,
      {
        metadata: {
          action: "manual_bulk_expiration",
        },
      },
      req
    );
    return utils.handleError(res, error);
  }
};

