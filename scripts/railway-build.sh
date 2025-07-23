#!/bin/bash
# Railway Build Script - Simplified for reliability
set -e

echo "🚀 Railway build - using minimal dependencies approach"

# Set environment variables
export NODE_ENV=production
export ELECTRON_SKIP_BINARY_DOWNLOAD=1
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

echo "📦 Installing minimal dependencies for Railway..."
# Install only essential packages needed for minimal server
npm install --no-optional --no-audit --no-fund express http-proxy-middleware

echo "✅ Railway build completed - minimal server ready!"
echo "🎯 Deployment will use fallback minimal server if full VS Code fails"