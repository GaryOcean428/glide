#!/usr/bin/env node

const http = require('http');

const endpoints = [
  { path: '/healthz', expected: 200 },
  { path: '/health', expected: 200 },
  { path: '/', expected: 200 }
];

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
      resolve(success);
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
  const host = process.env.RAILWAY_PUBLIC_DOMAIN || 'localhost';
  console.log(`🔍 Validating deployment at ${host}...`);
  
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
  console.log(`Overall result: ${allPassed ? '✅ All checks passed!' : '❌ Some checks failed'}`);
  process.exit(allPassed ? 0 : 1);
}

if (require.main === module) {
  validate();
}

module.exports = { validate };