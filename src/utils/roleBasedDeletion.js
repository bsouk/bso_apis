/**
 * Utility functions for role-based user deletion
 * Handles deletion logic for users with single or multiple roles
 */

const User = require('../models/user');

/**
 * Get role-specific data fields that should be removed when deleting a role
 */
const getRoleSpecificFields = (role) => {
  const roleFields = {
    supplier: [
      'company_data',
      'bank_details', 
      'beneficiary_address',
      'sample_products',
      'business_certificates',
      'licenses',
      'quality_procedures',
      'health_and_saftey_procedures',
      'anti_correcuptin_procedures'
    ],
    recruiter: [
      'company_data',
      'recruiter_company_details',
      'recruiter_specializations',
      'recruiter_experience'
    ],
    logistics: [
      'logistics_company_details',
      'logistics_specializations',
      'logistics_services',
      'fleet_details'
    ],
    resource: [
      'profile_title',
      'profile_description',
      'specialisations',
      'rate_per_hour',
      'project_pricing_model',
      'resource_availability',
      'work_exprience',
      'education',
      'portfolio',
      'skills',
      'certifications',
      'languages',
      'testimonials',
      'employement_history'
    ],
    buyer: [
      'buyer_preferences',
      'buyer_requirements',
      'purchase_history'
    ],
    company: [
      'company_data',
      'company_documents',
      'company_certifications'
    ]
  };

  return roleFields[role] || [];
};

/**
 * Trash a specific role from a user (role-based soft delete)
 * @param {string} userId - User ID
 * @param {string} role - Role to trash
 * @param {string} adminId - Admin ID who performed the action
 * @returns {Promise<Object>} - Result object
 */
async function trashUserRole(userId, role, adminId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User not found", code: 404 };
    }

    if (!user.user_type.includes(role)) {
      return { success: false, message: `User is not a ${role}`, code: 400 };
    }

    // Check if user has multiple roles
    const hasMultipleRoles = user.user_type.length > 1;
    
    if (hasMultipleRoles) {
      // User has multiple roles - only remove the specific role and mark role data as trashed
      const updatedUserType = user.user_type.filter(userRole => userRole !== role);
      
      // Prepare update data - remove role but keep other roles active
      const updateData = {
        user_type: updatedUserType,
        current_user_type: updatedUserType.includes(user.current_user_type) 
          ? user.current_user_type 
          : updatedUserType[0], // Set to first available role
        [`${role}_data_trashed`]: true,
        [`${role}_trashed_at`]: new Date(),
        [`${role}_trashed_by`]: adminId,
        updated_at: new Date()
      };

      await User.findByIdAndUpdate(userId, updateData);

      return {
        success: true,
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} role moved to trash. User account with other roles remains active.`,
        code: 200,
        data: {
          remaining_roles: updatedUserType,
          current_user_type: updateData.current_user_type
        }
      };
    } else {
      // User has only this role - trash entire user
      if (user.is_trashed) {
        return { success: false, message: `${role.charAt(0).toUpperCase() + role.slice(1)} is already trashed`, code: 400 };
      }

      await User.findByIdAndUpdate(userId, {
        is_trashed: true,
        trashed_at: new Date(),
        trashed_by: adminId,
      });

      return {
        success: true,
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} moved to trash successfully`,
        code: 200
      };
    }

  } catch (error) {
    console.error(`Error trashing ${role}:`, error);
    return { success: false, message: error.message, code: 500 };
  }
}

/**
 * Restore a specific role for a user (role-based restoration)
 * @param {string} userId - User ID
 * @param {string} role - Role to restore
 * @returns {Promise<Object>} - Result object
 */
async function restoreUserRole(userId, role) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User not found", code: 404 };
    }

    // Check if user has role data trashed (for multi-role users)
    const hasRoleDataTrashed = user[`${role}_data_trashed`];
    const isEntireUserTrashed = user.is_trashed;

    if (!hasRoleDataTrashed && !isEntireUserTrashed) {
      return { success: false, message: `${role.charAt(0).toUpperCase() + role.slice(1)} is not trashed`, code: 400 };
    }

    if (hasRoleDataTrashed && !isEntireUserTrashed) {
      // User has multiple roles and only this role data is trashed - restore role
      const updatedUserType = [...user.user_type, role];
      
      await User.findByIdAndUpdate(userId, {
        user_type: updatedUserType,
        [`${role}_data_trashed`]: false,
        [`${role}_trashed_at`]: null,
        [`${role}_trashed_by`]: null,
        updated_at: new Date()
      });

      return {
        success: true,
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} role restored successfully. User now has access to ${role} features.`,
        code: 200,
        data: {
          user_type: updatedUserType,
          current_user_type: user.current_user_type
        }
      };
    } else if (isEntireUserTrashed) {
      // Entire user is trashed - restore the user
      await User.findByIdAndUpdate(userId, {
        is_trashed: false,
        trashed_at: null,
        trashed_by: null,
      });

      return {
        success: true,
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} restored successfully`,
        code: 200
      };
    }

  } catch (error) {
    console.error(`Error restoring ${role}:`, error);
    return { success: false, message: error.message, code: 500 };
  }
}

/**
 * Delete a specific role permanently from a user (role-based hard delete)
 * @param {string} userId - User ID
 * @param {string} role - Role to delete
 * @returns {Promise<Object>} - Result object
 */
async function deleteUserRolePermanently(userId, role) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User not found", code: 404 };
    }

    if (!user.user_type.includes(role)) {
      return { success: false, message: `User is not a ${role}`, code: 400 };
    }

    // Check if user has multiple roles
    const hasMultipleRoles = user.user_type.length > 1;
    
    if (hasMultipleRoles) {
      // User has multiple roles - only remove role and role-specific data
      const updatedUserType = user.user_type.filter(userRole => userRole !== role);
      
      // Get role-specific fields to remove
      const roleFields = getRoleSpecificFields(role);
      
      // Prepare update data - remove role and role-specific fields
      const updateData = {
        user_type: updatedUserType,
        current_user_type: updatedUserType.includes(user.current_user_type) 
          ? user.current_user_type 
          : updatedUserType[0], // Set to first available role
        updated_at: new Date()
      };

      // Set role-specific fields to null or empty arrays
      roleFields.forEach(field => {
        if (field.includes('_') || field.includes('products') || field.includes('certificates') || 
            field.includes('licenses') || field.includes('experience') || field.includes('education') ||
            field.includes('portfolio') || field.includes('skills') || field.includes('certifications') ||
            field.includes('languages') || field.includes('testimonials') || field.includes('history')) {
          updateData[field] = [];
        } else {
          updateData[field] = null;
        }
      });

      await User.findByIdAndUpdate(userId, updateData);

      return {
        success: true,
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} role and data removed permanently. User account with other roles preserved.`,
        code: 200,
        data: {
          remaining_roles: updatedUserType,
          current_user_type: updateData.current_user_type
        }
      };
    } else {
      // User has only this role - delete entire user
      await User.findByIdAndDelete(userId);

      return {
        success: true,
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} account deleted permanently`,
        code: 200
      };
    }

  } catch (error) {
    console.error(`Error deleting ${role} permanently:`, error);
    return { success: false, message: error.message, code: 500 };
  }
}

module.exports = {
  trashUserRole,
  restoreUserRole,
  deleteUserRolePermanently,
  getRoleSpecificFields
};
