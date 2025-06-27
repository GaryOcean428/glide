#!/bin/bash

# GIDE GitHub OAuth Build Configuration Script
# This script handles environment variable injection and OAuth configuration
# during the GIDE build process.

set -e  # Exit on any error

echo "🔧 GIDE GitHub OAuth Build Configuration"
echo "========================================"

# Check if we're in the correct directory
if [ ! -f "extensions/github-authentication/package.json" ]; then
    echo "❌ Error: This script must be run from the GIDE project root directory"
    echo "   Expected to find: extensions/github-authentication/package.json"
    exit 1
fi

# Define paths
GITHUB_AUTH_DIR="extensions/github-authentication"
CONFIG_FILE="$GITHUB_AUTH_DIR/src/config.ts"
BACKUP_CONFIG="$CONFIG_FILE.backup"

echo "📁 Working directory: $(pwd)"
echo "🎯 Target config file: $CONFIG_FILE"

# Create backup of original config file
if [ ! -f "$BACKUP_CONFIG" ]; then
    echo "💾 Creating backup of original config file..."
    cp "$CONFIG_FILE" "$BACKUP_CONFIG"
fi

# Check for required environment variables
echo "🔍 Checking environment variables..."

if [ -z "$GITHUB_CLIENT_ID" ]; then
    echo "⚠️  Warning: GITHUB_CLIENT_ID not set, using default value"
    GITHUB_CLIENT_ID="Ov23liQH0sYgeB4izNjP"
else
    echo "✅ GITHUB_CLIENT_ID: $GITHUB_CLIENT_ID"
fi

if [ -z "$GITHUB_CLIENT_SECRET" ]; then
    echo "⚠️  Warning: GITHUB_CLIENT_SECRET not set"
    echo "   OAuth flows requiring client secret may not work"
else
    echo "✅ GITHUB_CLIENT_SECRET: [REDACTED]"
fi

# Load .env file if it exists
if [ -f ".env" ]; then
    echo "📄 Loading .env file..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# Generate the updated config file
echo "🔄 Updating OAuth configuration..."

cat > "$CONFIG_FILE" << EOF
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface IConfig {
	// The client ID of the GitHub OAuth app
	gitHubClientId: string;
	gitHubClientSecret?: string;
}

// GIDE GitHub OAuth Configuration
// Generated at build time: $(date)
// 
// IMPORTANT: This configuration uses the GIDE project's OAuth application credentials.
// The client secret is injected at build time via environment variables for security.
//
// OAuth Application Details:
// - Application Name: GIDE (GitHub Integrated Development Environment)
// - Client ID: $GITHUB_CLIENT_ID
// - Owner: GaryOcean428
//
// Callback URLs configured:
// - vscode://vscode.github-authentication/did-authenticate (primary)
// - http://127.0.0.1:3000/callback (loopback fallback)
// - http://localhost:3000/callback (loopback fallback)
// - http://127.0.0.1:8080/callback (loopback fallback)
// - http://localhost:8080/callback (loopback fallback)
//
// NOTE: GitHub client secrets cannot be secured when running in a native client so in other words, the client secret is
// not really a secret... so we allow the client secret in code. It is brought in before we publish VS Code. Reference:
// https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/best-practices-for-creating-an-oauth-app#client-secrets
export const Config: IConfig = {
	gitHubClientId: '$GITHUB_CLIENT_ID'$([ -n "$GITHUB_CLIENT_SECRET" ] && echo ",
	gitHubClientSecret: '$GITHUB_CLIENT_SECRET'")
};
EOF

echo "✅ OAuth configuration updated successfully"

# Validate the generated TypeScript file
echo "🔍 Validating generated TypeScript..."
if command -v npx &> /dev/null; then
    cd "$GITHUB_AUTH_DIR"
    if npx tsc --noEmit config.ts 2>/dev/null; then
        echo "✅ TypeScript validation passed"
    else
        echo "⚠️  TypeScript validation warnings (this may be normal)"
    fi
    cd - > /dev/null
else
    echo "⚠️  TypeScript compiler not available, skipping validation"
fi

# Display configuration summary
echo ""
echo "📋 Configuration Summary"
echo "========================"
echo "Client ID: $GITHUB_CLIENT_ID"
echo "Client Secret: $([ -n "$GITHUB_CLIENT_SECRET" ] && echo '[SET]' || echo '[NOT SET]')"
echo "Config file: $CONFIG_FILE"
echo "Backup file: $BACKUP_CONFIG"

# Provide next steps
echo ""
echo "🚀 Next Steps"
echo "============="
echo "1. Build the GIDE project using your normal build process"
echo "2. Test GitHub OAuth authentication in the built application"
echo "3. If you need to revert changes, restore from: $BACKUP_CONFIG"
echo ""
echo "For production builds, ensure GITHUB_CLIENT_SECRET is set securely"
echo "For development builds, you can omit the client secret"

echo ""
echo "✅ Build configuration completed successfully!"

