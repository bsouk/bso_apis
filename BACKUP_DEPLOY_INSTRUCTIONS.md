# 🛡️ Backup and Deploy Instructions

**Server**: ubuntu@ip-10-0-6-167  
**Project**: /var/www/mongo/bso_apis

---

## ⚡ Option 1: Automated Script (Recommended)

### Copy Script to Server

From your local machine:

```bash
# Copy the backup script to server
scp backup_and_deploy.sh ubuntu@your-server-ip:/var/www/mongo/bso_apis/
```

### Run on Server (in Termius):

```bash
# Navigate to project
cd /var/www/mongo/bso_apis

# Make script executable
chmod +x backup_and_deploy.sh

# Run it (it will ask for confirmation before deploying)
./backup_and_deploy.sh
```

### What It Does:

1. ✅ **Backs up MongoDB database**
2. ✅ **Backs up uploaded files** (public folder)
3. ✅ **Saves current version info**
4. ✅ **Asks for confirmation**
5. ✅ **Pulls latest code**
6. ✅ **Installs dependencies**
7. ✅ **Restarts application**
8. ✅ **Tests API**
9. ✅ **Keeps last 5 backups**

---

## 📝 Option 2: Manual Step-by-Step (Copy-Paste in Termius)

### Step 1: Create Backup Directory

```bash
mkdir -p /home/ubuntu/bso_backups
```

### Step 2: Backup MongoDB Database

```bash
# Get current date for backup name
DATE=$(date +%Y%m%d_%H%M%S)

# Backup MongoDB
mongodump --uri="$MONGODB_URI" \
  --out="/home/ubuntu/bso_backups/mongodb_$DATE"

# Verify backup was created
ls -lh /home/ubuntu/bso_backups/
```

**Expected output:**
```
mongodb_20251020_143022/  (with size shown)
```

### Step 3: Backup Uploaded Files

```bash
cd /var/www/mongo/bso_apis

# Backup public folder (uploads, media, etc.)
tar -czf "/home/ubuntu/bso_backups/public_$DATE.tar.gz" public/

# Verify
ls -lh /home/ubuntu/bso_backups/
```

### Step 4: Save Current Git Version

```bash
cd /var/www/mongo/bso_apis

# Show current version (save this!)
git log -1 --oneline

# Save to file
git log -1 > "/home/ubuntu/bso_backups/version_$DATE.txt"
echo "Backup created at: $DATE" >> "/home/ubuntu/bso_backups/version_$DATE.txt"
```

### Step 5: Deploy New Code

```bash
cd /var/www/mongo/bso_apis

# Pull latest code
git pull

# Install dependencies
npm install --production

# Restart application
pm2 restart bso_apis

# Check logs
pm2 logs bso_apis --lines 50
```

### Step 6: Verify Deployment

```bash
# Check PM2 status
pm2 status

# Should show: bso_apis | online

# Test API
curl http://localhost:5000/

# Should return: "Welcome to bso"
```

---

## 🔄 Quick Backup Commands (Just Copy-Paste)

```bash
# Quick backup everything
DATE=$(date +%Y%m%d_%H%M%S) && \
mkdir -p /home/ubuntu/bso_backups && \
mongodump --uri="$MONGODB_URI" --out="/home/ubuntu/bso_backups/mongodb_$DATE" && \
tar -czf "/home/ubuntu/bso_backups/public_$DATE.tar.gz" -C /var/www/mongo/bso_apis public && \
echo "✅ Backup complete! Saved in /home/ubuntu/bso_backups/"

# Then deploy
cd /var/www/mongo/bso_apis && \
git pull && \
npm install --production && \
pm2 restart bso_apis && \
pm2 logs bso_apis --lines 20
```

---

## 🚨 Rollback (If Something Goes Wrong)

### Rollback Code

```bash
cd /var/www/mongo/bso_apis

# See recent commits
git log --oneline -5

# Rollback to previous commit
git reset --hard <commit-hash>

# Restart
pm2 restart bso_apis
```

### Restore Database

```bash
# Find your backup
ls -lh /home/ubuntu/bso_backups/

# Restore specific backup
mongorestore --uri="$MONGODB_URI" \
  --drop \
  /home/ubuntu/bso_backups/mongodb_20251020_143022

# Restart app
pm2 restart bso_apis
```

### Restore Files

```bash
# Restore public folder
cd /var/www/mongo/bso_apis
tar -xzf /home/ubuntu/bso_backups/public_20251020_143022.tar.gz

# Restart
pm2 restart bso_apis
```

---

## 📊 View Backups

```bash
# List all backups
ls -lh /home/ubuntu/bso_backups/

# Check backup sizes
du -sh /home/ubuntu/bso_backups/*

# View backup info
cat /home/ubuntu/bso_backups/version_*.txt
```

---

## 🧹 Clean Old Backups

```bash
# Remove backups older than 7 days
find /home/ubuntu/bso_backups -mtime +7 -delete

# Keep only last 5 backups
cd /home/ubuntu/bso_backups
ls -t | tail -n +6 | xargs rm -rf
```

---

## ✅ Pre-Deployment Checklist

Run these before deploying:

```bash
# 1. Check current status
pm2 status

# 2. Check disk space
df -h

# 3. Check if backup directory has space
du -sh /home/ubuntu/bso_backups/

# 4. Test MongoDB connection
mongo "$MONGODB_URI" --eval "db.stats()"

# 5. Check git status
cd /var/www/mongo/bso_apis
git status
```

---

## 📝 Environment-Specific Backups

### Production Backup (Full)

```bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/bso_backups/full_$DATE"

mkdir -p "$BACKUP_DIR"

# Database
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/mongodb"

# Files
tar -czf "$BACKUP_DIR/public.tar.gz" -C /var/www/mongo/bso_apis public

# .env backup (be careful - contains secrets!)
cp /var/www/mongo/bso_apis/.env "$BACKUP_DIR/.env.backup"

# Git info
cd /var/www/mongo/bso_apis
git log -1 > "$BACKUP_DIR/git_version.txt"
git diff > "$BACKUP_DIR/local_changes.diff"

echo "✅ Full backup created at: $BACKUP_DIR"
```

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| **Backup DB** | `mongodump --uri="$MONGODB_URI" --out="/home/ubuntu/bso_backups/db_$(date +%Y%m%d)"` |
| **Backup Files** | `tar -czf "/home/ubuntu/bso_backups/files_$(date +%Y%m%d).tar.gz" -C /var/www/mongo/bso_apis public` |
| **Deploy** | `cd /var/www/mongo/bso_apis && git pull && npm install --production && pm2 restart bso_apis` |
| **Check Status** | `pm2 status && pm2 logs bso_apis --lines 20` |
| **Rollback Code** | `git reset --hard <commit> && pm2 restart bso_apis` |
| **Restore DB** | `mongorestore --uri="$MONGODB_URI" --drop /path/to/backup` |
| **List Backups** | `ls -lh /home/ubuntu/bso_backups/` |

---

## 💡 Best Practices

1. ✅ **Always backup before deploying**
2. ✅ **Test in staging first** (if available)
3. ✅ **Deploy during low-traffic hours**
4. ✅ **Keep at least 5 backups**
5. ✅ **Monitor logs after deployment**
6. ✅ **Have rollback plan ready**
7. ✅ **Document what you deployed**

---

## 🚀 Recommended: Use the Automated Script!

The automated script (`backup_and_deploy.sh`) handles everything:

```bash
# Just run this:
cd /var/www/mongo/bso_apis
./backup_and_deploy.sh

# It will:
# 1. Backup everything
# 2. Ask for confirmation
# 3. Deploy safely
# 4. Test automatically
# 5. Give you rollback info
```

**Much safer and easier!** 🎉

---

**Need help?** Check the logs:
```bash
pm2 logs bso_apis
tail -f /home/ubuntu/bso_backups/backup_*.log
```

