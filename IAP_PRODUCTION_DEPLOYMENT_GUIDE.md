# 🚀 IAP Production Deployment Guide

**Date:** January 2025  
**Purpose:** Complete step-by-step guide for deploying IAP (In-App Purchase) to production

---

## 📋 Overview

This guide covers the complete setup for **Google Play IAP** and **Apple App Store IAP** in production.

---

## ✅ Prerequisites

- ✅ Production mobile app published (or in internal testing)
- ✅ IAP products configured in Google Play Console / App Store Connect
- ✅ Google Cloud Service Account created
- ✅ Apple Shared Secret generated
- ✅ Access to production server

---

## 🔐 Part 1: Google Play IAP Setup

### Step 1: Create Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **blue-sky-organisation**
3. Navigate to **IAM & Admin** > **Service Accounts**
4. Click **Create Service Account**
5. Fill in:
   - **Name:** `bso-iap-verification`
   - **Description:** Service account for IAP verification
6. Click **Create and Continue**
7. Skip role assignment (click **Continue**)
8. Click **Done**

### Step 2: Create and Download Service Account Key

1. Click on the service account: `bso-iap-verification@blue-sky-organisation.iam.gserviceaccount.com`
2. Go to **Keys** tab
3. Click **Add Key** > **Create new key**
4. Select **JSON** format
5. Click **Create**
6. **Download the JSON file** - Save it securely (you'll need this)

### Step 3: Grant Google Play Console Access

1. Go to [Google Play Console](https://play.google.com/console/)
2. Select your app: **com.bluesky.pro**
3. Navigate to **Setup** > **API access**
4. Find your service account: `bso-iap-verification@blue-sky-organisation.iam.gserviceaccount.com`
5. Click **Grant access**
6. Grant these permissions:
   - ✅ **View financial data** (required for IAP verification)
   - ✅ **View app information** (required for package verification)
7. Click **Invite user**

### Step 4: Enable Google Play Android Developer API

1. Go to [Google Cloud Console APIs](https://console.cloud.google.com/apis/library)
2. Search for **Google Play Android Developer API**
3. Click on it
4. Click **Enable**
5. Wait for activation (usually instant)

### Step 5: Configure IAP Products in Play Console

1. Go to [Google Play Console](https://play.google.com/console/)
2. Select app: **com.bluesky.pro**
3. Navigate to **Monetize** > **Products** > **Subscriptions**
4. Create/verify subscription products:
   - Product ID: `com.bluesky.pro.supplier_monthly`
   - Product ID: `com.bluesky.pro.buyer_monthly`
   - (Add other products as needed)
5. Set pricing and availability
6. **Activate** the products

---

## 🍎 Part 2: Apple App Store IAP Setup

### Step 1: Generate App-Specific Shared Secret

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Select your app
3. Go to **App Information** > **App Store**
4. Scroll to **In-App Purchases**
5. Click **Manage** > **App-Specific Shared Secret**
6. Click **Generate** (if not already generated)
7. **Copy the shared secret** - Save it securely

### Step 2: Configure IAP Products in App Store Connect

1. In App Store Connect, go to **My Apps** > Your App
2. Navigate to **Features** > **In-App Purchases**
3. Create/verify subscription products:
   - Product ID: `com.bluesky.pro.supplier.monthly`
   - Product ID: `com.bluesky.pro.buyer.monthly`
   - (Add other products as needed)
4. Set pricing, duration, and availability
5. **Submit for Review** (if not already approved)

---

## 🖥️ Part 3: Server Configuration

### Step 1: Create `.env` File on Production Server

SSH into your production server:

```bash
ssh user@your-production-server.com
cd /path/to/bso_apis
```

Create `.env` file:

```bash
nano .env
```

### Step 2: Add Environment Variables

Copy and paste the following, then fill in your actual values:

```bash
# ============================================
# Server Configuration
# ============================================
NODE_ENV=production
SERVER_URL=https://your-api-domain.com
PORT=7012

# ============================================
# Database Configuration
# ============================================
MONGODB_URI=mongodb://username:password@host:port/database
DB_URL=mongodb://username:password@host:port/database

# ============================================
# JWT Authentication
# ============================================
JWT_SECRET=your-very-strong-random-secret-key-minimum-32-characters
JWT_EXPIRATION_DAY=30

# ============================================
# Google Play IAP Configuration
# ============================================
GOOGLE_PACKAGE_NAME=com.bluesky.pro

# Option 1: Store as JSON string in .env (RECOMMENDED)
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"blue-sky-organisation","private_key_id":"YOUR_PRIVATE_KEY_ID","private_key":"-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n","client_email":"bso-iap-verification@blue-sky-organisation.iam.gserviceaccount.com","client_id":"YOUR_CLIENT_ID","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/bso-iap-verification%40blue-sky-organisation.iam.gserviceaccount.com","universe_domain":"googleapis.com"}'

# Option 2: Use file path (Alternative)
# GOOGLE_SERVICE_ACCOUNT_KEY=./config/google-service-account.json

# ============================================
# Apple IAP Configuration
# ============================================
APPLE_SHARED_SECRET=your-apple-shared-secret-from-app-store-connect
```

**Important Notes:**
- Replace `YOUR_PRIVATE_KEY_ID`, `YOUR_PRIVATE_KEY_HERE`, `YOUR_CLIENT_ID` with values from your downloaded JSON file
- Replace `your-apple-shared-secret-from-app-store-connect` with your actual Apple shared secret
- Keep the JSON string on a single line (or use proper escaping)

### Step 3: Secure the `.env` File

```bash
# Set permissions (readable only by owner)
chmod 600 .env

# Verify permissions
ls -la .env
# Should show: -rw------- (600)
```

### Step 4: Alternative - File-Based Google Service Account (Optional)

If you prefer file-based approach instead of JSON string:

```bash
# Create config directory
mkdir -p config

# Upload the JSON file to server
# From your local machine:
scp /path/to/downloaded-service-account.json user@server:/path/to/bso_apis/config/google-service-account.json

# On server, set permissions
chmod 600 config/google-service-account.json

# In .env, use:
GOOGLE_SERVICE_ACCOUNT_KEY=./config/google-service-account.json
```

---

## ✅ Part 4: Verification

### Step 1: Verify Environment Variables

```bash
# On production server
cd /path/to/bso_apis

# Load and test environment variables
node -e "
require('dotenv').config();
console.log('✅ NODE_ENV:', process.env.NODE_ENV);
console.log('✅ GOOGLE_PACKAGE_NAME:', process.env.GOOGLE_PACKAGE_NAME || 'MISSING');
console.log('✅ GOOGLE_SERVICE_ACCOUNT_JSON:', process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? 'Set' : 'MISSING');
console.log('✅ GOOGLE_SERVICE_ACCOUNT_KEY:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'Not set');
console.log('✅ APPLE_SHARED_SECRET:', process.env.APPLE_SHARED_SECRET ? 'Set' : 'MISSING');
"
```

**Expected Output:**
```
✅ NODE_ENV: production
✅ GOOGLE_PACKAGE_NAME: com.bluesky.pro
✅ GOOGLE_SERVICE_ACCOUNT_JSON: Set
✅ GOOGLE_SERVICE_ACCOUNT_KEY: Not set
✅ APPLE_SHARED_SECRET: Set
```

### Step 2: Test Google Service Account

```bash
# On production server
cd /path/to/bso_apis
node verify_service_account.js
```

**Expected Output:**
```
✅ Service account file is valid
✅ Google Auth initialized successfully
✅ Ready for IAP verification
```

### Step 3: Test IAP Verification (Optional)

```bash
# Test with a real purchase token (from your test device)
node test_iap_with_payload.js
```

---

## 🚀 Part 5: Start Application

### Using PM2 (Recommended)

```bash
# Install PM2 globally (if not installed)
npm install -g pm2

# Start application
cd /path/to/bso_apis
pm2 start server.js --name bso-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Using npm

```bash
cd /path/to/bso_apis
npm start
```

### Using node directly

```bash
cd /path/to/bso_apis
node server.js
```

---

## 📋 Production Checklist

Before going live, verify:

### Google Play IAP
- [ ] ✅ Service account created in Google Cloud Console
- [ ] ✅ Service account key downloaded
- [ ] ✅ Service account granted access in Google Play Console
- [ ] ✅ Google Play Android Developer API enabled
- [ ] ✅ IAP products created and activated in Play Console
- [ ] ✅ `GOOGLE_PACKAGE_NAME` set in `.env`
- [ ] ✅ `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_SERVICE_ACCOUNT_KEY` set in `.env`
- [ ] ✅ Service account verification test passed

### Apple IAP
- [ ] ✅ App-Specific Shared Secret generated in App Store Connect
- [ ] ✅ IAP products created and approved in App Store Connect
- [ ] ✅ `APPLE_SHARED_SECRET` set in `.env`
- [ ] ✅ Apple IAP verification test passed

### Server Configuration
- [ ] ✅ `.env` file created with all required variables
- [ ] ✅ `.env` file permissions set to 600
- [ ] ✅ Application starts without errors
- [ ] ✅ API endpoints responding
- [ ] ✅ IAP verification endpoints tested

### Security
- [ ] ✅ No credentials in git repository
- [ ] ✅ `.env` file not in git (in `.gitignore`)
- [ ] ✅ Service account has minimal required permissions
- [ ] ✅ File permissions correctly set (600)

---

## 🧪 Testing IAP in Production

### Test Google Play IAP

1. **Purchase a subscription** on a test device
2. **Get the purchase token** from the app
3. **Call the API:**
   ```bash
   curl -X POST https://your-api-domain.com/user/verifyIAPSubscription \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{
       "platform": "android",
       "product_id": "com.bluesky.pro.supplier_monthly",
       "purchase_token": "YOUR_PURCHASE_TOKEN",
       "plan_id": "your-plan-id"
     }'
   ```

### Test Apple IAP

1. **Purchase a subscription** on a test device
2. **Get the receipt data** from the app
3. **Call the API:**
   ```bash
   curl -X POST https://your-api-domain.com/user/verifyIAPSubscription \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{
       "platform": "ios",
       "product_id": "com.bluesky.pro.supplier.monthly",
       "receipt_data": "YOUR_RECEIPT_DATA",
       "plan_id": "your-plan-id"
     }'
   ```

---

## 🔍 Troubleshooting

### Error: "No application was found for the given package name"

**Solution:**
1. Verify `GOOGLE_PACKAGE_NAME` matches your app's package name in Play Console
2. Ensure service account has access in Play Console
3. Check that app is published (at least in internal testing)

### Error: "Google service account credentials not configured"

**Solution:**
1. Verify `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_SERVICE_ACCOUNT_KEY` is set in `.env`
2. Check JSON format is correct (if using JSON string)
3. Verify file path is correct (if using file-based)

### Error: "Apple verification failed"

**Solution:**
1. Verify `APPLE_SHARED_SECRET` is correct
2. Check receipt data format
3. Ensure product ID matches App Store Connect

### Error: "Plan not found"

**Solution:**
1. Verify `plan_id` exists in database
2. Check plan is active
3. Ensure plan ID matches your database

---

## 📝 Environment Variables Reference

### Required for Google Play IAP

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_PACKAGE_NAME` | Android app package name | `com.bluesky.pro` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service account JSON string | `{"type":"service_account",...}` |
| OR `GOOGLE_SERVICE_ACCOUNT_KEY` | Path to service account file | `./config/google-service-account.json` |

### Required for Apple IAP

| Variable | Description | Example |
|----------|-------------|---------|
| `APPLE_SHARED_SECRET` | App-specific shared secret | `abc123def456...` |

---

## 🔐 Security Best Practices

1. ✅ **Never commit** `.env` file to git
2. ✅ **Never commit** `config/google-service-account.json` to git
3. ✅ **Set file permissions** to 600 (readable only by owner)
4. ✅ **Rotate credentials** if accidentally exposed
5. ✅ **Use environment variables** for all secrets
6. ✅ **Restrict service account permissions** (principle of least privilege)
7. ✅ **Monitor API access logs** for suspicious activity
8. ✅ **Use HTTPS** for all API communications

---

## 📞 Support

For issues or questions:
- Check `PRODUCTION_DEPLOYMENT_GUIDE.md` for general deployment
- Check `ENV_BASED_SECRETS.md` for environment variable setup
- Check `GOOGLE_PLAY_IAP_SETUP.md` for Google Play specific setup

---

## ✅ Summary

**Files to Create on Server:**
1. `.env` - Contains all environment variables including IAP credentials
2. `config/google-service-account.json` - (Optional, if using file-based approach)

**Code Already Configured:**
- ✅ Reads from `process.env.GOOGLE_SERVICE_ACCOUNT_JSON`
- ✅ Reads from `process.env.GOOGLE_SERVICE_ACCOUNT_KEY`
- ✅ Reads from `process.env.APPLE_SHARED_SECRET`
- ✅ Reads from `process.env.GOOGLE_PACKAGE_NAME`

**No Code Changes Needed** - Just configure `.env` file!

---

**Last Updated:** January 2025  
**Status:** Production Ready ✅
