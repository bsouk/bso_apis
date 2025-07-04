#!/bin/bash
# Fail script if any command fails
set -e
# Load NVM (Securely)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use specific Node.js versionsss
#nvm use v20 || { echo "Error: Failed to load Node.js v20"; exit 1; }
#echo "NVM Loaded"
echo "Node Version: $(node -v)"
echo "Running as: $(whoami)"
echo "Changing Directory..."
cd /home/bsoservices/ci-cd/api || { echo "Error: Directory not found"; exit 1; }
echo "Current Directory: $(pwd)"
echo "Installing NPM Packages..."
npm i || { echo "Error: NPM installation failed"; exit 1; }
echo "Installation Complete."
