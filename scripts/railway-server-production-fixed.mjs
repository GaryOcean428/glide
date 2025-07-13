#!/usr/bin/env node
/**
 * Production Railway server for GIDE VS Code web interface
 * Launches code-server directly instead of serving status pages
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  port: process.env.PORT || 8080,
  host: '0.0.0.0',
  password: process.env.PASSWORD || 'defaultpassword'
};

console.log('🚀 Starting code-server on Railway...');
console.log(`📍 Port: ${config.port}`);
console.log(`🌐 URL: https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'localhost'}`);

const codeServer = spawn('code-server', [
  '--bind-addr', `${config.host}:${config.port}`,
  '--auth', 'password',
  '--password', config.password,
  '--disable-telemetry',
  '--disable-update-check',
  '--app-name', 'GIDE',
  // Use Railway volume mount path or default workspace
  process.env.RAILWAY_VOLUME_MOUNT_PATH || '/tmp/workspace'
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    SHELL: '/bin/bash'
  }
});

codeServer.on('error', (err) => {
  console.error('❌ Failed to start:', err);
  process.exit(1);
});

codeServer.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
  process.exit(code);
});