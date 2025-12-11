# ✅ IAP Subscription Test - Ready to Test!

**Date:** January 2025  
**Status:** ✅ Configuration Complete - Ready for Testing

---

## ✅ SETUP COMPLETE

### 1. Service Account JSON
- ✅ **Saved:** `config/google-service-account.json`
- ✅ **Project ID:** `blue-sky-organisation`
- ✅ **Client Email:** `bso-iap-verification@blue-sky-organisation.iam.gserviceaccount.com`
- ✅ **Validated:** JSON structure is correct

### 2. Environment Configuration
- ✅ **GOOGLE_PACKAGE_NAME:** `com.bluesky.pro`
- ✅ **GOOGLE_SERVICE_ACCOUNT_KEY:** `./config/google-service-account.json`

### 3. Code Status
- ✅ **IAP_BYPASS_MODE:** `false` (Real verification enabled)
- ✅ **All code active** (No commented code)
- ✅ **Google Play verification** implemented

---

## 🧪 TEST PAYLOAD

```json
{
  "plan_id": "plan-1af67e74ed",
  "platform": "android",
  "product_id": "com.bluesky.pro.supplier_monthly",
  "purchase_token": "ojcmncmpppmafaphbepmoaib.AO-J1OxwuqRwMtMrFgKaGXI0vjMjMsxTxsybAR1wNgX2Awh8d9tFtFr_0iiC1OolJdjKM_v9HYiOhcpQN6tqLSrLMHuIlV2f_TZwu8EBTdHS-NehTJUeH94"
}
```

---

## 🚀 HOW TO TEST

### Option 1: Using Test Script (Recommended)

```bash
# Set JWT token
export TEST_JWT_TOKEN=your_jwt_token_here

# Run test
node test_iap_with_payload.js
```

### Option 2: Using cURL

```bash
curl -X POST http://localhost:5000/user/verifyIAPSubscription \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": "plan-1af67e74ed",
    "platform": "android",
    "product_id": "com.bluesky.pro.supplier_monthly",
    "purchase_token": "ojcmncmpppmafaphbepmoaib.AO-J1OxwuqRwMtMrFgKaGXI0vjMjMsxTxsybAR1wNgX2Awh8d9tFtFr_0iiC1OolJdjKM_v9HYiOhcpQN6tqLSrLMHuIlV2f_TZwu8EBTdHS-NehTJUeH94"
  }'
```

### Option 3: Using Postman

1. **Method:** POST
2. **URL:** `http://localhost:5000/user/verifyIAPSubscription`
3. **Headers:**
   - `Authorization: Bearer YOUR_JWT_TOKEN`
   - `Content-Type: application/json`
4. **Body (JSON):**
   ```json
   {
     "plan_id": "plan-1af67e74ed",
     "platform": "android",
     "product_id": "com.bluesky.pro.supplier_monthly",
     "purchase_token": "ojcmncmpppmafaphbepmoaib.AO-J1OxwuqRwMtMrFgKaGXI0vjMjMsxTxsybAR1wNgX2Awh8d9tFtFr_0iiC1OolJdjKM_v9HYiOhcpQN6tqLSrLMHuIlV2f_TZwu8EBTdHS-NehTJUeH94"
   }
   ```

---

## 📋 PRE-TEST CHECKLIST

Before testing, verify:

- [ ] **API Server Running**
  ```bash
  # Check if server is running
  curl http://localhost:5000/
  ```

- [ ] **JWT Token Valid**
  - Get token from login endpoint
  - Token should be for a valid user
  - Token should not be expired

- [ ] **Plan Exists in Database**
  ```javascript
  // In MongoDB
  db.plans.findOne({ plan_id: "plan-1af67e74ed" })
  ```
  - Plan should exist
  - Plan status should be "active"
  - Plan type should match product_id

- [ ] **User Doesn't Have Active Subscription**
  - User from JWT token should not have active subscription of same type
  - If exists, cancel it first or use different user

- [ ] **Purchase Token Valid**
  - Token should be from Google Play (sandbox or production)
  - Token should not be expired
  - Token should match the product_id

- [ ] **Service Account Has Play Console Access**
  - Service account email: `bso-iap-verification@blue-sky-organisation.iam.gserviceaccount.com`
  - Should have access in Google Play Console
  - Should have "View financial data" permission

---

## ✅ EXPECTED SUCCESS RESPONSE

```json
{
  "message": "Subscription activated successfully",
  "bypass_mode": false,
  "data": {
    "subscription": {
      "subscription_id": "sub-xxxxx",
      "type": "supplier",
      "plan_name": "Supplier Monthly Plan",
      "interval": "monthly",
      "status": "active",
      "start_at": "2025-01-XX...",
      "end_at": "2025-02-XX...",
      "payment_method": "google_iap"
    },
    "payment": {
      "payment_id": "pay-xxxxx",
      "transaction_id": "GPA.xxxx-xxxx-xxxx",
      "amount": 29.99,
      "currency": "USD",
      "verified": true
    },
    "recruiter_subscription": {
      "subscription_id": "sub-yyyyy",
      "type": "recruiter"
    }
  },
  "code": 200
}
```

---

## 🚨 COMMON ERRORS & SOLUTIONS

### Error: "Plan not found"
**Solution:** Verify plan exists in database with plan_id: "plan-1af67e74ed"

### Error: "Already have an active subscription"
**Solution:** Cancel existing subscription or use different user

### Error: "Invalid Google Play receipt"
**Possible Causes:**
- Purchase token expired
- Service account not granted access in Play Console
- Google Play Developer API not enabled
- Package name mismatch

**Solution:**
1. Check service account has access in Play Console
2. Enable Google Play Developer API in Google Cloud
3. Verify package name matches: `com.bluesky.pro`

### Error: "Google service account credentials not configured"
**Solution:** Verify `.env` has `GOOGLE_SERVICE_ACCOUNT_KEY=./config/google-service-account.json`

### Error: "User not found"
**Solution:** JWT token user doesn't exist in database

### Error: "Unauthorized"
**Solution:** JWT token is invalid or expired

---

## 📊 TEST FLOW

```
1. User makes purchase in Google Play Store
   ↓
2. Google Play returns purchase_token
   ↓
3. Mobile app sends to backend:
   POST /user/verifyIAPSubscription
   ↓
4. Backend verifies with Google Play API
   ↓
5. Backend creates subscription record
   ↓
6. Backend records payment transaction
   ↓
7. Backend auto-creates recruiter subscription (if supplier/logistics)
   ↓
8. Backend notifies admin
   ↓
9. Returns success response
```

---

## 🔍 VERIFICATION STEPS

After successful test, verify:

1. **Subscription Created**
   ```javascript
   db.subscriptions.findOne({ 
     user_id: ObjectId("..."),
     type: "supplier",
     status: "active"
   })
   ```

2. **Payment Recorded**
   ```javascript
   db.payments.findOne({ 
     subscription_id: ObjectId("...")
   })
   ```

3. **Recruiter Subscription** (if supplier/logistics)
   ```javascript
   db.subscriptions.findOne({ 
     user_id: ObjectId("..."),
     type: "recruiter",
     status: "active"
   })
   ```

---

## 📝 NOTES

- **Bypass Mode:** Currently `false` - Real verification enabled
- **Package Name:** `com.bluesky.pro` (from product_id)
- **Service Account:** `bso-iap-verification@blue-sky-organisation.iam.gserviceaccount.com`
- **Project:** `blue-sky-organisation`

---

## ✅ READY TO TEST!

Everything is configured and ready. Just need:
1. Valid JWT token
2. API server running
3. Plan exists in database

Run the test script to verify IAP subscription!

---

**Last Updated:** January 2025
