#!/bin/bash
echo "🔍 Verifying Glide build..."

# Check core VS Code components
[ -f "build/.npmrc" ] && echo "✅ Build config present" || echo "❌ Missing build/.npmrc"
[ -d "extensions/gide-coding-agent" ] && echo "✅ Gide extension present" || echo "❌ Missing Gide extension"

# Validate model configuration
if [ -f "extensions/gide-coding-agent/src/models/config.ts" ]; then
    echo "✅ Model configuration present"
else
    echo "❌ Missing approved model configuration"
fi

# Test health endpoint availability
if node -e "
const fs = require('fs');
const content = fs.readFileSync('scripts/railway-vscode-server.mjs', 'utf8');
if (content.includes('/healthz') && content.includes('/metrics')) {
    console.log('✅ Health and metrics endpoints configured');
    process.exit(0);
} else {
    console.log('❌ Health or metrics endpoints missing');
    process.exit(1);
}
"; then
    echo "Health check passed"
fi

# Validate railpack.json
if [ -f "railpack.json" ] && cat railpack.json | jq '.' > /dev/null 2>&1; then
    echo "✅ Valid railpack.json configuration"
else
    echo "❌ Invalid or missing railpack.json"
fi

echo "🎯 Build verification complete"