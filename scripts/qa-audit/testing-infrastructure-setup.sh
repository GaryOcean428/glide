#!/bin/bash

# Comprehensive QA & System Optimization Initiative
# Phase 3: Testing Infrastructure Setup

set -e

echo "=== Gary-Zero Testing Infrastructure Setup ==="
echo "Setting up testing framework and coverage analysis..."

# Create reports directory
mkdir -p reports/qa-audit

# Testing Infrastructure Report
echo "Testing Infrastructure Analysis" > reports/qa-audit/testing-infrastructure.txt
echo "===============================" >> reports/qa-audit/testing-infrastructure.txt
echo "Date: $(date)" >> reports/qa-audit/testing-infrastructure.txt
echo "" >> reports/qa-audit/testing-infrastructure.txt

# Task 1: Analyze existing testing setup
echo "🧪 Analyzing existing testing framework..."
echo "Current testing setup:" >> reports/qa-audit/testing-infrastructure.txt
echo "=====================" >> reports/qa-audit/testing-infrastructure.txt

# Check for test frameworks in package.json
if [ -f "package.json" ]; then
    echo "Testing dependencies found:" >> reports/qa-audit/testing-infrastructure.txt
    
    # Check for common testing frameworks
    testing_frameworks=(
        "jest"
        "mocha"
        "vitest"
        "@testing-library"
        "playwright"
        "cypress"
        "karma"
        "jasmine"
    )
    
    for framework in "${testing_frameworks[@]}"; do
        if grep -q "\"$framework" package.json; then
            echo "✅ $framework: installed" >> reports/qa-audit/testing-infrastructure.txt
        fi
    done
    
    echo "" >> reports/qa-audit/testing-infrastructure.txt
    echo "Test scripts available:" >> reports/qa-audit/testing-infrastructure.txt
    cat package.json | jq -r '.scripts | to_entries[] | select(.key | contains("test")) | "\(.key): \(.value)"' 2>/dev/null >> reports/qa-audit/testing-infrastructure.txt || echo "Could not parse test scripts"
fi

# Task 2: Find existing test files
echo "📁 Analyzing test file structure..."
echo "" >> reports/qa-audit/testing-infrastructure.txt
echo "Test file analysis:" >> reports/qa-audit/testing-infrastructure.txt
echo "===================" >> reports/qa-audit/testing-infrastructure.txt

# Count different types of test files
test_patterns=(
    "*.test.ts:TypeScript test files"
    "*.test.js:JavaScript test files"
    "*.spec.ts:TypeScript spec files" 
    "*.spec.js:JavaScript spec files"
    "*.test.tsx:React test files"
    "*.spec.tsx:React spec files"
)

total_tests=0
for pattern in "${test_patterns[@]}"; do
    file_pattern="${pattern%:*}"
    description="${pattern#*:}"
    
    count=$(find . -name "$file_pattern" ! -path "./node_modules/*" ! -path "./.git/*" | wc -l)
    total_tests=$((total_tests + count))
    
    if [ "$count" -gt 0 ]; then
        echo "$description: $count" >> reports/qa-audit/testing-infrastructure.txt
    fi
done

echo "Total test files: $total_tests" >> reports/qa-audit/testing-infrastructure.txt

# Task 3: Test directory structure analysis
echo "" >> reports/qa-audit/testing-infrastructure.txt
echo "Test directory structure:" >> reports/qa-audit/testing-infrastructure.txt
echo "=========================" >> reports/qa-audit/testing-infrastructure.txt

test_dirs=(
    "test"
    "tests"
    "__tests__"
    "src/test"
    "src/tests"
    "spec"
)

for dir in "${test_dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ Found test directory: $dir" >> reports/qa-audit/testing-infrastructure.txt
        echo "   Test files: $(find "$dir" -name "*.test.*" -o -name "*.spec.*" | wc -l)" >> reports/qa-audit/testing-infrastructure.txt
        echo "   Total files: $(find "$dir" -type f | wc -l)" >> reports/qa-audit/testing-infrastructure.txt
    fi
done

# Task 4: Coverage analysis setup
echo "📊 Setting up coverage analysis..."
echo "" >> reports/qa-audit/testing-infrastructure.txt
echo "Coverage analysis setup:" >> reports/qa-audit/testing-infrastructure.txt
echo "========================" >> reports/qa-audit/testing-infrastructure.txt

# Check for existing coverage configuration
coverage_configs=(
    "jest.config.js"
    "jest.config.json"
    ".nycrc"
    ".nycrc.json"
    "nyc.config.js"
    "vitest.config.ts"
    "vitest.config.js"
)

coverage_found=false
for config in "${coverage_configs[@]}"; do
    if [ -f "$config" ]; then
        echo "✅ Coverage config found: $config" >> reports/qa-audit/testing-infrastructure.txt
        coverage_found=true
    fi
done

if [ "$coverage_found" = false ]; then
    echo "⚠️ No coverage configuration found" >> reports/qa-audit/testing-infrastructure.txt
fi

# Task 5: Generate test setup recommendations
echo "📋 Generating testing recommendations..."
echo "" >> reports/qa-audit/testing-infrastructure.txt
echo "Testing infrastructure recommendations:" >> reports/qa-audit/testing-infrastructure.txt
echo "======================================" >> reports/qa-audit/testing-infrastructure.txt

# Calculate test coverage ratio
source_files=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
    ! -path "./node_modules/*" ! -path "./out/*" ! -path "./build/*" ! -path "./.git/*" \
    ! -name "*.test.*" ! -name "*.spec.*" | wc -l)

if [ "$source_files" -gt 0 ] && [ "$total_tests" -gt 0 ]; then
    coverage_ratio=$(echo "scale=2; $total_tests * 100 / $source_files" | bc 2>/dev/null || echo "0")
    echo "Estimated test coverage ratio: ${coverage_ratio}% (${total_tests} test files for ${source_files} source files)" >> reports/qa-audit/testing-infrastructure.txt
else
    echo "Cannot calculate test coverage ratio" >> reports/qa-audit/testing-infrastructure.txt
fi

echo "" >> reports/qa-audit/testing-infrastructure.txt
echo "Recommended improvements:" >> reports/qa-audit/testing-infrastructure.txt
echo "1. Set up automated test coverage reporting" >> reports/qa-audit/testing-infrastructure.txt
echo "2. Aim for >95% test coverage for critical paths" >> reports/qa-audit/testing-infrastructure.txt
echo "3. Implement unit tests for utility functions" >> reports/qa-audit/testing-infrastructure.txt
echo "4. Add integration tests for user workflows" >> reports/qa-audit/testing-infrastructure.txt
echo "5. Set up E2E testing for critical journeys" >> reports/qa-audit/testing-infrastructure.txt

# Task 6: Create test configuration templates
echo "📝 Creating test configuration templates..."

# Create a vitest config template
cat > scripts/qa-audit/vitest.config.template.ts << 'EOF'
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        'build/',
        'out/',
        '**/*.d.ts',
        '**/*.config.js',
        '**/*.config.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
EOF

# Create a Jest config template
cat > scripts/qa-audit/jest.config.template.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.config.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts']
};
EOF

# Create test setup template
cat > scripts/qa-audit/test-setup.template.ts << 'EOF'
import '@testing-library/jest-dom';

// Global test setup
beforeEach(() => {
  // Reset any mocks or test state
});

afterEach(() => {
  // Cleanup after each test
});

// Mock common modules if needed
jest.mock('vs/base/common/lifecycle', () => ({
  Disposable: class Disposable {
    dispose() {}
  }
}));
EOF

echo "✅ Testing infrastructure analysis complete!"
echo "📁 Reports generated:"
echo "  - reports/qa-audit/testing-infrastructure.txt"
echo "  - scripts/qa-audit/vitest.config.template.ts"
echo "  - scripts/qa-audit/jest.config.template.js"
echo "  - scripts/qa-audit/test-setup.template.ts"
echo ""
echo "Next steps:"
echo "  1. Review testing infrastructure recommendations"
echo "  2. Set up test coverage reporting"
echo "  3. Implement missing unit tests"
echo "  4. Configure automated test runs in CI/CD"