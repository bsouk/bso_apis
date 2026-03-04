#!/usr/bin/env bash
# Verify if CORS failure is due to Nginx (or another proxy) by comparing:
#   - Direct hit to Node (e.g. localhost:7012) = what Node returns
#   - Hit via public URL (e.g. https://api.bsoservices.com) = what the browser gets
#
# If direct has CORS headers but public does not → proxy (Nginx) is stripping or not forwarding them.
# If it was working 1 week ago, a proxy config change or missing CORS in proxy is likely.
#
# Usage (run on the API server):
#   bash scripts/verify-cors-nginx.sh
#   bash scripts/verify-cors-nginx.sh https://api.bsoservices.com
#
# If chmod +x fails (e.g. deployed file permissions), use "bash scripts/..." — no execute bit needed.
#
# Default: DIRECT_URL=http://localhost:7012, PUBLIC_URL=first argument or same as DIRECT.

set -e
PUBLIC_URL="${1:-}"
DIRECT_URL="${2:-http://localhost:7012}"
DIRECT_URL="${DIRECT_URL%/}"
if [ -z "$PUBLIC_URL" ]; then
  PUBLIC_URL="https://api.bsoservices.com"
fi
PUBLIC_URL="${PUBLIC_URL%/}"
ORIGIN="https://dashboard.bsoservices.ai"
PATH_TO_TEST="/admin/login"

echo "=========================================="
echo "CORS: Is it Nginx? (compare direct vs public)"
echo "=========================================="
echo "Direct (Node) URL: $DIRECT_URL"
echo "Public (browser) URL: $PUBLIC_URL"
echo "Origin: $ORIGIN"
echo ""

get_cors_headers() {
  local url="$1"
  curl -sI -X OPTIONS "$url$PATH_TO_TEST" \
    -H "Origin: $ORIGIN" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type, Authorization" \
    --connect-timeout 5 2>/dev/null | grep -i "access-control" || true
}

echo "--- 1) OPTIONS preflight to DIRECT (Node only, no proxy) ---"
DIRECT_CORS=$(get_cors_headers "$DIRECT_URL")
if [ -n "$DIRECT_CORS" ]; then
  echo "$DIRECT_CORS"
  echo "[OK] Node returns CORS headers when hit directly."
else
  echo "(no Access-Control-* headers)"
  echo "[!] Node is not returning CORS headers. Restart the app and ensure ALLOW_ALL_ORIGINS / CORS middleware is in place."
fi
echo ""

echo "--- 2) OPTIONS preflight to PUBLIC (through Nginx/proxy) ---"
PUBLIC_CORS=$(get_cors_headers "$PUBLIC_URL")
if [ -n "$PUBLIC_CORS" ]; then
  echo "$PUBLIC_CORS"
  echo "[OK] Public URL returns CORS headers."
else
  echo "(no Access-Control-* headers)"
  echo "[!] Public URL has NO CORS headers."
fi
echo ""

echo "=========================================="
echo "Verdict:"
echo "=========================================="
if [ -n "$DIRECT_CORS" ] && [ -z "$PUBLIC_CORS" ]; then
  echo ">>> LIKELY NGINX (or another proxy)."
  echo "    Node returns CORS when hit directly, but the public URL does not."
  echo "    Fix: Add CORS headers in Nginx for the API server block."
  echo "    See: bso_apis/deploy/nginx-cors-example.conf"
  echo ""
  echo "    If it was working 1 week ago, check:"
  echo "    - Recent Nginx config changes (default server, proxy_pass, add_header)"
  echo "    - Whether OPTIONS is now handled by Nginx before reaching Node"
  echo "    - Reload: sudo nginx -t && sudo systemctl reload nginx"
elif [ -z "$DIRECT_CORS" ]; then
  echo ">>> NODE is not sending CORS headers."
  echo "    Deploy latest server.js (with force CORS middleware) and restart: pm2 restart bso_apis"
elif [ -n "$PUBLIC_CORS" ]; then
  echo ">>> Both direct and public return CORS. Config looks OK."
  echo "    If the browser still shows CORS error, check: exact Request URL and Origin in DevTools, cache, or another proxy (e.g. Cloudflare)."
else
  echo ">>> Could not reach one or both URLs. Check URLs and that Node is running on $DIRECT_URL."
fi
echo "=========================================="
