#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 GIDE Environment Verification Started...');

// Function to check if a command exists
const commandExists = (command) => {
  try {
    execSync(`command -v ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

// Function to check if a global npm package is installed
const globalPackageExists = (packageName) => {
  try {
    execSync(`npm list -g ${packageName}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

// Verify essential commands
const verifyCommands = () => {
  console.log('🔧 Verifying essential commands...');
  
  const essentialCommands = ['node', 'npm', 'git'];
  let allPresent = true;
  
  essentialCommands.forEach(cmd => {
    if (commandExists(cmd)) {
      console.log(`✅ ${cmd} is available`);
    } else {
      console.error(`❌ ${cmd} is missing`);
      allPresent = false;
    }
  });
  
  return allPresent;
};

// Verify global packages
const verifyGlobalPackages = () => {
  console.log('📦 Verifying global packages...');
  
  const globalPackages = ['typescript', 'ts-node'];
  let allPresent = true;
  
  globalPackages.forEach(pkg => {
    if (globalPackageExists(pkg)) {
      console.log(`✅ ${pkg} is globally installed`);
    } else {
      console.warn(`⚠️  ${pkg} is not globally installed`);
      allPresent = false;
    }
  });
  
  return allPresent;
};

// Verify directories
const verifyDirectories = () => {
  console.log('📁 Verifying required directories...');
  
  const requiredDirs = ['dist', 'logs', 'temp', 'uploads'];
  let allPresent = true;
  
  requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`✅ Directory ${dir} exists`);
    } else {
      console.warn(`⚠️  Directory ${dir} is missing`);
      allPresent = false;
    }
  });
  
  return allPresent;
};

// Verify environment variables
const verifyEnvironment = () => {
  console.log('🌍 Verifying environment variables...');
  
  const recommendedVars = ['NODE_ENV', 'PORT'];
  let allPresent = true;
  
  recommendedVars.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}=${process.env[envVar]}`);
    } else {
      console.warn(`⚠️  ${envVar} is not set`);
      allPresent = false;
    }
  });
  
  return allPresent;
};

// Main verification
const main = () => {
  try {
    const commandsOk = verifyCommands();
    const packagesOk = verifyGlobalPackages();
    const dirsOk = verifyDirectories();
    const envOk = verifyEnvironment();
    
    if (commandsOk && packagesOk && dirsOk && envOk) {
      console.log('🎉 All verifications passed! Environment is ready for Railway deployment.');
      process.exit(0);
    } else {
      console.log('⚠️  Some verifications failed. Environment may need setup.');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Verification failed:', error.message);
    process.exit(1);
  }
};

main();