#!/usr/bin/env node
/**
 * Pre-deployment validation script for Railway
 * Validates configuration and tests key components before deployment
 */

import { createRequire } from 'module';
import path from 'path';
import url from 'url';
import fs from 'fs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

console.log('🔍 Railway Deployment Pre-Validation...\n');

let allPassed = true;

// Test 1: Verify no Deno detection triggers
console.log('1️⃣ Checking for Deno detection triggers...');
if (fs.existsSync(path.join(__dirname, '..', '.eslint-plugin-local'))) {
    console.log('   ❌ .eslint-plugin-local directory exists (will trigger Deno detection)');
    allPassed = false;
} else {
    console.log('   ✅ No .eslint-plugin-local directory (Deno trigger eliminated)');
}

// Test 2: Verify Railway configuration files
console.log('\n2️⃣ Checking Railway configuration files...');
const railwayFiles = ['railway.json', 'railway.toml', 'railpack.json'];
let railwayConfigValid = true;

railwayFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
        try {
            if (file.endsWith('.json')) {
                JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
            console.log(`   ✅ ${file} exists and is valid`);
        } catch (error) {
            console.log(`   ❌ ${file} has syntax errors: ${error.message}`);
            railwayConfigValid = false;
        }
    } else {
        console.log(`   ❌ ${file} missing`);
        railwayConfigValid = false;
    }
});

allPassed = allPassed && railwayConfigValid;

// Test 3: Verify Node.js configuration
console.log('\n3️⃣ Checking Node.js configuration...');
const railpackPath = path.join(__dirname, '..', 'railpack.json');
const railpack = JSON.parse(fs.readFileSync(railpackPath, 'utf8'));

if (railpack.build?.provider === 'node') {
    console.log('   ✅ Railpack configured for Node.js provider');
} else {
    console.log('   ❌ Railpack not configured for Node.js provider');
    allPassed = false;
}

if (railpack.deploy?.startCommand?.includes('node')) {
    console.log('   ✅ Start command uses Node.js');
} else {
    console.log('   ❌ Start command does not use Node.js');
    allPassed = false;
}

// Test 4: Verify Railway server script
console.log('\n4️⃣ Checking Railway server script...');
const serverScriptPath = path.join(__dirname, 'railway-vscode-server.mjs');
if (fs.existsSync(serverScriptPath)) {
    console.log('   ✅ Railway server script exists');
    
    // Check script permissions
    try {
        fs.accessSync(serverScriptPath, fs.constants.R_OK);
        console.log('   ✅ Railway server script is readable');
    } catch (error) {
        console.log('   ❌ Railway server script is not readable');
        allPassed = false;
    }
} else {
    console.log('   ❌ Railway server script missing');
    allPassed = false;
}

// Test 5: Verify critical dependencies
console.log('\n5️⃣ Checking critical dependencies...');
const packagePath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const criticalDeps = [
    '@vscode/test-web',
    'http-proxy-middleware', 
    'express'
];

criticalDeps.forEach(dep => {
    if (pkg.dependencies[dep]) {
        console.log(`   ✅ ${dep} in dependencies: ${pkg.dependencies[dep]}`);
    } else {
        console.log(`   ❌ ${dep} missing from dependencies`);
        allPassed = false;
    }
});

// Test 6: Check environment variables configuration
console.log('\n6️⃣ Checking environment variables...');
const expectedEnvVars = [
    'ELECTRON_SKIP_BINARY_DOWNLOAD',
    'PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD',
    'PUPPETEER_SKIP_CHROMIUM_DOWNLOAD',
    'NPM_CONFIG_OPTIONAL'
];

const railwayTomlPath = path.join(__dirname, '..', 'railway.toml');
const railwayToml = fs.readFileSync(railwayTomlPath, 'utf8');

expectedEnvVars.forEach(envVar => {
    if (railwayToml.includes(envVar)) {
        console.log(`   ✅ ${envVar} configured in railway.toml`);
    } else {
        console.log(`   ⚠️  ${envVar} not found in railway.toml`);
    }
});

// Test 7: Verify RAILPACK_PRUNE_DEPS setting
console.log('\n7️⃣ Checking RAILPACK_PRUNE_DEPS setting...');
if (railwayToml.includes('RAILPACK_PRUNE_DEPS = "false"')) {
    console.log('   ✅ RAILPACK_PRUNE_DEPS set to false (prevents dependency pruning)');
} else {
    console.log('   ❌ RAILPACK_PRUNE_DEPS not set to false');
    allPassed = false;
}

// Final summary
console.log('\n📋 Validation Summary:');
if (allPassed) {
    console.log('✅ All validation checks passed!');
    console.log('🚀 Configuration should resolve Railway deployment issues');
    console.log('\n🔧 Key fixes applied:');
    console.log('  • Removed Deno detection trigger (.eslint-plugin-local)');
    console.log('  • Configured explicit RAILPACK builder');
    console.log('  • Set RAILPACK_PRUNE_DEPS=false');
    console.log('  • Environment variables configured');
    console.log('  • Node.js runtime properly specified');
    process.exit(0);
} else {
    console.log('❌ Some validation checks failed');
    console.log('⚠️  Please fix the issues above before deploying');
    process.exit(1);
}