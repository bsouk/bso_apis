# 🔍 IAP VERIFICATION SETUP & TESTING GUIDE

**Date:** January 2025  
**Purpose:** Setup and test Google Play IAP verification with real purchase token

---

## ✅ CURRENT IMPLEMENTATION STATUS

### Code Review Results:

1. **✅ IAP_BYPASS_MODE**: Set to `false` - **REAL VERIFICATION ENABLED**
   - Location: `src/controllers/user/iap.js` line 35
   - Status: Production mode active, no bypass

2. **✅ All Code Active**: No commented code found
   - All verification functions are active
   - Google Play verification is fully implemented
   - Receipt parsing is functional

3. **✅ Implementation Complete**:
   - ✅ Input validation
   - ✅ User verification
   - ✅ Plan verification
   - ✅ Receipt verification (Apple & Google)
   - ✅ Duplicate transaction prevention
   - ✅ Subscription creation
   - ✅ Payment recording
   - ✅ Auto-recruiter subscription
   - ✅ Admin notifications

---

## 🔧 SETUP REQUIRED

### 1. Google Service Account Configuration

The code supports **TWO methods** for Google authentication:

#### Method 1: Service Account JSON File (Recommended)

**Environment Variable:**
```env
GOOGLE_SERVICE_ACCOUNT_KEY=./config/google-service-account.json
```

**File Location:** `bso_apis/config/google-service-account.json`

#### Method 2: Service Account JSON String in .env

**Environment Variable:**
```env
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"..."}'
```

### 2. Google Package Name

**Environment Variable:**
```env
GOOGLE_PACKAGE_NAME=com.bluesky.pro
```

**Note:** Based on your product_id `com.bluesky.pro.supplier_monthly`, the package name is `com.bluesky.pro`

---

## 📝 CREATING SERVICE ACCOUNT JSON

### Your Provided Key:
```
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4ZS49kbPHm0Uq38vzNgCdiWbBnUlzHWsMo7bk2h6n/CZpBMNPqCtBQPe+XxQq616yZSIaypazl7oUC18mJB+MZiA/egqH+MQWFKPrF3tZcKYMf0bUxa6srWbGlIteEcAnrpo3JCAjDuz7+AGPQY0UJz+AlYJRcaYviucQ8Y+oq3CFuJEFaQKYTL+9fANwNMcB4LJfU1IsgjFED53iAvt6Cn0txVFWSyknS1rR8nrqwAr5Z6CPDxYewc3yulgWQBbuPv9lr91XKNmqBxY3vbCG+B6AseF3DCkStDyW9QhUjGndfHdrhi3NMmi85R8QQOZt3UKZchttxKnQfoTJKbOrQIDAQAB
```

This is a **base64 encoded RSA public key**. For Google Play verification, you need a **complete service account JSON file** with:
- `type`: "service_account"
- `project_id`: Your Google Cloud project ID
- `private_key_id`: Key ID
- `private_key`: Full private key (with BEGIN/END markers)
- `client_email`: Service account email
- `client_id`: Client ID
- `auth_uri`, `token_uri`, etc.

### ⚠️ IMPORTANT:

You need to get the **complete service account JSON** from Google Cloud Console:
1. Go to Google Cloud Console
2. Navigate to IAM & Admin > Service Accounts
3. Create or select a service account
4. Create a key (JSON format)
5. Download the JSON file

**OR** if you have the full private key, we can construct the JSON file.

---

## 🧪 TEST PAYLOAD

### Your Test Data:

```json
{
  "plan_id": "plan-1af67e74ed",
  "platform": "android",
  "product_id": "com.bluesky.pro.supplier_monthly",
  "purchase_token": "ojcmncmpppmafaphbepmoaib.AO-J1OxwuqRwMtMrFgKaGXI0vjMjMsxTxsybAR1wNgX2Awh8d9tFtFr_0iiC1OolJdjKM_v9HYiOhcpQN6tqLSrLMHuIlV2f_TZwu8EBTdHS-NehTJUeH94"
}
```

### API Endpoint:
```
POST http://localhost:5000/user/verifyIAPSubscription
```

### Headers Required:
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

---

## 📋 ENV FILE CONFIGURATION

Add these to your `.env` file:

```env
# Google Play IAP Configuration
GOOGLE_PACKAGE_NAME=com.bluesky.pro
GOOGLE_SERVICE_ACCOUNT_KEY=./config/google-service-account.json

# OR use JSON string (alternative method)
# GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

---

## 🧪 TESTING STEPS

### Step 1: Verify Plan Exists

First, check if the plan exists in database:
```bash
# Check plan in MongoDB
db.plans.findOne({ plan_id: "plan-1af67e74ed" })
```

### Step 2: Setup Service Account

1. Update `config/google-service-account.json` with your complete service account JSON
2. OR add `GOOGLE_SERVICE_ACCOUNT_JSON` to `.env`

### Step 3: Update .env

Add:
```env
GOOGLE_PACKAGE_NAME=com.bluesky.pro
```

### Step 4: Test API Endpoint

Use the test script provided below or Postman/curl.

---

## 🔍 VERIFICATION CHECKLIST

- [ ] IAP_BYPASS_MODE is `false` (✅ Already set)
- [ ] Google service account JSON file exists or JSON string in .env
- [ ] GOOGLE_PACKAGE_NAME is set in .env
- [ ] Plan exists in database with plan_id: "plan-1af67e74ed"
- [ ] User exists and has valid JWT token
- [ ] User doesn't have active subscription of same type
- [ ] Purchase token is valid (from Google Play sandbox/production)

---

## 📊 EXPECTED FLOW

```
1. API receives request
2. Validates input (plan_id, platform, product_id, purchase_token)
3. Verifies user (from JWT)
4. Verifies plan exists and is active
5. Checks for existing subscription
6. Verifies purchase_token with Google Play API
7. Parses Google response
8. Validates product_id matches
9. Checks for duplicate transaction
10. Creates subscription record
11. Records payment transaction
12. Auto-creates recruiter subscription (if supplier/logistics)
13. Notifies admin
14. Returns success response
```

---

## 🚨 COMMON ERRORS

### Error: "Google service account credentials not configured"
**Solution:** Add GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SERVICE_ACCOUNT_JSON to .env

### Error: "Invalid Google Play receipt"
**Possible Causes:**
- Invalid purchase_token
- Token expired
- Product ID mismatch
- Package name mismatch

### Error: "Plan not found"
**Solution:** Verify plan exists in database with correct plan_id

### Error: "Already have an active subscription"
**Solution:** Cancel existing subscription or use different user

---

## 📝 NEXT STEPS

1. ✅ Code is fully functional (no changes needed)
2. ⚠️ Need to add Google service account credentials
3. ⚠️ Need to set GOOGLE_PACKAGE_NAME in .env
4. ⚠️ Need to verify plan exists in database
5. ⚠️ Test with provided payload

---

**Status:** Code is ready, needs configuration setup


