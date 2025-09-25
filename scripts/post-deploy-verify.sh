#!/bin/bash
SERVICE_URL="https://glide-code-production.up.railway.app"

echo "🚀 Post-deployment verification..."

# Health check
if curl -f "$SERVICE_URL/healthz" > /dev/null 2>&1; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi

# Metrics check  
if curl -f "$SERVICE_URL/metrics" > /dev/null 2>&1; then
    echo "✅ Metrics endpoint accessible"
else
    echo "⚠️ Metrics endpoint unavailable"
fi

echo "🎉 Deployment verification complete"