#!/bin/bash
# BSO API - Backup and Deploy Script
# This script backs up database and files, then deploys new code

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  BSO API - Backup & Deploy Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Configuration
PROJECT_DIR="/var/www/mongo/bso_apis"
BACKUP_DIR="/home/ubuntu/bso_backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_${DATE}"

# Create backup directory if doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}📂 Project Directory: $PROJECT_DIR${NC}"
echo -e "${YELLOW}💾 Backup Directory: $BACKUP_DIR${NC}"
echo -e "${YELLOW}📅 Backup Name: $BACKUP_NAME${NC}"
echo ""

# Step 1: Navigate to project directory
echo -e "${GREEN}Step 1: Navigating to project...${NC}"
cd "$PROJECT_DIR" || { echo -e "${RED}❌ Error: Cannot find project directory${NC}"; exit 1; }
echo -e "✅ Current directory: $(pwd)"
echo ""

# Step 2: Check current git status
echo -e "${GREEN}Step 2: Checking current version...${NC}"
CURRENT_COMMIT=$(git rev-parse --short HEAD)
CURRENT_BRANCH=$(git branch --show-current)
echo -e "📌 Current branch: ${YELLOW}$CURRENT_BRANCH${NC}"
echo -e "📌 Current commit: ${YELLOW}$CURRENT_COMMIT${NC}"
echo ""

# Step 3: Backup MongoDB Database
echo -e "${GREEN}Step 3: Backing up MongoDB database...${NC}"
if [ ! -z "$MONGODB_URI" ]; then
    echo "🔄 Running mongodump..."
    mongodump --uri="$MONGODB_URI" \
              --out="$BACKUP_DIR/$BACKUP_NAME/mongodb" \
              2>&1 | tee "$BACKUP_DIR/$BACKUP_NAME/mongodump.log"
    
    if [ $? -eq 0 ]; then
        echo -e "✅ ${GREEN}Database backup complete!${NC}"
        DB_SIZE=$(du -sh "$BACKUP_DIR/$BACKUP_NAME/mongodb" | cut -f1)
        echo -e "📦 Backup size: $DB_SIZE"
    else
        echo -e "${RED}❌ Database backup failed!${NC}"
        echo "Check log: $BACKUP_DIR/$BACKUP_NAME/mongodump.log"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  MONGODB_URI not found in environment${NC}"
    echo "Skipping database backup..."
fi
echo ""

# Step 4: Backup uploaded files
echo -e "${GREEN}Step 4: Backing up uploaded files...${NC}"
if [ -d "$PROJECT_DIR/public" ]; then
    echo "🔄 Compressing public folder..."
    tar -czf "$BACKUP_DIR/$BACKUP_NAME/public_files.tar.gz" \
        -C "$PROJECT_DIR" public \
        2>&1 | tee "$BACKUP_DIR/$BACKUP_NAME/tar.log"
    
    if [ $? -eq 0 ]; then
        echo -e "✅ ${GREEN}Files backup complete!${NC}"
        FILES_SIZE=$(du -sh "$BACKUP_DIR/$BACKUP_NAME/public_files.tar.gz" | cut -f1)
        echo -e "📦 Backup size: $FILES_SIZE"
    else
        echo -e "${YELLOW}⚠️  Files backup failed (non-critical)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Public folder not found, skipping...${NC}"
fi
echo ""

# Step 5: Save current package.json
echo -e "${GREEN}Step 5: Backing up package.json...${NC}"
cp package.json "$BACKUP_DIR/$BACKUP_NAME/package.json.backup"
echo -e "✅ Package.json backed up"
echo ""

# Step 6: Create backup info file
echo -e "${GREEN}Step 6: Creating backup info...${NC}"
cat > "$BACKUP_DIR/$BACKUP_NAME/backup_info.txt" << EOF
BSO API Backup Information
==========================
Date: $(date)
Branch: $CURRENT_BRANCH
Commit: $CURRENT_COMMIT
Server: $(hostname)
User: $(whoami)

Backup Contents:
- MongoDB database dump
- Public files (uploads)
- package.json

To restore this backup:
1. Stop the application: pm2 stop bso_apis
2. Restore MongoDB: mongorestore --uri="\$MONGODB_URI" "$BACKUP_DIR/$BACKUP_NAME/mongodb"
3. Restore files: tar -xzf "$BACKUP_DIR/$BACKUP_NAME/public_files.tar.gz" -C "$PROJECT_DIR"
4. Restart: pm2 restart bso_apis
EOF
echo -e "✅ Backup info created"
echo ""

# Show backup summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Backup Summary${NC}"
echo -e "${GREEN}========================================${NC}"
TOTAL_SIZE=$(du -sh "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)
echo -e "📦 Total backup size: ${YELLOW}$TOTAL_SIZE${NC}"
echo -e "📂 Backup location: ${YELLOW}$BACKUP_DIR/$BACKUP_NAME${NC}"
echo ""
echo "Backup contents:"
ls -lh "$BACKUP_DIR/$BACKUP_NAME/"
echo ""

# Ask for confirmation to deploy
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  Ready to Deploy?${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
read -p "Continue with deployment? (yes/no): " -n 3 -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled. Backup is saved at:${NC}"
    echo "$BACKUP_DIR/$BACKUP_NAME"
    exit 0
fi
echo ""

# Step 7: Pull latest code
echo -e "${GREEN}Step 7: Pulling latest code...${NC}"
git fetch origin
echo "Available commits:"
git log --oneline HEAD..origin/$CURRENT_BRANCH | head -5

echo ""
git pull origin "$CURRENT_BRANCH"

if [ $? -eq 0 ]; then
    NEW_COMMIT=$(git rev-parse --short HEAD)
    echo -e "✅ ${GREEN}Code updated successfully!${NC}"
    echo -e "📌 New commit: ${YELLOW}$NEW_COMMIT${NC}"
    
    if [ "$CURRENT_COMMIT" == "$NEW_COMMIT" ]; then
        echo -e "${YELLOW}⚠️  No new changes (already up to date)${NC}"
    fi
else
    echo -e "${RED}❌ Git pull failed!${NC}"
    echo "Your backup is safe at: $BACKUP_DIR/$BACKUP_NAME"
    exit 1
fi
echo ""

# Step 8: Install/update dependencies
echo -e "${GREEN}Step 8: Installing dependencies...${NC}"
npm install --production

if [ $? -eq 0 ]; then
    echo -e "✅ ${GREEN}Dependencies installed!${NC}"
else
    echo -e "${RED}❌ npm install failed!${NC}"
    echo "Your backup is safe at: $BACKUP_DIR/$BACKUP_NAME"
    exit 1
fi
echo ""

# Step 9: Restart application
echo -e "${GREEN}Step 9: Restarting application...${NC}"
pm2 restart bso_apis

if [ $? -eq 0 ]; then
    echo -e "✅ ${GREEN}Application restarted!${NC}"
else
    echo -e "${RED}❌ PM2 restart failed!${NC}"
    exit 1
fi
echo ""

# Step 10: Wait and check status
echo -e "${GREEN}Step 10: Checking application status...${NC}"
sleep 3
pm2 status bso_apis

echo ""
echo "Checking logs..."
pm2 logs bso_apis --lines 20 --nostream

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "✅ ${GREEN}Old version: $CURRENT_COMMIT${NC}"
echo -e "✅ ${GREEN}New version: $NEW_COMMIT${NC}"
echo -e "✅ ${GREEN}Backup saved at: $BACKUP_DIR/$BACKUP_NAME${NC}"
echo ""
echo "To view logs: pm2 logs bso_apis"
echo "To rollback: git reset --hard $CURRENT_COMMIT && pm2 restart bso_apis"
echo ""

# Step 11: Test API endpoint
echo -e "${GREEN}Testing API endpoint...${NC}"
sleep 2
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/)

if [ "$RESPONSE" -eq 200 ]; then
    echo -e "✅ ${GREEN}API is responding! (HTTP $RESPONSE)${NC}"
else
    echo -e "${YELLOW}⚠️  API returned HTTP $RESPONSE${NC}"
    echo "Check logs: pm2 logs bso_apis"
fi

echo ""
echo -e "${GREEN}🎉 Deployment successful!${NC}"
echo ""

# Cleanup old backups (keep last 5)
echo "Cleaning up old backups (keeping last 5)..."
cd "$BACKUP_DIR"
ls -t | tail -n +6 | xargs -r rm -rf
echo -e "✅ Old backups cleaned up"
echo ""

exit 0

