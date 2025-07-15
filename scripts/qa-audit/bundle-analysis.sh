#!/bin/bash

# Comprehensive QA & System Optimization Initiative  
# Phase 1: Bundle Analysis & Optimization

set -e

echo "=== Gary-Zero Bundle Analysis & Optimization ==="
echo "Analyzing bundle size and optimization opportunities..."

# Create reports directory
mkdir -p reports/qa-audit

# Check if webpack-bundle-analyzer is available
analyzer_available=false
if command -v webpack-bundle-analyzer &> /dev/null; then
    analyzer_available=true
elif [ -f "node_modules/.bin/webpack-bundle-analyzer" ]; then
    analyzer_available=true
fi

# Bundle Analysis Report
echo "Bundle Analysis Report" > reports/qa-audit/bundle-analysis.txt
echo "=====================" >> reports/qa-audit/bundle-analysis.txt
echo "Date: $(date)" >> reports/qa-audit/bundle-analysis.txt
echo "" >> reports/qa-audit/bundle-analysis.txt

# Task 1: Analyze existing built bundles
echo "📊 Analyzing existing build outputs..."
if [ -d "out" ]; then
    echo "Build output analysis:" >> reports/qa-audit/bundle-analysis.txt
    echo "Build directory size:" >> reports/qa-audit/bundle-analysis.txt
    du -sh out/ >> reports/qa-audit/bundle-analysis.txt 2>/dev/null || echo "Could not analyze out directory"
    
    echo "" >> reports/qa-audit/bundle-analysis.txt
    echo "Largest files in build output:" >> reports/qa-audit/bundle-analysis.txt
    find out/ -type f -name "*.js" -exec wc -c {} \; 2>/dev/null | sort -nr | head -10 | while read size file; do
        echo "$(numfmt --to=iec $size) $file" >> reports/qa-audit/bundle-analysis.txt
    done || echo "No JavaScript files found in out directory" >> reports/qa-audit/bundle-analysis.txt
else
    echo "No 'out' directory found - build may not have been run" >> reports/qa-audit/bundle-analysis.txt
fi

# Task 2: Analyze source file sizes for bundle impact
echo "🔍 Analyzing source file impact on bundle size..."
echo "" >> reports/qa-audit/bundle-analysis.txt
echo "Source file size analysis:" >> reports/qa-audit/bundle-analysis.txt
echo "Top 15 largest TypeScript/JavaScript files:" >> reports/qa-audit/bundle-analysis.txt

find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
    ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
    -exec wc -c {} \; | sort -nr | head -15 | while read size file; do
    echo "$(numfmt --to=iec $size) $file" >> reports/qa-audit/bundle-analysis.txt
done

# Task 3: Check for bundlesize configuration
echo "" >> reports/qa-audit/bundle-analysis.txt
echo "Bundle size configuration:" >> reports/qa-audit/bundle-analysis.txt
if [ -f "package.json" ]; then
    if grep -q "bundlesize" package.json; then
        echo "✅ bundlesize configuration found in package.json" >> reports/qa-audit/bundle-analysis.txt
        grep -A 10 "bundlesize" package.json >> reports/qa-audit/bundle-analysis.txt 2>/dev/null || echo "Could not extract bundlesize config"
    else
        echo "⚠️  No bundlesize configuration found in package.json" >> reports/qa-audit/bundle-analysis.txt
        echo "Consider adding bundlesize for monitoring" >> reports/qa-audit/bundle-analysis.txt
    fi
fi

# Task 4: Analyze dependencies that might affect bundle size
echo "" >> reports/qa-audit/bundle-analysis.txt
echo "Dependency bundle impact analysis:" >> reports/qa-audit/bundle-analysis.txt

if [ -f "package.json" ]; then
    echo "Large dependencies (potential bundle impact):" >> reports/qa-audit/bundle-analysis.txt
    
    # Check node_modules sizes if available
    if [ -d "node_modules" ]; then
        echo "Top 10 largest installed dependencies:" >> reports/qa-audit/bundle-analysis.txt
        du -sh node_modules/* 2>/dev/null | sort -hr | head -10 >> reports/qa-audit/bundle-analysis.txt || echo "Could not analyze node_modules"
    fi
    
    echo "" >> reports/qa-audit/bundle-analysis.txt
    echo "Dependencies count:" >> reports/qa-audit/bundle-analysis.txt
    deps=$(cat package.json | jq '.dependencies | length' 2>/dev/null || echo "Could not count dependencies")
    dev_deps=$(cat package.json | jq '.devDependencies | length' 2>/dev/null || echo "Could not count dev dependencies")
    echo "Production dependencies: $deps" >> reports/qa-audit/bundle-analysis.txt
    echo "Development dependencies: $dev_deps" >> reports/qa-audit/bundle-analysis.txt
fi

# Task 5: Check for webpack configuration
echo "" >> reports/qa-audit/bundle-analysis.txt
echo "Webpack configuration analysis:" >> reports/qa-audit/bundle-analysis.txt

webpack_configs=(
    "webpack.config.js"
    "webpack.config.ts"
    "webpack.prod.js"
    "webpack.dev.js"
    "build/webpack.config.js"
)

config_found=false
for config in "${webpack_configs[@]}"; do
    if [ -f "$config" ]; then
        echo "✅ Webpack config found: $config" >> reports/qa-audit/bundle-analysis.txt
        config_found=true
        
        # Check for optimization settings
        if grep -q "optimization" "$config"; then
            echo "  - Optimization settings detected" >> reports/qa-audit/bundle-analysis.txt
        fi
        if grep -q "splitChunks" "$config"; then
            echo "  - Code splitting configuration detected" >> reports/qa-audit/bundle-analysis.txt
        fi
        if grep -q "TerserPlugin\|UglifyJsPlugin" "$config"; then
            echo "  - Minification configuration detected" >> reports/qa-audit/bundle-analysis.txt
        fi
    fi
done

if [ "$config_found" = false ]; then
    echo "⚠️  No webpack configuration files found" >> reports/qa-audit/bundle-analysis.txt
fi

# Task 6: Generate optimization recommendations
echo "" >> reports/qa-audit/bundle-analysis.txt
echo "Bundle optimization recommendations:" >> reports/qa-audit/bundle-analysis.txt
echo "===================================" >> reports/qa-audit/bundle-analysis.txt

# Check for potential optimizations
large_files=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
    ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
    -exec wc -c {} \; | awk '$1 > 50000' | wc -l)

if [ "$large_files" -gt 0 ]; then
    echo "📦 Consider code splitting for $large_files files over 50KB" >> reports/qa-audit/bundle-analysis.txt
fi

# Check for multiple similar imports
echo "📦 Consider barrel exports for related modules" >> reports/qa-audit/bundle-analysis.txt
echo "📦 Implement tree-shaking for unused code elimination" >> reports/qa-audit/bundle-analysis.txt
echo "📦 Use dynamic imports for route-based code splitting" >> reports/qa-audit/bundle-analysis.txt
echo "📦 Consider lazy loading for non-critical components" >> reports/qa-audit/bundle-analysis.txt

# Create bundlesize config if not exists
if [ -f "package.json" ] && ! grep -q "bundlesize" package.json; then
    echo "📝 Creating recommended bundlesize configuration..."
    
    cat > scripts/qa-audit/recommended-bundlesize.json << EOF
{
  "bundlesize": [
    {
      "path": "./out/**/*.js",
      "maxSize": "500kb",
      "compression": "gzip"
    },
    {
      "path": "./out/vs/loader.js",
      "maxSize": "200kb"
    },
    {
      "path": "./out/vs/workbench/workbench.web.main.js",
      "maxSize": "5mb"
    }
  ]
}
EOF
    
    echo "📁 Recommended bundlesize config created at scripts/qa-audit/recommended-bundlesize.json" >> reports/qa-audit/bundle-analysis.txt
    echo "   Add this to your package.json to enable bundle size monitoring" >> reports/qa-audit/bundle-analysis.txt
fi

# Summary
echo "✅ Bundle analysis complete!"
echo ""
echo "📁 Report generated: reports/qa-audit/bundle-analysis.txt"
echo "📄 View with: cat reports/qa-audit/bundle-analysis.txt"
echo ""
echo "Next steps:"
echo "  1. Review large files for code splitting opportunities"
echo "  2. Implement bundlesize monitoring" 
echo "  3. Configure webpack optimizations"
echo "  4. Set up bundle analysis in CI/CD"