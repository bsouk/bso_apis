#!/bin/bash
# One-time PM2 boot persistence for user bsoservices (run on the server as bsoservices)
set -e

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

APP_DIR="/var/www/mongo/bso_apis"
[ -d "$APP_DIR" ] || APP_DIR="/home/bsoservices/ci-cd/bso_apis"
cd "$APP_DIR"

echo "=== PM2 diagnostics ==="
echo "User: $(whoami)"
echo "Home: $HOME"
echo "PM2_HOME: ${PM2_HOME:-$HOME/.pm2}"
echo "App dir: $APP_DIR"
pm2 -v
pm2 ping || true

echo "=== Test MongoDB ==="
node -e "require('dotenv').config(); const m=require('mongoose'); m.connect(process.env.MONGODB_URI).then(()=>{console.log('MongoDB OK');process.exit(0)}).catch(e=>{console.error('MongoDB FAIL:',e.message);process.exit(1)})"

echo "=== Test app (5s foreground) — Ctrl+C if it stays up ==="
timeout 5 node server.js || true

echo "=== Start with PM2 ==="
pm2 delete bso_apis 2>/dev/null || true
mkdir -p logs
pm2 start ecosystem.config.js
sleep 3
pm2 status
pm2 logs bso_apis --lines 20 --nostream
curl -sf http://127.0.0.1:7012/ && echo "" && echo "API health OK" || echo "API health FAILED"

pm2 save
echo ""
echo "=== Enable restart on server reboot (run the sudo line PM2 prints if shown) ==="
pm2 startup systemd -u "$(whoami)" --hp "$HOME" || true
