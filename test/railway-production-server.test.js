#!/usr/bin/env node

/**
 * Focused test for railway-server-production.mjs
 * Tests the specific deployment configuration and endpoints
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const TEST_PORT = 3002;
const TEST_TIMEOUT = 10000;

// Simple test runner for this focused test
if (require.main === module) {
    console.log('🧪 Running Railway Production Server Test...\n');
    
    runTests().catch(console.error);
}

async function runTests() {
    console.log('📝 Railway Production Server:');
    
    let serverProcess;
    
    try {
        // Start the production server
        console.log('  🚀 Starting production server...');
        const serverPath = path.join(__dirname, '..', 'scripts', 'railway-server-production.mjs');
        
        serverProcess = spawn(process.execPath, [serverPath], {
            env: { ...process.env, PORT: TEST_PORT },
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Wait for server to start
        await new Promise((resolve, reject) => {
            let serverReady = false;
            
            serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                if (output.includes('GIDE production server running') && !serverReady) {
                    serverReady = true;
                    setTimeout(resolve, 1000); // Give server a moment to fully initialize
                }
            });
            
            serverProcess.stderr.on('data', (data) => {
                console.error('    Server error:', data.toString());
            });
            
            serverProcess.on('error', (err) => {
                reject(new Error(`Failed to start server: ${err.message}`));
            });
            
            // Timeout fallback
            setTimeout(() => {
                if (!serverReady) {
                    reject(new Error('Server failed to start within timeout'));
                }
            }, TEST_TIMEOUT);
        });
        
        console.log('  ✅ Server started successfully');
        
        // Test health check endpoint
        await testHealthEndpoint();
        
        // Test alternate health endpoint
        await testAlternateHealthEndpoint();
        
        // Test main interface
        await testMainInterface();
        
        // Test 404 response
        await test404Response();
        
        console.log('\n🎯 All tests passed!');
        
    } catch (err) {
        console.log(`  ❌ Test failed: ${err.message}`);
        process.exitCode = 1;
    } finally {
        if (serverProcess && !serverProcess.killed) {
            serverProcess.kill('SIGTERM');
        }
    }
}

async function testHealthEndpoint() {
    const { res, data } = await makeRequest('/healthz');
    
    if (res.statusCode !== 200) {
        throw new Error(`Health check: Expected status 200, got ${res.statusCode}`);
    }
    
    const healthData = JSON.parse(data);
    if (healthData.status !== 'healthy') {
        throw new Error(`Health check: Expected status 'healthy', got '${healthData.status}'`);
    }
    if (healthData.build !== 'production') {
        throw new Error(`Health check: Expected build 'production', got '${healthData.build}'`);
    }
    
    console.log('  ✅ Health check endpoint responds correctly');
}

async function testAlternateHealthEndpoint() {
    const { res } = await makeRequest('/health');
    
    if (res.statusCode !== 200) {
        throw new Error(`Alternate health: Expected status 200, got ${res.statusCode}`);
    }
    
    console.log('  ✅ Alternate health endpoint responds correctly');
}

async function testMainInterface() {
    const { res, data } = await makeRequest('/');
    
    if (res.statusCode !== 200) {
        throw new Error(`Main interface: Expected status 200, got ${res.statusCode}`);
    }
    
    if (!data.includes('Visual Studio Code - GIDE')) {
        throw new Error('Main interface: Expected GIDE title not found');
    }
    
    console.log('  ✅ Main interface serves correctly');
}

async function test404Response() {
    const { res, data } = await makeRequest('/nonexistent');
    
    // The production server serves a fallback page for unknown routes
    // This is expected behavior for a production web application
    if (res.statusCode !== 200) {
        throw new Error(`Fallback test: Expected status 200 (fallback page), got ${res.statusCode}`);
    }
    
    // Should serve either the fallback HTML or 404 JSON
    const isHtml = data.includes('<!DOCTYPE html>') || data.includes('<html');
    const isJson = data.includes('"error"');
    
    if (!isHtml && !isJson) {
        throw new Error('Fallback test: Expected either HTML fallback or JSON 404 response');
    }
    
    console.log('  ✅ Fallback/404 response works correctly');
}

function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: TEST_PORT,
            path: path,
            method: 'GET',
            timeout: 5000
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ res, data }));
        });
        
        req.on('error', (err) => {
            reject(new Error(`Request error: ${err.message}`));
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}