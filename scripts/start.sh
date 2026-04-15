#!/bin/bash
# Load NVM (Securely)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Node Version: $(node -v)"
echo "Running as: $(whoami)"
echo "Changing Directory..."
cd /home/bsoservices/ci-cd/bso_apis || { echo "Error: Directory not found"; exit 1; }
echo "Current Directory: $(pwd)"

# Use same app name as backup_and_deploy.sh (bso_apis). Restart if already running, else start.
echo "Starting APIs (PM2 app name: bso_apis)"
if pm2 describe bso_apis >/dev/null 2>&1; then
  pm2 restart bso_apis --update-env
else
  pm2 start ecosystem.config.js --only bso_apis --env production
fi
pm2 save
