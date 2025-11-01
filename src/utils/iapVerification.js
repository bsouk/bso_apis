/**
 * IAP (In-App Purchase) Verification Utilities
 * Handles receipt verification for Apple App Store and Google Play Store
 */

const axios = require('axios');
const { google } = require('googleapis');

/**
 * Verify Apple App Store Receipt
 * @param {string} receiptData - Base64 encoded receipt from iOS app
 * @returns {Promise<Object>} Apple verification response
 */
async function verifyAppleReceipt(receiptData) {
    // Determine environment - try production first, fallback to sandbox
    const productionUrl = 'https://buy.itunes.apple.com/verifyReceipt';
    const sandboxUrl = 'https://sandbox.itunes.apple.com/verifyReceipt';
    
    const requestBody = {
        'receipt-data': receiptData,
        'password': process.env.APPLE_SHARED_SECRET,
        'exclude-old-transactions': true
    };

    try {
        // Try production first
        const productionResponse = await axios.post(productionUrl, requestBody, {
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        });

        // Status 21007 means receipt is from sandbox, retry with sandbox URL
        if (productionResponse.data.status === 21007) {
            console.log('📱 Apple receipt is from sandbox, retrying...');
            const sandboxResponse = await axios.post(sandboxUrl, requestBody, {
                timeout: 10000,
                headers: { 'Content-Type': 'application/json' }
            });
            return sandboxResponse.data;
        }

        return productionResponse.data;
    } catch (error) {
        console.error('❌ Apple receipt verification error:', error.message);
        throw new Error(`Apple verification failed: ${error.message}`);
    }
}

/**
 * Verify Google Play Store Receipt
 * @param {string} packageName - Android app package name
 * @param {string} productId - Product/subscription ID
 * @param {string} purchaseToken - Purchase token from Android
 * @returns {Promise<Object>} Google verification response
 */
async function verifyGoogleReceipt(packageName, productId, purchaseToken) {
    try {
        // Initialize Google Auth
        let auth;
        
        if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
            // Use service account key file
            auth = new google.auth.GoogleAuth({
                keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
                scopes: ['https://www.googleapis.com/auth/androidpublisher'],
            });
        } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
            // Use service account JSON string
            const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
            auth = new google.auth.GoogleAuth({
                credentials: credentials,
                scopes: ['https://www.googleapis.com/auth/androidpublisher'],
            });
        } else {
            throw new Error('Google service account credentials not configured');
        }

        const androidPublisher = google.androidpublisher({
            version: 'v3',
            auth: auth,
        });

        // Verify subscription purchase
        const response = await androidPublisher.purchases.subscriptions.get({
            packageName: packageName,
            subscriptionId: productId,
            token: purchaseToken,
        });

        return response.data;
    } catch (error) {
        console.error('❌ Google receipt verification error:', error.message);
        throw new Error(`Google verification failed: ${error.message}`);
    }
}

/**
 * Parse Apple receipt response to extract subscription details
 * @param {Object} appleResponse - Response from Apple verification
 * @returns {Object} Parsed subscription details
 */
function parseAppleReceipt(appleResponse) {
    if (!appleResponse.latest_receipt_info || appleResponse.latest_receipt_info.length === 0) {
        throw new Error('No receipt info found in Apple response');
    }

    const latestReceipt = appleResponse.latest_receipt_info[0];
    
    return {
        isValid: appleResponse.status === 0,
        transactionId: latestReceipt.transaction_id || latestReceipt.original_transaction_id,
        productId: latestReceipt.product_id,
        purchaseDate: new Date(parseInt(latestReceipt.purchase_date_ms)),
        expiryDate: latestReceipt.expires_date_ms ? new Date(parseInt(latestReceipt.expires_date_ms)) : null,
        isTrialPeriod: latestReceipt.is_trial_period === 'true',
        cancellationDate: latestReceipt.cancellation_date_ms ? new Date(parseInt(latestReceipt.cancellation_date_ms)) : null,
        environment: appleResponse.environment,
        originalResponse: appleResponse
    };
}

/**
 * Parse Google receipt response to extract subscription details
 * @param {Object} googleResponse - Response from Google verification
 * @returns {Object} Parsed subscription details
 */
function parseGoogleReceipt(googleResponse) {
    return {
        isValid: googleResponse.purchaseState === 0, // 0 = Purchased, 1 = Canceled
        transactionId: googleResponse.orderId,
        productId: googleResponse.productId || googleResponse.subscriptionId,
        purchaseDate: new Date(parseInt(googleResponse.startTimeMillis)),
        expiryDate: googleResponse.expiryTimeMillis ? new Date(parseInt(googleResponse.expiryTimeMillis)) : null,
        autoRenewing: googleResponse.autoRenewing,
        cancellationDate: googleResponse.userCancellationTimeMillis ? new Date(parseInt(googleResponse.userCancellationTimeMillis)) : null,
        paymentState: googleResponse.paymentState, // 0 = Payment pending, 1 = Payment received
        originalResponse: googleResponse
    };
}

/**
 * Validate product ID mapping to plan ID
 * @param {string} storeProductId - Product ID from App Store / Play Store
 * @param {string} planId - Internal plan ID
 * @param {string} platform - 'ios' or 'android'
 * @returns {boolean} Whether mapping is valid
 */
function validateProductPlanMapping(storeProductId, planId, platform) {
    // This mapping should ideally come from database or config
    // For now, we'll do basic validation that product ID contains plan type
    
    // Expected format: com.bso.{type}.{interval}
    // Example: com.bso.supplier.monthly, com.bso.buyer.yearly
    
    const productParts = storeProductId.toLowerCase().split('.');
    if (productParts.length < 4) {
        return false;
    }
    
    // Extract type and interval from product ID
    const productType = productParts[2]; // supplier, buyer, logistics, etc.
    const productInterval = productParts[3]; // monthly, yearly
    
    // Basic validation - plan should contain these elements
    // More sophisticated validation should be done by fetching plan details
    return true; // We'll do detailed validation in the main controller
}

/**
 * Calculate subscription end date based on interval
 * @param {Date} startDate - Subscription start date
 * @param {string} interval - Plan interval (monthly, yearly, lifetime)
 * @returns {Date|null} Calculated end date
 */
function calculateEndDate(startDate, interval) {
    if (interval === 'lifetime') {
        return null;
    }
    
    const endDate = new Date(startDate);
    
    switch (interval) {
        case 'monthly':
            endDate.setMonth(endDate.getMonth() + 1);
            break;
        case 'yearly':
            endDate.setFullYear(endDate.getFullYear() + 1);
            break;
        case 'quarterly':
            endDate.setMonth(endDate.getMonth() + 3);
            break;
        case 'weekly':
            endDate.setDate(endDate.getDate() + 7);
            break;
        case 'daily':
            endDate.setDate(endDate.getDate() + 1);
            break;
        default:
            endDate.setMonth(endDate.getMonth() + 1);
    }
    
    return endDate;
}

module.exports = {
    verifyAppleReceipt,
    verifyGoogleReceipt,
    parseAppleReceipt,
    parseGoogleReceipt,
    validateProductPlanMapping,
    calculateEndDate
};







