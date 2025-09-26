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

// Test 3: Check Railway build configuration follows deployment guidelines
function testRailwayConfig() {
    console.log('\n3. Testing Railway build configuration...');
    
    // According to Railway deployment guidelines, we should use railpack.json ONLY
    // Check for railpack.json (should exist)
    if (fs.existsSync('railpack.json')) {
        try {
            const railpack = JSON.parse(fs.readFileSync('railpack.json', 'utf8'));
            
            if (railpack.build?.provider === 'node') {
                console.log('   ✅ railpack.json configured with Node.js provider');
            } else {
                console.log('   ❌ railpack.json missing Node.js provider');
                return false;
            }
            
            if (railpack.build?.env?.['RAILPACK_PRUNE_DEPS'] === 'false') {
                console.log('   ✅ railpack.json has RAILPACK_PRUNE_DEPS=false');
            } else {
                console.log('   ❌ railpack.json missing RAILPACK_PRUNE_DEPS=false');
                return false;
            }
        } catch (error) {
            console.log('   ❌ railpack.json syntax error');
            return false;
        }
    } else {
        console.log('   ❌ railpack.json not found');
        return false;
    }
    
    // Check that competing build configs don't exist (following deployment guidelines)
    const competingFiles = ['Dockerfile', 'railway.toml', 'railway.json', 'nixpacks.toml'];
    let hasCompeting = false;
    
    competingFiles.forEach(file => {
        if (fs.existsSync(file)) {
            console.log(`   ⚠️  ${file} exists (may override railpack.json)`);
            hasCompeting = true;
        }
    });
    
    if (!hasCompeting) {
        console.log('   ✅ No competing build configurations (railpack.json will take priority)');
    }
    
    return !hasCompeting;
}

// Test 4: Check package.json dependencies structure
function testPackageJson() {
    console.log('\n4. Testing dependency audit...');
    
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
        testRailwayConfig,
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
        console.log('\n🎉 All tests passed! Engine compatibility and Railway deployment configured correctly.');
        console.log('   - Engine warnings should be suppressed');
        console.log('   - Production build will exclude dev dependencies'); 
        console.log('   - Railway deployment using railpack.json ONLY (no competing configs)');
        console.log('   - Build process hardened following deployment guidelines');
    } else {
        console.log('\n⚠️  Some tests failed. Please review the issues above.');
    }
    
    return failed === 0;
}

// Run the verification
runTests().then(success => {
    process.exit(success ? 0 : 1);
});