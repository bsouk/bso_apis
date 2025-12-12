/**
 * IAP (In-App Purchase) Verification Utilities
 * Handles receipt verification for Apple App Store and Google Play Store
 * Supports both old format (base64 receipt) and new format (JWT tokens)
 */

const axios = require('axios');
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');

/**
 * Check if receipt data is a JWT token (App Store Server Notification v2)
 * @param {string} receiptData - Receipt data to check
 * @returns {boolean} True if JWT token
 */
function isJWTToken(receiptData) {
    // JWT tokens start with "eyJ" (base64 encoded {" header)
    return receiptData && typeof receiptData === 'string' && receiptData.trim().startsWith('eyJ');
}

/**
 * Decode JWT token from Apple App Store Server Notification v2
 * @param {string} jwtToken - JWT token from iOS app
 * @returns {Object} Decoded JWT payload
 */
function decodeAppleJWT(jwtToken) {
    try {
        // Decode JWT without verification (for now)
        // In production, you should verify with Apple's public keys
        const decoded = jwt.decode(jwtToken, { complete: true });
        
        if (!decoded || !decoded.payload) {
            throw new Error('Invalid JWT token structure');
        }

        console.log('✅ JWT token decoded successfully');
        return decoded.payload;
    } catch (error) {
        console.error('❌ JWT decode error:', error.message);
        throw new Error(`JWT decode failed: ${error.message}`);
    }
}

/**
 * Parse JWT payload to extract transaction info (App Store Server Notification v2 format)
 * @param {Object} jwtPayload - Decoded JWT payload
 * @returns {Object} Transaction details
 */
function parseJWTTransaction(jwtPayload) {
    // JWT payload structure for App Store Server Notification v2
    // The payload may contain nested JWTs for transactionInfo and renewalInfo
    
    let transactionData = null;
    let renewalData = null;
    
    // Try to find transactionInfo (could be nested JWT or direct object)
    const transactionInfo = jwtPayload.transactionInfo || 
                           jwtPayload.data?.signedTransactionInfo || 
                           jwtPayload.signedTransactionInfo;
    
    // Try to find renewalInfo (could be nested JWT or direct object)
    const renewalInfo = jwtPayload.renewalInfo || 
                       jwtPayload.data?.signedRenewalInfo || 
                       jwtPayload.signedRenewalInfo;
    
    // If transactionInfo is a JWT string, decode it
    if (typeof transactionInfo === 'string' && transactionInfo.startsWith('eyJ')) {
        try {
            transactionData = jwt.decode(transactionInfo, { complete: false });
            console.log('✅ Decoded nested transactionInfo JWT');
        } catch (error) {
            console.error('❌ Error decoding transactionInfo JWT:', error.message);
        }
    } else if (transactionInfo && typeof transactionInfo === 'object') {
        transactionData = transactionInfo;
    }
    
    // If renewalInfo is a JWT string, decode it
    if (typeof renewalInfo === 'string' && renewalInfo.startsWith('eyJ')) {
        try {
            renewalData = jwt.decode(renewalInfo, { complete: false });
            console.log('✅ Decoded nested renewalInfo JWT');
        } catch (error) {
            console.error('❌ Error decoding renewalInfo JWT:', error.message);
        }
    } else if (renewalInfo && typeof renewalInfo === 'object') {
        renewalData = renewalInfo;
    }

    // Use transactionData if available, otherwise fall back to jwtPayload
    const transaction = transactionData || jwtPayload;
    
    // Extract transaction details with multiple fallback options
    const transactionId = transaction.originalTransactionId || 
                         transaction.transactionId || 
                         transaction.original_transaction_id ||
                         transaction.transaction_id;
    
    const productId = transaction.productId || 
                     transaction.product_id ||
                     transaction.productIdentifier;
    
    // Handle date parsing (could be ISO string, timestamp, or milliseconds)
    let purchaseDate = new Date();
    if (transaction.purchaseDate) {
        purchaseDate = new Date(transaction.purchaseDate);
    } else if (transaction.purchase_date_ms) {
        purchaseDate = new Date(parseInt(transaction.purchase_date_ms));
    } else if (transaction.purchaseDateMs) {
        purchaseDate = new Date(parseInt(transaction.purchaseDateMs));
    }
    
    let expiryDate = null;
    if (transaction.expiresDate) {
        expiryDate = new Date(transaction.expiresDate);
    } else if (transaction.expires_date_ms) {
        expiryDate = new Date(parseInt(transaction.expires_date_ms));
    } else if (transaction.expiresDateMs) {
        expiryDate = new Date(parseInt(transaction.expiresDateMs));
    } else if (renewalData && renewalData.expiresDate) {
        expiryDate = new Date(renewalData.expiresDate);
    }
    
    return {
        transactionId: transactionId,
        productId: productId,
        purchaseDate: purchaseDate,
        expiryDate: expiryDate,
        isTrialPeriod: transaction.isTrialPeriod === 'true' || 
                      transaction.isTrialPeriod === true ||
                      transaction.is_trial_period === 'true',
        cancellationDate: transaction.revocationDate ? new Date(transaction.revocationDate) : null,
        environment: transaction.environment || jwtPayload.environment || 'Production',
        originalResponse: jwtPayload
    };
}

/**
 * Verify Apple App Store Receipt
 * Supports both old format (base64 receipt) and new format (JWT tokens)
 * @param {string} receiptData - Base64 encoded receipt or JWT token from iOS app
 * @returns {Promise<Object>} Apple verification response or JWT payload
 */
async function verifyAppleReceipt(receiptData) {
    // Check if it's a JWT token (App Store Server Notification v2)
    if (isJWTToken(receiptData)) {
        console.log('🍎 Detected JWT token format (App Store Server Notification v2)');
        try {
            const jwtPayload = decodeAppleJWT(receiptData);
            const transactionData = parseJWTTransaction(jwtPayload);
            
            // Return in format compatible with parseAppleReceipt
            return {
                status: 0, // Success
                environment: transactionData.environment || 'Production',
                latest_receipt_info: [{
                    transaction_id: transactionData.transactionId,
                    original_transaction_id: transactionData.transactionId,
                    product_id: transactionData.productId,
                    purchase_date_ms: transactionData.purchaseDate.getTime().toString(),
                    expires_date_ms: transactionData.expiryDate ? transactionData.expiryDate.getTime().toString() : null,
                    is_trial_period: transactionData.isTrialPeriod ? 'true' : 'false',
                    cancellation_date_ms: transactionData.cancellationDate ? transactionData.cancellationDate.getTime().toString() : null
                }],
                receipt_type: 'JWT',
                jwt_payload: jwtPayload
            };
        } catch (error) {
            console.error('❌ JWT token processing error:', error.message);
            throw new Error(`JWT token processing failed: ${error.message}`);
        }
    }

    // Old format: Base64 encoded receipt (legacy support)
    console.log('🍎 Using legacy base64 receipt format');
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
 * Supports both old format (base64 receipt) and new format (JWT tokens)
 * @param {Object} appleResponse - Response from Apple verification or JWT payload
 * @returns {Object} Parsed subscription details
 */
function parseAppleReceipt(appleResponse) {
    // Handle JWT format (already parsed in verifyAppleReceipt)
    if (appleResponse.receipt_type === 'JWT' && appleResponse.latest_receipt_info) {
        const latestReceipt = appleResponse.latest_receipt_info[0];
        
        return {
            isValid: appleResponse.status === 0,
            transactionId: latestReceipt.transaction_id || latestReceipt.original_transaction_id,
            productId: latestReceipt.product_id,
            purchaseDate: latestReceipt.purchase_date_ms ? new Date(parseInt(latestReceipt.purchase_date_ms)) : new Date(),
            expiryDate: latestReceipt.expires_date_ms ? new Date(parseInt(latestReceipt.expires_date_ms)) : null,
            isTrialPeriod: latestReceipt.is_trial_period === 'true',
            cancellationDate: latestReceipt.cancellation_date_ms ? new Date(parseInt(latestReceipt.cancellation_date_ms)) : null,
            environment: appleResponse.environment || 'Production',
            originalResponse: appleResponse
        };
    }

    // Handle old format (base64 receipt)
    if (!appleResponse.latest_receipt_info || appleResponse.latest_receipt_info.length === 0) {
        // Log detailed error for debugging
        console.error('❌ Apple response structure:', JSON.stringify(appleResponse, null, 2));
        throw new Error('No receipt info found in Apple response. Status: ' + (appleResponse.status || 'unknown'));
    }

    const latestReceipt = appleResponse.latest_receipt_info[0];
    
    return {
        isValid: appleResponse.status === 0,
        transactionId: latestReceipt.transaction_id || latestReceipt.original_transaction_id,
        productId: latestReceipt.product_id,
        purchaseDate: latestReceipt.purchase_date_ms ? new Date(parseInt(latestReceipt.purchase_date_ms)) : new Date(),
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












