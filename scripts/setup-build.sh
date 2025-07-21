#!/bin/bash
set -e

# --- Ensure build/ directory exists ---
mkdir -p build

# --- Ensure build/.npmrc exists with default config ---
if [ ! -f build/.npmrc ]; then
  cat > build/.npmrc <<'EONPM'
registry=https://registry.npmjs.org/
package-lock=false
save-exact=true
audit=false
fund=false
scripts-prepend-node-path=true
EONPM
  echo "✅ Created build/.npmrc"
else
  echo "ℹ️ build/.npmrc already exists"
fi

# --- Validate Docker context & print contents for debug ---
if [ -d build ]; then
  echo "🗂️ build/ directory contents:"
  ls -la build/
fi

# --- Check for .dockerignore exclusions and fix if necessary ---
if ! grep -q "!build/.npmrc" .dockerignore 2>/dev/null; then
  echo -e "\n# Ensure build context includes .npmrc\n!build/\n!build/.npmrc" >> .dockerignore
  echo "✅ Updated .dockerignore to include build/.npmrc"
fi

echo "🏁 Pre-build setup complete."
