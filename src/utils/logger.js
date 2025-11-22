const AdminLogs = require('../models/admin_logs');
const mongoose = require('mongoose');

/**
 * ═══════════════════════════════════════════════════════════
 * ADMIN ACTIVITY LOGGER UTILITY
 * ═══════════════════════════════════════════════════════════
 * 
 * Centralized logging utility for tracking all administrative actions
 * 
 * @version 1.0.0
 * @created November 5, 2025
 * 
 * Usage:
 *   const { createLog } = require('../utils/logger');
 *   
 *   await createLog({
 *     admin_id: req.user._id,
 *     admin_name: req.user.full_name,
 *     admin_email: req.user.email,
 *     admin_role: req.user.role,
 *     feature: 'manual_enquiry',
 *     action: 'create',
 *     status: 'success',
 *     related_id: enquiry._id,
 *     metadata: { buyer_name: 'ABC Corp' },
 *     req: req
 *   });
 */

/**
 * Create activity log entry
 * 
 * @param {Object} params - Log parameters
 * @param {String|ObjectId} params.admin_id - Admin MongoDB ObjectId
 * @param {String} params.admin_name - Admin full name
 * @param {String} params.admin_email - Admin email address
 * @param {String} params.admin_role - Admin role (super_admin or sub_admin)
 * @param {String} params.feature - Feature name (manual_enquiry, product, etc.)
 * @param {String} params.action - Action type (create, update, delete, etc.)
 * @param {String|ObjectId} [params.related_id] - Related document ID (optional)
 * @param {String} [params.related_collection] - Collection name (optional)
 * @param {String} [params.status='success'] - Action status (success or failed)
 * @param {Object} [params.details={}] - Additional action details
 * @param {String} [params.error_message] - Error message if failed
 * @param {String} [params.error_stack] - Error stack trace if failed
 * @param {Object} [params.metadata={}] - Feature-specific metadata
 * @param {Object} [params.req] - Express request object (for IP, user agent)
 * 
 * @returns {Promise<Object>} Created log document
 */
async function createLog({
  admin_id,
  admin_name,
  admin_email,
  admin_role,
  feature,
  action,
  related_id = null,
  related_collection = null,
  status = 'success',
  details = {},
  error_message = null,
  error_stack = null,
  metadata = {},
  req = null
}) {
  try {
    // Validate required fields
    if (!admin_id || !admin_name || !admin_email || !admin_role || !feature || !action) {
      console.error('❌ Logger: Missing required fields', {
        admin_id: !!admin_id,
        admin_name: !!admin_name,
        admin_email: !!admin_email,
        admin_role: !!admin_role,
        feature: !!feature,
        action: !!action
      });
      return null;
    }

    // Build log data object
    const logData = {
      admin_id,
      admin_name,
      admin_email,
      admin_role,
      feature,
      action,
      status,
      details,
      metadata
    };

    // Add optional fields if provided
    if (related_id) logData.related_id = related_id;
    if (related_collection) logData.related_collection = related_collection;
    if (error_message) logData.error_message = error_message;
    if (error_stack) logData.error_stack = error_stack;

    // Extract request metadata if req object provided
    if (req) {
      // Get IP address (handle proxy scenarios)
      logData.ip_address = req.ip || 
                          req.headers['x-forwarded-for']?.split(',')[0] || 
                          req.connection?.remoteAddress || 
                          req.socket?.remoteAddress;
      
      logData.user_agent = req.get('user-agent') || req.headers['user-agent'];
      logData.request_method = req.method;
      logData.request_endpoint = req.originalUrl || req.url;
    }

    // Create log entry in database
    const log = await AdminLogs.create(logData);

    // Success console log (for debugging)
    console.log(`✅ [LOG CREATED] ${feature} - ${action} by ${admin_name} (${status})`);

    return log;

  } catch (error) {
    // IMPORTANT: Logging failure should NOT break the main operation
    console.error('❌ [LOG CREATION FAILED]', {
      error: error.message,
      feature,
      action,
      admin_email
    });
    
    // Return null instead of throwing - graceful degradation
    return null;
  }
}

/**
 * Create log from admin user object (helper function)
 * Extracts admin details automatically from req.user
 * 
 * @param {Object} admin - Admin user object (req.user)
 * @param {String} feature - Feature name
 * @param {String} action - Action type
 * @param {Object} options - Additional options
 * @param {Object} req - Express request object
 * 
 * @returns {Promise<Object>} Created log document
 */
async function createLogFromAdmin(admin, feature, action, options = {}, req = null) {
  // Handle null or undefined admin gracefully
  if (!admin) {
    console.error('❌ Logger: Admin object is null or undefined', { feature, action });
    return null;
  }

  return createLog({
    admin_id: admin._id || admin.id,
    admin_name: admin.full_name || `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || 'Unknown Admin',
    admin_email: admin.email || 'unknown@example.com',
    admin_role: admin.role || 'unknown',
    feature,
    action,
    ...options,
    req
  });
}

/**
 * Create success log (helper function)
 * 
 * @param {Object} admin - Admin user object
 * @param {String} feature - Feature name
 * @param {String} action - Action type
 * @param {Object} options - Additional options
 * @param {Object} req - Express request object
 */
async function logSuccess(admin, feature, action, options = {}, req = null) {
  return createLogFromAdmin(admin, feature, action, {
    status: 'success',
    ...options
  }, req);
}

/**
 * Create failed log (helper function)
 * 
 * @param {Object} admin - Admin user object
 * @param {String} feature - Feature name
 * @param {String} action - Action type
 * @param {Error} error - Error object
 * @param {Object} options - Additional options
 * @param {Object} req - Express request object
 */
async function logFailure(admin, feature, action, error, options = {}, req = null) {
  return createLogFromAdmin(admin, feature, action, {
    status: 'failed',
    error_message: error.message || error.toString(),
    error_stack: error.stack,
    ...options
  }, req);
}

/**
 * Cleanup old logs (utility for cron jobs)
 * 
 * @param {Number} daysOld - Delete logs older than this many days
 * @returns {Promise<Number>} Number of logs deleted
 */
async function cleanupOldLogs(daysOld = 365) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await AdminLogs.updateMany(
      {
        createdAt: { $lt: cutoffDate },
        is_deleted: { $ne: true }
      },
      {
        is_deleted: true,
        deleted_at: new Date()
      }
    );

    console.log(`🧹 Cleaned up ${result.modifiedCount} logs older than ${daysOld} days`);
    return result.modifiedCount;
  } catch (error) {
    console.error('❌ Failed to cleanup old logs:', error.message);
    return 0;
  }
}

/**
 * Get logs summary for specific admin
 * 
 * @param {String|ObjectId} adminId - Admin ID
 * @returns {Promise<Object>} Summary statistics
 */
async function getAdminLogsSummary(adminId) {
  try {
    const summary = await AdminLogs.aggregate([
      { 
        $match: { 
          admin_id: new mongoose.Types.ObjectId(adminId),
          is_deleted: { $ne: true }
        } 
      },
      {
        $facet: {
          total: [{ $count: 'count' }],
          by_feature: [
            { $group: { _id: '$feature', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          recent_actions: [
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            { $project: { feature: 1, action: 1, status: 1, createdAt: 1 } }
          ],
          failed_count: [
            { $match: { status: 'failed' } },
            { $count: 'count' }
          ]
        }
      }
    ]);

    return summary[0];
  } catch (error) {
    console.error('❌ Failed to get admin logs summary:', error.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  createLog,
  createLogFromAdmin,
  logSuccess,
  logFailure,
  cleanupOldLogs,
  getAdminLogsSummary
};

