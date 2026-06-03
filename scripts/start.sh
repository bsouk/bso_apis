#!/bin/bash
set -e

# Load NVM when present (CodeDeploy / manual deploy)
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

echo "Node Version: $(node -v)"
echo "Running as: $(whoami)"

# Production path first, then legacy CI path
if [ -d "/var/www/mongo/bso_apis" ]; then
  APP_DIR="/var/www/mongo/bso_apis"
elif [ -d "/home/bsoservices/ci-cd/bso_apis" ]; then
  APP_DIR="/home/bsoservices/ci-cd/bso_apis"
else
  echo "Error: bso_apis directory not found"
  exit 1
fi

cd "$APP_DIR"
echo "Current Directory: $(pwd)"

if [ ! -f ".env" ]; then
  echo "Error: .env missing in $APP_DIR"
  exit 1
fi

mkdir -p logs

echo "Starting APIs (PM2 app name: bso_apis)"
if pm2 describe bso_apis >/dev/null 2>&1; then
  pm2 restart bso_apis --update-env
else
  pm2 start ecosystem.config.js
fi

pm2 save
echo "PM2 process list:"
pm2 status
