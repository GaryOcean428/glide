#!/bin/bash

# Comprehensive QA & System Optimization Initiative
# Phase 2: Component Architecture Audit

set -e

echo "=== Gary-Zero Component Architecture Audit ==="
echo "Analyzing component structure and architecture patterns..."

# Create reports directory
mkdir -p reports/qa-audit

# Component Architecture Report
echo "Component Architecture Analysis" > reports/qa-audit/component-architecture.txt
echo "===============================" >> reports/qa-audit/component-architecture.txt
echo "Date: $(date)" >> reports/qa-audit/component-architecture.txt
echo "" >> reports/qa-audit/component-architecture.txt

# Task 1: Find and analyze React/Vue components
echo "🔍 Analyzing component structure..."

# Look for React components (tsx files and jsx files)
react_components=$(find . -type f \( -name "*.tsx" -o -name "*.jsx" \) \
    ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
    | wc -l)

# Look for Vue components
vue_components=$(find . -type f -name "*.vue" \
    ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
    | wc -l)

echo "Component file count analysis:" >> reports/qa-audit/component-architecture.txt
echo "React/JSX components: $react_components" >> reports/qa-audit/component-architecture.txt
echo "Vue components: $vue_components" >> reports/qa-audit/component-architecture.txt
echo "" >> reports/qa-audit/component-architecture.txt

# Task 2: Analyze component sizes (lines of code)
echo "📊 Component size analysis..."
echo "Component size distribution:" >> reports/qa-audit/component-architecture.txt
echo "===========================" >> reports/qa-audit/component-architecture.txt

if [ "$react_components" -gt 0 ]; then
    echo "React/JSX component sizes (lines of code):" >> reports/qa-audit/component-architecture.txt
    find . -type f \( -name "*.tsx" -o -name "*.jsx" \) \
        ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
        -exec wc -l {} \; | sort -nr | head -20 >> reports/qa-audit/component-architecture.txt
    
    echo "" >> reports/qa-audit/component-architecture.txt
    echo "Components over 200 lines (refactoring candidates):" >> reports/qa-audit/component-architecture.txt
    find . -type f \( -name "*.tsx" -o -name "*.jsx" \) \
        ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
        -exec wc -l {} \; | awk '$1 > 200' | sort -nr >> reports/qa-audit/component-architecture.txt
    
    echo "" >> reports/qa-audit/component-architecture.txt
    echo "Components under 50 lines (potential for consolidation):" >> reports/qa-audit/component-architecture.txt
    find . -type f \( -name "*.tsx" -o -name "*.jsx" \) \
        ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
        -exec wc -l {} \; | awk '$1 < 50 && $1 > 10' | sort -n >> reports/qa-audit/component-architecture.txt
fi

# Task 3: Analyze prop interfaces and type definitions
echo "📝 Prop interface analysis..."
echo "" >> reports/qa-audit/component-architecture.txt
echo "Prop interface analysis:" >> reports/qa-audit/component-architecture.txt
echo "========================" >> reports/qa-audit/component-architecture.txt

# Count interfaces and types
interface_count=$(find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
    ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
    -exec grep -l "interface.*Props\|type.*Props" {} \; | wc -l)

echo "Files with prop interfaces: $interface_count" >> reports/qa-audit/component-architecture.txt

# Find components without proper prop typing
echo "" >> reports/qa-audit/component-architecture.txt
echo "Components potentially missing prop interfaces:" >> reports/qa-audit/component-architecture.txt
find . -type f \( -name "*.tsx" -o -name "*.jsx" \) \
    ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
    ! -exec grep -l "interface.*Props\|type.*Props\|React\.FC" {} \; >> reports/qa-audit/component-architecture.txt

# Task 4: Analyze hook usage patterns
echo "🪝 Hook usage analysis..."
echo "" >> reports/qa-audit/component-architecture.txt
echo "Hook usage patterns:" >> reports/qa-audit/component-architecture.txt
echo "====================" >> reports/qa-audit/component-architecture.txt

# Count different hook types
hook_files=$(find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
    ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
    -exec grep -l "use[A-Z]" {} \; | wc -l)

echo "Files using hooks: $hook_files" >> reports/qa-audit/component-architecture.txt

# Analyze hook complexity (files with many hooks)
echo "" >> reports/qa-audit/component-architecture.txt
echo "Components with high hook usage (potential complexity):" >> reports/qa-audit/component-architecture.txt
find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
    ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
    -exec sh -c 'count=$(grep -c "use[A-Z]" "$1" 2>/dev/null || echo 0); if [ "$count" -gt 5 ]; then echo "$count $1"; fi' _ {} \; \
    | sort -nr >> reports/qa-audit/component-architecture.txt

# Task 5: Directory structure analysis
echo "📁 Directory structure analysis..."
echo "" >> reports/qa-audit/component-architecture.txt
echo "Component directory structure:" >> reports/qa-audit/component-architecture.txt
echo "==============================" >> reports/qa-audit/component-architecture.txt

# Find potential component directories
component_dirs=(
    "src/components"
    "components" 
    "src/ui"
    "ui"
    "src/views"
    "views"
    "src/pages"
    "pages"
)

for dir in "${component_dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ Found component directory: $dir" >> reports/qa-audit/component-architecture.txt
        echo "   Files: $(find "$dir" -name "*.tsx" -o -name "*.jsx" -o -name "*.vue" | wc -l)" >> reports/qa-audit/component-architecture.txt
        echo "   Subdirectories: $(find "$dir" -type d | wc -l)" >> reports/qa-audit/component-architecture.txt
    fi
done

# Task 6: State management analysis
echo "🏪 State management analysis..."
echo "" >> reports/qa-audit/component-architecture.txt
echo "State management patterns:" >> reports/qa-audit/component-architecture.txt
echo "==========================" >> reports/qa-audit/component-architecture.txt

# Check for different state management solutions
state_patterns=(
    "useState:use[Ss]tate"
    "useReducer:useReducer"
    "useContext:useContext"
    "Redux:redux\|useSelector\|useDispatch"
    "Zustand:zustand"
    "Recoil:recoil"
    "Jotai:jotai"
)

for pattern in "${state_patterns[@]}"; do
    name="${pattern%:*}"
    regex="${pattern#*:}"
    
    count=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
        ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
        -exec grep -l "$regex" {} \; | wc -l 2>/dev/null || echo 0)
    
    if [ "$count" -gt 0 ]; then
        echo "$name usage: $count files" >> reports/qa-audit/component-architecture.txt
    fi
done

# Task 7: Component reusability analysis
echo "♻️ Component reusability analysis..."
echo "" >> reports/qa-audit/component-architecture.txt
echo "Component reusability assessment:" >> reports/qa-audit/component-architecture.txt
echo "=================================" >> reports/qa-audit/component-architecture.txt

# Find components that might be imported multiple times (reusable)
echo "Potentially reusable components (imported in multiple files):" >> reports/qa-audit/component-architecture.txt
find . -type f \( -name "*.tsx" -o -name "*.jsx" \) \
    ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
    -exec basename {} .tsx \; -exec basename {} .jsx \; 2>/dev/null | \
    sort | uniq | while read component; do
        if [ -n "$component" ]; then
            import_count=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
                ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
                -exec grep -l "import.*$component" {} \; 2>/dev/null | wc -l)
            if [ "$import_count" -gt 1 ]; then
                echo "$component: imported in $import_count files" >> reports/qa-audit/component-architecture.txt
            fi
        fi
    done

# Task 8: Generate architectural recommendations
echo "" >> reports/qa-audit/component-architecture.txt
echo "Architectural recommendations:" >> reports/qa-audit/component-architecture.txt
echo "==============================" >> reports/qa-audit/component-architecture.txt

echo "📦 Component Size Guidelines:" >> reports/qa-audit/component-architecture.txt
echo "  - Break down components over 200 lines" >> reports/qa-audit/component-architecture.txt
echo "  - Consider merging components under 25 lines" >> reports/qa-audit/component-architecture.txt
echo "  - Extract custom hooks from components with 5+ hooks" >> reports/qa-audit/component-architecture.txt
echo "" >> reports/qa-audit/component-architecture.txt

echo "🏗️ Architecture Improvements:" >> reports/qa-audit/component-architecture.txt
echo "  - Implement proper prop interfaces for all components" >> reports/qa-audit/component-architecture.txt
echo "  - Create a component library for reusable components" >> reports/qa-audit/component-architecture.txt
echo "  - Establish consistent directory structure" >> reports/qa-audit/component-architecture.txt
echo "  - Implement error boundaries for component trees" >> reports/qa-audit/component-architecture.txt
echo "" >> reports/qa-audit/component-architecture.txt

echo "🧹 Code Quality:" >> reports/qa-audit/component-architecture.txt
echo "  - Use composition over inheritance" >> reports/qa-audit/component-architecture.txt
echo "  - Implement proper TypeScript interfaces" >> reports/qa-audit/component-architecture.txt
echo "  - Follow single responsibility principle" >> reports/qa-audit/component-architecture.txt

echo "✅ Component architecture audit complete!"
echo "📁 Report generated: reports/qa-audit/component-architecture.txt"
echo "📄 View with: cat reports/qa-audit/component-architecture.txt"