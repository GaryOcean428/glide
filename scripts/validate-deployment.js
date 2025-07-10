#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const endpoints = [
  { path: '/healthz', expected: 200 },
  { path: '/health', expected: 200 },
  { path: '/', expected: 200 }
];

// Enhanced validation with deployment checks
async function validateDeploymentFiles() {
  console.log('🔍 Validating deployment files...');
  
  const requiredFiles = [
    'scripts/railway-server-production.mjs',
    'package.json',
    'railway.toml',
    'build-gide-extension.sh'
  ];
  
  let filesOk = true;
  
  for (const file of requiredFiles) {
    const exists = fs.existsSync(path.join(__dirname, '..', file));
    console.log(`${file}: ${exists ? '✅' : '❌'}`);
    if (!exists) filesOk = false;
  }
  
  // Check package.json configuration
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json')));
    const hasProductionServer = pkg.scripts && 
      pkg.scripts.start && 
      pkg.scripts.start.includes('railway-server-production.mjs');
    console.log(`package.json production config: ${hasProductionServer ? '✅' : '❌'}`);
    if (!hasProductionServer) filesOk = false;
  } catch (error) {
    console.log(`package.json validation: ❌ ${error.message}`);
    filesOk = false;
  }
  
  return filesOk;
}

async function validateEndpoint(host, endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: process.env.PORT || 8080,
      path: endpoint.path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      const success = res.statusCode === endpoint.expected;
      console.log(`${endpoint.path}: ${res.statusCode} ${success ? '✅' : '❌'}`);
      
      // For health endpoint, also validate JSON response
      if (endpoint.path === '/healthz' && success) {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const health = JSON.parse(data);
            const isHealthy = health.status === 'healthy';
            console.log(`  Health status: ${health.status} ${isHealthy ? '✅' : '❌'}`);
            resolve(success && isHealthy);
          } catch {
            console.log(`  Health JSON parsing: ❌`);
            resolve(false);
          }
        });
      } else {
        resolve(success);
      }
    });

    req.on('error', (error) => {
      console.error(`${endpoint.path}: Failed - ${error.message} ❌`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.error(`${endpoint.path}: Timeout ❌`);
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function validate() {
  console.log('🚀 GIDE Deployment Validation');
  console.log('==============================\n');
  
  // First validate deployment files
  const filesOk = await validateDeploymentFiles();
  console.log('');
  
  // Then validate running server
  const host = process.env.RAILWAY_PUBLIC_DOMAIN || 'localhost';
  console.log(`🌐 Validating server at ${host}...`);
  
  let allPassed = true;
  
  for (const endpoint of endpoints) {
    try {
      const success = await validateEndpoint(host, endpoint);
      allPassed = allPassed && success;
    } catch (error) {
      console.error(`${endpoint.path}: Exception - ${error.message} ❌`);
      allPassed = false;
    }
  }
  
  console.log('');
  console.log('==============================');
  console.log(`Files: ${filesOk ? '✅' : '❌'}`);
  console.log(`Server: ${allPassed ? '✅' : '❌'}`);
  console.log(`Overall: ${(filesOk && allPassed) ? '✅ All checks passed!' : '❌ Some checks failed'}`);
  
  process.exit((filesOk && allPassed) ? 0 : 1);
}

if (require.main === module) {
  validate();
}

module.exports = { validate };