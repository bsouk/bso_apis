#!/bin/bash
# Load NVM (Securely)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Node Version: $(node -v)"
echo "Running as: $(whoami)"
echo "Changing Directory..."
cd /var/www/mongo/bso_apis
echo "Current Directory: $(pwd)"
echo "Starting APIs"
pm2 restart server.js
