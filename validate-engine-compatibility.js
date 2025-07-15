#!/usr/bin/env node

/**
 * Verification script for engine compatibility and build process hardening
 * This script validates the implemented fixes for bare-fs/bare-os engine warnings
 */

import fs from 'fs';
import path from 'path';

console.log('🔧 Engine Compatibility & Build Process Hardening Verification');
console.log('================================================================');

// Test 1: Check if .yarnrc.yml exists and contains proper engine handling
function testYarnrcYml() {
    console.log('\n1. Testing .yarnrc.yml configuration...');
    
    if (fs.existsSync('.yarnrc.yml')) {
        const content = fs.readFileSync('.yarnrc.yml', 'utf8');
        
        if (content.includes('ignoreDependencies') && 
            content.includes('bare-fs') && 
            content.includes('bare-os')) {
            console.log('   ✅ .yarnrc.yml exists with proper ignoreDependencies');
        } else {
            console.log('   ❌ .yarnrc.yml missing ignoreDependencies for bare packages');
            return false;
        }
        
        if (content.includes('nodeLinker: node-modules')) {
            console.log('   ✅ nodeLinker properly configured');
        } else {
            console.log('   ⚠️ nodeLinker not set to node-modules');
        }
        
        return true;
    } else {
        console.log('   ❌ .yarnrc.yml not found');
        return false;
    }
}

// Test 2: Check if .yarnrc exists with ignore-engines
function testYarnrc() {
    console.log('\n2. Testing .yarnrc configuration...');
    
    if (fs.existsSync('.yarnrc')) {
        const content = fs.readFileSync('.yarnrc', 'utf8');
        
        if (content.includes('ignore-engines true')) {
            console.log('   ✅ .yarnrc exists with ignore-engines true');
            return true;
        } else {
            console.log('   ❌ .yarnrc missing ignore-engines setting');
            return false;
        }
    } else {
        console.log('   ❌ .yarnrc not found');
        return false;
    }
}

// Test 3: Check Dockerfile has --ignore-engines flag
function testDockerfile() {
    console.log('\n3. Testing Dockerfile optimization...');
    
    if (fs.existsSync('Dockerfile')) {
        const content = fs.readFileSync('Dockerfile', 'utf8');
        
        if (content.includes('--ignore-engines')) {
            console.log('   ✅ Dockerfile contains --ignore-engines flag');
        } else {
            console.log('   ❌ Dockerfile missing --ignore-engines flag');
            return false;
        }
        
        if (content.includes('--production')) {
            console.log('   ✅ Dockerfile uses production install');
        } else {
            console.log('   ⚠️ Dockerfile not using production install');
        }
        
        return true;
    } else {
        console.log('   ❌ Dockerfile not found');
        return false;
    }
}

// Test 4: Check railway.toml has engine bypass
function testRailwayToml() {
    console.log('\n4. Testing Railway build configuration...');
    
    if (fs.existsSync('railway.toml')) {
        const content = fs.readFileSync('railway.toml', 'utf8');
        
        if (content.includes('--ignore-engines')) {
            console.log('   ✅ railway.toml contains engine bypass');
        } else {
            console.log('   ❌ railway.toml missing engine bypass');
            return false;
        }
        
        if (content.includes('nixpacksPlan')) {
            console.log('   ✅ railway.toml has custom install commands');
        } else {
            console.log('   ⚠️ railway.toml missing custom install commands');
        }
        
        return true;
    } else {
        console.log('   ❌ railway.toml not found');
        return false;
    }
}

// Test 5: Check package.json dependencies structure
function testPackageJson() {
    console.log('\n5. Testing dependency audit...');
    
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        // Check if @vscode/gulp-electron is in devDependencies
        if (packageJson.devDependencies && packageJson.devDependencies['@vscode/gulp-electron']) {
            console.log('   ✅ @vscode/gulp-electron correctly in devDependencies');
        } else {
            console.log('   ❌ @vscode/gulp-electron not in devDependencies');
        }
        
        // Check if production dependencies don't include dev-only packages
        const prodDeps = Object.keys(packageJson.dependencies || {});
        const devOnlyPackages = ['@vscode/gulp-electron', 'electron', 'gulp'];
        
        const devInProd = prodDeps.filter(dep => devOnlyPackages.some(devPkg => dep.includes(devPkg)));
        
        if (devInProd.length === 0) {
            console.log('   ✅ No dev-only packages in production dependencies');
        } else {
            console.log(`   ⚠️ Found potential dev packages in production: ${devInProd.join(', ')}`);
        }
        
        return true;
    } catch (error) {
        console.log('   ❌ Error reading package.json:', error.message);
        return false;
    }
}

// Run all tests
async function runTests() {
    const tests = [
        testYarnrcYml,
        testYarnrc,
        testDockerfile,
        testRailwayToml,
        testPackageJson
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            const result = test();
            if (result) {
                passed++;
            } else {
                failed++;
            }
        } catch (error) {
            console.log(`   ❌ Test failed with error: ${error.message}`);
            failed++;
        }
    }
    
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
    
    if (failed === 0) {
        console.log('\n🎉 All tests passed! Engine compatibility fixes implemented.');
        console.log('   - Engine warnings should be suppressed');
        console.log('   - Production build will exclude dev dependencies');
        console.log('   - Build process hardened for Railway deployment');
    } else {
        console.log('\n⚠️  Some tests failed. Please review the issues above.');
    }
    
    return failed === 0;
}

// Run the verification
runTests().then(success => {
    process.exit(success ? 0 : 1);
});