# 🔐 IAP Environment Configuration Guide

## ⚠️ Important Note

The key you provided (`MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...`) is a **Google Play License Key** (RSA public key), which is used for app licensing.

**For IAP (In-App Purchase) verification, you need a different credential:**
- **Google Cloud Service Account JSON** (not a license key)

---

## 📋 What to Add to .env File

Add these lines to your `.env` file:

```env
# Google Play IAP Configuration
GOOGLE_PACKAGE_NAME=com.bluesky.pro
GOOGLE_SERVICE_ACCOUNT_KEY=./config/google-service-account.json

# OR use JSON string (alternative - if you prefer to store in .env)
# GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"..."}'
```

---

## 🔧 How to Get Service Account JSON

### Step 1: Google Cloud Console

1. Go to https://console.cloud.google.com/
2. Select your project (or create one)
3. Navigate to **IAM & Admin** > **Service Accounts**
4. Click **Create Service Account**
5. Name it: `bso-iap-verification`
6. Click **Create and Continue**
7. Grant role: **Service Account User**
8. Click **Done**

### Step 2: Create Key

1. Click on the service account
2. Go to **Keys** tab
3. Click **Add Key** > **Create new key**
4. Select **JSON**
5. Download the file

### Step 3: Enable API

1. Go to **APIs & Services** > **Library**
2. Search "Google Play Android Developer API"
3. Click **Enable**

### Step 4: Grant Play Console Access

1. Go to https://play.google.com/console/
2. Select your app
3. Go to **Setup** > **API access**
4. Find your service account email
5. Click **Grant access**
6. Enable:
   - ✅ View financial data
   - ✅ View app information

---

## 📁 Service Account JSON Structure

The JSON file should look like:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "bso-iap@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

---

## ✅ Quick Setup Checklist

- [ ] Service account JSON downloaded from Google Cloud Console
- [ ] File saved as: `bso_apis/config/google-service-account.json`
- [ ] Google Play Developer API enabled
- [ ] Service account granted access in Play Console
- [ ] `.env` file updated with:
  - `GOOGLE_PACKAGE_NAME=com.bluesky.pro`
  - `GOOGLE_SERVICE_ACCOUNT_KEY=./config/google-service-account.json`

---

## 🧪 Test Configuration

After setup, test with:
```bash
node test_iap_verification.js
```

Make sure to set `TEST_JWT_TOKEN` in `.env` or as environment variable.

---

**Note:** The license key you have is for app licensing, not IAP. You need the service account JSON for IAP verification.
