# 🚀 Production Deployment Guide

**Date:** January 2025  
**Purpose:** Step-by-step guide for deploying to production server

---

## 📋 Overview

This guide explains what files need to be created on the production server and how to set them up securely.

---

## ✅ Files That Come from Git (Automatic)

These files are automatically deployed when you pull from git:

- ✅ All source code (`src/`)
- ✅ `package.json` and dependencies
- ✅ Configuration files (routes, controllers, models)
- ✅ Template files (`.example` files)
- ✅ Documentation files

**You don't need to create these manually** - they come from git.

---

## 🔐 Files You MUST Create on Server (Manual)

**✅ RECOMMENDED APPROACH:** Store ALL secrets in `.env` file using environment variables.

The code is already configured to read from environment variables:
- ✅ `process.env.APPLE_SHARED_SECRET` - Apple IAP secret
- ✅ `process.env.GOOGLE_SERVICE_ACCOUNT_KEY` - Google service account file path (optional)
- ✅ `process.env.GOOGLE_SERVICE_ACCOUNT_JSON` - Google service account JSON string (recommended)
- ✅ `process.env.GOOGLE_PACKAGE_NAME` - Google Play package name
- ✅ All other secrets read from `.env`

### 1. `.env` File (Environment Variables) - **PRIMARY METHOD**

**Location:** Root directory (`/path/to/bso_apis/.env`)

**Required Variables:**

```bash
# Server Configuration
NODE_ENV=production
SERVER_URL=https://your-api-domain.com
PORT=7012

# Database
MONGODB_URI=mongodb://username:password@host:port/database
DB_URL=mongodb://username:password@host:port/database

# JWT Authentication
JWT_SECRET=your-very-strong-random-secret-key-here
JWT_EXPIRATION_DAY=30

# Google Play IAP Configuration
GOOGLE_PACKAGE_NAME=com.bluesky.pro

# Option 1: Google Service Account as JSON string (RECOMMENDED - All in .env)
# Replace with your actual service account JSON from Google Cloud Console
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project-id","private_key_id":"your-private-key-id","private_key":"-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n","client_email":"your-service-account@your-project.iam.gserviceaccount.com","client_id":"your-client-id","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/...","universe_domain":"googleapis.com"}'

# Option 2: Google Service Account as file path (Alternative)
# GOOGLE_SERVICE_ACCOUNT_KEY=./config/google-service-account.json

# Apple IAP Configuration
APPLE_SHARED_SECRET=your-apple-shared-secret-key

# AWS Configuration (if used)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your-bucket-name

# Email Configuration (if used)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password

# Other API Keys (if used)
STRIPE_SECRET_KEY=sk_live_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
```

**How to Create:**

```bash
# On production server
cd /path/to/bso_apis
nano .env
# Paste all environment variables
# Save and exit (Ctrl+X, Y, Enter)
```

---

### 2. Google Service Account Credentials (OPTIONAL - Use .env Instead)

**⚠️ RECOMMENDED APPROACH:** Store credentials in `.env` file (see Option 2 below)

**Option 1: File-Based (If you prefer file)**

**Location:** `config/google-service-account.json`

**Required for:** Google Play IAP verification

**How to Create:**

1. Download the JSON file from Google Cloud Console
2. Upload to server:
   ```bash
   # On your local machine
   scp config/google-service-account.json user@server:/path/to/bso_apis/config/
   ```
3. Set in `.env`:
   ```bash
   GOOGLE_SERVICE_ACCOUNT_KEY=./config/google-service-account.json
   ```

**Option 2: Environment Variable (RECOMMENDED - More Secure)**

**Store directly in `.env` file as JSON string:**

In your `.env` file, add:
```bash
# Replace with your actual service account JSON from Google Cloud Console
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project-id","private_key_id":"your-private-key-id","private_key":"-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n","client_email":"your-service-account@your-project.iam.gserviceaccount.com","client_id":"your-client-id","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/...","universe_domain":"googleapis.com"}'
```

**✅ Benefits of Option 2:**
- All secrets in one place (`.env`)
- No separate file to manage
- Easier to deploy
- Code already supports this (reads from `process.env.GOOGLE_SERVICE_ACCOUNT_JSON`)

---

## 🔒 Security Best Practices

### 1. File Permissions

Set proper permissions on sensitive files:

```bash
# On production server
cd /path/to/bso_apis

# Restrict .env file (readable only by owner)
chmod 600 .env

# Restrict google-service-account.json
chmod 600 config/google-service-account.json

# Verify permissions
ls -la .env
ls -la config/google-service-account.json
```

**Expected Output:**
```
-rw------- 1 user user 1234 .env
-rw------- 1 user user 2345 config/google-service-account.json
```

### 2. File Ownership

Ensure files are owned by the application user:

```bash
# Change ownership (if needed)
sudo chown app-user:app-user .env
sudo chown app-user:app-user config/google-service-account.json
```

### 3. Never Commit These Files

✅ Already done - these files are in `.gitignore`:
- `.env`
- `config/google-service-account.json`

---

## 📦 Complete Deployment Steps

### Step 1: Clone/Pull Repository

```bash
# SSH into production server
ssh user@your-server.com

# Navigate to application directory
cd /var/www/bso_apis  # or your deployment path

# Pull latest code
git pull origin main

# Install/update dependencies
npm install --production
```

### Step 2: Create `.env` File

```bash
# Create .env file
nano .env

# Add all required environment variables (see above)
# Save and exit

# Set permissions
chmod 600 .env
```

### Step 3: Add Google Service Account to `.env` (RECOMMENDED)

**Option A: Store as JSON string in `.env` (Recommended)**

Add to your `.env` file:
```bash
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"blue-sky-organisation",...}'
```

**Option B: Use file-based approach**

```bash
# Create config directory (if doesn't exist)
mkdir -p config

# Create file
nano config/google-service-account.json

# Paste JSON content from Google Cloud Console
# Save and exit

# Set permissions
chmod 600 config/google-service-account.json

# Add to .env
GOOGLE_SERVICE_ACCOUNT_KEY=./config/google-service-account.json
```

**✅ Code automatically reads from environment variables - no code changes needed!**

### Step 4: Verify Configuration

```bash
# Test environment variables are loaded
node -e "require('dotenv').config(); console.log('DB:', process.env.MONGODB_URI ? 'Set' : 'Missing');"

# Test service account (if IAP is configured)
node verify_service_account.js
```

### Step 5: Start Application

```bash
# Using PM2 (recommended)
pm2 start server.js --name bso-api

# Or using npm
npm start

# Or using node directly
node server.js
```

---

## 🔄 Alternative: Environment Variables Only

Instead of creating files, you can use **environment variables only**:

### Option: Use `GOOGLE_SERVICE_ACCOUNT_JSON` (Environment Variable)

Instead of `config/google-service-account.json` file, you can set:

```bash
# In .env file
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

**Note:** The code supports both:
- `GOOGLE_SERVICE_ACCOUNT_KEY` (file path)
- `GOOGLE_SERVICE_ACCOUNT_JSON` (JSON string)

**Recommendation:** Use file-based approach for easier management.

---

## 📋 Deployment Checklist

Before going live, verify:

- [ ] ✅ `.env` file created with all required variables
- [ ] ✅ `config/google-service-account.json` created (if using IAP)
- [ ] ✅ File permissions set correctly (600)
- [ ] ✅ Database connection tested
- [ ] ✅ IAP verification tested (if applicable)
- [ ] ✅ Environment variables loaded correctly
- [ ] ✅ Application starts without errors
- [ ] ✅ API endpoints responding
- [ ] ✅ Logs are working
- [ ] ✅ SSL/TLS certificates configured
- [ ] ✅ Firewall rules configured
- [ ] ✅ Process manager (PM2) configured (if used)

---

## 🛠️ Server Setup (First Time)

### 1. Install Node.js

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Or using package manager
sudo apt-get update
sudo apt-get install nodejs npm
```

### 2. Install PM2 (Process Manager)

```bash
npm install -g pm2

# Start application
pm2 start server.js --name bso-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 3. Install MongoDB (if not using cloud)

```bash
# Follow MongoDB installation guide for your OS
# Or use MongoDB Atlas (cloud - recommended)
```

### 4. Setup Nginx (Reverse Proxy)

```nginx
# /etc/nginx/sites-available/bso-api
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:7012;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔍 Verification Commands

### Check Files Exist

```bash
# On production server
cd /path/to/bso_apis

# Check .env exists
test -f .env && echo "✅ .env exists" || echo "❌ .env missing"

# Check service account exists
test -f config/google-service-account.json && echo "✅ Service account exists" || echo "❌ Service account missing"

# Check permissions
ls -la .env config/google-service-account.json
```

### Test Environment Variables

```bash
# Load and test
node -e "
require('dotenv').config();
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Missing');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Missing');
console.log('GOOGLE_SERVICE_ACCOUNT_KEY:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'Not set');
"
```

### Test Application

```bash
# Start application
npm start

# Or with PM2
pm2 start server.js --name bso-api

# Check logs
pm2 logs bso-api

# Test API endpoint
curl http://localhost:7012/health
```

---

## 🚨 Troubleshooting

### Error: "Cannot find module"

**Solution:** Run `npm install` on server

### Error: "MongoDB connection failed"

**Solution:** 
- Check `MONGODB_URI` in `.env`
- Verify MongoDB is running
- Check firewall rules

### Error: "Google service account not found"

**Solution:**
- Verify `config/google-service-account.json` exists
- Check file permissions (should be 600)
- Verify path in `.env` is correct

### Error: "JWT_SECRET is not defined"

**Solution:**
- Add `JWT_SECRET` to `.env` file
- Restart application

---

## 📝 Summary

### Files Created from Git (Automatic):
- ✅ All source code
- ✅ `package.json`
- ✅ Configuration files

### Files Created on Server (Manual):
- 🔐 `.env` - Environment variables
- 🔐 `config/google-service-account.json` - Google credentials

### Security:
- ✅ Set file permissions to 600
- ✅ Never commit sensitive files
- ✅ Use strong secrets
- ✅ Rotate credentials regularly

---

**Last Updated:** January 2025
