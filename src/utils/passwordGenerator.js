/**
 * Centralized password generation utility
 */

const generatePassword = require("generate-password");

/**
 * Creates a new random password
 * @param {Object} options - Password generation options
 * @returns {string} - Generated password
 */
function createNewPassword(options = {}) {
  const defaultOptions = {
    length: 8,
    numbers: true,
    uppercase: true,
    lowercase: true,
    strict: true,
  };

  const passwordOptions = { ...defaultOptions, ...options };
  
  const password = generatePassword.generate(passwordOptions);
  return password;
}

/**
 * Creates a strong password for admin users
 * @returns {string} - Generated strong password
 */
function createStrongPassword() {
  return createNewPassword({
    length: 12,
    numbers: true,
    symbols: true,
    uppercase: true,
    lowercase: true,
    strict: true,
  });
}

/**
 * Creates a temporary password for password reset
 * @returns {string} - Generated temporary password
 */
function createTemporaryPassword() {
  return createNewPassword({
    length: 10,
    numbers: true,
    uppercase: true,
    lowercase: true,
    strict: true,
  });
}

module.exports = {
  createNewPassword,
  createStrongPassword,
  createTemporaryPassword
};




