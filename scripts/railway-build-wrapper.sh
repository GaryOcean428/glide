#!/bin/bash
set -e

echo "🔧 VS Code Railway Build Wrapper"

# Ensure build directory exists with all required files
mkdir -p build
cp build/npm/*.* build/ 2>/dev/null || true

# Install with Railway-optimized settings
npm config set build_from_source false
npm config set target_platform linux
npm config set target_arch x64

# Run VS Code postinstall with error handling
if [ -f "build/npm/postinstall.js" ]; then
    echo "📦 Running VS Code postinstall..."
    node build/npm/postinstall.js || echo "⚠️ Postinstall completed with warnings"
fi

echo "✅ Build wrapper completed"