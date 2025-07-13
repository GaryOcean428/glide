#!/usr/bin/env node
/**
 * Test script to validate code-server configuration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, '..');

console.log('🧪 Testing GIDE Railway configuration...');

// Test 1: Check if fixed script exists
const fixedScript = path.join(appRoot, 'scripts', 'railway-server-production-fixed.mjs');
if (fs.existsSync(fixedScript)) {
  console.log('✅ Fixed railway server script exists');
} else {
  console.log('❌ Fixed railway server script missing');
  process.exit(1);
}

// Test 2: Check if package.json has been updated
const packageJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
if (packageJson.scripts.start.includes('railway-server-production-fixed.mjs')) {
  console.log('✅ package.json start script updated');
} else {
  console.log('❌ package.json start script not updated');
  process.exit(1);
}

// Test 3: Check if railway:start script is updated
if (packageJson.scripts['railway:start'].includes('railway-server-production-fixed.mjs')) {
  console.log('✅ package.json railway:start script updated');
} else {
  console.log('❌ package.json railway:start script not updated');
  process.exit(1);
}

// Test 4: Check railway.toml configuration
const railwayToml = fs.readFileSync(path.join(appRoot, 'railway.toml'), 'utf8');
if (!railwayToml.includes('healthcheckPath')) {
  console.log('✅ Railway health check path removed');
} else {
  console.log('❌ Railway health check path not removed');
  process.exit(1);
}

// Test 5: Check Dockerfile.codeserver
const dockerfile = fs.readFileSync(path.join(appRoot, 'Dockerfile.codeserver'), 'utf8');
if (dockerfile.includes('railway-server-production-fixed.mjs')) {
  console.log('✅ Dockerfile.codeserver updated to use fixed script');
} else {
  console.log('❌ Dockerfile.codeserver not updated');
  process.exit(1);
}

console.log('🎉 All configuration tests passed!');
console.log('📝 Summary of changes:');
console.log('   - Created railway-server-production-fixed.mjs that launches code-server directly');
console.log('   - Updated package.json scripts to use the fixed launcher');
console.log('   - Updated railway.toml to remove custom health check endpoint');
console.log('   - Updated Dockerfile.codeserver to use the new script');
console.log('   - Backed up original files to .backup/');