#!/bin/bash
# ─────────────────────────────────────────────
#  PinoyPool — Hostinger Deploy Script
#  Run this on your server: bash deploy.sh
# ─────────────────────────────────────────────

echo ""
echo "🎱 PinoyPool Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━"

# Pull latest code from GitHub
echo "📥 Pulling latest from GitHub..."
git pull origin main

# Install / update dependencies
echo "📦 Installing dependencies..."
npm install --production

# Restart the app with PM2
echo "🔄 Restarting app..."
if pm2 list | grep -q "pinoypool"; then
  pm2 restart pinoypool
else
  pm2 start server.js --name "pinoypool"
fi

# Save PM2 process list so it survives reboots
pm2 save

echo ""
echo "✅ Deployment complete!"
echo "🌐 pinoypool.com is live"
echo ""
pm2 show pinoypool
