#!/bin/bash
# Build script for Gide Coding Agent Extension
# This script builds the extension with npm (preferred) or yarn

set -e

echo "Building Gide Coding Agent Extension..."

# Change to extension directory
cd "$(dirname "$0")/extensions/gide-coding-agent"

# Check for package managers (prefer npm for Railway compatibility)
if command -v npm &> /dev/null; then
    echo "Using npm for package management..."
    echo "Installing dependencies..."
    npm install
    echo "Building extension..."
    npm run build
elif command -v yarn &> /dev/null; then
    echo "Using yarn for package management..."
    echo "Installing dependencies..."
    yarn install
    echo "Building extension..."
    yarn build
else
    echo "Error: Neither npm nor yarn is installed."
    echo "Please install Node.js (which includes npm) or yarn."
    exit 1
fi

echo "Gide Coding Agent Extension built successfully!"
echo "Extension output available in: extensions/gide-coding-agent/out/"