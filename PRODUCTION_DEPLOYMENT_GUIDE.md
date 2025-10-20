# 🚀 BSO APIs - Production Deployment Guide

**Last Updated**: October 20, 2025  
**Server**: AWS EC2 (via CodeDeploy)  
**User**: `bsoservices`  
**Directory**: `/home/bsoservices/ci-cd`  
**Process Manager**: PM2

---

## 📋 Pre-Deployment Checklist

### 1. Environment Variables
- [ ] All `.env` variables are set on production server
- [ ] Database connection string is correct
- [ ] AWS keys are configured
- [ ] Stripe keys are production keys (not test)
- [ ] Email credentials are set
- [ ] Firebase credentials are uploaded

### 2. Code Verification
- [ ] All code is pushed to repository
- [ ] No `.env` files in git
- [ ] Dependencies are up to date
- [ ] No console.logs in production code

### 3. Database
- [ ] MongoDB is accessible
- [ ] Database user has correct permissions
- [ ] Backup is taken before deployment

---

## 🖥️ Server Requirements

### System Requirements
```bash
OS: Linux (Ubuntu/Amazon Linux)
Node.js: v20.x
MongoDB: 7.x
PM2: Latest
Memory: Minimum 2GB RAM
Storage: Minimum 20GB
```

### Required Tools
- Node.js v20
- npm
- PM2
- Git
- MongoDB client (optional)

---

## 🔑 SSH Access

### Connect to Server
```bash
# Replace with your server details
ssh -i "your-key.pem" bsoservices@your-server-ip

# Or if using password
ssh bsoservices@your-server-ip
```

---

## 📦 First Time Setup (One Time Only)

### 1. Install Node.js v20

```bash
# SSH into server
ssh bsoservices@your-server-ip

# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js v20
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node -v  # Should show v20.x.x
npm -v
```

### 2. Install PM2

```bash
# Install PM2 globally
npm install -g pm2

# Verify
pm2 -v

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions it gives you

# Save PM2 processes
pm2 save
```

### 3. Create Project Directory

```bash
# Create directory
sudo mkdir -p /home/bsoservices/ci-cd
sudo chown -R bsoservices:bsoservices /home/bsoservices/ci-cd

# Navigate to directory
cd /home/bsoservices/ci-cd
```

### 4. Setup Environment File

```bash
cd /home/bsoservices/ci-cd

# Create .env file
nano .env

# Paste your production environment variables
# (See .env template below)
# Save: Ctrl+O, Enter, Ctrl+X
```

#### `.env` Template for Production

```bash
# Server Configuration
PORT=5000
NODE_ENV=production
ENV=production

# JWT Configuration  
JWT_SECRET=your-super-secure-jwt-secret-min-64-chars-CHANGE-THIS
JWT_EXPIRATION_DAY=7
JWT_EXPIRATION_DAY_FOR_REMEMBER_ME=30

# Database
MONGODB_URI=mongodb://your-mongodb-host:27017/bso_production

# AWS S3
AWS_ACCESS_KEY_ID=your-production-aws-key
AWS_SECRET_ACCESS_KEY=your-production-aws-secret
AWS_S3_BUCKET=your-production-bucket
AWS_REGION=eu-west-2

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASS=your-email-app-password
EMAIL_FROM=noreply@yourdomain.com

# Stripe (PRODUCTION KEYS!)
STRIPE_SECRET_KEY=sk_live_your-production-stripe-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-production-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-production-webhook-secret

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Firebase
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com

# Google Maps
GOOGLE_MAPS_API_KEY=your-google-maps-key

# Twilio
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number
```

### 5. Upload Firebase Admin SDK Key

```bash
cd /home/bsoservices/ci-cd

# Create config directory if doesn't exist
mkdir -p src/config

# Upload your Firebase admin SDK JSON file
# You can use SCP or nano to create it

# Using SCP from your local machine:
# scp -i "your-key.pem" blue-sky-firebase-adminsdk.json bsoservices@your-server:/home/bsoservices/ci-cd/src/config/

# Or create with nano:
nano src/config/blue-sky-e98e0-firebase-adminsdk-fbsvc-82b430caf7.json
# Paste your Firebase JSON content
# Save: Ctrl+O, Enter, Ctrl+X
```

---

## 🚀 Deployment Process

### Method 1: Manual Deployment (First Time)

```bash
# 1. SSH into server
ssh bsoservices@your-server-ip

# 2. Navigate to project directory
cd /home/bsoservices/ci-cd

# 3. Clone or pull latest code
# If first time:
git clone https://github.com/bsouk/bso_apis.git .

# If updating:
git pull origin main

# 4. Install dependencies
npm install --production

# 5. Check .env file exists
ls -la .env

# 6. Start with PM2
pm2 start server.js --name "bso-api" --env production

# 7. Verify it's running
pm2 status
pm2 logs bso-api --lines 50

# 8. Save PM2 configuration
pm2 save
```

### Method 2: Using AWS CodeDeploy (Automated)

Your `appspec.yml` is already configured. When you push to GitHub/CodePipeline:

1. Code is deployed to `/home/bsoservices/ci-cd`
2. `scripts/install.sh` runs automatically (installs npm packages)
3. `scripts/start.sh` runs automatically (starts PM2)

**Trigger Deployment:**
```bash
# From your local machine
git push origin main

# CodeDeploy will handle the rest
```

---

## 🗄️ Database Setup & Migrations

### Important: No Traditional Migrations Needed! ✅

Your app uses **Mongoose** which automatically:
- Creates database if it doesn't exist
- Creates collections when models are first used
- Updates indexes automatically

### Verify Database Connection

```bash
# SSH into server
ssh bsoservices@your-server-ip

# Test MongoDB connection
mongo "mongodb://your-host:27017/bso_production" --eval "db.stats()"

# Or if using MongoDB 6+:
mongosh "mongodb://your-host:27017/bso_production" --eval "db.stats()"
```

### Initialize Database (First Time Only)

```bash
cd /home/bsoservices/ci-cd

# Start the application (it will auto-create collections)
pm2 start server.js --name "bso-api"

# Check logs to confirm database connection
pm2 logs bso-api --lines 100

# You should see:
# "MongoDB connected successfully"
```

### Create Initial Super Admin (First Time Only)

Your code has a function to create the first admin. Access it via API:

```bash
# Method 1: Using curl (from server)
curl -X POST http://localhost:5000/admin/create-admin

# Method 2: Using Postman/Browser
# Visit: http://your-domain.com/admin/create-admin
```

**Default Admin Credentials** (from your code):
```
Email: bso@mailinator.com
Password: Admin@123
```

⚠️ **IMPORTANT**: Change these immediately after first login!

### Seed Data (If Needed)

If you need to populate initial data:

```bash
cd /home/bsoservices/ci-cd

# Create a seed script
nano seed.js
```

```javascript
// seed.js - Example seed script
require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Brand = require('./src/models/brand');
const Category = require('./src/models/product_category');

async function seed() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Seed brands
    const brands = [
      { name: 'Nike', status: 'active' },
      { name: 'Adidas', status: 'active' },
    ];
    await Brand.insertMany(brands);
    console.log('Brands seeded');

    // Seed categories
    const categories = [
      { name: 'Electronics', status: 'active' },
      { name: 'Clothing', status: 'active' },
    ];
    await Category.insertMany(categories);
    console.log('Categories seeded');

    console.log('✅ Seeding complete');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();
```

```bash
# Run the seed script
node seed.js

# Remove seed script after use
rm seed.js
```

---

## 🔄 PM2 Commands (Most Important)

### Basic PM2 Commands

```bash
# View all running processes
pm2 status

# View logs
pm2 logs bso-api
pm2 logs bso-api --lines 100
pm2 logs bso-api --err  # Only errors

# Restart application
pm2 restart bso-api

# Stop application
pm2 stop bso-api

# Delete from PM2
pm2 delete bso-api

# Monitor in real-time
pm2 monit

# Show process details
pm2 show bso-api

# Clear logs
pm2 flush bso-api
```

### Advanced PM2 Setup

```bash
# Start with ecosystem file (recommended)
cd /home/bsoservices/ci-cd

# Create ecosystem file
nano ecosystem.config.js
```

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'bso-api',
    script: './server.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

```bash
# Start with ecosystem file
pm2 start ecosystem.config.js

# Save configuration
pm2 save
```

---

## 🔍 Post-Deployment Verification

### 1. Check Application Status

```bash
# SSH into server
ssh bsoservices@your-server-ip

# Check PM2 status
pm2 status

# Should show:
# ┌─────┬────────────┬─────────┬─────────┬───────────┐
# │ id  │ name       │ status  │ cpu     │ memory    │
# ├─────┼────────────┼─────────┼─────────┼───────────┤
# │ 0   │ bso-api    │ online  │ 0%      │ 125.5mb   │
# └─────┴────────────┴─────────┴─────────┴───────────┘
```

### 2. Check Logs

```bash
# View recent logs
pm2 logs bso-api --lines 50

# Look for:
# ✅ "MongoDB connected successfully"
# ✅ "Starting HTTP Server"
# ✅ "Port: 5000"

# Check for errors
pm2 logs bso-api --err --lines 50
```

### 3. Test API Endpoints

```bash
# Test health check
curl http://localhost:5000/

# Should return: "Welcome to bso"

# Test admin login
curl -X POST http://localhost:5000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bso@mailinator.com","password":"Admin@123"}'

# Should return user data with token
```

### 4. Check Database Connection

```bash
# View application logs
pm2 logs bso-api | grep -i "mongodb"

# Should see: "MongoDB connected successfully"
```

### 5. Test External Access

```bash
# From your local machine
curl http://your-domain.com/

# Or test in browser
# Visit: http://your-domain.com
```

---

## 🔧 Update/Redeploy Process

### Quick Update (When code changes)

```bash
# SSH into server
ssh bsoservices@your-server-ip

# Navigate to project
cd /home/bsoservices/ci-cd

# Pull latest code
git pull origin main

# Install any new dependencies
npm install --production

# Restart PM2
pm2 restart bso-api

# Check status
pm2 status
pm2 logs bso-api --lines 50
```

### Full Restart

```bash
# SSH into server
ssh bsoservices@your-server-ip
cd /home/bsoservices/ci-cd

# Stop application
pm2 stop bso-api

# Pull latest code
git pull origin main

# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install --production

# Start application
pm2 start bso-api

# Verify
pm2 status
pm2 logs bso-api
```

---

## 🛡️ Security Checklist

### Before Going Live

- [ ] All `.env` values are production values
- [ ] JWT_SECRET is strong and unique
- [ ] Database has authentication enabled
- [ ] Firewall is configured (only allow ports 80, 443, 22)
- [ ] SSL certificate is installed
- [ ] Default admin password is changed
- [ ] AWS keys have minimal required permissions
- [ ] Stripe is in live mode (not test)
- [ ] CORS is restricted to your domains only
- [ ] Rate limiting is enabled
- [ ] MongoDB is not exposed to public

### Server Hardening

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Configure firewall
sudo ufw allow 22     # SSH
sudo ufw allow 80     # HTTP
sudo ufw allow 443    # HTTPS
sudo ufw allow 5000   # API (if not behind nginx)
sudo ufw enable

# Setup nginx reverse proxy (recommended)
sudo apt install nginx -y

# Configure nginx
sudo nano /etc/nginx/sites-available/bso-api
```

```nginx
# /etc/nginx/sites-available/bso-api
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Enable nginx site
sudo ln -s /etc/nginx/sites-available/bso-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.yourdomain.com
```

---

## 📊 Monitoring & Maintenance

### Monitor Application

```bash
# Real-time monitoring
pm2 monit

# Check memory usage
pm2 status
free -h

# Check disk space
df -h

# Check CPU usage
top
htop  # if installed
```

### Log Management

```bash
# Rotate logs with PM2
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### Backup Strategy

```bash
# Create backup script
nano /home/bsoservices/backup.sh
```

```bash
#!/bin/bash
# Backup script

BACKUP_DIR="/home/bsoservices/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --uri="mongodb://localhost:27017/bso_production" \
  --out="$BACKUP_DIR/mongo_$DATE"

# Backup uploads folder
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" \
  /home/bsoservices/ci-cd/public

# Keep only last 7 days of backups
find $BACKUP_DIR -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
chmod +x /home/bsoservices/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add this line:
0 2 * * * /home/bsoservices/backup.sh >> /home/bsoservices/backup.log 2>&1
```

---

## 🚨 Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs bso-api --err --lines 100

# Common issues:
# 1. Port already in use
sudo lsof -i :5000
# Kill process: sudo kill -9 <PID>

# 2. Database connection failed
# Check MONGODB_URI in .env
cat .env | grep MONGODB

# 3. Missing dependencies
npm install --production

# 4. Permission issues
ls -la /home/bsoservices/ci-cd
sudo chown -R bsoservices:bsoservices /home/bsoservices/ci-cd
```

### High Memory Usage

```bash
# Check PM2 memory
pm2 status

# Restart if needed
pm2 restart bso-api

# Enable cluster mode for better performance
# (Edit ecosystem.config.js and set instances: 'max')
```

### Database Connection Issues

```bash
# Test MongoDB connection
mongosh "mongodb://your-host:27017/bso_production"

# Check if MongoDB is running
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod
```

---

## 📞 Quick Reference Commands

### Essential SSH Commands

```bash
# Connect to server
ssh bsoservices@your-server-ip

# Navigate to project
cd /home/bsoservices/ci-cd

# Check what's running
pm2 status

# View logs
pm2 logs bso-api

# Restart app
pm2 restart bso-api

# Pull latest code
git pull origin main

# Install dependencies
npm install --production

# Exit server
exit
```

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Code is tested locally
- [ ] All dependencies are in package.json
- [ ] .env.example is up to date
- [ ] No sensitive data in code
- [ ] Database backup is taken

### Deployment
- [ ] SSH into server
- [ ] Navigate to project directory
- [ ] Pull latest code: `git pull origin main`
- [ ] Install dependencies: `npm install --production`
- [ ] Restart PM2: `pm2 restart bso-api`
- [ ] Check status: `pm2 status`
- [ ] Check logs: `pm2 logs bso-api --lines 50`

### Post-Deployment
- [ ] Test API endpoints
- [ ] Check application logs
- [ ] Verify database connection
- [ ] Test frontend integration
- [ ] Monitor for 15 minutes
- [ ] Update deployment documentation

---

## 📝 Summary

**Your BSO API is deployed to:**
- **Server**: AWS EC2
- **User**: bsoservices
- **Directory**: `/home/bsoservices/ci-cd`
- **Port**: 5000
- **Process Manager**: PM2
- **Database**: MongoDB (Mongoose auto-creates collections)

**To deploy new changes:**
```bash
ssh bsoservices@your-server-ip
cd /home/bsoservices/ci-cd
git pull origin main
npm install --production
pm2 restart bso-api
pm2 logs bso-api
```

**That's it!** No migrations needed - Mongoose handles everything! 🎉

---

**Need Help?** Check troubleshooting section or contact DevOps team.

