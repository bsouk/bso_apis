const express = require('express');
const router = express.Router();
require('../../config/passport');
const passport = require('passport');
const controller = require('../../controllers/admin/logs');
const trimRequest = require('trim-request');

const requireAuth = passport.authenticate('jwt', {
  session: false,
});

// Middleware: allow super_admin or sub_admin with Logs View permission
const requireLogsView = (req, res, next) => {
  if (req.user.role === 'super_admin') return next();
  const logsPerms = req.user.permissions?.[0]?.['Logs'];
  if (req.user.role === 'sub_admin' && Array.isArray(logsPerms) && logsPerms.includes('View')) return next();
  return res.status(403).json({
    message: 'Access denied. Logs view permission required.',
    code: 403
  });
};

// Middleware: allow super_admin or sub_admin with Logs Delete permission
const requireLogsDelete = (req, res, next) => {
  if (req.user.role === 'super_admin') return next();
  const logsPerms = req.user.permissions?.[0]?.['Logs'];
  if (req.user.role === 'sub_admin' && Array.isArray(logsPerms) && logsPerms.includes('Delete')) return next();
  return res.status(403).json({
    message: 'Access denied. Logs delete permission required.',
    code: 403
  });
};

/**
 * ═══════════════════════════════════════════════════════════
 * ADMIN LOGS ROUTES
 * ═══════════════════════════════════════════════════════════
 * 
 * All routes require admin authentication (requireAuth).
 * GET routes: super_admin or sub_admin with Logs View.
 * DELETE routes: super_admin or sub_admin with Logs Delete.
 * 
 * @version 1.0.0
 * @created November 5, 2025
 */

// ─────────────────────────────────────────────────────────
// GET ROUTES
// ─────────────────────────────────────────────────────────

/**
 * @route   GET /admin/getLogs
 * @desc    Get all logs with pagination, search, and filters
 * @access  Super Admin Only
 * @params  search, offset, limit, feature, action, status, admin_id, from_date, to_date
 */
router.get(
  '/getLogs',
  trimRequest.all,
  requireAuth,
  requireLogsView,
  controller.getLogs
);

/**
 * @route   GET /admin/getLogById/:id
 * @desc    Get single log details
 * @access  Super Admin Only
 * @params  id (log ObjectId)
 */
router.get(
  '/getLogById/:id',
  trimRequest.all,
  requireAuth,
  requireLogsView,
  controller.getLogById
);

/**
 * @route   GET /admin/getLogStats
 * @desc    Get comprehensive log statistics
 * @access  Super Admin Only
 */
router.get(
  '/getLogStats',
  trimRequest.all,
  requireAuth,
  requireLogsView,
  controller.getLogStats
);

/**
 * @route   GET /admin/getLogFilters
 * @desc    Get available filter options (features, actions, admins)
 * @access  Super Admin Only
 */
router.get(
  '/getLogFilters',
  trimRequest.all,
  requireAuth,
  requireLogsView,
  controller.getLogFilters
);

/**
 * @route   GET /admin/getAdminActivitySummary/:adminId
 * @desc    Get activity summary for specific admin
 * @access  Super Admin Only
 * @params  adminId (admin ObjectId)
 */
router.get(
  '/getAdminActivitySummary/:adminId',
  trimRequest.all,
  requireAuth,
  requireLogsView,
  controller.getAdminActivitySummary
);

/**
 * @route   GET /admin/exportLogs
 * @desc    Export logs to CSV/Excel
 * @access  Super Admin Only
 * @params  format, and same filters as getLogs
 */
router.get(
  '/exportLogs',
  trimRequest.all,
  requireAuth,
  requireLogsView,
  controller.exportLogs
);

/**
 * @route   GET /admin/getRecentLogs
 * @desc    Get recent logs (for dashboard widget)
 * @access  Super Admin Only
 * @params  limit (default: 10)
 */
router.get(
  '/getRecentLogs',
  trimRequest.all,
  requireAuth,
  requireLogsView,
  controller.getRecentLogs
);

// ─────────────────────────────────────────────────────────
// DELETE ROUTES
// ─────────────────────────────────────────────────────────

/**
 * @route   DELETE /admin/deleteLog/:id
 * @desc    Soft delete a single log
 * @access  Super Admin Only
 * @params  id (log ObjectId)
 */
router.delete(
  '/deleteLog/:id',
  trimRequest.all,
  requireAuth,
  requireLogsDelete,
  controller.deleteLog
);

/**
 * @route   DELETE /admin/bulkDeleteLogs
 * @desc    Bulk soft delete multiple logs
 * @access  Super Admin Only
 * @body    { ids: [array of log ObjectIds] }
 */
router.delete(
  '/bulkDeleteLogs',
  trimRequest.all,
  requireAuth,
  requireLogsDelete,
  controller.bulkDeleteLogs
);

// ═══════════════════════════════════════════════════════════
// EXPORT ROUTER
// ═══════════════════════════════════════════════════════════

module.exports = router;

