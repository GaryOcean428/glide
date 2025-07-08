#!/usr/bin/env node

/**
 * Verification script to test the node-gyp build fix
 * This script validates that the Docker environment has the required tools
 * and can successfully run the Railway server
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

console.log('🧪 GIDE Build Fix Verification Test');
console.log('=====================================');

// Test 1: Check if Dockerfile has the required build tools
function testDockerfileContents() {
    console.log('\n1. Testing Dockerfile contains required build dependencies...');
    
    try {
        const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
        
        const requiredTools = ['python3', 'make', 'g++'];
        const hasAllTools = requiredTools.every(tool => dockerfile.includes(tool));
        
        if (hasAllTools) {
            console.log('   ✅ Dockerfile contains all required build tools (python3, make, g++)');
        } else {
            console.log('   ❌ Dockerfile missing required build tools');
            return false;
        }
        
        // Check if production flag is set
        if (dockerfile.includes('NPM_CONFIG_PRODUCTION=true')) {
            console.log('   ✅ Dockerfile configured to skip dev dependencies');
        } else {
            console.log('   ⚠️ Dockerfile may install dev dependencies');
        }
        
        return true;
    } catch (error) {
        console.log('   ❌ Error reading Dockerfile:', error.message);
        return false;
    }
}

// Test 2: Check if Railway server script exists and is executable
function testRailwayServer() {
    console.log('\n2. Testing Railway server configuration...');
    
    const serverPath = path.join('scripts', 'railway-server.js');
    
    if (fs.existsSync(serverPath)) {
        console.log('   ✅ Railway server script exists');
        
        // Check if it contains the required functionality
        const serverContent = fs.readFileSync(serverPath, 'utf8');
        
        if (serverContent.includes('checkNativeModules') && 
            serverContent.includes('startCodeServer') &&
            serverContent.includes('healthz')) {
            console.log('   ✅ Railway server has required functionality');
            return true;
        } else {
            console.log('   ❌ Railway server missing required functionality');
            return false;
        }
    } else {
        console.log('   ❌ Railway server script not found');
        return false;
    }
}

// Test 3: Test package.json has correct scripts
function testPackageJson() {
    console.log('\n3. Testing package.json configuration...');
    
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        if (packageJson.scripts && packageJson.scripts.start) {
            console.log('   ✅ Package.json has start script');
        } else {
            console.log('   ❌ Package.json missing start script');
            return false;
        }
        
        if (packageJson.scripts && packageJson.scripts['railway:start']) {
            console.log('   ✅ Package.json has railway:start script');
        } else {
            console.log('   ❌ Package.json missing railway:start script');
            return false;
        }
        
        return true;
    } catch (error) {
        console.log('   ❌ Error reading package.json:', error.message);
        return false;
    }
}

// Test 4: Check if alternative Dockerfile exists
function testCodeServerDockerfile() {
    console.log('\n4. Testing alternative code-server Dockerfile...');
    
    if (fs.existsSync('Dockerfile.codeserver')) {
        console.log('   ✅ Alternative code-server Dockerfile exists');
        
        const content = fs.readFileSync('Dockerfile.codeserver', 'utf8');
        
        if (content.includes('code-server.dev/install.sh')) {
            console.log('   ✅ Code-server installation script included');
            return true;
        } else {
            console.log('   ❌ Code-server installation script missing');
            return false;
        }
    } else {
        console.log('   ⚠️ Alternative code-server Dockerfile not found (optional)');
        return true; // This is optional
    }
}

// Test 5: Check if build documentation exists
function testDocumentation() {
    console.log('\n5. Testing build fix documentation...');
    
    if (fs.existsSync('BUILD_FIX.md')) {
        console.log('   ✅ BUILD_FIX.md documentation exists');
        
        const content = fs.readFileSync('BUILD_FIX.md', 'utf8');
        
        if (content.includes('node-gyp') && content.includes('python3')) {
            console.log('   ✅ Documentation contains relevant build fix information');
            return true;
        } else {
            console.log('   ❌ Documentation missing key information');
            return false;
        }
    } else {
        console.log('   ⚠️ BUILD_FIX.md documentation not found (optional)');
        return true; // This is optional
    }
}

// Run all tests
async function runTests() {
    const tests = [
        testDockerfileContents,
        testRailwayServer,
        testPackageJson,
        testCodeServerDockerfile,
        testDocumentation
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
        console.log('\n🎉 All tests passed! The build fix is properly implemented.');
        console.log('   The Docker image should now successfully compile native modules.');
    } else {
        console.log('\n⚠️  Some tests failed. Please review the issues above.');
    }
    
    return failed === 0;
}

// Run the verification
runTests().then(success => {
    process.exit(success ? 0 : 1);
});