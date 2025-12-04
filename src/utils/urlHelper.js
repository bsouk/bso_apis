/**
 * URL Helper Utility
 * 
 * This utility provides functions for safe URL construction
 * to avoid issues like double slashes in URLs.
 */

/**
 * Get the frontend URL with proper formatting (no trailing slash)
 * @returns {string} Clean frontend URL
 */
const getCleanFrontendUrl = () => {
    const frontendUrl = process.env.FRONTEND_PROD_URL || process.env.FRONTEND_URL || 'https://bsoservices.com';
    // Remove trailing slash if exists to avoid double slashes
    return frontendUrl.endsWith('/') ? frontendUrl.slice(0, -1) : frontendUrl;
};

/**
 * Build a safe URL by joining base URL and path
 * @param {string} baseUrl - The base URL (e.g., "https://example.com" or "https://example.com/")
 * @param {...string} paths - Path segments to append
 * @returns {string} Properly formatted URL
 */
const buildUrl = (baseUrl, ...paths) => {
    // Remove trailing slash from base URL
    let cleanBase = baseUrl?.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    // Join paths with proper slashes
    const cleanPaths = paths.map(path => {
        if (!path) return '';
        // Remove leading and trailing slashes
        return path.toString().replace(/^\/+|\/+$/g, '');
    }).filter(Boolean);
    
    return `${cleanBase}/${cleanPaths.join('/')}`;
};

/**
 * Get frontend URL for enquiry review page
 * @param {string} enquiryId - The enquiry ID
 * @returns {string} Full URL to enquiry review page
 */
const getEnquiryReviewUrl = (enquiryId) => {
    return buildUrl(getCleanFrontendUrl(), 'enquiry-review-page', enquiryId);
};

/**
 * Get frontend URL for quote review page (supplier)
 * @param {string} quoteId - The quote ID
 * @returns {string} Full URL to quote review page
 */
const getQuoteReviewUrl = (quoteId) => {
    return buildUrl(getCleanFrontendUrl(), 'quote-review-page', quoteId);
};

/**
 * Get frontend URL for logistics quote review page
 * @param {string} quoteId - The quote ID
 * @returns {string} Full URL to logistics quote review page
 */
const getLogisticsQuoteReviewUrl = (quoteId) => {
    return buildUrl(getCleanFrontendUrl(), 'quote-review-page-logistics', quoteId);
};

/**
 * Get frontend URL for quotation management
 * @returns {string} Full URL to quotation management page
 */
const getQuotationManagementUrl = () => {
    return buildUrl(getCleanFrontendUrl(), 'quotation-management');
};

/**
 * Get frontend URL for logistics quotation management
 * @returns {string} Full URL to logistics quotation management page
 */
const getLogisticsQuotationManagementUrl = () => {
    return buildUrl(getCleanFrontendUrl(), 'quotation-management-logistics');
};

module.exports = {
    getCleanFrontendUrl,
    buildUrl,
    getEnquiryReviewUrl,
    getQuoteReviewUrl,
    getLogisticsQuoteReviewUrl,
    getQuotationManagementUrl,
    getLogisticsQuotationManagementUrl
};






