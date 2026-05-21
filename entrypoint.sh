#!/bin/sh
set -e

# ── Wait for database (with timeout) ──
echo "Waiting for database..."
DB_RETRIES=0
DB_MAX_RETRIES=60
until node -e "const net = require('net'); const s = net.createConnection({host:'${DB_HOST:-db}',port:5432}); s.on('connect',()=>{s.end();process.exit(0)}); s.on('error',()=>process.exit(1));" 2>/dev/null; do
  DB_RETRIES=$((DB_RETRIES + 1))
  if [ "$DB_RETRIES" -ge "$DB_MAX_RETRIES" ]; then
    echo "ERROR: Database not available after ${DB_MAX_RETRIES}s. Exiting."
    exit 1
  fi
  sleep 1
done
echo "Database is ready."

# ── Wait for mock-oidc if in dev mode ──
if [ -n "$OIDC_ISSUER_URL" ]; then
  # Extract host:port from OIDC_ISSUER_URL for internal health check
  OIDC_HOST=$(echo "$OIDC_ISSUER_URL" | sed 's|http://||' | sed 's|/.*||')
  echo "Checking OIDC provider at ${OIDC_HOST}..."
  OIDC_RETRIES=0
  OIDC_MAX_RETRIES=30
  while ! node -e "const http=require('http');http.get('http://${OIDC_HOST}/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1));" 2>/dev/null; do
    OIDC_RETRIES=$((OIDC_RETRIES + 1))
    if [ "$OIDC_RETRIES" -ge "$OIDC_MAX_RETRIES" ]; then
      echo "WARNING: OIDC provider not available after ${OIDC_MAX_RETRIES}s. Login may not work."
      break
    fi
    sleep 1
  done
  if [ "$OIDC_RETRIES" -lt "$OIDC_MAX_RETRIES" ]; then
    echo "OIDC provider is ready."
  fi
fi

# ── Apply database schema ──
echo "Applying database schema..."
if ! node ./node_modules/prisma/build/index.js db push --skip-generate; then
  echo "ERROR: Schema push failed. Retrying in 3s..."
  sleep 3
  if ! node ./node_modules/prisma/build/index.js db push --skip-generate; then
    echo "ERROR: Schema push failed twice. Exiting."
    exit 1
  fi
fi
echo "Schema applied."

# ── Seed database ──
echo "Seeding database..."
if ! node ./prisma/seed.js; then
  echo "WARNING: Seed encountered an issue (may already be seeded)."
fi
echo "Database ready."

# ── Start Next.js ──
echo "Starting Next.js..."
exec node server.js
