#!/bin/bash

# Comprehensive QA & System Optimization Initiative
# Phase 1: File System Analysis and Deduplication Detection

set -e

echo "=== Gary-Zero File System Analysis ==="
echo "Starting comprehensive file system audit..."

# Create reports directory
mkdir -p reports/qa-audit

# Task 1.1: Dependency audit and cleanup
echo "📦 Running dependency audit..."
echo "Dependency Audit Results" > reports/qa-audit/dependency-audit.txt
echo "========================" >> reports/qa-audit/dependency-audit.txt
echo "Date: $(date)" >> reports/qa-audit/dependency-audit.txt
echo "" >> reports/qa-audit/dependency-audit.txt

# Check for yarn vs npm usage
if [ -f "yarn.lock" ]; then
    echo "Using Yarn package manager" >> reports/qa-audit/dependency-audit.txt
    echo "yarn audit --level moderate" >> reports/qa-audit/dependency-audit.txt
    yarn audit --level moderate >> reports/qa-audit/dependency-audit.txt 2>&1 || echo "Audit completed with warnings"
    
    echo "" >> reports/qa-audit/dependency-audit.txt
    echo "Yarn outdated packages:" >> reports/qa-audit/dependency-audit.txt
    yarn outdated >> reports/qa-audit/dependency-audit.txt 2>&1 || echo "No outdated packages or check failed"
else
    echo "Using NPM package manager" >> reports/qa-audit/dependency-audit.txt
    npm audit --audit-level moderate >> reports/qa-audit/dependency-audit.txt 2>&1 || echo "Audit completed with warnings"
    
    echo "" >> reports/qa-audit/dependency-audit.txt
    echo "NPM outdated packages:" >> reports/qa-audit/dependency-audit.txt
    npm outdated >> reports/qa-audit/dependency-audit.txt 2>&1 || echo "No outdated packages or check failed"
fi

# Task 1.2: Find duplicate files
echo "🔍 Scanning for duplicate files..."
echo "Duplicate Files Analysis" > reports/qa-audit/duplicate-files.txt
echo "=======================" >> reports/qa-audit/duplicate-files.txt
echo "Date: $(date)" >> reports/qa-audit/duplicate-files.txt
echo "" >> reports/qa-audit/duplicate-files.txt

echo "Scanning TypeScript and JavaScript files for duplicates..." >> reports/qa-audit/duplicate-files.txt
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" -exec md5sum {} \; | sort | uniq -d -w32 >> reports/qa-audit/duplicate-files.txt

# Count total files analyzed
total_files=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" | wc -l)
echo "" >> reports/qa-audit/duplicate-files.txt
echo "Total files analyzed: $total_files" >> reports/qa-audit/duplicate-files.txt

# Task 1.3: File size analysis
echo "📊 Analyzing file sizes..."
echo "File Size Analysis" > reports/qa-audit/file-sizes.txt
echo "==================" >> reports/qa-audit/file-sizes.txt
echo "Date: $(date)" >> reports/qa-audit/file-sizes.txt
echo "" >> reports/qa-audit/file-sizes.txt

echo "Top 20 largest source files:" >> reports/qa-audit/file-sizes.txt
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" -exec wc -l {} \; | sort -nr | head -20 >> reports/qa-audit/file-sizes.txt

echo "" >> reports/qa-audit/file-sizes.txt
echo "Files over 500 lines (potential refactoring candidates):" >> reports/qa-audit/file-sizes.txt
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" -exec wc -l {} \; | awk '$1 > 500' | sort -nr >> reports/qa-audit/file-sizes.txt

# Task 1.4: Import/Export analysis
echo "📋 Analyzing import/export patterns..."
echo "Import/Export Analysis" > reports/qa-audit/imports-exports.txt
echo "======================" >> reports/qa-audit/imports-exports.txt
echo "Date: $(date)" >> reports/qa-audit/imports-exports.txt
echo "" >> reports/qa-audit/imports-exports.txt

echo "Files with most imports (potential over-coupling):" >> reports/qa-audit/imports-exports.txt
find . -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" -exec sh -c 'echo "$(grep -c "^import" "$1" 2>/dev/null || echo 0) $1"' _ {} \; | sort -nr | head -20 >> reports/qa-audit/imports-exports.txt

echo "" >> reports/qa-audit/imports-exports.txt
echo "Circular dependency candidates (files importing from same directory):" >> reports/qa-audit/imports-exports.txt
find . -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" -exec grep -l "from '\\./" {} \; | head -10 >> reports/qa-audit/imports-exports.txt

# Task 1.5: Package.json analysis
echo "📦 Analyzing package.json structure..."
echo "Package.json Analysis" > reports/qa-audit/package-analysis.txt
echo "===================" >> reports/qa-audit/package-analysis.txt
echo "Date: $(date)" >> reports/qa-audit/package-analysis.txt
echo "" >> reports/qa-audit/package-analysis.txt

if [ -f "package.json" ]; then
    echo "Dependencies count:" >> reports/qa-audit/package-analysis.txt
    deps_count=$(cat package.json | jq '.dependencies | length' 2>/dev/null || echo "Could not parse JSON")
    dev_deps_count=$(cat package.json | jq '.devDependencies | length' 2>/dev/null || echo "Could not parse JSON")
    echo "Production dependencies: $deps_count" >> reports/qa-audit/package-analysis.txt
    echo "Development dependencies: $dev_deps_count" >> reports/qa-audit/package-analysis.txt
    
    echo "" >> reports/qa-audit/package-analysis.txt
    echo "Scripts available:" >> reports/qa-audit/package-analysis.txt
    cat package.json | jq -r '.scripts | keys[]' 2>/dev/null | head -20 >> reports/qa-audit/package-analysis.txt || echo "Could not parse scripts"
fi

# Summary
echo "✅ File system analysis complete!"
echo ""
echo "📁 Reports generated in reports/qa-audit/:"
echo "  - dependency-audit.txt"
echo "  - duplicate-files.txt" 
echo "  - file-sizes.txt"
echo "  - imports-exports.txt"
echo "  - package-analysis.txt"
echo ""
echo "Next steps:"
echo "  1. Review duplicate files for consolidation opportunities"
echo "  2. Address files over 500 lines for potential refactoring"
echo "  3. Investigate high import counts for architecture improvements"
echo "  4. Run code duplication detection with 'scripts/qa-audit/code-duplication-analysis.sh'"