# 🔧 Google Play IAP Setup Guide

## ⚠️ Important: License Key vs Service Account

The key you provided (`MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...`) appears to be a **Google Play License Key** (public key), which is used for app licensing verification.

**However, for IAP (In-App Purchase) verification, you need a different type of credential:**

### What You Need for IAP Verification:

1. **Google Cloud Service Account JSON File** - This is different from a license key
2. **Service Account with Google Play Developer API access**

---

## 📋 Step-by-Step Setup

### Step 1: Get Service Account from Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Navigate to **IAM & Admin** > **Service Accounts**
4. Click **Create Service Account**
5. Fill in details:
   - Name: `bso-iap-verification`
   - Description: `Service account for BSO IAP verification`
6. Click **Create and Continue**
7. Grant role: **Service Account User**
8. Click **Continue** then **Done**

### Step 2: Create Service Account Key

1. Click on the service account you just created
2. Go to **Keys** tab
3. Click **Add Key** > **Create new key**
4. Select **JSON** format
5. Click **Create** - This downloads a JSON file

### Step 3: Enable Google Play Developer API

1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Play Android Developer API"
3. Click on it and click **Enable**

### Step 4: Grant Service Account Access in Google Play Console

1. Go to [Google Play Console](https://play.google.com/console/)
2. Select your app
3. Go to **Setup** > **API access**
4. Find your service account email (from the JSON file)
5. Click **Grant access**
6. Grant permissions:
   - ✅ **View financial data**
   - ✅ **View app information and download bulk reports**

---

## 📁 Service Account JSON Structure

The service account JSON file should look like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id-123456",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "bso-iap-verification@your-project.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/bso-iap-verification%40your-project.iam.gserviceaccount.com"
}
```

---

## 🔐 Environment Variables Setup

### Option 1: Use JSON File (Recommended)

1. Save the downloaded JSON file as: `bso_apis/config/google-service-account.json`
2. Add to `.env`:
```env
GOOGLE_SERVICE_ACCOUNT_KEY=./config/google-service-account.json
GOOGLE_PACKAGE_NAME=com.bluesky.pro
```

### Option 2: Use JSON String in .env

1. Copy the entire JSON content
2. Add to `.env` (as a single line, escaped):
```env
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"..."}'
GOOGLE_PACKAGE_NAME=com.bluesky.pro
```

---

## ✅ Verification Checklist

- [ ] Service account JSON file downloaded from Google Cloud Console
- [ ] Google Play Android Developer API enabled
- [ ] Service account has access in Google Play Console
- [ ] `GOOGLE_SERVICE_ACCOUNT_KEY` or `GOOGLE_SERVICE_ACCOUNT_JSON` set in .env
- [ ] `GOOGLE_PACKAGE_NAME=com.bluesky.pro` set in .env
- [ ] JSON file placed in `config/google-service-account.json` (if using file method)

---

## 🧪 Testing

After setup, test with:
```bash
node test_iap_verification.js
```

---

## 🚨 Common Issues

### Error: "Google service account credentials not configured"
- **Solution**: Make sure `GOOGLE_SERVICE_ACCOUNT_KEY` or `GOOGLE_SERVICE_ACCOUNT_JSON` is set in .env

### Error: "Invalid Google Play receipt"
- **Possible causes**:
  - Service account doesn't have access in Google Play Console
  - Google Play Developer API not enabled
  - Package name mismatch
  - Purchase token expired or invalid

### Error: "Permission denied"
- **Solution**: Grant service account access in Google Play Console with proper permissions

---

## 📝 Note About License Key

The license key you provided is for **Android License Verification Library (LVL)**, which is different from IAP verification. For IAP, you need the service account JSON as described above.

---

**Last Updated:** January 2025
