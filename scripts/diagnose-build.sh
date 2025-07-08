#!/bin/bash
# diagnose-build.sh - Diagnose build issues

echo "=== BUILD DIAGNOSTICS ==="
echo "Date: $(date)"
echo "Hostname: $(hostname)"
echo "User: $(whoami)"
echo ""

echo "=== SYSTEM INFO ==="
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME)"
echo "Kernel: $(uname -r)"
echo "Architecture: $(uname -m)"
echo ""

echo "=== RESOURCE INFO ==="
echo "Memory:"
free -h
echo ""
echo "Disk:"
df -h
echo ""
echo "CPU:"
nproc
echo ""

echo "=== NETWORK INFO ==="
echo "DNS Servers:"
cat /etc/resolv.conf
echo ""
echo "Network connectivity test:"
timeout 5 curl -I https://registry.npmjs.org/ || echo "npm registry unreachable"
timeout 5 curl -I https://deb.nodesource.com/ || echo "NodeSource unreachable"
timeout 5 curl -I https://deb.debian.org/ || echo "Debian repos unreachable"
echo ""

echo "=== APT SOURCES ==="
cat /etc/apt/sources.list
ls -la /etc/apt/sources.list.d/
echo ""

echo "=== NODE/NPM INFO ==="
which node && node --version || echo "Node not found"
which npm && npm --version || echo "npm not found"
which yarn && yarn --version || echo "yarn not found"
echo ""

echo "=== ENVIRONMENT VARIABLES ==="
env | grep -E "(NODE|NPM|DEBIAN|PORT|RAILWAY)" | sort
echo ""

echo "=== END DIAGNOSTICS ==="