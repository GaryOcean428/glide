#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 GIDE Environment Setup Initiated...');

// Environment validation
const requiredEnvVars = [
  'NODE_ENV',
  'PORT'
];

// Install system essentials
const installEssentials = () => {
  try {
    console.log('📦 Installing essential packages...');
    
    // Install global TypeScript if not present
    try {
      execSync('tsc --version', { stdio: 'ignore' });
      console.log('✅ TypeScript already installed');
    } catch {
      console.log('🔧 Installing TypeScript globally...');
      execSync('npm install -g typescript@latest', { stdio: 'inherit' });
    }

    // Install additional global tools
    const globalTools = [
      'ts-node',
      'nodemon',
      '@types/node'
    ];

    globalTools.forEach(tool => {
      try {
        execSync(`npm list -g ${tool}`, { stdio: 'ignore' });
        console.log(`✅ ${tool} already installed`);
      } catch {
        console.log(`🔧 Installing ${tool}...`);
        execSync(`npm install -g ${tool}`, { stdio: 'inherit' });
      }
    });

    console.log('✅ Essential packages installed successfully');
  } catch (error) {
    console.error('❌ Error installing essentials:', error.message);
    process.exit(1);
  }
};

// Create necessary directories
const createDirectories = () => {
  const dirs = ['dist', 'logs', 'temp', 'uploads'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
};

// Validate environment
const validateEnvironment = () => {
  console.log('🔍 Validating environment...');
  
  const missing = requiredEnvVars.filter(env => !process.env[env]);
  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
  }

  // Set default values for Railway
  if (!process.env.PORT) {
    process.env.PORT = '3000';
    console.log('🔧 Set default PORT=3000');
  }

  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
    console.log('🔧 Set default NODE_ENV=production');
  }
};

// Main execution
const main = async () => {
  try {
    validateEnvironment();
    createDirectories();
    installEssentials();
    console.log('🎉 GIDE environment setup completed successfully!');
  } catch (error) {
    console.error('💥 Setup failed:', error.message);
    process.exit(1);
  }
};

main();