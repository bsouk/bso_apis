/**
 * Utility function to create a user with a specific role
 * This function creates both a base user account and the specific role account
 */

const User = require('../models/user');
const { generateUniqueUserId } = require('./userIdGenerator');
const emailer = require('./emailer');
const { createNewPassword } = require('./passwordGenerator');

/**
 * Creates a base user account first, then creates the specific role account
 * @param {Object} data - User data
 * @param {string} role - User role (recruiter, supplier, logistics, resource, buyer, company)
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} - Created user data
 */
async function createUserWithRole(data, role, res) {
  try {
    console.log(`Creating user with role: ${role}`);
    
    // Step 1: Validate required fields
    if (!data.email || !data.full_name) {
      return res.status(400).json({
        message: "Email and full name are required",
        code: 400
      });
    }

    // Step 2: Check if email already exists
    const existingEmail = await User.findOne({ email: data.email });
    if (existingEmail) {
      return res.status(400).json({
        message: "Email already exists",
        code: 400
      });
    }

    // Step 3: Check if phone number already exists (if provided)
    if (data.phone_number) {
      const existingPhone = await User.findOne({ phone_number: data.phone_number });
      if (existingPhone) {
        return res.status(400).json({
          message: "Phone number already exists",
          code: 400
        });
      }
    }

    // Step 4: Generate unique user ID
    const uniqueUserId = await generateUniqueUserId(
      data.first_name || data.full_name?.split(' ')[0],
      data.last_name || data.full_name?.split(' ').slice(1).join(' '),
      data.email,
      data.phone_number
    );

    // Step 5: Handle password - use provided password or generate one
    const password = data.password || createNewPassword();
    console.log(`🔐 Using ${data.password ? 'provided' : 'generated'} password for user creation`);

    // Step 6: Create base user data
    const baseUserData = {
      ...data,
      unique_user_id: uniqueUserId,
      password,
      decoded_password: password,
      user_type: [role],
      current_user_type: role,
      profile_completed: true,
      is_user_approved_by_admin: true,
      status: data.status || 'active',
    };

    // Step 7: Create and save the user
    const user = new User(baseUserData);
    await user.save();

    console.log(`✅ Base user created successfully with ID: ${user._id}`);

    // Step 8: Create role-specific data if needed
    let roleSpecificData = null;
    
    switch (role) {
      case 'logistics':
        // Create address for logistics users
        const Address = require('../models/address');
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
        await address.save();
        roleSpecificData = { address: addressData };
        break;
        
      case 'supplier':
        // Add supplier-specific logic here if needed
        roleSpecificData = { supplier_approved: true };
        break;
        
      case 'recruiter':
        // Add recruiter-specific logic here if needed
        roleSpecificData = { recruiter_approved: true };
        break;
        
      case 'resource':
        // Add resource-specific logic here if needed
        roleSpecificData = { resource_approved: true };
        break;
        
      default:
        roleSpecificData = {};
    }

    // Step 9: Send welcome email
    const mailOptions = {
      to: user.email,
      subject: `Welcome to ${process.env.APP_NAME || 'BSO Services'}! Your ${role.charAt(0).toUpperCase() + role.slice(1)} Account Has Been Created`,
      app_name: process.env.APP_NAME || 'BSO Services',
      email: user.email,
      password: password,
      name: user.full_name,
      account_type: role,
      password_source: data.password ? 'provided' : 'generated',
    };

    try {
      await emailer.sendEmail(null, mailOptions, "accountCreated");
      console.log(`✅ Welcome email sent to ${user.email}`);
    } catch (emailError) {
      console.warn(`⚠️ Failed to send email to ${user.email}:`, emailError.message);
      // Don't fail the entire process if email fails
    }

    // Step 10: Return success response
    return {
      success: true,
      user: {
        _id: user._id,
        unique_user_id: user.unique_user_id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        user_type: user.user_type,
        current_user_type: user.current_user_type,
        status: user.status,
        profile_completed: user.profile_completed,
        is_user_approved_by_admin: user.is_user_approved_by_admin,
        created_at: user.createdAt,
      },
      roleSpecificData,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`,
      code: 200
    };

  } catch (error) {
    console.error(`❌ Error creating user with role ${role}:`, error);
    throw error;
  }
}

/**
 * Wrapper function for creating recruiters
 */
async function createRecruiter(data, res) {
  return await createUserWithRole(data, 'recruiter', res);
}

/**
 * Wrapper function for creating suppliers
 */
async function createSupplier(data, res) {
  return await createUserWithRole(data, 'supplier', res);
}

/**
 * Wrapper function for creating logistics users
 */
async function createLogisticsUser(data, res) {
  return await createUserWithRole(data, 'logistics', res);
}

/**
 * Wrapper function for creating resources
 */
async function createResource(data, res) {
  return await createUserWithRole(data, 'resource', res);
}

/**
 * Wrapper function for creating customers/buyers
 */
async function createCustomer(data, res) {
  return await createUserWithRole(data, 'buyer', res);
}

/**
 * Wrapper function for creating companies
 */
async function createCompany(data, res) {
  return await createUserWithRole(data, 'company', res);
}

module.exports = {
  createUserWithRole,
  createRecruiter,
  createSupplier,
  createLogisticsUser,
  createResource,
  createCustomer,
  createCompany
};
