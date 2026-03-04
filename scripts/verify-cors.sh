#!/usr/bin/env bash
# Run this on the production server to verify CORS headers.
# Usage: ./scripts/verify-cors.sh [API_BASE_URL]
# Example: ./scripts/verify-cors.sh https://api.bsoservices.ai
# If omitted, uses http://localhost:7012 (when API runs on same machine).

set -e
API_URL="${1:-http://localhost:7012}"
API_URL="${API_URL%/}"

echo "=========================================="
echo "CORS verification for API: $API_URL"
echo "=========================================="

# Check if API is reachable first
if ! curl -sS --connect-timeout 3 -o /dev/null "$API_URL/" 2>/dev/null; then
  echo ""
  echo "ERROR: Cannot reach API at $API_URL"
  echo "Start the API first, e.g.:"
  echo "  npm install -g pm2 && pm2 start server.js --name bso_apis"
  echo "  or: node server.js"
  echo ""
  exit 1
fi
echo "API is reachable."
echo ""

check_origin() {
  local name="$1"
  local origin="$2"
  local path="${3:-/}"
  echo ""
  echo "--- $name (Origin: $origin) ---"
  echo "OPTIONS preflight:"
  if headers=$(curl -sI -X OPTIONS "$API_URL$path" \
    -H "Origin: $origin" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type, Authorization" \
    --connect-timeout 3 2>/dev/null); then
    echo "$headers" | grep -i "access-control" || echo "(no access-control headers)"
    if echo "$headers" | grep -qi "Access-Control-Allow-Origin: $origin"; then
      echo "OK: Access-Control-Allow-Origin matches $origin"
    else
      echo "FAIL: Access-Control-Allow-Origin missing or wrong for $origin"
    fi
  else
    echo "FAIL: Request failed (is API running?)"
  fi
}

check_origin "Admin (dashboard)" "https://dashboard.bsoservices.ai" "/admin/login"
check_origin "Frontend (HTTPS)"  "https://bsoservices.ai"     "/user/profile"
check_origin "Frontend (HTTP)"   "http://bsoservices.ai"     "/user/profile"

echo ""
echo "=========================================="
echo "Done. If OK lines appear above, CORS is configured correctly."
echo "If FAIL or no Access-Control-Allow-Origin, check server.js and restart PM2."
echo "=========================================="
