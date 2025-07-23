#!/bin/bash
# Railway Build Script
# Handles Railway-specific build requirements and native module issues

set -e

echo "🚀 Starting Railway build process..."

# Set environment variables for Railway deployment
export NODE_ENV=production
export ELECTRON_SKIP_BINARY_DOWNLOAD=1
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export NPM_CONFIG_OPTIONAL=false
export SKIP_NATIVE_MODULES=1
export npm_config_target_platform=linux
export npm_config_arch=x64
export npm_config_disturl=https://nodejs.org/dist
export npm_config_runtime=node
export npm_config_build_from_source=false

echo "📋 Environment Configuration:"
echo "  Node.js: $(node --version)"
echo "  npm: $(npm --version)"
echo "  Platform: $npm_config_target_platform"
echo "  Architecture: $npm_config_arch"

echo "🔧 Configuring npm for Railway..."
npm config set registry https://registry.npmjs.org/
npm config set fetch-retries 5
npm config set legacy-peer-deps true

echo "📦 Installing production dependencies..."
# Try full install first, fallback to minimal if it fails
if npm install --omit=dev --omit=optional --legacy-peer-deps --no-audit --no-fund; then
    echo "✅ Full dependency installation successful"
else
    echo "⚠️  Full installation failed, trying minimal dependencies..."
    # Clean and try minimal install
    rm -rf node_modules package-lock.json
    npm install express http-proxy-middleware --no-optional --no-audit --no-fund
    echo "✅ Minimal dependency installation successful"
fi

echo "🧹 Cleaning up build artifacts..."
# Remove unnecessary files to reduce image size
rm -rf node_modules/.cache || true
rm -rf /tmp/.node-gyp || true

echo "✅ Railway build completed successfully!"

# Verify the build
echo "🔍 Build verification:"
if [ -f "scripts/railway-vscode-server.mjs" ]; then
    echo "  ✓ Full VS Code server script available"
fi

if [ -f "scripts/railway-minimal-server.mjs" ]; then
    echo "  ✓ Minimal fallback server available"
fi

echo "🎯 Railway deployment ready!"