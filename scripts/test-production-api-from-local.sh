#!/usr/bin/env bash
# Run this from your LOCAL machine (not the server) to test the PRODUCTION API.
# Usage: bash scripts/test-production-api-from-local.sh [API_BASE_URL]
# Example: bash scripts/test-production-api-from-local.sh https://api.bsoservices.com

set -e
API_URL="${1:-https://api.bsoservices.com}"
API_URL="${API_URL%/}"
ORIGIN="https://dashboard.bsoservices.ai"

echo "=========================================="
echo "Test PRODUCTION API from local: $API_URL"
echo "=========================================="

echo ""
echo "1) OPTIONS preflight (CORS) to $API_URL/admin/login"
curl -sI -X OPTIONS "$API_URL/admin/login" \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  --connect-timeout 10 2>/dev/null | grep -i access-control || echo "(no Access-Control-* headers)"
echo ""

echo "2) GET /cors-test (health + CORS)"
curl -sI -H "Origin: $ORIGIN" "$API_URL/cors-test" --connect-timeout 10 2>/dev/null | head -20
echo ""

echo "3) POST /admin/login (actual login — use your password)"
echo "   Run manually: curl -s -X POST $API_URL/admin/login -H 'Content-Type: application/json' -H 'Origin: $ORIGIN' -d '{\"email\":\"bsouk.ltd@gmail.com\",\"password\":\"YOUR_PASSWORD\",\"remember_me\":false}'"
echo ""
echo "=========================================="
echo "If (1) or (2) show Access-Control-Allow-Origin, CORS is working from production."
echo "If not, deploy latest server.js and ensure Nginx forwards OPTIONS to Node."
echo "=========================================="
