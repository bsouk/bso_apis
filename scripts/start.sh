#!/bin/bash
# Fail script if any command fails
set -e
# Load NVM (Securely)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Node Version: $(node -v)"
echo "Running as: $(whoami)"
echo "Changing Directory..."
cd /var/www/mongo/bso_apis || { echo "Error: Directory not found"; exit 1; }
echo "Current Directory: $(pwd)"
echo "Checking PM2 Processes"
pm2 status
echo "Starting APIs"
pm2 restart server.js
pm2 status
