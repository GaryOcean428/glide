#!/usr/bin/env node
/**
 * CI-friendly Railway configuration validation
 * Validates Railway configuration without starting servers
 */

import fs from 'fs';
import path from 'path';

console.log('🔧 Railway Configuration CI Validation');
console.log('=====================================');

let allValid = true;

// Test 1: Check Railway configuration files
console.log('\n1️⃣ Railway Configuration Validation...');

const railpackExists = fs.existsSync('railpack.json');
const railwayJsonExists = fs.existsSync('railway.json');
const railwayTomlExists = fs.existsSync('railway.toml');
const nixpacksExists = fs.existsSync('nixpacks.toml');
const dockerfileExists = fs.existsSync('Dockerfile');

console.log(`   railpack.json (priority #2): ${railpackExists ? '✅' : '❌'}`);
console.log(`   railway.json (priority #3): ${railwayJsonExists ? '⚠️' : '✅'}`);
console.log(`   railway.toml (priority #3): ${railwayTomlExists ? '⚠️' : '✅'}`);
console.log(`   nixpacks.toml (priority #4): ${nixpacksExists ? '⚠️' : '✅'}`);
console.log(`   Dockerfile (priority #1): ${dockerfileExists ? '⚠️' : '✅'}`);

if (!railpackExists) {
    console.log('   ❌ Primary configuration (railpack.json) missing');
    allValid = false;
}

const competingConfigs = [];
if (dockerfileExists) competingConfigs.push('Dockerfile(#1)');
if (railwayJsonExists) competingConfigs.push('railway.json(#3)');
if (railwayTomlExists) competingConfigs.push('railway.toml(#3)');
if (nixpacksExists) competingConfigs.push('nixpacks.toml(#4)');

if (competingConfigs.length > 0) {
    console.log(`   ⚠️  Competing configurations: ${competingConfigs.join(', ')}`);
    console.log('   These may override railpack.json per Railway build priority');
} else {
    console.log('   ✅ No competing configurations - railpack.json will be used');
}

// Test 2: Validate JSON syntax
console.log('\n2️⃣ Configuration Syntax Validation...');
if (railpackExists) {
    try {
        const railpack = JSON.parse(fs.readFileSync('railpack.json', 'utf8'));
        console.log('   ✅ railpack.json syntax valid');
        
        // Check critical properties
        if (railpack.build?.provider === 'node') {
            console.log('   ✅ Node.js provider specified');
        } else {
            console.log('   ⚠️  Node.js provider not explicitly set');
        }
        
        if (railpack.deploy?.startCommand) {
            console.log(`   ✅ Start command: ${railpack.deploy.startCommand}`);
        } else {
            console.log('   ❌ No start command specified');
            allValid = false;
        }
        
        if (railpack.deploy?.healthCheckPath) {
            console.log(`   ✅ Health check path: ${railpack.deploy.healthCheckPath}`);
        } else {
            console.log('   ⚠️  No health check path specified');
        }
        
    } catch (error) {
        console.log(`   ❌ railpack.json syntax error: ${error.message}`);
        allValid = false;
    }
}

// Test 3: Check required scripts and files
console.log('\n3️⃣ Required Files Validation...');

const requiredFiles = [
    'scripts/railway-vscode-server.mjs',
    'package.json',
    '.env.template'
];

for (const file of requiredFiles) {
    const exists = fs.existsSync(file);
    console.log(`   ${file}: ${exists ? '✅' : '❌'}`);
    if (!exists && file === 'scripts/railway-vscode-server.mjs') {
        allValid = false;
    }
}

// Test 4: Basic script syntax validation
console.log('\n4️⃣ Script Syntax Validation...');
if (fs.existsSync('scripts/railway-vscode-server.mjs')) {
    try {
        // Just check that the file can be parsed as valid JavaScript/Node.js
        const { execSync } = await import('child_process');
        execSync('node --check scripts/railway-vscode-server.mjs', { 
            stdio: 'pipe',
            env: { ...process.env, VSCODE_SKIP_NODE_VERSION_CHECK: '1' }
        });
        console.log('   ✅ Railway server script syntax valid');
    } catch (error) {
        console.log(`   ❌ Railway server script syntax error: ${error.message}`);
        allValid = false;
    }
} else {
    console.log('   ❌ Railway server script not found');
    allValid = false;
}

// Summary
console.log('\n📊 Validation Summary');
console.log('====================');
console.log(`Status: ${allValid ? '🎉 ALL CHECKS PASSED' : '❌ VALIDATION FAILED'}`);

if (!allValid) {
    console.log('\n🔧 Recommended Actions:');
    if (!railpackExists) console.log('   - Create railpack.json configuration');
    if (competingConfigs.length > 0) console.log('   - Remove competing build configurations');
    console.log('   - Ensure all required files are present');
    console.log('   - Fix any syntax errors in configuration files');
}

process.exit(allValid ? 0 : 1);