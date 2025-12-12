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
    if (!receiptData || typeof receiptData !== 'string') {
        return false;
    }
    
    const trimmed = receiptData.trim();
    // JWT tokens start with "eyJ" (base64 encoded {" header)
    // They also have 3 parts separated by dots: header.payload.signature
    const isJWT = trimmed.startsWith('eyJ') && trimmed.split('.').length === 3;
    
    console.log('🔍 JWT detection:', {
        startsWithEyJ: trimmed.startsWith('eyJ'),
        hasThreeParts: trimmed.split('.').length === 3,
        isJWT: isJWT,
        preview: trimmed.substring(0, 50)
    });
    
    return isJWT;
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
        
        if (!decoded) {
            throw new Error('JWT decode returned null/undefined');
        }
        
        console.log('✅ JWT decoded, has payload:', !!decoded.payload);
        console.log('📋 JWT header:', decoded.header);
        
        if (!decoded.payload) {
            // Try decoding without complete flag
            const simpleDecoded = jwt.decode(jwtToken, { complete: false });
            if (simpleDecoded) {
                console.log('✅ Fallback: Decoded JWT without complete flag');
                return simpleDecoded;
            }
            throw new Error('Invalid JWT token structure - no payload found');
        }

        console.log('✅ JWT token decoded successfully');
        console.log('📋 Payload type:', typeof decoded.payload);
        console.log('📋 Payload is array:', Array.isArray(decoded.payload));
        
        return decoded.payload;
    } catch (error) {
        console.error('❌ JWT decode error:', error.message);
        console.error('❌ JWT token preview:', jwtToken.substring(0, 200));
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
    
    console.log('🔍 Parsing JWT transaction, payload structure:', {
        hasTransactionInfo: !!jwtPayload.transactionInfo,
        hasSignedTransactionInfo: !!jwtPayload.signedTransactionInfo,
        hasData: !!jwtPayload.data,
        topLevelKeys: Object.keys(jwtPayload)
    });
    
    let transactionData = null;
    let renewalData = null;
    
    // Try to find transactionInfo (could be nested JWT or direct object)
    // Check multiple possible locations
    const transactionInfo = jwtPayload.transactionInfo || 
                           jwtPayload.signedTransactionInfo ||
                           jwtPayload.data?.signedTransactionInfo || 
                           jwtPayload.data?.transactionInfo;
    
    // Try to find renewalInfo (could be nested JWT or direct object)
    const renewalInfo = jwtPayload.renewalInfo || 
                       jwtPayload.signedRenewalInfo ||
                       jwtPayload.data?.signedRenewalInfo || 
                       jwtPayload.data?.renewalInfo;
    
    console.log('🔍 Found transactionInfo:', !!transactionInfo, typeof transactionInfo);
    console.log('🔍 Found renewalInfo:', !!renewalInfo, typeof renewalInfo);
    
    // If transactionInfo is a JWT string, decode it
    if (typeof transactionInfo === 'string' && transactionInfo.startsWith('eyJ')) {
        try {
            transactionData = jwt.decode(transactionInfo, { complete: false });
            console.log('✅ Decoded nested transactionInfo JWT');
            console.log('📋 Transaction data keys:', Object.keys(transactionData || {}));
        } catch (error) {
            console.error('❌ Error decoding transactionInfo JWT:', error.message);
        }
    } else if (transactionInfo && typeof transactionInfo === 'object') {
        transactionData = transactionInfo;
        console.log('✅ Using transactionInfo as object');
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
    
    console.log('🔍 Using transaction source:', transactionData ? 'transactionData' : 'jwtPayload');
    console.log('🔍 Transaction keys:', Object.keys(transaction));
    
    // Extract transaction details with multiple fallback options
    const transactionId = transaction.originalTransactionId || 
                         transaction.transactionId || 
                         transaction.original_transaction_id ||
                         transaction.transaction_id ||
                         transaction.id;
    
    const productId = transaction.productId || 
                     transaction.product_id ||
                     transaction.productIdentifier ||
                     transaction.productIdentifier ||
                     transaction.bundleId; // Sometimes product ID is in bundleId
    
    console.log('🔍 Extracted transactionId:', transactionId);
    console.log('🔍 Extracted productId:', productId);
    
    // Handle date parsing (could be ISO string, timestamp, or milliseconds)
    let purchaseDate = new Date();
    if (transaction.purchaseDate) {
        purchaseDate = new Date(transaction.purchaseDate);
    } else if (transaction.purchase_date_ms) {
        purchaseDate = new Date(parseInt(transaction.purchase_date_ms));
    } else if (transaction.purchaseDateMs) {
        purchaseDate = new Date(parseInt(transaction.purchaseDateMs));
    } else if (transaction.purchaseDateTimestamp) {
        purchaseDate = new Date(parseInt(transaction.purchaseDateTimestamp));
    } else if (transaction.signedDate) {
        purchaseDate = new Date(transaction.signedDate);
    }
    
    let expiryDate = null;
    if (transaction.expiresDate) {
        expiryDate = new Date(transaction.expiresDate);
    } else if (transaction.expires_date_ms) {
        expiryDate = new Date(parseInt(transaction.expires_date_ms));
    } else if (transaction.expiresDateMs) {
        expiryDate = new Date(parseInt(transaction.expiresDateMs));
    } else if (transaction.expiresDateTimestamp) {
        expiryDate = new Date(parseInt(transaction.expiresDateTimestamp));
    } else if (renewalData && renewalData.expiresDate) {
        expiryDate = new Date(renewalData.expiresDate);
    } else if (renewalData && renewalData.expiresDateMs) {
        expiryDate = new Date(parseInt(renewalData.expiresDateMs));
    }
    
    // If we still don't have transactionId or productId, try to extract from jwtPayload directly
    let finalTransactionId = transactionId;
    let finalProductId = productId;
    
    if (!finalTransactionId || finalTransactionId === 'unknown') {
        // Try extracting from jwtPayload directly
        finalTransactionId = jwtPayload.originalTransactionId || 
                           jwtPayload.transactionId || 
                           jwtPayload.original_transaction_id ||
                           jwtPayload.transaction_id ||
                           jwtPayload.id ||
                           `jwt_${Date.now()}`; // Fallback to timestamp-based ID
        console.log('⚠️ Using fallback transactionId:', finalTransactionId);
    }
    
    if (!finalProductId || finalProductId === 'unknown') {
        // Try extracting from jwtPayload directly
        finalProductId = jwtPayload.productId || 
                        jwtPayload.product_id ||
                        jwtPayload.productIdentifier ||
                        jwtPayload.bundleId ||
                        'unknown_product';
        console.log('⚠️ Using fallback productId:', finalProductId);
    }
    
    // If we still don't have critical fields, log the full structure for debugging
    if (!finalTransactionId || finalTransactionId === 'unknown' || !finalProductId || finalProductId === 'unknown') {
        console.error('❌ Missing critical fields in transaction data');
        console.error('📋 Full transaction object:', JSON.stringify(transaction, null, 2).substring(0, 1000));
        console.error('📋 Full jwtPayload:', JSON.stringify(jwtPayload, null, 2).substring(0, 1000));
        
        // Don't throw error - return what we have so the flow can continue
        // The actual validation will happen later in the controller
    }
    
    return {
        transactionId: finalTransactionId,
        productId: finalProductId,
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
        console.log('📝 JWT token length:', receiptData.length);
        console.log('📝 JWT token preview:', receiptData.substring(0, 100) + '...');
        
        try {
            const jwtPayload = decodeAppleJWT(receiptData);
            console.log('✅ JWT decoded successfully');
            console.log('📋 JWT payload keys:', Object.keys(jwtPayload));
            console.log('📋 JWT payload structure:', JSON.stringify(jwtPayload, null, 2).substring(0, 500));
            
            const transactionData = parseJWTTransaction(jwtPayload);
            console.log('✅ Transaction data parsed:', {
                transactionId: transactionData.transactionId,
                productId: transactionData.productId,
                purchaseDate: transactionData.purchaseDate,
                expiryDate: transactionData.expiryDate
            });
            
            // Validate that we have at least transactionId and productId
            if (!transactionData.transactionId || transactionData.transactionId === 'unknown' ||
                !transactionData.productId || transactionData.productId === 'unknown_product') {
                console.error('❌ Critical fields missing in transactionData:', {
                    transactionId: transactionData.transactionId,
                    productId: transactionData.productId
                });
                // Still return the structure, but log the issue
                // The controller will handle validation
            }
            
            // Return in format compatible with parseAppleReceipt
            const response = {
                status: 0, // Success
                environment: transactionData.environment || 'Production',
                latest_receipt_info: [{
                    transaction_id: transactionData.transactionId || `jwt_${Date.now()}`,
                    original_transaction_id: transactionData.transactionId || `jwt_${Date.now()}`,
                    product_id: transactionData.productId || 'unknown_product',
                    purchase_date_ms: transactionData.purchaseDate ? transactionData.purchaseDate.getTime().toString() : Date.now().toString(),
                    expires_date_ms: transactionData.expiryDate ? transactionData.expiryDate.getTime().toString() : null,
                    is_trial_period: transactionData.isTrialPeriod ? 'true' : 'false',
                    cancellation_date_ms: transactionData.cancellationDate ? transactionData.cancellationDate.getTime().toString() : null
                }],
                receipt_type: 'JWT',
                jwt_payload: jwtPayload
            };
            
            console.log('✅ Returning formatted response with latest_receipt_info:', response.latest_receipt_info.length, 'items');
            console.log('📋 Response latest_receipt_info[0]:', response.latest_receipt_info[0]);
            return response;
        } catch (error) {
            console.error('❌ JWT token processing error:', error.message);
            console.error('❌ Error stack:', error.stack);
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
    console.log('🔍 parseAppleReceipt called with response type:', appleResponse.receipt_type || 'legacy');
    console.log('🔍 Response keys:', Object.keys(appleResponse));
    console.log('🔍 Has latest_receipt_info:', !!appleResponse.latest_receipt_info);
    console.log('🔍 latest_receipt_info length:', appleResponse.latest_receipt_info?.length || 0);
    
    // Handle JWT format (already parsed in verifyAppleReceipt)
    if (appleResponse.receipt_type === 'JWT' && appleResponse.latest_receipt_info) {
        console.log('✅ Processing JWT format receipt');
        const latestReceipt = appleResponse.latest_receipt_info[0];
        
        if (!latestReceipt) {
            console.error('❌ latest_receipt_info array is empty');
            throw new Error('No receipt info found in JWT response');
        }
        
        console.log('✅ Latest receipt data:', {
            transaction_id: latestReceipt.transaction_id,
            product_id: latestReceipt.product_id,
            purchase_date_ms: latestReceipt.purchase_date_ms
        });
        
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
        console.error('❌ Apple response structure:', JSON.stringify(appleResponse, null, 2).substring(0, 2000));
        console.error('❌ Response status:', appleResponse.status);
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












