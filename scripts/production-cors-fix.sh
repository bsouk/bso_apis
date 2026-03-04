#!/bin/bash
# Production CORS fix: clear caches and restart API so CORS changes take effect.
# Run this on the API server (e.g. where Node/PM2 runs) after deploying.

set -e

echo "=== Production CORS fix ==="

# 1. Clear npm cache (optional, use if you suspect stale deps)
# npm cache clean --force

# 2. Restart the Node process so new server.js (CORS) is loaded
# If using PM2:
if command -v pm2 &> /dev/null; then
  echo "Restarting app with PM2..."
  pm2 restart all
  # Or restart by name, e.g.: pm2 restart bso-api
  echo "PM2 restart done."
else
  echo "PM2 not found. Restart the Node process manually (e.g. systemctl restart your-app, or kill and start node server.js)."
fi

# 3. If using nginx as reverse proxy, reload it so it doesn't cache responses
if command -v nginx &> /dev/null; then
  echo "Reloading nginx..."
  sudo nginx -t && sudo nginx -s reload
  echo "Nginx reloaded."
fi

echo "=== Done. Ensure ALLOWED_ORIGINS on this server includes https://dashboard.bsoservices.ai (or leave unset to use defaults). ==="
