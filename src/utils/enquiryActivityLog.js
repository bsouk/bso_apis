/**
 * Enquiry Activity Log Helper
 * 
 * This utility provides functions to add activity logs to enquiries
 * and handle status updates with proper logging.
 */

const Enquiry = require('../models/Enquiry');

/**
 * Add an activity log entry to an enquiry
 * 
 * @param {string} enquiryId - The enquiry ID
 * @param {object} logData - The log data
 * @param {string} logData.action - The action type (e.g., "enquiry_created", "supplier_quote_accepted")
 * @param {string} logData.description - Human-readable description
 * @param {object} logData.performed_by - User who performed the action
 * @param {string} logData.performed_by.user_id - User ID
 * @param {string} logData.performed_by.user_type - "buyer", "supplier", "logistics", "admin", "system"
 * @param {string} logData.performed_by.name - User name
 * @param {object} [logData.on_behalf_of] - Optional: User on whose behalf action was performed
 * @param {string} [logData.previous_status] - Previous status (auto-filled if not provided)
 * @param {string} [logData.new_status] - New status
 * @param {object} [logData.metadata] - Additional metadata
 * @returns {Promise<object>} Updated enquiry
 */
const addActivityLog = async (enquiryId, logData) => {
    try {
        const enquiry = await Enquiry.findById(enquiryId);
        if (!enquiry) {
            console.error(`Enquiry not found: ${enquiryId}`);
            return null;
        }

        const activityLog = {
            action: logData.action,
            description: logData.description,
            performed_by: logData.performed_by,
            on_behalf_of: logData.on_behalf_of || null,
            previous_status: logData.previous_status || enquiry.status,
            new_status: logData.new_status || enquiry.status,
            metadata: logData.metadata || {},
            created_at: new Date()
        };

        // Add to activity logs array
        enquiry.activity_logs.push(activityLog);
        await enquiry.save();

        console.log(`📝 Activity log added to enquiry ${enquiryId}:`, {
            action: activityLog.action,
            description: activityLog.description
        });

        return enquiry;
    } catch (error) {
        console.error(`Error adding activity log to enquiry ${enquiryId}:`, error);
        return null;
    }
};

/**
 * Update enquiry status with activity log
 * 
 * @param {string} enquiryId - The enquiry ID
 * @param {string} newStatus - The new status
 * @param {object} logData - The log data (same as addActivityLog)
 * @returns {Promise<object>} Updated enquiry
 */
const updateStatusWithLog = async (enquiryId, newStatus, logData) => {
    try {
        const enquiry = await Enquiry.findById(enquiryId);
        if (!enquiry) {
            console.error(`Enquiry not found: ${enquiryId}`);
            return null;
        }

        const previousStatus = enquiry.status;

        // Update status
        enquiry.status = newStatus;

        // Add activity log
        const activityLog = {
            action: logData.action || 'status_updated',
            description: logData.description,
            performed_by: logData.performed_by,
            on_behalf_of: logData.on_behalf_of || null,
            previous_status: previousStatus,
            new_status: newStatus,
            metadata: logData.metadata || {},
            created_at: new Date()
        };

        enquiry.activity_logs.push(activityLog);
        await enquiry.save();

        console.log(`📝 Enquiry ${enquiryId} status updated: ${previousStatus} → ${newStatus}`);

        return enquiry;
    } catch (error) {
        console.error(`Error updating enquiry status ${enquiryId}:`, error);
        return null;
    }
};

/**
 * Get activity logs for an enquiry
 * 
 * @param {string} enquiryId - The enquiry ID
 * @returns {Promise<array>} Array of activity logs
 */
const getActivityLogs = async (enquiryId) => {
    try {
        const enquiry = await Enquiry.findById(enquiryId)
            .select('activity_logs')
            .lean();
        
        if (!enquiry) {
            return [];
        }

        return enquiry.activity_logs || [];
    } catch (error) {
        console.error(`Error getting activity logs for enquiry ${enquiryId}:`, error);
        return [];
    }
};

/**
 * Create standard log data for admin actions
 * 
 * @param {object} admin - Admin user object
 * @param {string} action - Action type
 * @param {string} description - Description
 * @param {object} [onBehalfOf] - User on whose behalf action is performed
 * @param {object} [metadata] - Additional metadata
 * @returns {object} Log data object
 */
const createAdminLogData = (admin, action, description, onBehalfOf = null, metadata = {}) => {
    return {
        action,
        description,
        performed_by: {
            user_id: admin._id,
            user_type: 'admin',
            name: admin.full_name || admin.email || 'Admin'
        },
        on_behalf_of: onBehalfOf ? {
            user_id: onBehalfOf._id || onBehalfOf.user_id,
            user_type: onBehalfOf.user_type || 'buyer',
            name: onBehalfOf.full_name || onBehalfOf.name || 'User'
        } : null,
        metadata
    };
};

/**
 * Create standard log data for user actions
 * 
 * @param {object} user - User object
 * @param {string} userType - User type ("buyer", "supplier", "logistics")
 * @param {string} action - Action type
 * @param {string} description - Description
 * @param {object} [metadata] - Additional metadata
 * @returns {object} Log data object
 */
const createUserLogData = (user, userType, action, description, metadata = {}) => {
    return {
        action,
        description,
        performed_by: {
            user_id: user._id,
            user_type: userType,
            name: user.full_name || user.email || 'User'
        },
        metadata
    };
};

module.exports = {
    addActivityLog,
    updateStatusWithLog,
    getActivityLogs,
    createAdminLogData,
    createUserLogData
};












