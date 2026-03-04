const Admin = require('../../models/admin');
const ResetPassword = require('../../models/reset_password');
const AdminPasswordResetRequest = require('../../models/admin_password_reset_request');
const uuid = require('uuid');
const emailer = require('../../utils/emailer');
const utils = require('../../utils/utils');

// Admin email links: production → PRODUCTION_ADMIN_URL, local → LOCAL_ADMIN_URL
// Optional: USE_LOCAL_ADMIN_FOR_EMAILS=true forces LOCAL_ADMIN_URL when NODE_ENV=production but testing locally
function getAdminBaseUrlForEmails() {
  if (process.env.USE_LOCAL_ADMIN_FOR_EMAILS === 'true' || process.env.USE_LOCAL_ADMIN_FOR_EMAILS === '1') {
    return process.env.LOCAL_ADMIN_URL || '';
  }
  return process.env.NODE_ENV === 'production' ? (process.env.PRODUCTION_ADMIN_URL || '') : (process.env.LOCAL_ADMIN_URL || '');
}

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const RESET_TOKEN_EXPIRY_MINUTES = 15;
const MAX_PASSWORD_RESET_REQUESTS_PER_12_HOURS = 3;

/**
 * Forgot password request (no auth).
 * - Super admin: reset link sent immediately; max 3 requests per 12 hours.
 * - Sub-admin: max 3 requests per 12 hours; request sent to admin for approval.
 */
exports.forgotPasswordRequest = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return utils.handleError(res, { message: 'Email is required', code: 400 });
    }

    const user = await Admin.findOne({ email: email.toLowerCase() });
    if (!user) {
      return utils.handleError(res, { message: 'No account found with the provided email', code: 400 });
    }

    // Super admin: send reset link directly; max 3 requests per 12 hours
    if (user.role === 'super_admin') {
      const twelveHoursAgo = new Date(Date.now() - TWELVE_HOURS_MS);
      const requestCount = await AdminPasswordResetRequest.countDocuments({
        sub_admin_id: user._id,
        createdAt: { $gte: twelveHoursAgo },
      });
      if (requestCount >= MAX_PASSWORD_RESET_REQUESTS_PER_12_HOURS) {
        return utils.handleError(res, {
          message: `You can only submit up to ${MAX_PASSWORD_RESET_REQUESTS_PER_12_HOURS} password reset requests every 12 hours. Please try again later.`,
          code: 400,
        });
      }

      const token = uuid.v4();
      const tokenExpirationDuration = RESET_TOKEN_EXPIRY_MINUTES * 60;
      await ResetPassword.create({
        email: user.email,
        token,
        used: false,
        exp_time: new Date(Date.now() + tokenExpirationDuration * 1000),
      });

      const baseUrl = getAdminBaseUrlForEmails();
      const reset_link = `${baseUrl}reset-password/${token}`;
      const mailOptions = {
        to: user.email,
        subject: 'Password Reset Request',
        name: user.full_name || user.first_name || user.email,
        email: user.email,
        reset_link,
      };
      await emailer.sendEmail(null, mailOptions, 'forgotPasswordWithLink');

      // Record this request so the 12-hour limit applies
      await AdminPasswordResetRequest.create({
        sub_admin_id: user._id,
        email: user.email,
        status: 'approved',
      });

      return res.json({
        code: 200,
        message: 'Reset link has been sent to your email.',
      });
    }

    // Sub-admin: max 3 requests per 12 hours (any status), then send for approval
    const twelveHoursAgo = new Date(Date.now() - TWELVE_HOURS_MS);
    const requestCount = await AdminPasswordResetRequest.countDocuments({
      sub_admin_id: user._id,
      createdAt: { $gte: twelveHoursAgo },
    });
    if (requestCount >= MAX_PASSWORD_RESET_REQUESTS_PER_12_HOURS) {
      return utils.handleError(res, {
        message: `You can only submit up to ${MAX_PASSWORD_RESET_REQUESTS_PER_12_HOURS} password reset requests every 12 hours. Please try again later.`,
        code: 400,
      });
    }

    await AdminPasswordResetRequest.create({
      sub_admin_id: user._id,
      email: user.email,
      status: 'pending',
    });

    const mailOptions = {
      to: user.email,
      subject: 'Password Reset Request Received',
      name: user.full_name || user.first_name || user.email,
      email: user.email,
    };
    await emailer.sendEmail(null, mailOptions, 'adminPasswordResetRequestSent');

    return res.json({
      code: 200,
      message: 'Your request has been sent to the administrator. You will receive a reset link by email once it is approved.',
    });
  } catch (err) {
    console.error(err);
    utils.handleError(res, err);
  }
};

/**
 * List password forgot requests (super_admin only).
 */
exports.getPasswordForgotRequests = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ code: 403, message: 'Only super admin can view password reset requests' });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const status = req.query.status; // pending | approved | rejected
    const search = (req.query.search || '').trim().toLowerCase();

    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, count] = await Promise.all([
      AdminPasswordResetRequest.find(filter)
        .populate('sub_admin_id', 'first_name last_name full_name email')
        .populate('approved_by', 'first_name last_name full_name email')
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      AdminPasswordResetRequest.countDocuments(filter),
    ]);

    return res.json({ code: 200, data, count });
  } catch (err) {
    console.error(err);
    utils.handleError(res, err);
  }
};

/**
 * Get single password forgot request by id (super_admin only).
 */
exports.getPasswordForgotRequestById = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ code: 403, message: 'Only super admin can view this request' });
    }

    const requestDoc = await AdminPasswordResetRequest.findById(req.params.id)
      .populate('sub_admin_id', 'first_name last_name full_name email')
      .populate('approved_by', 'first_name last_name full_name email')
      .lean();
    if (!requestDoc) {
      return res.status(404).json({ code: 404, message: 'Request not found' });
    }
    return res.json({ code: 200, data: requestDoc });
  } catch (err) {
    console.error(err);
    utils.handleError(res, err);
  }
};

/**
 * Approve request: create reset token, send reset link email, update request (super_admin only).
 */
exports.approvePasswordForgotRequest = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ code: 403, message: 'Only super admin can approve requests' });
    }

    const requestDoc = await AdminPasswordResetRequest.findById(req.params.id);
    if (!requestDoc) {
      return res.status(404).json({ code: 404, message: 'Request not found' });
    }
    if (requestDoc.status !== 'pending') {
      return utils.handleError(res, { message: 'Request is no longer pending', code: 400 });
    }

    const user = await Admin.findById(requestDoc.sub_admin_id);
    if (!user) {
      return utils.handleError(res, { message: 'Sub-admin user not found', code: 400 });
    }

    const token = uuid.v4();
    const tokenExpirationDuration = RESET_TOKEN_EXPIRY_MINUTES * 60;
    await ResetPassword.create({
      email: user.email,
      token,
      used: false,
      exp_time: new Date(Date.now() + tokenExpirationDuration * 1000),
    });

    // Respects USE_LOCAL_ADMIN_FOR_EMAILS so local testing uses LOCAL_ADMIN_URL
    const baseUrl = getAdminBaseUrlForEmails();
    const reset_link = `${baseUrl}reset-password/${token}`;

    const mailOptions = {
      to: user.email,
      subject: 'Password Reset Request Approved',
      name: user.full_name || user.first_name || user.email,
      email: user.email,
      reset_link,
    };
    await emailer.sendEmail(null, mailOptions, 'forgotPasswordWithLink');

    requestDoc.status = 'approved';
    requestDoc.approved_by = req.user._id;
    requestDoc.approved_at = new Date();
    requestDoc.reset_token = token;
    requestDoc.reset_token_expiry = new Date(Date.now() + tokenExpirationDuration * 1000);
    await requestDoc.save();

    return res.json({
      code: 200,
      message: 'Request approved. Reset link has been sent to the sub-admin by email.',
    });
  } catch (err) {
    console.error(err);
    utils.handleError(res, err);
  }
};

/**
 * Reject request (super_admin only).
 */
exports.rejectPasswordForgotRequest = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ code: 403, message: 'Only super admin can reject requests' });
    }

    const { reason } = req.body || {};
    const requestDoc = await AdminPasswordResetRequest.findById(req.params.id);
    if (!requestDoc) {
      return res.status(404).json({ code: 404, message: 'Request not found' });
    }
    if (requestDoc.status !== 'pending') {
      return utils.handleError(res, { message: 'Request is no longer pending', code: 400 });
    }

    requestDoc.status = 'rejected';
    requestDoc.approved_by = req.user._id;
    requestDoc.approved_at = new Date();
    if (reason) requestDoc.rejected_reason = reason;
    await requestDoc.save();

    return res.json({ code: 200, message: 'Request rejected.' });
  } catch (err) {
    console.error(err);
    utils.handleError(res, err);
  }
};

/**
 * Delete single password forgot request (super_admin only).
 */
exports.deletePasswordForgotRequest = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ code: 403, message: 'Only super admin can delete requests' });
    }

    const requestDoc = await AdminPasswordResetRequest.findByIdAndDelete(req.params.id);
    if (!requestDoc) {
      return res.status(404).json({ code: 404, message: 'Request not found' });
    }
    return res.json({ code: 200, message: 'Request deleted.' });
  } catch (err) {
    console.error(err);
    utils.handleError(res, err);
  }
};

/**
 * Delete multiple password forgot requests by ids (super_admin only).
 */
exports.deletePasswordForgotRequestsMany = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ code: 403, message: 'Only super admin can delete requests' });
    }

    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return utils.handleError(res, { message: 'ids array is required', code: 400 });
    }

    const result = await AdminPasswordResetRequest.deleteMany({ _id: { $in: ids } });
    return res.json({
      code: 200,
      message: `${result.deletedCount} request(s) deleted.`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error(err);
    utils.handleError(res, err);
  }
};

/**
 * Delete password forgot requests by date range (super_admin only).
 * Body: { fromDate, toDate } - ISO date strings. Deletes where createdAt >= fromDate and createdAt <= toDate.
 */
exports.deletePasswordForgotRequestsByDateRange = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ code: 403, message: 'Only super admin can delete requests' });
    }

    const { fromDate, toDate } = req.body || {};
    if (!fromDate || !toDate) {
      return utils.handleError(res, { message: 'fromDate and toDate are required', code: 400 });
    }

    const from = new Date(fromDate);
    let to = new Date(toDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return utils.handleError(res, { message: 'Invalid fromDate or toDate', code: 400 });
    }
    if (from > to) {
      return utils.handleError(res, { message: 'fromDate must be before or equal to toDate', code: 400 });
    }
    // Include full end day in UTC (23:59:59.999) so the selected "To" date includes all requests that day
    const toEndOfDay = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate(), 23, 59, 59, 999));

    const result = await AdminPasswordResetRequest.deleteMany({
      createdAt: { $gte: from, $lte: toEndOfDay },
    });
    return res.json({
      code: 200,
      message: `${result.deletedCount} request(s) deleted for the selected date range.`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error(err);
    utils.handleError(res, err);
  }
};
