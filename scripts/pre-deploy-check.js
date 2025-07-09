#!/usr/bin/env node

console.log('🔍 Pre-deployment validation...');

const fs = require('fs');
const path = require('path');

// Check required files exist
const requiredFiles = [
  'Dockerfile',
  'scripts/railway-server.mjs',
  'package.json',
  'railway.toml'
];

let allFilesExist = true;

console.log('\n📁 Checking required files...');
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
}

// Check package.json for problematic dependencies in regular dependencies
console.log('\n🔍 Checking package.json dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const problematicDeps = ['native-keymap', 'native-watchdog', 'node-pty', 'kerberos'];
const dependencies = packageJson.dependencies || {};
const optionalDependencies = packageJson.optionalDependencies || {};

let dependencyIssues = false;

for (const dep of problematicDeps) {
  if (dependencies[dep]) {
    console.log(`❌ ${dep} is in regular dependencies (should be optional)`);
    dependencyIssues = true;
  } else if (optionalDependencies[dep]) {
    console.log(`✅ ${dep} is correctly in optionalDependencies`);
  } else {
    console.log(`✅ ${dep} not found (good for lightweight deployment)`);
  }
}

// Check scripts
console.log('\n🔧 Checking scripts...');
const scripts = packageJson.scripts || {};

if (scripts['railway:start'] === 'node scripts/railway-server.mjs') {
  console.log('✅ railway:start script configured correctly');
} else {
  console.log('❌ railway:start script misconfigured');
  dependencyIssues = true;
}

if (scripts['railway:build'] && scripts['railway:build'].includes('Skipping build')) {
  console.log('✅ railway:build script configured for lightweight deployment');
} else {
  console.log('❌ railway:build script not optimized');
  dependencyIssues = true;
}

// Check Dockerfile
console.log('\n🐳 Checking Dockerfile...');
if (fs.existsSync('Dockerfile')) {
  const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
  
  if (dockerfile.includes('codercom/code-server')) {
    console.log('✅ Using pre-built code-server image');
  } else {
    console.log('⚠️  Not using pre-built code-server image');
  }
  
  if (dockerfile.includes('SKIP_NATIVE_MODULES=1')) {
    console.log('✅ Native modules skip flag set');
  } else {
    console.log('⚠️  Native modules skip flag not set');
  }
  
  if (dockerfile.includes('--omit=optional')) {
    console.log('✅ Optional dependencies omitted');
  } else {
    console.log('⚠️  Optional dependencies not omitted');
  }
}

console.log('\n📊 Summary:');
if (allFilesExist && !dependencyIssues) {
  console.log('✅ Pre-deployment checks passed! Ready for Railway deployment.');
  process.exit(0);
} else {
  console.log('❌ Pre-deployment checks failed. Please fix the issues above.');
  process.exit(1);
}