# 🔐 Environment Variable Based Secrets Management

**Date:** January 2025  
**Approach:** Store ALL secrets in `.env` file - No hardcoded credentials in code

---

## ✅ Current Implementation

The code is **already production-ready** and reads all secrets from environment variables:

### Code Already Uses Environment Variables:

1. **Apple IAP:**
   ```javascript
   // src/utils/iapVerification.js
   'password': process.env.APPLE_SHARED_SECRET
   ```

2. **Google IAP:**
   ```javascript
   // src/utils/iapVerification.js
   if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
       // File-based approach
   } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
       // JSON string approach (RECOMMENDED)
       const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
   }
   ```

3. **Google Package Name:**
   ```javascript
   // src/controllers/user/iap.js
   const packageName = process.env.GOOGLE_PACKAGE_NAME || 'com.bso.app';
   ```

---

## 📋 How to Store Secrets in `.env`

### Step 1: Create `.env` File

```bash
# On production server
cd /path/to/bso_apis
cp env.example .env
nano .env
```

### Step 2: Add Your Production Credentials

```bash
# ============================================
# Server Configuration
# ============================================
NODE_ENV=production
SERVER_URL=https://your-api-domain.com
PORT=7012

# ============================================
# Database
# ============================================
MONGODB_URI=mongodb://username:password@host:port/database
DB_URL=mongodb://username:password@host:port/database

# ============================================
# JWT
# ============================================
JWT_SECRET=your-very-strong-random-secret-key
JWT_EXPIRATION_DAY=30

# ============================================
# Google Play IAP
# ============================================
GOOGLE_PACKAGE_NAME=com.bluesky.pro

# Store Google Service Account as JSON string (RECOMMENDED)
# Replace with your actual service account JSON from Google Cloud Console
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project-id","private_key_id":"your-private-key-id","private_key":"-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n","client_email":"your-service-account@your-project.iam.gserviceaccount.com","client_id":"your-client-id","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/...","universe_domain":"googleapis.com"}'

# ============================================
# Apple IAP
# ============================================
APPLE_SHARED_SECRET=your-apple-shared-secret-key
```

### Step 3: Secure the File

```bash
# Set permissions (readable only by owner)
chmod 600 .env

# Verify permissions
ls -la .env
# Should show: -rw------- (600)
```

---

## ✅ Benefits of This Approach

1. **✅ All secrets in one place** - Easy to manage
2. **✅ No hardcoded credentials** - Code reads from environment
3. **✅ Not in git** - `.env` is in `.gitignore`
4. **✅ Easy to deploy** - Just create `.env` on server
5. **✅ Production ready** - Code already supports this

---

## 🔍 How Code Accesses Secrets

### Example: Google Service Account

```javascript
// src/utils/iapVerification.js

// Code checks environment variables in this order:
if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    // Option 1: File path
    auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
} else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    // Option 2: JSON string (from .env) - RECOMMENDED
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
} else {
    throw new Error('Google service account credentials not configured');
}
```

**✅ Your code is already production-ready!** Just add secrets to `.env` file.

---

## 📝 Summary

| Secret | Environment Variable | Location in Code |
|--------|---------------------|------------------|
| Apple IAP Secret | `APPLE_SHARED_SECRET` | `src/utils/iapVerification.js:21` |
| Google Service Account | `GOOGLE_SERVICE_ACCOUNT_JSON` | `src/utils/iapVerification.js:67` |
| Google Package Name | `GOOGLE_PACKAGE_NAME` | `src/controllers/user/iap.js:278` |
| Database URI | `MONGODB_URI` | Various files |
| JWT Secret | `JWT_SECRET` | Various files |

**✅ All secrets read from `process.env.*` - No code changes needed!**

---

## 🚀 Deployment

1. **Create `.env` file on server**
2. **Add all your production credentials**
3. **Set permissions:** `chmod 600 .env`
4. **Start application** - Code automatically reads from `.env`

**That's it! No code changes required.**

---

**Last Updated:** January 2025
