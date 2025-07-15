#!/bin/bash

# Comprehensive QA & System Optimization Initiative
# Phase 1: Code Duplication Detection

set -e

echo "=== Gary-Zero Code Duplication Analysis ==="
echo "Detecting code duplicates for optimization opportunities..."

# Create reports directory
mkdir -p reports/qa-audit

# Check if jscpd is available globally, if not install it temporarily
if ! command -v jscpd &> /dev/null; then
    echo "📥 Installing jscpd for duplication detection..."
    npm install -g jscpd 2>/dev/null || echo "Note: Could not install jscpd globally, trying local install"
    
    # Try local install if global fails
    if ! command -v jscpd &> /dev/null; then
        npm install --no-save jscpd 2>/dev/null || echo "Warning: Could not install jscpd"
    fi
fi

echo "🔍 Analyzing code duplication..."

# Generate timestamp for reports
timestamp=$(date +"%Y%m%d_%H%M%S")

# Configure jscpd options for thorough analysis
min_lines=10
min_tokens=50
output_dir="reports/qa-audit/duplication_$timestamp"

# Create output directory
mkdir -p "$output_dir"

# Run duplication analysis with multiple output formats
echo "Running jscpd analysis..." > "$output_dir/duplication-summary.txt"
echo "=========================" >> "$output_dir/duplication-summary.txt"
echo "Date: $(date)" >> "$output_dir/duplication-summary.txt"
echo "Minimum lines: $min_lines" >> "$output_dir/duplication-summary.txt"
echo "Minimum tokens: $min_tokens" >> "$output_dir/duplication-summary.txt"
echo "" >> "$output_dir/duplication-summary.txt"

# Run jscpd if available
if command -v jscpd &> /dev/null; then
    echo "✅ Running jscpd duplication detection..."
    jscpd \
        --min-lines $min_lines \
        --min-tokens $min_tokens \
        --formats typescript,tsx,javascript,jsx \
        --reporters json,html,console \
        --output "$output_dir" \
        --gitignore \
        --ignore "node_modules/**,out/**,build/**,.git/**,*.d.ts" \
        . >> "$output_dir/duplication-summary.txt" 2>&1 || echo "jscpd completed with warnings"
else
    echo "⚠️  jscpd not available, using alternative analysis..."
    
    # Alternative: Manual duplication detection using basic tools
    echo "Manual Duplication Analysis" > "$output_dir/manual-duplication.txt"
    echo "==========================" >> "$output_dir/manual-duplication.txt"
    echo "Date: $(date)" >> "$output_dir/manual-duplication.txt"
    echo "" >> "$output_dir/manual-duplication.txt"
    
    # Find similar file sizes (potential duplicates)
    echo "Files with similar sizes (potential duplicates):" >> "$output_dir/manual-duplication.txt"
    find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
        ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
        -exec wc -l {} \; | sort -n | uniq -d -w5 >> "$output_dir/manual-duplication.txt"
    
    echo "" >> "$output_dir/manual-duplication.txt"
    
    # Find files with similar names (potential naming pattern issues)
    echo "Files with similar naming patterns:" >> "$output_dir/manual-duplication.txt"
    find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
        ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
        -printf "%f\n" | sort | uniq -c | sort -nr | head -20 >> "$output_dir/manual-duplication.txt"
fi

# Find potential duplicate function/class names
echo "🔍 Analyzing function and class name duplicates..."
echo "Function/Class Name Analysis" > "$output_dir/name-duplicates.txt"
echo "============================" >> "$output_dir/name-duplicates.txt"
echo "Date: $(date)" >> "$output_dir/name-duplicates.txt"
echo "" >> "$output_dir/name-duplicates.txt"

echo "Potential duplicate function names:" >> "$output_dir/name-duplicates.txt"
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
    ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
    -exec grep -h "function \|const .* = \|export function \|export const .* =" {} \; \
    | sed 's/.*function \([a-zA-Z_][a-zA-Z0-9_]*\).*/\1/' \
    | sed 's/.*const \([a-zA-Z_][a-zA-Z0-9_]*\) = .*/\1/' \
    | sort | uniq -c | sort -nr | head -20 >> "$output_dir/name-duplicates.txt"

echo "" >> "$output_dir/name-duplicates.txt"
echo "Potential duplicate class names:" >> "$output_dir/name-duplicates.txt"
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
    ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
    -exec grep -h "class \|export class " {} \; \
    | sed 's/.*class \([a-zA-Z_][a-zA-Z0-9_]*\).*/\1/' \
    | sort | uniq -c | sort -nr | head -20 >> "$output_dir/name-duplicates.txt"

# Analyze import statement patterns for potential consolidation
echo "📦 Analyzing import patterns..."
echo "Import Pattern Analysis" > "$output_dir/import-patterns.txt"
echo "======================" >> "$output_dir/import-patterns.txt"
echo "Date: $(date)" >> "$output_dir/import-patterns.txt"
echo "" >> "$output_dir/import-patterns.txt"

echo "Most frequently imported modules:" >> "$output_dir/import-patterns.txt"
find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
    ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
    -exec grep -h "^import.*from ['\"]" {} \; \
    | sed 's/.*from [\x27\x22]\([^[\x27\x22]*\)[\x27\x22].*/\1/' \
    | sort | uniq -c | sort -nr | head -20 >> "$output_dir/import-patterns.txt"

echo "" >> "$output_dir/import-patterns.txt"
echo "Potential barrel import opportunities (modules imported from same path):" >> "$output_dir/import-patterns.txt"
find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
    ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
    -exec grep -h "^import.*from ['\"]\\./.*['\"]" {} \; \
    | sed 's/.*from [\x27\x22]\([^[\x27\x22]*\)[\x27\x22].*/\1/' \
    | sed 's/\/[^\/]*$//' \
    | sort | uniq -c | sort -nr | head -15 >> "$output_dir/import-patterns.txt"

# Create summary report
echo "📊 Generating summary report..."
{
    echo "=== Code Duplication Analysis Summary ==="
    echo "Date: $(date)"
    echo "Output Directory: $output_dir"
    echo ""
    echo "Reports Generated:"
    ls -la "$output_dir"
    echo ""
    echo "Analysis Complete!"
    echo ""
    echo "Next Steps:"
    echo "1. Review duplication reports for consolidation opportunities"
    echo "2. Identify utility functions that can be shared"
    echo "3. Look for barrel export opportunities"
    echo "4. Consider code splitting for large duplicate blocks"
    echo ""
    echo "To view results:"
    echo "  - HTML Report: open $output_dir/jscpd-report.html (if available)"
    echo "  - Summary: cat $output_dir/duplication-summary.txt"
    echo "  - Name Analysis: cat $output_dir/name-duplicates.txt"
    echo "  - Import Patterns: cat $output_dir/import-patterns.txt"
} > "$output_dir/README.txt"

echo "✅ Code duplication analysis complete!"
echo "📁 Reports saved to: $output_dir"
echo "📄 Quick summary: cat $output_dir/README.txt"