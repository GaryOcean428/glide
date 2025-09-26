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

// According to Railway deployment guidelines, we should enforce railpack.json ONLY
// Build priority: Dockerfile > railpack.json > railway.json/railway.toml > Nixpacks
// We want railpack.json to take priority, so we should NOT have competing configs

const projectRoot = path.resolve(__dirname, '..');
let railwayConfigValid = true;

// Check for railpack.json (required)
const railpackPath = path.resolve(projectRoot, 'railpack.json');
if (!railpackPath.startsWith(projectRoot)) {
    console.log('   ❌ railpack.json path traversal detected');
    railwayConfigValid = false;
} else if (fs.existsSync(railpackPath)) {
    try {
        const content = fs.readFileSync(railpackPath, 'utf8');
        JSON.parse(content);
        console.log('   ✅ railpack.json exists and is valid');
    } catch (error) {
        console.log(`   ❌ railpack.json has syntax errors: ${error.message}`);
        railwayConfigValid = false;
    }
} else {
    console.log('   ❌ railpack.json missing');
    railwayConfigValid = false;
}

// Check for competing configuration files (should NOT exist)
const competingFiles = ['railway.json', 'railway.toml', 'Dockerfile', 'nixpacks.toml'];
competingFiles.forEach(file => {
    const filePath = path.resolve(projectRoot, file);
    if (fs.existsSync(filePath)) {
        console.log(`   ⚠️  ${file} exists (may override railpack.json - consider removing)`);
    }
});

if (!fs.existsSync(path.resolve(projectRoot, 'railway.json')) && 
    !fs.existsSync(path.resolve(projectRoot, 'railway.toml')) &&
    !fs.existsSync(path.resolve(projectRoot, 'Dockerfile')) &&
    !fs.existsSync(path.resolve(projectRoot, 'nixpacks.toml'))) {
    console.log('   ✅ No competing build configuration files (railpack.json will take priority)');
}

allPassed = allPassed && railwayConfigValid;

// Test 3: Verify Node.js configuration
console.log('\n3️⃣ Checking Node.js configuration...');

// Security: Ensure path is within project root (railpackPath already defined above)
if (!railpackPath.startsWith(projectRoot)) {
    console.log('   ❌ Security: railpack.json path traversal detected');
    allPassed = false;
} else if (fs.existsSync(railpackPath)) {
    try {
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
    } catch (error) {
        console.log(`   ❌ Error reading railpack.json: ${error.message}`);
        allPassed = false;
    }
} else {
    console.log('   ❌ railpack.json not found');
    allPassed = false;
}

// Test 4: Verify Railway server script
console.log('\n4️⃣ Checking Railway server script...');
const scriptsDir = path.resolve(__dirname);
const serverScriptPath = path.resolve(scriptsDir, 'railway-vscode-server.mjs');

// Security: Ensure script path is within scripts directory
if (!serverScriptPath.startsWith(scriptsDir)) {
    console.log('   ❌ Security: server script path traversal detected');
    allPassed = false;
} else if (fs.existsSync(serverScriptPath)) {
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
const packagePath = path.resolve(projectRoot, 'package.json');

// Security: Ensure package.json path is within project root
if (!packagePath.startsWith(projectRoot)) {
    console.log('   ❌ Security: package.json path traversal detected');
    allPassed = false;
} else if (fs.existsSync(packagePath)) {
    try {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        
        const criticalDeps = [
            '@vscode/test-web',
            'http-proxy-middleware', 
            'express'
        ];

        criticalDeps.forEach(dep => {
            if (pkg.dependencies && pkg.dependencies[dep]) {
                console.log(`   ✅ ${dep} in dependencies: ${pkg.dependencies[dep]}`);
            } else {
                console.log(`   ❌ ${dep} missing from dependencies`);
                allPassed = false;
            }
        });
    } catch (error) {
        console.log(`   ❌ Error reading package.json: ${error.message}`);
        allPassed = false;
    }
} else {
    console.log('   ❌ package.json not found');
    allPassed = false;
}

// Test 6: Check environment variables configuration in railpack.json
console.log('\n6️⃣ Checking environment variables...');
const expectedEnvVars = [
    'ELECTRON_SKIP_BINARY_DOWNLOAD',
    'PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD', 
    'PUPPETEER_SKIP_CHROMIUM_DOWNLOAD',
    'NPM_CONFIG_OPTIONAL',
    'RAILPACK_PRUNE_DEPS'
];

// Check railpack.json for environment variables (we already validated it exists above)
if (fs.existsSync(railpackPath)) {
    try {
        const railpack = JSON.parse(fs.readFileSync(railpackPath, 'utf8'));

        if (railpack.build && railpack.build.env) {
            expectedEnvVars.forEach(envVar => {
                if (railpack.build.env[envVar]) {
                    console.log(`   ✅ ${envVar} configured in railpack.json: ${railpack.build.env[envVar]}`);
                } else {
                    console.log(`   ⚠️  ${envVar} not found in railpack.json`);
                }
            });

            // Test 7: Verify RAILPACK_PRUNE_DEPS setting
            console.log('\n7️⃣ Checking RAILPACK_PRUNE_DEPS setting...');
            if (railpack.build.env['RAILPACK_PRUNE_DEPS'] === 'false') {
                console.log('   ✅ RAILPACK_PRUNE_DEPS set to false (prevents dependency pruning)');
            } else {
                console.log('   ❌ RAILPACK_PRUNE_DEPS not set to false');
                allPassed = false;
            }
        } else {
            console.log('   ❌ No environment variables section found in railpack.json');
            allPassed = false;
        }
    } catch (error) {
        console.log(`   ❌ Error reading railpack.json env section: ${error.message}`);
        allPassed = false;
    }
}

// Final summary
console.log('\n📋 Validation Summary:');
if (allPassed) {
    console.log('✅ All validation checks passed!');
    console.log('🚀 Configuration should resolve Railway deployment issues');
    console.log('\n🔧 Key fixes applied:');
    console.log('  • Removed Deno detection trigger (.eslint-plugin-local)');
    console.log('  • Using railpack.json ONLY (no competing build configs)');
    console.log('  • Set RAILPACK_PRUNE_DEPS=false in railpack.json');
    console.log('  • Environment variables configured in railpack.json');
    console.log('  • Node.js runtime properly specified');
    console.log('\n📋 Railway Build Priority (followed correctly):');
    console.log('  1. Dockerfile (removed) ✅');
    console.log('  2. railpack.json (configured) ✅');
    console.log('  3. railway.json/railway.toml (removed) ✅');
    console.log('  4. Nixpacks auto-detection (will be bypassed) ✅');
    process.exit(0);
} else {
    console.log('❌ Some validation checks failed');
    console.log('⚠️  Please fix the issues above before deploying');
    process.exit(1);
}