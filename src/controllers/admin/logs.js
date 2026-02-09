const AdminLogs = require("../../models/admin_logs");
const utils = require("../../utils/utils");
const mongoose = require("mongoose");

/**
 * ═══════════════════════════════════════════════════════════
 * ADMIN LOGS MANAGEMENT CONTROLLER
 * ═══════════════════════════════════════════════════════════
 * 
 * Handles CRUD operations for admin activity logs
 * 
 * @version 1.0.0
 * @created November 5, 2025
 */

/**
 * GET /admin/getLogs
 * Get all logs with advanced pagination, search, and filters
 * 
 * Query Parameters:
 * - search: String (searches admin name, email, enquiry number, buyer name)
 * - offset: Number (default: 0)
 * - limit: Number (default: 10)
 * - feature: String (filter by feature)
 * - action: String (filter by action)
 * - status: String (filter by status)
 * - admin_id: String (filter by specific admin)
 * - admin_role: String (filter by role)
 * - from_date: Date (start date)
 * - to_date: Date (end date)
 */
exports.getLogs = async (req, res) => {
  try {
    console.log("📋 Fetching logs with filters:", req.query);

    const {
      search = '',
      offset = 0,
      limit = 10,
      feature = '',
      action = '',
      status = '',
      admin_id = '',
      admin_role = '',
      from_date = '',
      to_date = ''
    } = req.query;

    // Build filter object
    const filter = { is_deleted: { $ne: true } };

    // ─────────────────────────────────────────────────
    // SEARCH FILTER - Multi-field search
    // ─────────────────────────────────────────────────
    if (search && search.trim()) {
      filter.$or = [
        { admin_name: { $regex: search, $options: 'i' } },
        { admin_email: { $regex: search, $options: 'i' } },
        { 'metadata.enquiry_number': { $regex: search, $options: 'i' } },
        { 'metadata.buyer_name': { $regex: search, $options: 'i' } },
        { 'metadata.buyer_email': { $regex: search, $options: 'i' } }
      ];
    }

    // ─────────────────────────────────────────────────
    // FEATURE FILTER
    // ─────────────────────────────────────────────────
    if (feature && feature.trim()) {
      filter.feature = feature;
    }

    // ─────────────────────────────────────────────────
    // ACTION FILTER
    // ─────────────────────────────────────────────────
    if (action && action.trim()) {
      filter.action = action;
    }

    // ─────────────────────────────────────────────────
    // STATUS FILTER
    // ─────────────────────────────────────────────────
    if (status && status.trim()) {
      filter.status = status;
    }

    // ─────────────────────────────────────────────────
    // ADMIN FILTER
    // ─────────────────────────────────────────────────
    if (admin_id && admin_id.trim()) {
      filter.admin_id = new mongoose.Types.ObjectId(admin_id);
    }

    // ─────────────────────────────────────────────────
    // ADMIN ROLE FILTER
    // ─────────────────────────────────────────────────
    if (admin_role && admin_role.trim()) {
      filter.admin_role = admin_role;
    }

    // ─────────────────────────────────────────────────
    // DATE RANGE FILTER
    // ─────────────────────────────────────────────────
    if (from_date || to_date) {
      filter.createdAt = {};
      if (from_date) {
        filter.createdAt.$gte = new Date(from_date);
      }
      if (to_date) {
        const endDate = new Date(to_date);
        endDate.setHours(23, 59, 59, 999); // End of day
        filter.createdAt.$lte = endDate;
      }
    }

    console.log("🔍 Applied filters:", filter);

    // ─────────────────────────────────────────────────
    // FETCH LOGS WITH AGGREGATION
    // ─────────────────────────────────────────────────
    const logs = await AdminLogs.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'admins',
          localField: 'admin_id',
          foreignField: '_id',
          as: 'admin_full_details'
        }
      },
      {
        $addFields: {
          admin_full_details: { $arrayElemAt: ['$admin_full_details', 0] }
        }
      },
      {
        $project: {
          'admin_full_details.password': 0,
          'admin_full_details.decoded_password': 0,
          error_stack: 0 // Don't return stack trace in list view
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: parseInt(offset) },
      { $limit: parseInt(limit) }
    ]);

    // Get total count for pagination
    const totalCount = await AdminLogs.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    const currentPage = Math.floor(parseInt(offset) / parseInt(limit)) + 1;
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    console.log(`✅ Found ${logs.length} logs out of ${totalCount} total`);

    res.json({
      data: logs,
      count: totalCount,
      totalPages,
      currentPage,
      hasNextPage,
      hasPrevPage,
      limit: parseInt(limit),
      offset: parseInt(offset),
      code: 200
    });

  } catch (error) {
    console.error("❌ Error fetching logs:", error);
    utils.handleError(res, error);
  }
};

/**
 * GET /admin/getLogById/:id
 * Get single log with full details
 */
exports.getLogById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("📄 Fetching log details for ID:", id);

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid log ID format',
        code: 400
      });
    }

    // Fetch log with admin details
    const log = await AdminLogs.findOne({
      _id: id,
      is_deleted: { $ne: true }
    }).populate('admin_id', 'full_name email role profile_image');

    if (!log) {
      return res.status(404).json({
        message: 'Log not found',
        code: 404
      });
    }

    console.log("✅ Log found:", log._id);

    res.json({
      data: log,
      code: 200
    });

  } catch (error) {
    console.error("❌ Error fetching log details:", error);
    utils.handleError(res, error);
  }
};

/**
 * DELETE /admin/deleteLog/:id
 * Soft delete a single log
 * Allowed: super_admin or sub_admin with Logs Delete (enforced by route middleware)
 */
exports.deleteLog = async (req, res) => {
  try {
    const { id } = req.params;
    const admin_id = req.user._id;

    console.log(`🗑️ Deleting log ${id} by ${req.user.email}`);

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid log ID format',
        code: 400
      });
    }

    // Soft delete the log
    const log = await AdminLogs.findByIdAndUpdate(
      id,
      {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: admin_id
      },
      { new: true }
    );

    if (!log) {
      return res.status(404).json({
        message: 'Log not found',
        code: 404
      });
    }

    console.log("✅ Log deleted successfully:", id);

    res.json({
      message: 'Log deleted successfully',
      code: 200
    });

  } catch (error) {
    console.error("❌ Error deleting log:", error);
    utils.handleError(res, error);
  }
};

/**
 * DELETE /admin/bulkDeleteLogs
 * Bulk soft delete multiple logs
 * Allowed: super_admin or sub_admin with Logs Delete (enforced by route middleware)
 */
exports.bulkDeleteLogs = async (req, res) => {
  try {
    const { ids } = req.body;
    const admin_id = req.user._id;

    console.log(`🗑️ Bulk deleting ${ids?.length} logs by ${req.user.email}`);

    // Validate input
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        message: 'Please provide log IDs to delete',
        code: 400
      });
    }

    // Validate all IDs
    const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        message: 'Some log IDs have invalid format',
        invalid_ids: invalidIds,
        code: 400
      });
    }

    // Bulk update
    const result = await AdminLogs.updateMany(
      {
        _id: { $in: ids },
        is_deleted: { $ne: true }
      },
      {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: admin_id
      }
    );

    console.log(`✅ Bulk deleted ${result.modifiedCount} logs`);

    res.json({
      message: `${result.modifiedCount} log(s) deleted successfully`,
      count: result.modifiedCount,
      code: 200
    });

  } catch (error) {
    console.error("❌ Error bulk deleting logs:", error);
    utils.handleError(res, error);
  }
};

/**
 * GET /admin/getLogStats
 * Get comprehensive statistics for dashboard/analytics
 */
exports.getLogStats = async (req, res) => {
  try {
    console.log("📊 Fetching log statistics");

    const stats = await AdminLogs.aggregate([
      { $match: { is_deleted: { $ne: true } } },
      {
        $facet: {
          // Logs by feature
          by_feature: [
            { $group: { _id: '$feature', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          // Logs by action
          by_action: [
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          // Logs by status
          by_status: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          // Logs by admin role
          by_role: [
            { $group: { _id: '$admin_role', count: { $sum: 1 } } }
          ],
          // Total count
          total_count: [
            { $count: 'total' }
          ],
          // Failed actions count
          failed_count: [
            { $match: { status: 'failed' } },
            { $count: 'total' }
          ],
          // Recent logs (last 10)
          recent_logs: [
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $project: {
                admin_name: 1,
                feature: 1,
                action: 1,
                status: 1,
                createdAt: 1
              }
            }
          ],
          // Logs per day (last 7 days)
          logs_per_day: [
            {
              $match: {
                createdAt: {
                  $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                }
              }
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ],
          // Top admins by activity
          top_admins: [
            {
              $group: {
                _id: '$admin_id',
                admin_name: { $first: '$admin_name' },
                admin_email: { $first: '$admin_email' },
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
          ]
        }
      }
    ]);

    console.log("✅ Statistics generated successfully");

    res.json({
      data: stats[0],
      code: 200
    });

  } catch (error) {
    console.error("❌ Error fetching log statistics:", error);
    utils.handleError(res, error);
  }
};

/**
 * GET /admin/getLogFilters
 * Get available filter options (features, actions, admins)
 * Useful for populating dropdown filters in UI
 */
exports.getLogFilters = async (req, res) => {
  try {
    console.log("🎚️ Fetching log filter options");

    const [features, actions, admins] = await Promise.all([
      // Get unique features
      AdminLogs.distinct('feature', { is_deleted: { $ne: true } }),
      
      // Get unique actions
      AdminLogs.distinct('action', { is_deleted: { $ne: true } }),
      
      // Get unique admins with their details
      AdminLogs.aggregate([
        { $match: { is_deleted: { $ne: true } } },
        {
          $group: {
            _id: '$admin_id',
            admin_name: { $first: '$admin_name' },
            admin_email: { $first: '$admin_email' },
            admin_role: { $first: '$admin_role' }
          }
        },
        { $sort: { admin_name: 1 } }
      ])
    ]);

    console.log("✅ Filter options retrieved");

    res.json({
      data: {
        features: features.sort(),
        actions: actions.sort(),
        admins: admins,
        statuses: ['success', 'failed'],
        roles: ['super_admin', 'sub_admin']
      },
      code: 200
    });

  } catch (error) {
    console.error("❌ Error fetching filter options:", error);
    utils.handleError(res, error);
  }
};

/**
 * GET /admin/getAdminActivitySummary/:adminId
 * Get activity summary for a specific admin
 * Useful for admin profile page
 */
exports.getAdminActivitySummary = async (req, res) => {
  try {
    const { adminId } = req.params;

    console.log("📊 Fetching activity summary for admin:", adminId);

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({
        message: 'Invalid admin ID format',
        code: 400
      });
    }

    const summary = await AdminLogs.aggregate([
      {
        $match: {
          admin_id: new mongoose.Types.ObjectId(adminId),
          is_deleted: { $ne: true }
        }
      },
      {
        $facet: {
          total_actions: [{ $count: 'count' }],
          by_feature: [
            { $group: { _id: '$feature', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          by_status: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          recent_activity: [
            { $sort: { createdAt: -1 } },
            { $limit: 20 },
            {
              $project: {
                feature: 1,
                action: 1,
                status: 1,
                createdAt: 1,
                'metadata.enquiry_number': 1
              }
            }
          ],
          first_activity: [
            { $sort: { createdAt: 1 } },
            { $limit: 1 },
            { $project: { createdAt: 1 } }
          ],
          last_activity: [
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            { $project: { createdAt: 1 } }
          ]
        }
      }
    ]);

    console.log("✅ Admin activity summary generated");

    res.json({
      data: summary[0],
      code: 200
    });

  } catch (error) {
    console.error("❌ Error fetching admin activity summary:", error);
    utils.handleError(res, error);
  }
};

/**
 * GET /admin/exportLogs
 * Export logs to CSV/Excel format
 * 
 * Query Parameters:
 * - format: String (csv or excel) - default: csv
 * - Same filters as getLogs
 */
exports.exportLogs = async (req, res) => {
  try {
    const {
      format = 'csv',
      search = '',
      feature = '',
      action = '',
      status = '',
      admin_role = '',
      from_date = '',
      to_date = ''
    } = req.query;

    console.log(`📥 Exporting logs to ${format.toUpperCase()}`);

    // Build filter (same as getLogs)
    const filter = { is_deleted: { $ne: true } };

    if (search && search.trim()) {
      filter.$or = [
        { admin_name: { $regex: search, $options: 'i' } },
        { admin_email: { $regex: search, $options: 'i' } },
        { 'metadata.enquiry_number': { $regex: search, $options: 'i' } }
      ];
    }

    if (feature) filter.feature = feature;
    if (action) filter.action = action;
    if (status) filter.status = status;
    if (admin_role) filter.admin_role = admin_role;

    if (from_date || to_date) {
      filter.createdAt = {};
      if (from_date) filter.createdAt.$gte = new Date(from_date);
      if (to_date) {
        const endDate = new Date(to_date);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    // Fetch all matching logs (no pagination for export)
    const logs = await AdminLogs.find(filter)
      .sort({ createdAt: -1 })
      .limit(10000) // Safety limit
      .lean();

    // Format data for export
    const exportData = logs.map(log => ({
      'Log ID': log._id.toString(),
      'Admin Name': log.admin_name,
      'Admin Email': log.admin_email,
      'Admin Role': log.admin_role,
      'Feature': log.feature,
      'Action': log.action,
      'Status': log.status,
      'Enquiry Number': log.metadata?.enquiry_number || '',
      'Buyer Name': log.metadata?.buyer_name || '',
      'Error Message': log.error_message || '',
      'IP Address': log.ip_address || '',
      'Date': new Date(log.createdAt).toLocaleString(),
      'Timestamp': log.createdAt
    }));

    console.log(`✅ Exporting ${exportData.length} logs`);

    // Return data (frontend will handle actual file generation)
    res.json({
      data: exportData,
      count: exportData.length,
      format: format,
      code: 200
    });

  } catch (error) {
    console.error("❌ Error exporting logs:", error);
    utils.handleError(res, error);
  }
};

/**
 * GET /admin/getRecentLogs
 * Get recent logs (for dashboard widget)
 * 
 * Query Parameters:
 * - limit: Number (default: 10)
 */
exports.getRecentLogs = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    console.log(`📋 Fetching ${limit} recent logs`);

    const logs = await AdminLogs.find({ is_deleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('-error_stack -details') // Exclude large fields
      .lean();

    console.log(`✅ Found ${logs.length} recent logs`);

    res.json({
      data: logs,
      count: logs.length,
      code: 200
    });

  } catch (error) {
    console.error("❌ Error fetching recent logs:", error);
    utils.handleError(res, error);
  }
};

// ═══════════════════════════════════════════════════════════
// EXPORTS - Already exported via exports.functionName above
// ═══════════════════════════════════════════════════════════
// All functions exported individually using exports.functionName pattern

