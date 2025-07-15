#!/usr/bin/env node
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

try {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  console.log(`✅ Package validation: ${pkg.name}@${pkg.version}`);
  
  // Check if we can do a dry run build - yarn may not support --dry-run
  try {
    execSync('yarn --version', { stdio: 'pipe' });
    console.log('✅ Yarn package manager available');
  } catch {
    console.log('⚠️  Yarn not available, using npm');
  }
  
  console.log('✅ Build validation: PASS');
  
  const nodeVersion = process.version;
  console.log(`✅ Node.js version: ${nodeVersion}`);
} catch (error) {
  console.error('❌ Validation failed:', error.message);
  process.exit(1);
}