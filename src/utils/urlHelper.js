/**
 * URL Helper Utility
 * Fixes double slash issues and properly concatenates URLs
 */

/**
 * Builds a URL by properly joining base URL with path
 * Removes trailing slash from base URL and leading slash from path before joining
 * 
 * @param {string} baseUrl - Base URL (e.g., http://localhost:3000 or https://example.com)
 * @param {string} path - Path to append (e.g., /my-account or my-account)
 * @returns {string} Properly formatted URL
 */
function buildUrl(baseUrl, path = '') {
  if (!baseUrl) {
    return path || '';
  }

  // Remove trailing slash from base URL
  const cleanBase = baseUrl.toString().replace(/\/+$/, '');
  
  // Remove leading slash from path
  const cleanPath = path ? path.toString().replace(/^\/+/, '') : '';

  // Join them with single slash
  if (!cleanPath) {
    return cleanBase;
  }

  return `${cleanBase}/${cleanPath}`;
}

/**
 * Gets the base APP_URL from environment variables
 * Handles trailing slashes properly
 * 
 * @returns {string} Clean base URL
 */
function getBaseUrl() {
  const appUrl = process.env.APP_URL || process.env.FRONTEND_PROD_URL || 'http://localhost:3000';
  return appUrl.replace(/\/+$/, ''); // Remove trailing slashes
}

/**
 * Builds frontend route URLs with proper formatting
 * 
 * @param {string} route - Route path (e.g., '/my-account' or 'my-account')
 * @returns {string} Full URL
 */
function frontendUrl(route = '') {
  return buildUrl(getBaseUrl(), route);
}

module.exports = {
  buildUrl,
  getBaseUrl,
  frontendUrl
};
