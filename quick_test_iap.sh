#!/bin/bash

# Quick test script for Apple IAP verification
# Usage: ./quick_test_iap.sh

echo "═══════════════════════════════════════════════════════════"
echo "   🧪 QUICK TEST: Apple IAP from Local to Production"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ -z "$1" ]; then
    echo "❌ ERROR: JWT Receipt Token is required"
    echo ""
    echo "Usage:"
    echo "  ./quick_test_iap.sh <FULL_JWT_RECEIPT_TOKEN>"
    echo ""
    echo "Or:"
    echo "  node test_iap_from_local.js <FULL_JWT_RECEIPT_TOKEN>"
    echo ""
    echo "📋 To get the token:"
    echo "  1. Look in Flutter logs for 'receipt_data:'"
    echo "  2. Copy the ENTIRE token (it's very long)"
    echo "  3. Paste it as the argument"
    echo ""
    exit 1
fi

echo "🚀 Running test with provided JWT token..."
echo "   Token length: ${#1} characters"
echo ""

node test_iap_from_local.js "$1"




