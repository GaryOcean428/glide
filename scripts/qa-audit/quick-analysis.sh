#!/bin/bash

# Quick QA Analysis Test (without dependency audit)
set -e

echo "=== Quick Gary-Zero Analysis Test ==="
echo "Testing analysis capabilities..."

# Create reports directory
mkdir -p reports/qa-audit

# Task 1: Find duplicate files
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

# Task 2: File size analysis
echo "📊 Analyzing file sizes..."
echo "File Size Analysis" > reports/qa-audit/file-sizes.txt
echo "==================" >> reports/qa-audit/file-sizes.txt
echo "Date: $(date)" >> reports/qa-audit/file-sizes.txt
echo "" >> reports/qa-audit/file-sizes.txt

echo "Top 10 largest source files:" >> reports/qa-audit/file-sizes.txt
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" -exec wc -l {} \; | sort -nr | head -10 >> reports/qa-audit/file-sizes.txt

echo "" >> reports/qa-audit/file-sizes.txt
echo "Files over 500 lines (potential refactoring candidates):" >> reports/qa-audit/file-sizes.txt
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" -exec wc -l {} \; | awk '$1 > 500' | sort -nr >> reports/qa-audit/file-sizes.txt

# Summary
echo "✅ Quick analysis complete!"
echo ""
echo "📁 Reports generated in reports/qa-audit/:"
echo "  - duplicate-files.txt"
echo "  - file-sizes.txt"
echo ""
echo "📊 Summary:"
echo "Total files analyzed: $total_files"
echo ""
cat reports/qa-audit/file-sizes.txt | grep "Total\|over 500" || echo "No files over 500 lines found"