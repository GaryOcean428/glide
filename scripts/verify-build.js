#!/usr/bin/env node

/**
 * Build verification script for GIDE deployment
 * Validates that the build output is correct and deployment-ready
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 GIDE Build Verification');
console.log('==========================');

function checkBuildOutput() {
    console.log('\n1. Checking build output...');
    
    const buildPaths = [
        'out',
        'out/main.js',
        'out/vs',
        'extensions'
    ];
    
    let buildValid = true;
    
    for (const buildPath of buildPaths) {
        const exists = fs.existsSync(buildPath);
        console.log(`   ${buildPath}: ${exists ? '✅' : '❌'}`);
        if (!exists && buildPath !== 'out') {
            // out directory might not exist if compile failed, but others should
            buildValid = false;
        }
    }
    
    return buildValid;
}

function checkPackageIntegrity() {
    console.log('\n2. Checking package integrity...');
    
    try {
        const packageJson = require('../package.json');
        
        // Check critical scripts
        const criticalScripts = [
            'start',
            'build',
            'compile',
            'railway:start',
            'railway:health'
        ];
        
        let scriptsValid = true;
        for (const script of criticalScripts) {
            const exists = packageJson.scripts && packageJson.scripts[script];
            console.log(`   Script ${script}: ${exists ? '✅' : '❌'}`);
            if (!exists) scriptsValid = false;
        }
        
        // Check main entry point
        const mainExists = packageJson.main && fs.existsSync(packageJson.main);
        console.log(`   Main entry (${packageJson.main}): ${mainExists ? '✅' : '❌'}`);
        
        return scriptsValid && mainExists;
    } catch (error) {
        console.log(`   ❌ Package.json validation failed: ${error.message}`);
        return false;
    }
}

function checkDeploymentFiles() {
    console.log('\n3. Checking deployment files...');
    
    const deploymentFiles = [
        'railway.toml',
        'scripts/railway-vscode-server.mjs',
        'Dockerfile',
        'start.sh'
    ];
    
    let deploymentValid = true;
    
    for (const file of deploymentFiles) {
        const exists = fs.existsSync(file);
        console.log(`   ${file}: ${exists ? '✅' : '❌'}`);
        if (!exists) deploymentValid = false;
    }
    
    return deploymentValid;
}

function checkSecurityConfig() {
    console.log('\n4. Checking security configuration...');
    
    try {
        // Check if .env.template exists (should not commit actual .env)
        const envTemplateExists = fs.existsSync('.env.template');
        console.log(`   .env.template: ${envTemplateExists ? '✅' : '❌'}`);
        
        // Check if .env is properly gitignored
        const gitignore = fs.readFileSync('.gitignore', 'utf8');
        const envIgnored = gitignore.includes('.env');
        console.log(`   .env in .gitignore: ${envIgnored ? '✅' : '❌'}`);
        
        return envTemplateExists && envIgnored;
    } catch (error) {
        console.log(`   ❌ Security config check failed: ${error.message}`);
        return false;
    }
}

function generateReport(results) {
    console.log('\n📊 Build Verification Report');
    console.log('=============================');
    
    const { buildOutput, packageIntegrity, deploymentFiles, securityConfig } = results;
    
    console.log(`Build Output: ${buildOutput ? '✅' : '❌'}`);
    console.log(`Package Integrity: ${packageIntegrity ? '✅' : '❌'}`);
    console.log(`Deployment Files: ${deploymentFiles ? '✅' : '❌'}`);
    console.log(`Security Config: ${securityConfig ? '✅' : '❌'}`);
    
    const allPassed = buildOutput && packageIntegrity && deploymentFiles && securityConfig;
    const score = [buildOutput, packageIntegrity, deploymentFiles, securityConfig]
        .filter(Boolean).length;
    
    console.log(`\nOverall Score: ${score}/4 (${Math.round(score/4 * 100)}%)`);
    console.log(`Status: ${allPassed ? '🎉 READY FOR DEPLOYMENT' : '⚠️  DEPLOYMENT ISSUES DETECTED'}`);
    
    if (!allPassed) {
        console.log('\n🔧 Recommended Actions:');
        if (!buildOutput) console.log('   - Fix build compilation errors');
        if (!packageIntegrity) console.log('   - Verify package.json scripts and main entry');
        if (!deploymentFiles) console.log('   - Ensure all deployment files are present');
        if (!securityConfig) console.log('   - Review security configuration');
    }
    
    return allPassed;
}

// Run verification
async function main() {
    try {
        const results = {
            buildOutput: checkBuildOutput(),
            packageIntegrity: checkPackageIntegrity(), 
            deploymentFiles: checkDeploymentFiles(),
            securityConfig: checkSecurityConfig()
        };
        
        const success = generateReport(results);
        process.exit(success ? 0 : 1);
        
    } catch (error) {
        console.error('\n❌ Build verification failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { checkBuildOutput, checkPackageIntegrity, checkDeploymentFiles, checkSecurityConfig };