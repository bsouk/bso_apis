#!/bin/bash

# IAP Test Runner Script
# This script gets a JWT token and runs the IAP test

echo "═══════════════════════════════════════════════════════════"
echo "   IAP VERIFICATION TEST RUNNER"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Configuration
API_URL=${API_URL:-"http://localhost:7012"}
TEST_EMAIL=${TEST_EMAIL:-"ghufranjaleel@yopmail.com"}
TEST_PASSWORD=${TEST_PASSWORD:-"Ghufran@123456"}

# Wait a moment for password to be set
sleep 2

echo "🔐 Step 1: Getting JWT Token..."
echo "   API URL: $API_URL"
echo "   Email: $TEST_EMAIL"
echo ""

# Get JWT token
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/user/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_credentials\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

# Extract token
JWT_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$JWT_TOKEN" ]; then
  echo "❌ ERROR: Failed to get JWT token"
  echo "   Response: $LOGIN_RESPONSE"
  echo ""
  echo "💡 TIP: Make sure:"
  echo "   1. API server is running on $API_URL"
  echo "   2. User exists with email: $TEST_EMAIL"
  echo "   3. Password is correct: $TEST_PASSWORD"
  echo ""
  exit 1
fi

echo "✅ JWT Token obtained successfully!"
echo "   Token: ${JWT_TOKEN:0:50}..."
echo ""

echo "🧪 Step 2: Running IAP Verification Test..."
echo ""

# Run the test
export TEST_JWT_TOKEN=$JWT_TOKEN
node test_iap_with_payload.js

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Test completed successfully!"
else
  echo "❌ Test failed with exit code: $EXIT_CODE"
fi

exit $EXIT_CODE


