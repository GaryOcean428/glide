#!/usr/bin/env node

/**
 * Railway Environment Variable Audit Script
 * Creates a backup of Railway environment variables and validates configuration
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync } from 'fs';

console.log('🔍 Railway Environment Variable Audit');
console.log('=====================================');

// Check if Railway CLI is available
function checkRailwayCLI() {
    try {
        execSync('npx --yes @railway/cli --version', { stdio: 'pipe' });
        console.log('✅ Railway CLI is available via npx');
        return true;
    } catch (error) {
        console.log('⚠️ Railway CLI not installed, using npx for commands');
        return false;
    }
}

// Export Railway variables to backup file
function exportRailwayVariables() {
    try {
        console.log('📋 Exporting Railway environment variables...');
        
        // Try to get variables using Railway CLI
        const command = 'npx --yes @railway/cli variables --json';
        const output = execSync(command, { 
            stdio: 'pipe',
            encoding: 'utf8',
            timeout: 30000
        });
        
        writeFileSync('.env.railway.backup', output);
        console.log('✅ Railway variables backed up to .env.railway.backup');
        return true;
    } catch (error) {
        console.log('⚠️ Could not export Railway variables (possibly not deployed yet)');
        console.log('   This is normal for local development');
        
        // Create a template backup file
        const template = JSON.stringify({
            NODE_ENV: "production",
            SKIP_NATIVE_MODULES: "1",
            ELECTRON_SKIP_BINARY_DOWNLOAD: "1",
            PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
            PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: "true",
            NPM_CONFIG_OPTIONAL: "false",
            RAILPACK_PRUNE_DEPS: "false"
        }, null, 2);
        
        writeFileSync('.env.railway.backup', template);
        console.log('✅ Created template environment backup');
        return false;
    }
}

// Validate essential environment variables
function validateEnvironment() {
    console.log('🔧 Validating environment configuration...');
    
    const requiredVars = [
        'NODE_ENV',
        'SKIP_NATIVE_MODULES', 
        'ELECTRON_SKIP_BINARY_DOWNLOAD',
        'PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD'
    ];
    
    const missingVars = [];
    
    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            missingVars.push(varName);
        }
    }
    
    if (missingVars.length > 0) {
        console.log('⚠️ Missing environment variables:', missingVars.join(', '));
        console.log('   These should be set in Railway deployment');
    } else {
        console.log('✅ All required environment variables are set');
    }
    
    return missingVars.length === 0;
}

// Main execution
async function main() {
    console.log('🚀 Starting Railway environment audit...\n');
    
    const cliAvailable = checkRailwayCLI();
    const varsExported = exportRailwayVariables();
    const envValid = validateEnvironment();
    
    console.log('\n📊 Audit Summary');
    console.log('=================');
    console.log(`Railway CLI: ${cliAvailable ? '✅ Available' : '⚠️ Using npx'}`);
    console.log(`Variables Exported: ${varsExported ? '✅ Success' : '⚠️ Template created'}`);
    console.log(`Environment Valid: ${envValid ? '✅ Valid' : '⚠️ Missing vars'}`);
    
    if (!varsExported || !envValid) {
        console.log('\n💡 For Railway deployment, ensure these variables are set:');
        console.log('   NODE_ENV=production');
        console.log('   SKIP_NATIVE_MODULES=1');
        console.log('   ELECTRON_SKIP_BINARY_DOWNLOAD=1');
        console.log('   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1');
        console.log('   PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true');
        console.log('   NPM_CONFIG_OPTIONAL=false');
    }
    
    return varsExported && envValid;
}

main().catch(error => {
    console.error('❌ Audit failed:', error.message);
    process.exit(1);
});