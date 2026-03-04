#!/usr/bin/env bash
# Test admin login API
# Usage: ./scripts/test-admin-login.sh [BASE_URL] [EMAIL] [PASSWORD]
# Example: ./scripts/test-admin-login.sh http://localhost:7012 admin@example.com Admin@123
# Example: ./scripts/test-admin-login.sh https://api.bsoservices.ai bsouk.ltd@gmail.com yourpassword

set -e
BASE_URL="${1:-http://localhost:7012}"
BASE_URL="${BASE_URL%/}"
EMAIL="${2:-bsouk.ltd@gmail.com}"
PASSWORD="${3:-}"

if [ -z "$PASSWORD" ]; then
  echo "Usage: $0 [BASE_URL] [EMAIL] [PASSWORD]"
  echo "Example: $0 http://localhost:7012 bsouk.ltd@gmail.com YourPassword"
  exit 1
fi

echo "POST $BASE_URL/admin/login"
echo "Body: { \"email\": \"$EMAIL\", \"password\": \"***\" }"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/admin/login" \
  -H "Content-Type: application/json" \
  -H "Origin: https://dashboard.bsoservices.ai" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"remember_me\":false}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
HTTP_BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP status: $HTTP_CODE"
echo "Response:"
echo "$HTTP_BODY" | head -c 500
[ ${#HTTP_BODY} -gt 500 ] && echo "..." || echo ""
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "OK: Login succeeded (check for token in response)."
else
  echo "Login failed or error (status $HTTP_CODE)."
fi
