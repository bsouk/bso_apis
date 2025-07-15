#!/bin/bash
# Fail script if any command fails
set -e
# Load NVM (Securely)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Node Version: $(node -v)"
echo "Running as: $(whoami)"
echo "Changing Directory..."
cd /home/bsoservices/ci-cd/bso_apis || { echo "Error: Directory not found"; exit 1; }
echo "Current Directory: $(pwd)"
echo "Installing NPM Packages..."
npm i || { echo "Error: NPM installation failed"; exit 1; }
echo "Installation Complete."
