# 🔒 Security Setup Guide

## ⚠️ IMPORTANT: Sensitive Files

The following files contain sensitive credentials and **MUST NOT** be committed to git:

- `config/google-service-account.json` - Google Cloud Service Account credentials
- `.env` - Environment variables with API keys and secrets

---

## 🔐 Google Service Account Setup

### Step 1: Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin** > **Service Accounts**
3. Click **Create Service Account**
4. Name it: `bso-iap-verification`
5. Grant roles:
   - **Viewer** (for app information)
   - **Service Account User** (for API access)

### Step 2: Create and Download Key

1. Click on the service account
2. Go to **Keys** tab
3. Click **Add Key** > **Create new key**
4. Select **JSON** format
5. Download the key file

### Step 3: Configure in Project

1. Copy the downloaded JSON file to:
   ```
   config/google-service-account.json
   ```

2. **OR** set environment variable:
   ```bash
   export GOOGLE_SERVICE_ACCOUNT_KEY=./config/google-service-account.json
   ```

### Step 4: Grant Play Console Access

1. Go to [Google Play Console](https://play.google.com/console/)
2. Navigate to **Setup** > **API access**
3. Find your service account email (e.g., `bso-iap-verification@your-project.iam.gserviceaccount.com`)
4. Click **Grant access**
5. Grant permissions:
   - ✅ **View financial data**
   - ✅ **View app information**

### Step 5: Enable API

1. Go to [Google Cloud Console APIs](https://console.cloud.google.com/apis/library)
2. Search for **Google Play Android Developer API**
3. Click **Enable**

---

## 📋 Environment Variables

Create `.env` file (copy from `.env.example` if available):

```bash
# Google Play IAP Configuration
GOOGLE_PACKAGE_NAME=com.bluesky.pro
GOOGLE_SERVICE_ACCOUNT_KEY=./config/google-service-account.json

# Apple IAP Configuration
APPLE_SHARED_SECRET=your-apple-shared-secret

# Database
MONGODB_URI=your-mongodb-connection-string
DB_URL=your-mongodb-connection-string

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION_DAY=30

# Server
SERVER_URL=http://localhost:7012
NODE_ENV=production
```

---

## ✅ Verification

After setup, verify the configuration:

```bash
# Verify service account file exists
ls -la config/google-service-account.json

# Test IAP verification (if configured)
node verify_service_account.js
```

---

## 🚨 Security Best Practices

1. ✅ **Never commit** `config/google-service-account.json` to git
2. ✅ **Never commit** `.env` file to git
3. ✅ Use `.gitignore` to exclude sensitive files
4. ✅ Rotate credentials if accidentally committed
5. ✅ Use environment variables for production
6. ✅ Restrict service account permissions (principle of least privilege)
7. ✅ Regularly audit service account access

---

## 📝 Template File

A template file is provided at:
- `config/google-service-account.json.example`

Copy this file and fill in your actual credentials:
```bash
cp config/google-service-account.json.example config/google-service-account.json
# Then edit with your actual credentials
```

---

## 🔄 If Credentials Were Committed

If you accidentally committed sensitive files:

1. **Remove from git tracking:**
   ```bash
   git rm --cached config/google-service-account.json
   git rm --cached .env
   ```

2. **Add to .gitignore:**
   ```bash
   echo "config/google-service-account.json" >> .gitignore
   echo ".env" >> .gitignore
   ```

3. **Amend commit:**
   ```bash
   git add .gitignore
   git commit --amend --no-edit
   ```

4. **Force push (if already pushed):**
   ```bash
   git push --force-with-lease
   ```

5. **Rotate credentials** in Google Cloud Console (create new service account)

---

**Last Updated:** January 2025
