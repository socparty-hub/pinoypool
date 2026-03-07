#!/bin/bash
# ─────────────────────────────────────────────
#  PinoyPool — DEV Environment Deploy Script
#  Run this on your Hostinger server:
#    bash deploy-dev.sh
#
#  What this does:
#   • Clones / updates the dev branch into ~/pinoypool-dev
#   • Installs dependencies
#   • Creates a .env with PORT=3001 and COMING_SOON=false
#   • Starts / restarts the app under PM2 as "pinoypool-dev"
#   • Prints the local URL so you can verify Nginx proxy
# ─────────────────────────────────────────────

set -e  # Stop on first error

DEV_DIR="$HOME/pinoypool-dev"
REPO="https://github.com/socparty-hub/pinoypool.git"
PORT=3001

echo ""
echo "🧪 PinoyPool DEV Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Clone or update ──────────────────────────
if [ -d "$DEV_DIR/.git" ]; then
  echo "📥 Pulling latest dev branch..."
  cd "$DEV_DIR"
  git fetch origin
  git checkout dev
  git pull origin dev
else
  echo "📥 Cloning dev branch..."
  git clone --branch dev "$REPO" "$DEV_DIR"
  cd "$DEV_DIR"
fi

# ── Install dependencies ─────────────────────
echo "📦 Installing dependencies..."
npm install --production

# ── Write .env (won't overwrite SMTP vars if already set) ──
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
  cat > .env <<EOF
PORT=$PORT
COMING_SOON=false
# Add your SMTP vars here to receive email alerts:
# SMTP_USER=yourname@gmail.com
# SMTP_PASS=xxxx-xxxx-xxxx-xxxx
# NOTIFY_TO=yourname@gmail.com
EOF
  echo "   .env created (edit it to add SMTP details if needed)"
else
  # Make sure PORT and COMING_SOON are set correctly
  grep -q "^PORT=" .env || echo "PORT=$PORT" >> .env
  grep -q "^COMING_SOON=" .env || echo "COMING_SOON=false" >> .env
  sed -i "s/^PORT=.*/PORT=$PORT/" .env
  sed -i "s/^COMING_SOON=.*/COMING_SOON=false/" .env
  echo "   .env already exists — PORT and COMING_SOON updated"
fi

# ── Start / restart with PM2 ─────────────────
echo "🔄 Starting app with PM2..."
if pm2 list | grep -q "pinoypool-dev"; then
  pm2 restart pinoypool-dev
else
  pm2 start server.js --name "pinoypool-dev"
fi

pm2 save

echo ""
echo "✅ DEV environment is running!"
echo "   Local:  http://localhost:$PORT"
echo "   Public: http://dev.pinoypool.com  (after Nginx subdomain is set up)"
echo ""
pm2 show pinoypool-dev
