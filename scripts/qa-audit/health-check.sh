#!/bin/bash

# Comprehensive QA & System Optimization Initiative
# Master Health Check Script - Runs all QA audits

set -e

echo "=============================================="
echo "   Gary-Zero Comprehensive Health Check"
echo "   QA & System Optimization Initiative"
echo "=============================================="
echo "Date: $(date)"
echo ""

# Create main reports directory
mkdir -p reports/qa-audit
mkdir -p reports/qa-audit/archive

# Archive previous reports if they exist
if [ -f "reports/qa-audit/health-check-summary.txt" ]; then
    timestamp=$(date +"%Y%m%d_%H%M%S")
    mv reports/qa-audit/health-check-summary.txt "reports/qa-audit/archive/health-check-summary_$timestamp.txt" 2>/dev/null || true
fi

# Initialize summary report
{
    echo "=== Gary-Zero Health Check Summary ==="
    echo "Date: $(date)"
    echo "======================================"
    echo ""
} > reports/qa-audit/health-check-summary.txt

# Phase 1: Critical Analysis (Week 1)
echo "🔴 Phase 1: Critical Analysis (Week 1)"
echo "========================================="

# Task 1.1: File System Analysis
echo "📊 Running File System Analysis..."
if [ -f "scripts/qa-audit/file-system-analysis.sh" ]; then
    bash scripts/qa-audit/file-system-analysis.sh
    echo "✅ File System Analysis: COMPLETED" >> reports/qa-audit/health-check-summary.txt
else
    echo "❌ File System Analysis script not found" >> reports/qa-audit/health-check-summary.txt
fi
echo ""

# Task 1.2: Code Duplication Detection
echo "🔍 Running Code Duplication Analysis..."
if [ -f "scripts/qa-audit/code-duplication-analysis.sh" ]; then
    bash scripts/qa-audit/code-duplication-analysis.sh
    echo "✅ Code Duplication Analysis: COMPLETED" >> reports/qa-audit/health-check-summary.txt
else
    echo "❌ Code Duplication Analysis script not found" >> reports/qa-audit/health-check-summary.txt
fi
echo ""

# Task 1.3: Bundle Analysis
echo "📦 Running Bundle Analysis..."
if [ -f "scripts/qa-audit/bundle-analysis.sh" ]; then
    bash scripts/qa-audit/bundle-analysis.sh
    echo "✅ Bundle Analysis: COMPLETED" >> reports/qa-audit/health-check-summary.txt
else
    echo "❌ Bundle Analysis script not found" >> reports/qa-audit/health-check-summary.txt
fi
echo ""

# Phase 2: Architecture Analysis (Week 2)
echo "🟡 Phase 2: Architecture Analysis (Week 2)"
echo "============================================"

# Task 2.1: Component Architecture Audit
echo "🏗️ Running Component Architecture Audit..."
if [ -f "scripts/qa-audit/component-architecture-audit.sh" ]; then
    bash scripts/qa-audit/component-architecture-audit.sh
    echo "✅ Component Architecture Audit: COMPLETED" >> reports/qa-audit/health-check-summary.txt
else
    echo "❌ Component Architecture Audit script not found" >> reports/qa-audit/health-check-summary.txt
fi
echo ""

# Phase 3: Security and Performance
echo "🔒 Security and Performance Analysis"
echo "====================================="

# Task 3.1: Security Analysis
echo "🛡️ Running Security Analysis..."
{
    echo ""
    echo "Security Analysis Results"
    echo "========================"
    echo "Date: $(date)"
    echo ""
    
    # Check for common security issues
    echo "Potential security concerns:"
    
    # Check for hardcoded secrets
    secret_files=$(find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" -o -name "*.json" \) \
        ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
        -exec grep -l "password\|secret\|key.*['\"][a-zA-Z0-9]\{20,\}" {} \; 2>/dev/null | wc -l)
    echo "Files with potential hardcoded secrets: $secret_files"
    
    # Check for unsafe eval usage
    eval_usage=$(find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" \) \
        ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
        -exec grep -l "eval(" {} \; 2>/dev/null | wc -l)
    echo "Files using eval(): $eval_usage"
    
    # Check for console.log statements (potential info leakage)
    console_logs=$(find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" \) \
        ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
        -exec grep -l "console\.log" {} \; 2>/dev/null | wc -l)
    echo "Files with console.log statements: $console_logs"
    
    echo ""
    echo "Recommendations:"
    echo "- Remove or secure any hardcoded secrets"
    echo "- Replace eval() with safer alternatives"
    echo "- Remove debug console.log statements from production"
    echo "- Implement proper environment variable management"
    
} > reports/qa-audit/security-analysis.txt

echo "✅ Security Analysis: COMPLETED" >> reports/qa-audit/health-check-summary.txt
echo ""

# Task 3.2: Performance Metrics
echo "⚡ Analyzing Performance Metrics..."
{
    echo ""
    echo "Performance Analysis Results"
    echo "============================"
    echo "Date: $(date)"
    echo ""
    
    # File count analysis
    total_ts_files=$(find . -name "*.ts" -o -name "*.tsx" ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" | wc -l)
    total_js_files=$(find . -name "*.js" -o -name "*.jsx" ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" | wc -l)
    
    echo "Codebase size metrics:"
    echo "TypeScript files: $total_ts_files"
    echo "JavaScript files: $total_js_files"
    echo "Total source files: $((total_ts_files + total_js_files))"
    
    # Calculate average file size
    if [ $((total_ts_files + total_js_files)) -gt 0 ]; then
        avg_lines=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
            ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
            -exec wc -l {} \; | awk '{sum += $1; count++} END {if(count>0) print int(sum/count); else print 0}')
        echo "Average file size: $avg_lines lines"
    fi
    
    echo ""
    echo "Bundle impact assessment:"
    large_files=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
        ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
        -exec wc -l {} \; | awk '$1 > 500' | wc -l)
    echo "Large files (>500 lines): $large_files"
    
    echo ""
    echo "Performance recommendations:"
    echo "- Consider code splitting for files over 500 lines"
    echo "- Implement lazy loading for route components"
    echo "- Use React.memo() for expensive components"
    echo "- Optimize bundle size with tree-shaking"
    
} > reports/qa-audit/performance-analysis.txt

echo "✅ Performance Analysis: COMPLETED" >> reports/qa-audit/health-check-summary.txt
echo ""

# Generate final comprehensive summary
echo "📋 Generating Comprehensive Summary..."
{
    echo ""
    echo "=== HEALTH CHECK RESULTS SUMMARY ==="
    echo "Date: $(date)"
    echo ""
    
    echo "📊 Reports Generated:"
    echo "===================="
    if [ -f "reports/qa-audit/dependency-audit.txt" ]; then
        echo "✅ Dependency Audit Report"
    fi
    if [ -f "reports/qa-audit/duplicate-files.txt" ]; then
        echo "✅ Duplicate Files Analysis"
    fi
    if [ -f "reports/qa-audit/file-sizes.txt" ]; then
        echo "✅ File Size Analysis"
    fi
    if [ -f "reports/qa-audit/bundle-analysis.txt" ]; then
        echo "✅ Bundle Analysis Report"
    fi
    if [ -f "reports/qa-audit/component-architecture.txt" ]; then
        echo "✅ Component Architecture Report"
    fi
    if [ -f "reports/qa-audit/security-analysis.txt" ]; then
        echo "✅ Security Analysis Report"
    fi
    if [ -f "reports/qa-audit/performance-analysis.txt" ]; then
        echo "✅ Performance Analysis Report"
    fi
    
    echo ""
    echo "🎯 Key Metrics:"
    echo "==============="
    
    # Extract key metrics from reports
    if [ -f "reports/qa-audit/file-sizes.txt" ]; then
        total_files=$(grep "Total files analyzed:" reports/qa-audit/file-sizes.txt | cut -d: -f2 | tr -d ' ' || echo "N/A")
        echo "Total source files: $total_files"
    fi
    
    if [ -f "reports/qa-audit/component-architecture.txt" ]; then
        react_components=$(grep "React/JSX components:" reports/qa-audit/component-architecture.txt | cut -d: -f2 | tr -d ' ' || echo "N/A")
        echo "React/JSX components: $react_components"
    fi
    
    echo ""
    echo "🚨 Priority Actions:"
    echo "==================="
    echo "1. Review duplicate files for consolidation"
    echo "2. Refactor components over 200 lines"
    echo "3. Implement proper prop interfaces"
    echo "4. Set up bundle size monitoring"
    echo "5. Address security concerns if any"
    
    echo ""
    echo "📈 Success Criteria Progress:"
    echo "============================="
    echo "⏳ Test Coverage: TBD (implement coverage reporting)"
    echo "⏳ Performance: TBD (implement performance monitoring)"
    echo "⏳ Bundle Size: TBD (implement bundlesize checks)"
    echo "✅ Code Quality: Analysis tools implemented"
    
    echo ""
    echo "📅 Next Steps:"
    echo "=============="
    echo "Week 1: Address critical findings from file system analysis"
    echo "Week 2: Implement component architecture improvements"
    echo "Week 3: Set up testing and performance monitoring"
    echo "Week 4: Establish ongoing monitoring and CI/CD integration"
    
} >> reports/qa-audit/health-check-summary.txt

# Display final summary
echo ""
echo "=============================================="
echo "         HEALTH CHECK COMPLETE!"
echo "=============================================="
echo ""
echo "📁 All reports saved to: reports/qa-audit/"
echo ""
echo "📄 Key reports to review:"
echo "  • Health Check Summary: reports/qa-audit/health-check-summary.txt"
echo "  • File System Analysis: reports/qa-audit/dependency-audit.txt"
echo "  • Code Duplication: reports/qa-audit/duplication_*/README.txt"
echo "  • Bundle Analysis: reports/qa-audit/bundle-analysis.txt"
echo "  • Component Architecture: reports/qa-audit/component-architecture.txt"
echo "  • Security Analysis: reports/qa-audit/security-analysis.txt"
echo "  • Performance Analysis: reports/qa-audit/performance-analysis.txt"
echo ""
echo "🔄 To run again: bash scripts/qa-audit/health-check.sh"
echo ""
echo "✅ QA & System Optimization Initiative Phase 1 Complete!"