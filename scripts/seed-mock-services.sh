#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# seed-mock-services.sh
#
# Seeds mock-oidc with the correct users, client, and redirect URIs
# for TPRMAI local development.
#
# Usage:
#   chmod +x scripts/seed-mock-services.sh
#   ./scripts/seed-mock-services.sh
#
# Prerequisites: docker compose --profile dev up (mock services running)
# ---------------------------------------------------------------------------

set -euo pipefail

MOCK_OIDC_URL="http://127.0.0.1:10091"
CLIENT_ID="mock-oidc-client"
FRONTEND_URL="http://localhost:3020"

GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }

# ---------------------------------------------------------------------------
# 1. Wait for mock-oidc to be healthy
# ---------------------------------------------------------------------------

echo "Waiting for mock-oidc to be ready..."
RETRIES=30
COUNT=0
until curl -sf "${MOCK_OIDC_URL}/health" > /dev/null 2>&1; do
  COUNT=$((COUNT + 1))
  if [ $COUNT -ge $RETRIES ]; then
    fail "mock-oidc did not become healthy after ${RETRIES} attempts"
    exit 1
  fi
  sleep 2
done
ok "mock-oidc is healthy"

# ---------------------------------------------------------------------------
# 2. Register app users in mock-oidc
# ---------------------------------------------------------------------------

echo ""
echo "Registering app users in mock-oidc..."

register_user() {
  local sub="$1" email="$2" name="$3"
  HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" \
    -X POST "${MOCK_OIDC_URL}/api/users" \
    -H "Content-Type: application/json" \
    -d "{\"sub\": \"${sub}\", \"email\": \"${email}\", \"name\": \"${name}\"}")

  if [ "$HTTP_CODE" = "200" ]; then
    ok "Registered user: ${sub} (${name})"
  else
    warn "User registration returned HTTP ${HTTP_CODE}: ${sub}"
  fi
}

register_user "admin-001"   "admin@tprmai.local"   "Alex Admin"
register_user "analyst-001" "analyst@tprmai.local"  "Sam Analyst"
register_user "viewer-001"  "viewer@tprmai.local"   "Val Viewer"
register_user "vendor-001"  "vendor@tprmai.local"   "Vic Vendor"

# ---------------------------------------------------------------------------
# 3. Remove non-app users (if any)
# ---------------------------------------------------------------------------

echo ""
echo "Checking for non-app users..."

EXPECTED_SUBS=("admin-001" "analyst-001" "viewer-001" "vendor-001")
CURRENT_USERS=$(curl -sf "${MOCK_OIDC_URL}/api/users" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for u in data.get('users', []):
    print(u['sub'])
" 2>/dev/null || echo "")

if [ -n "$CURRENT_USERS" ]; then
  while IFS= read -r sub; do
    IS_APP_USER=false
    for expected in "${EXPECTED_SUBS[@]}"; do
      if [ "$sub" = "$expected" ]; then
        IS_APP_USER=true
        break
      fi
    done
    if [ "$IS_APP_USER" = "false" ]; then
      HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" \
        -X DELETE "${MOCK_OIDC_URL}/api/users/${sub}")
      if [ "$HTTP_CODE" = "200" ]; then
        ok "Removed non-app user: ${sub}"
      else
        warn "Failed to remove user ${sub} (HTTP ${HTTP_CODE})"
      fi
    fi
  done <<< "$CURRENT_USERS"
fi
ok "Non-app users cleaned up"

# ---------------------------------------------------------------------------
# 4. Update mock-oidc client redirect URIs
# ---------------------------------------------------------------------------

echo ""
echo "Updating mock-oidc client redirect URIs..."

HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" \
  -X PUT "${MOCK_OIDC_URL}/api/clients/${CLIENT_ID}/redirect_uris" \
  -H "Content-Type: application/json" \
  -d "{\"redirect_uris\": [\"${FRONTEND_URL}/api/auth/callback\"]}")

if [ "$HTTP_CODE" = "200" ]; then
  ok "Redirect URIs updated for ${CLIENT_ID}"
else
  warn "Redirect URI update returned HTTP ${HTTP_CODE}"
fi

# ---------------------------------------------------------------------------
# 5. Verify mock-oidc users
# ---------------------------------------------------------------------------

echo ""
echo "Verifying mock-oidc users..."

USERS_JSON=$(curl -sf "${MOCK_OIDC_URL}/api/users")
USER_COUNT=$(echo "$USERS_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(len(data.get('users', [])))
" 2>/dev/null || echo "0")

if [ "$USER_COUNT" = "4" ]; then
  ok "mock-oidc has exactly 4 users"
  echo "$USERS_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for u in data.get('users', []):
    print(f\"  - {u['sub']}: {u['name']} ({u['email']})\")" 2>/dev/null
else
  warn "mock-oidc has ${USER_COUNT} users (expected 4)"
fi

# ---------------------------------------------------------------------------
# 6. Summary
# ---------------------------------------------------------------------------

echo ""
echo "==========================================="
echo -e "${GREEN}Mock services seeded successfully${NC}"
echo "==========================================="
echo ""
echo "  mock-oidc (external): ${MOCK_OIDC_URL}"
echo "  mock-oidc (internal): http://mock-oidc:10090"
echo ""
echo "  Users:"
echo "    admin-001   -> admin@tprmai.local   (ADMIN)"
echo "    analyst-001 -> analyst@tprmai.local  (ANALYST)"
echo "    viewer-001  -> viewer@tprmai.local   (VIEWER)"
echo "    vendor-001  -> vendor@tprmai.local   (VENDOR)"
echo ""
echo "  Client: ${CLIENT_ID} -> ${FRONTEND_URL}/api/auth/callback"
echo ""
echo "  OIDC Discovery: ${MOCK_OIDC_URL}/.well-known/openid-configuration"
echo ""
