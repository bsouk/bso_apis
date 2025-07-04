#!/bin/bash
# Fail script if any command fails
set -e
# Load NVM (Securely)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use specific Node.js version
#nvm use v20 || { echo "Error: Failed to load Node.js v20"; exit 1; }
#echo "NVM Loaded"
echo "Node Version: $(node -v)"
echo "Running as: $(whoami)"
echo "Changing Directory..."
cd /home/bsoservices/ci-cd || { echo "Error: Directory not found"; exit 1; }
echo "Current Directory: $(pwd)"
echo "Running NPM Build..."
#npm run build || { echo "Error: NPM Build failed"; exit 1; }
#echo "Build Complete."
echo "Checking PM2 Processes"
pm2 status
#echo "Starting APIs"
#pm2 restart dist/main.js
#echo "Starting Chat"
#pm2 restart dist/chat.js
#echo "Checking PM2 Processes again..."
#pm2 status
