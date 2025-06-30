#!/bin/bash
# Build script for Gide Coding Agent Extension
# This script ensures the extension is properly built with yarn

set -e

echo "Building Gide Coding Agent Extension..."

# Change to extension directory
cd "$(dirname "$0")/extensions/gide-coding-agent"

# Check if yarn is available
if ! command -v yarn &> /dev/null; then
    echo "Error: yarn is not installed. Please install yarn first."
    echo "Visit: https://yarnpkg.com/getting-started/install"
    exit 1
fi

# Install dependencies
echo "Installing dependencies with yarn..."
yarn install --frozen-lockfile

# Build the extension
echo "Building extension..."
yarn build

echo "Gide Coding Agent Extension built successfully!"
echo "Extension output available in: extensions/gide-coding-agent/out/"