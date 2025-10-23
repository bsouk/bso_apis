# 📱 BSO Subscription Payment API Documentation for Mobile

## 🎯 Overview
This document provides complete API details for implementing subscription payments (Buyer Direct and Buyer Indirect plans) in the mobile application.

---

## 🔐 Base Configuration

**Base URL**: `https://betazone.promaticstechnologies.com/bso_apis/`  
**Authentication**: Bearer Token (JWT)  
**Content-Type**: `application/json`

---

## 📋 API Flow for Subscription Payment

### Step 1: Get Available Plans
### Step 2: Generate Client Secret for Payment
### Step 3: Process Payment with Stripe (Mobile SDK)
### Step 4: Create Subscription After Successful Payment

---

## 1️⃣ Get All Available Plans

Retrieve all available subscription plans to display to the user.

### Endpoint
```
GET /getAllPlan
```

### Authentication
❌ **No Authentication Required**

### Query Parameters
| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| type      | string | Optional | Filter by plan type: `buyer`, `supplier`, `logistics`, `resource`, `recruiter` |

### Request Example
```bash
GET https://betazone.promaticstechnologies.com/bso_apis/getAllPlan?type=buyer
```

### Response Success (200)
```json
{
  "code": 200,
  "message": "Plans fetched successfully",
  "data": [
    {
      "_id": "6789abcdef123456",
      "plan_id": "plan_buyer_direct_001",
      "type": "buyer",
      "plan_name": "Buyer Direct",
      "plan_description": "Direct access to suppliers without admin involvement",
      "price": 99.99,
      "currency": "USD",
      "interval": "monthly",
      "plan_type": "premium",
      "plan_step": "direct",
      "status": "active",
      "features": [
        {
          "name": "Direct Supplier Contact",
          "included": true,
          "limit": null
        },
        {
          "name": "Unlimited Enquiries",
          "included": true,
          "limit": null
        }
      ],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "6789abcdef123457",
      "plan_id": "plan_buyer_indirect_001",
      "type": "buyer",
      "plan_name": "Buyer Indirect",
      "plan_description": "Admin-managed supplier interactions",
      "price": 49.99,
      "currency": "USD",
      "interval": "monthly",
      "plan_type": "premium",
      "plan_step": "admin_involved",
      "status": "active",
      "features": [
        {
          "name": "Admin-Managed Quotes",
          "included": true,
          "limit": null
        },
        {
          "name": "10 Enquiries per month",
          "included": true,
          "limit": 10
        }
      ],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Important Fields for Mobile

- **plan_id**: Unique identifier for the plan (use this for subscription creation)
- **plan_step**: 
  - `"direct"` = Buyer Direct Plan
  - `"admin_involved"` = Buyer Indirect Plan
- **price**: Plan price in the specified currency
- **interval**: Billing cycle (`monthly`, `yearly`)

---

## 2️⃣ Generate Client Secret for Payment

Before processing payment, you need to generate a Stripe client secret.

### Endpoint
```
POST /generateClientSecretKey
```

### Authentication
✅ **Required** - Bearer Token in Header

### Headers
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

### Request Body
```json
{
  "plan_id": "plan_buyer_direct_001"
}
```

### Request Example
```bash
POST https://betazone.promaticstechnologies.com/bso_apis/generateClientSecretKey

Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

Body:
{
  "plan_id": "plan_buyer_direct_001"
}
```

### Response Success (200)
```json
{
  "code": 200,
  "message": "Setup Intent created successfully",
  "data": {
    "client_secret": "seti_1234567890abcdef_secret_1234567890abcdef",
    "setup_intent": "seti_1234567890abcdef",
    "payment_method_types": ["card"],
    "status": "requires_payment_method"
  }
}
```

### Response Error - Already Subscribed (400)
```json
{
  "code": 400,
  "message": "Already subscribed to a buyer plan. Cancel existing subscription before purchasing a new one."
}
```

### Response Error - Plan Not Found (404)
```json
{
  "code": 404,
  "message": "Plan not found"
}
```

---

## 3️⃣ Process Payment (Stripe Mobile SDK)

**Note**: This step happens entirely within your mobile app using Stripe's mobile SDK.

### iOS (Swift)
Use Stripe iOS SDK to handle payment:
```swift
// Use the client_secret from Step 2
let clientSecret = "seti_1234567890abcdef_secret_1234567890abcdef"

// Initialize Stripe SDK with your publishable key
STPAPIClient.shared.publishableKey = "pk_live_..." // Your Stripe Publishable Key

// Present payment sheet
let paymentSheet = PaymentSheet(
    paymentIntentClientSecret: clientSecret,
    configuration: configuration
)

paymentSheet.present(from: viewController) { result in
    switch result {
    case .completed:
        // Payment successful - get payment_method_id
        let paymentMethodId = result.paymentMethod.stripeId
        // Proceed to Step 4
    case .failed(let error):
        // Handle error
    case .canceled:
        // User canceled
    }
}
```

### Android (Kotlin)
```kotlin
// Use the client_secret from Step 2
val clientSecret = "seti_1234567890abcdef_secret_1234567890abcdef"

// Initialize Stripe SDK
PaymentConfiguration.init(applicationContext, "pk_live_...") // Your Stripe Publishable Key

// Present payment sheet
paymentSheet.presentWithPaymentIntent(
    clientSecret,
    PaymentSheet.Configuration(...)
)

// In your payment result callback
override fun onPaymentSheetResult(paymentResult: PaymentSheetResult) {
    when (paymentResult) {
        is PaymentSheetResult.Completed -> {
            // Payment successful - get payment_method_id
            val paymentMethodId = paymentResult.paymentMethod.id
            // Proceed to Step 4
        }
        is PaymentSheetResult.Failed -> {
            // Handle error
        }
        is PaymentSheetResult.Canceled -> {
            // User canceled
        }
    }
}
```

### What You Need
- **Stripe Publishable Key**: `pk_live_51RBYgoHoaFEMsOSK7Y3vXIioBT5P8zNlcd9QZOhSqi6XTjzkRffYhayoDM5491Vi3ESL2CQgAC0KdsQfesmeBLcU00Vve6YF8j`
- **client_secret**: From Step 2 response
- **payment_method_id**: Obtained after successful payment

---

## 4️⃣ Create Subscription (After Payment Success)

After successful payment processing via Stripe SDK, create the subscription in the database.

### Endpoint
```
POST /createSubscription
```

### Authentication
✅ **Required** - Bearer Token in Header

### Headers
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

### Request Body
```json
{
  "plan_id": "plan_buyer_direct_001",
  "payment_method_id": "pm_1234567890abcdef"
}
```

### Request Parameters
| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| plan_id   | string | ✅ Yes   | The plan ID from Step 1 |
| payment_method_id | string | ✅ Yes | Payment method ID from Stripe SDK (Step 3) |

### Request Example
```bash
POST https://betazone.promaticstechnologies.com/bso_apis/createSubscription

Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

Body:
{
  "plan_id": "plan_buyer_direct_001",
  "payment_method_id": "pm_1234567890abcdef"
}
```

### Response Success (200)
```json
{
  "code": 200,
  "message": "Subscription created successfully",
  "requires_action": false,
  "data": {
    "subscription": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "user_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "subscription_id": "sub-a1b2c3d4e5",
      "plan_id": "plan_buyer_direct_001",
      "stripe_subscription_id": "sub_1234567890abcdef",
      "stripe_payment_method_id": "pm_1234567890abcdef",
      "stripe_customer_id": "cus_1234567890abcdef",
      "start_at": "2024-10-23T00:00:00.000Z",
      "end_at": "2024-11-23T00:00:00.000Z",
      "status": "active",
      "type": "buyer",
      "payment_method_type": "card",
      "isPurchased": true,
      "createdAt": "2024-10-23T10:30:00.000Z",
      "updatedAt": "2024-10-23T10:30:00.000Z"
    },
    "requires_action": false,
    "client_secret": null,
    "payment_intent_status": "succeeded",
    "subscription_status": "active"
  }
}
```

### Response - Requires Additional Authentication (200)
```json
{
  "code": 200,
  "message": "Payment requires additional authentication",
  "requires_action": true,
  "data": {
    "subscription": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "status": "incomplete",
      ...
    },
    "requires_action": true,
    "client_secret": "pi_1234567890abcdef_secret_1234567890abcdef",
    "payment_intent_status": "requires_action",
    "subscription_status": "incomplete"
  }
}
```

**Handling `requires_action: true`**:
If the response has `requires_action: true`, you need to complete 3D Secure authentication:

```swift
// iOS
stripe.handleNextAction(
    forPayment: clientSecret,
    with: viewController
) { result in
    // Handle result
}
```

```kotlin
// Android
stripe.handleNextActionForPayment(
    fragment,
    clientSecret
)
```

### Response Error - Already Subscribed (404)
```json
{
  "code": 404,
  "message": "Already have an active Subscription. cancel it first !"
}
```

### Response Error - Invalid Payment Method (400)
```json
{
  "code": 400,
  "message": "Invalid payment method",
  "stripe_code": "payment_method_invalid"
}
```

### Response Error - Missing Required Fields (400)
```json
{
  "code": 400,
  "message": "Plan ID and payment method ID are required"
}
```

---

## 🔄 Additional APIs

### 5️⃣ Check Active Subscriptions

Check if user has active subscriptions.

### Endpoint
```
GET /checksubscriptions
```

### Authentication
✅ **Required** - Bearer Token

### Response Success (200)
```json
{
  "code": 200,
  "message": "Active subscription found",
  "data": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "user_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "subscription_id": "sub-a1b2c3d4e5",
      "plan_id": "plan_buyer_direct_001",
      "status": "active",
      "type": "buyer",
      "start_at": "2024-10-23T00:00:00.000Z",
      "end_at": "2024-11-23T00:00:00.000Z",
      "is_recurring": true,
      "plan": {
        "plan_name": "Buyer Direct",
        "price": 99.99,
        "interval": "monthly",
        "plan_step": "direct"
      }
    }
  ]
}
```

### Response - No Active Subscription (201)
```json
{
  "code": 201,
  "message": "No active subscription found"
}
```

---

### 6️⃣ Cancel Subscription

Cancel an active subscription.

### Endpoint
```
POST /cancelSubscription
```

### Authentication
✅ **Required** - Bearer Token

### Request Body
```json
{
  "subscription_id": "sub-a1b2c3d4e5"
}
```

### Response Success (200)
```json
{
  "code": 200,
  "message": "Subscription canceled successfully"
}
```

---

## 📊 Subscription Status Flow

```
incomplete → active → (canceled_scheduled) → canceled
                   → (expired)
```

### Status Definitions

| Status | Description |
|--------|-------------|
| `incomplete` | Payment pending or requires authentication |
| `active` | Subscription is active and working |
| `canceled_scheduled` | Will be canceled at period end |
| `canceled` | Subscription has been canceled |
| `expired` | Subscription period has ended |

---

## 🎨 Plan Types (Buyer Plans)

### Buyer Direct Plan
```json
{
  "plan_step": "direct",
  "description": "Direct communication with suppliers",
  "features": [
    "Direct supplier contact",
    "Unlimited enquiries",
    "Real-time quotes",
    "No admin intervention"
  ]
}
```

### Buyer Indirect Plan
```json
{
  "plan_step": "admin_involved",
  "description": "Admin-managed supplier interactions",
  "features": [
    "Admin-verified suppliers",
    "Admin-managed quotes",
    "Quality control",
    "Limited enquiries per period"
  ]
}
```

---

## 🔒 Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7Il9pZCI6IjY1YTFiMmMzZDRlNWY2ZzdoOGk5ajBrMiIsInR5cGUiOiJ1c2VyIn0sImlhdCI6MTYzNDU2Nzg5MH0.abc123def456...
```

### How to get the token?
User must login first using the login API. The token is returned in the login response and should be stored securely on the device.

---

## 🚨 Error Handling

### Common Error Responses

#### 400 - Bad Request
```json
{
  "code": 400,
  "message": "Plan ID and payment method ID are required"
}
```

#### 401 - Unauthorized
```json
{
  "code": 401,
  "message": "Unauthorized access"
}
```

#### 404 - Not Found
```json
{
  "code": 404,
  "message": "Plan not found"
}
```

#### 500 - Server Error
```json
{
  "code": 500,
  "message": "Internal server error"
}
```

---

## 📱 Complete Mobile Implementation Flow

```
┌─────────────────┐
│ 1. User Opens   │
│ Subscription    │
│ Screen          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Call GET     │
│ /getAllPlan     │
│ (No Auth)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Display      │
│ Buyer Direct &  │
│ Buyer Indirect  │
│ Plans           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. User Selects │
│ Plan & Taps     │
│ "Subscribe"     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Call POST    │
│ /generateClient │
│ SecretKey       │
│ (With Auth)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. Get          │
│ client_secret   │
│ from response   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 7. Initialize   │
│ Stripe SDK with │
│ client_secret   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 8. Present      │
│ Stripe Payment  │
│ Sheet           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 9. User Enters  │
│ Card Details &  │
│ Confirms        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 10. Get         │
│ payment_method  │
│ _id from Stripe │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 11. Call POST   │
│ /createSub      │
│ scription       │
│ (With Auth)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 12. Check       │
│ requires_action │
│ in response     │
└────────┬────────┘
         │
         ├─ No ──►┌──────────────┐
         │        │ Success!     │
         │        │ Show success │
         │        │ message      │
         │        └──────────────┘
         │
         └─ Yes ─►┌──────────────┐
                  │ Handle 3DS   │
                  │ with Stripe  │
                  │ SDK          │
                  └──────────────┘
```

---

## 🧪 Testing

### Test Card Numbers (Stripe)

| Card Number | Description |
|-------------|-------------|
| 4242 4242 4242 4242 | Success |
| 4000 0027 6000 3184 | Requires 3D Secure |
| 4000 0000 0000 9995 | Declined |

- **Expiry**: Any future date (e.g., 12/25)
- **CVC**: Any 3 digits (e.g., 123)
- **ZIP**: Any 5 digits (e.g., 12345)

---

## 📞 Support

For technical issues or questions:
- **Email**: support@bsoservices.com
- **API Base URL**: https://betazone.promaticstechnologies.com/bso_apis/

---

## 📝 Notes for Mobile Developer

1. **Stripe SDK Integration**:
   - iOS: Add `Stripe` pod to your Podfile
   - Android: Add Stripe dependency to build.gradle

2. **Publishable Key**: 
   ```
   pk_live_51RBYgoHoaFEMsOSK7Y3vXIioBT5P8zNlcd9QZOhSqi6XTjzkRffYhayoDM5491Vi3ESL2CQgAC0KdsQfesmeBLcU00Vve6YF8j
   ```

3. **Store JWT Token Securely**:
   - iOS: Use Keychain
   - Android: Use EncryptedSharedPreferences

4. **Handle Network Errors**:
   - Implement retry logic for network failures
   - Show appropriate error messages to users

5. **Loading States**:
   - Show loading indicators during API calls
   - Disable buttons to prevent duplicate requests

6. **Subscription Status**:
   - Periodically check subscription status
   - Handle subscription expiration gracefully

---

## 📅 Last Updated
October 23, 2025


/**
 * Utility to generate missing user IDs for existing users
 * This function runs on server startup to ensure all users have unique_user_id
 */

const User = require('../models/user');

/**
 * Sanitizes text by removing special characters and converting to lowercase
 * @param {string} text - Text to sanitize
 * @returns {string} - Sanitized text
 */
function sanitizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove special characters
    .replace(/\s+/g, '') // Remove spaces
    .substring(0, 15); // Limit length
}

/**
 * Generates a unique suffix for user IDs
 * @returns {string} - 6-character unique suffix
 */
function generateUniqueSuffix() {
  const timestamp = Date.now().toString(36).slice(-3); // 3 chars from timestamp
  const random = Math.random().toString(36).slice(2, 5); // 3 random chars
  return timestamp + random; // 6 chars total
}

/**
 * Checks if a user ID already exists in the database
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} - True if exists, false otherwise
 */
async function checkIfUserIdExists(userId) {
  const existingUser = await User.findOne({ unique_user_id: userId });
  return !!existingUser;
}

/**
 * Generates a unique user ID with pattern: bso-{identifier}-{unique-suffix}
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 * @param {string} email - User's email
 * @param {string} phone - User's phone number
 * @returns {Promise<string>} - Generated unique user ID
 */
async function generateUniqueUserId(firstName, lastName, email, phone) {
  let identifier = '';
  
  // Determine identifier based on priority: name > email > phone
  if (firstName && lastName) {
    const sanitizedFirst = sanitizeText(firstName);
    const sanitizedLast = sanitizeText(lastName);
    identifier = `${sanitizedFirst}-${sanitizedLast}`;
  } else if (firstName) {
    identifier = sanitizeText(firstName);
  } else if (lastName) {
    identifier = sanitizeText(lastName);
  } else if (email) {
    const emailPrefix = email.split('@')[0];
    identifier = sanitizeText(emailPrefix);
  } else if (phone) {
    // Extract last 10 digits from phone number
    const phoneDigits = phone.replace(/\D/g, '').slice(-10);
    identifier = phoneDigits;
  } else {
    identifier = 'user'; // fallback
  }
  
  // Truncate if too long (keep it under 30 chars for readability)
  if (identifier.length > 30) {
    identifier = identifier.substring(0, 30);
  }
  
  // Generate unique suffix and create user ID
  let uniqueSuffix = generateUniqueSuffix();
  let userId = `bso-${identifier}-${uniqueSuffix}`;
  
  // Check uniqueness in database and regenerate if needed
  let attempts = 0;
  const maxAttempts = 10; // Prevent infinite loop
  
  while (await checkIfUserIdExists(userId) && attempts < maxAttempts) {
    uniqueSuffix = generateUniqueSuffix();
    userId = `bso-${identifier}-${uniqueSuffix}`;
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    // If still not unique, add timestamp to ensure uniqueness
    const timestamp = Date.now().toString(36);
    userId = `bso-${identifier}-${timestamp}`;
  }
  
  return userId;
}

/**
 * Main function to generate missing user IDs for all users
 * This function should be called on server startup
 * @returns {Promise<Object>} - Summary of the operation
 */
async function generateMissingUserIds() {
  try {
    console.log('🔍 Starting user ID generation for users with missing IDs...');
    
    // Find all users without unique_user_id, with empty/null unique_user_id, or with 'NaN'
    const usersWithoutId = await User.find({
      $or: [
        { unique_user_id: { $exists: false } },
        { unique_user_id: null },
        { unique_user_id: '' },
        { unique_user_id: { $regex: /^\s*$/ } }, // Empty or whitespace only
        { unique_user_id: 'NaN' }, // Fix NaN values
        { unique_user_id: /^NaN$/i } // Case insensitive NaN
      ]
    }).select('_id first_name last_name email phone_number unique_user_id createdAt');
    
    console.log(`📊 Found ${usersWithoutId.length} users without unique_user_id`);
    
    if (usersWithoutId.length === 0) {
      console.log('✅ All users already have unique_user_id. No action needed.');
      return {
        success: true,
        message: 'All users already have unique_user_id',
        processed: 0,
        errors: 0
      };
    }
    
    let processed = 0;
    let errors = 0;
    const errorsList = [];
    
    // Process each user
    for (const user of usersWithoutId) {
      try {
        console.log(`🔄 Processing user: ${user.first_name} ${user.last_name} (${user.email || 'no email'})`);
        
        // Generate unique user ID
        const uniqueUserId = await generateUniqueUserId(
          user.first_name,
          user.last_name,
          user.email,
          user.phone_number
        );
        
        // Update user with new ID
        await User.findByIdAndUpdate(user._id, {
          unique_user_id: uniqueUserId
        });
        
        console.log(`✅ Generated ID: ${uniqueUserId} for user: ${user.first_name} ${user.last_name}`);
        processed++;
        
      } catch (error) {
        console.error(`❌ Error processing user ${user._id}:`, error.message);
        errors++;
        errorsList.push({
          userId: user._id,
          name: `${user.first_name} ${user.last_name}`,
          error: error.message
        });
      }
    }
    
    const summary = {
      success: true,
      message: `User ID generation completed. Processed: ${processed}, Errors: ${errors}`,
      processed,
      errors,
      totalFound: usersWithoutId.length,
      errorsList
    };
    
    console.log('📋 Summary:', summary);
    
    // Also check for users with numeric IDs and suggest migration
    const usersWithNumericId = await User.find({
      unique_user_id: { $regex: /^\d+$/ } // Only numeric IDs
    }).countDocuments();
    
    if (usersWithNumericId > 0) {
      console.log(`⚠️  Found ${usersWithNumericId} users with numeric IDs. Consider migrating to new format.`);
      summary.numericIdsFound = usersWithNumericId;
      summary.suggestion = 'Consider running migrateNumericUserIds() to update numeric IDs to new format';
    }
    
    return summary;
    
  } catch (error) {
    console.error('❌ Error in generateMissingUserIds:', error);
    return {
      success: false,
      message: 'Error generating missing user IDs',
      error: error.message,
      processed: 0,
      errors: 1
    };
  }
}

/**
 * Optional function to migrate numeric user IDs to new format
 * This is separate from the main function as it's more invasive
 * @returns {Promise<Object>} - Summary of the migration
 */
async function migrateNumericUserIds() {
  try {
    console.log('🔄 Starting migration of numeric user IDs to new format...');
    
    // Find users with numeric IDs
    const usersWithNumericId = await User.find({
      unique_user_id: { $regex: /^\d+$/ } // Only numeric IDs
    }).select('_id first_name last_name email phone_number unique_user_id');
    
    console.log(`📊 Found ${usersWithNumericId.length} users with numeric IDs`);
    
    if (usersWithNumericId.length === 0) {
      console.log('✅ No users with numeric IDs found.');
      return {
        success: true,
        message: 'No numeric IDs to migrate',
        processed: 0,
        errors: 0
      };
    }
    
    let processed = 0;
    let errors = 0;
    const errorsList = [];
    
    for (const user of usersWithNumericId) {
      try {
        console.log(`🔄 Migrating user: ${user.first_name} ${user.last_name} (old ID: ${user.unique_user_id})`);
        
        // Generate new format user ID
        const newUserId = await generateUniqueUserId(
          user.first_name,
          user.last_name,
          user.email,
          user.phone_number
        );
        
        // Update user with new ID
        await User.findByIdAndUpdate(user._id, {
          unique_user_id: newUserId
        });
        
        console.log(`✅ Migrated ID: ${user.unique_user_id} → ${newUserId}`);
        processed++;
        
      } catch (error) {
        console.error(`❌ Error migrating user ${user._id}:`, error.message);
        errors++;
        errorsList.push({
          userId: user._id,
          oldId: user.unique_user_id,
          name: `${user.first_name} ${user.last_name}`,
          error: error.message
        });
      }
    }
    
    const summary = {
      success: true,
      message: `Numeric ID migration completed. Processed: ${processed}, Errors: ${errors}`,
      processed,
      errors,
      totalFound: usersWithNumericId.length,
      errorsList
    };
    
    console.log('📋 Migration Summary:', summary);
    return summary;
    
  } catch (error) {
    console.error('❌ Error in migrateNumericUserIds:', error);
    return {
      success: false,
      message: 'Error migrating numeric user IDs',
      error: error.message,
      processed: 0,
      errors: 1
    };
  }
}

/**
 * Function to validate all user IDs in the database
 * Useful for debugging and verification
 * @returns {Promise<Object>} - Validation results
 */
async function validateAllUserIds() {
  try {
    console.log('🔍 Validating all user IDs...');
    
    const totalUsers = await User.countDocuments();
    const usersWithoutId = await User.countDocuments({
      $or: [
        { unique_user_id: { $exists: false } },
        { unique_user_id: null },
        { unique_user_id: '' },
        { unique_user_id: { $regex: /^\s*$/ } }
      ]
    });
    
    const usersWithNumericId = await User.countDocuments({
      unique_user_id: { $regex: /^\d+$/ }
    });
    
    const usersWithNewFormat = await User.countDocuments({
      unique_user_id: { $regex: /^bso-/ }
    });
    
    const duplicateIds = await User.aggregate([
      { $group: { _id: '$unique_user_id', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    const validation = {
      totalUsers,
      usersWithoutId,
      usersWithNumericId,
      usersWithNewFormat,
      duplicateCount: duplicateIds.length,
      duplicates: duplicateIds,
      isValid: usersWithoutId === 0 && duplicateIds.length === 0
    };
    
    console.log('📊 Validation Results:', validation);
    return validation;
    
  } catch (error) {
    console.error('❌ Error validating user IDs:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  generateMissingUserIds,
  migrateNumericUserIds,
  validateAllUserIds,
  generateUniqueUserId
};
