#!/usr/bin/env node
/**
 * Validation script for Railway VS Code server
 * Tests that health checks are isolated and VS Code interface is properly served
 */

import http from 'http';
import { spawn } from 'child_process';

const TEST_PORT = 8081;
const HEALTH_ENDPOINTS = ['/healthz', '/health', '/api/health'];

let testServer;

/**
 * Make HTTP request and return response
 */
function makeRequest(path, port = TEST_PORT) {
    return new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}${path}`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error(`Request timeout for ${path}`));
        });
    });
}

/**
 * Start test server
 */
function startTestServer() {
    return new Promise((resolve, reject) => {
        console.log('🚀 Starting test server on port', TEST_PORT);
        
        testServer = spawn('node', ['scripts/railway-vscode-server.mjs'], {
            env: { ...process.env, PORT: TEST_PORT },
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let serverReady = false;
        const timeout = setTimeout(() => {
            if (!serverReady) {
                testServer.kill();
                reject(new Error('Test server startup timeout'));
            }
        }, 30000);

        testServer.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('Server:', output.trim());
            
            if (output.includes('Railway proxy server listening') && !serverReady) {
                serverReady = true;
                clearTimeout(timeout);
                resolve();
            }
        });

        testServer.stderr.on('data', (data) => {
            console.error('Server error:', data.toString().trim());
        });

        testServer.on('error', reject);
        testServer.on('exit', (code) => {
            if (!serverReady) {
                reject(new Error(`Server exited with code ${code}`));
            }
        });
    });
}

/**
 * Run validation tests
 */
async function runTests() {
    const results = [];
    
    console.log('\n🧪 Running health check tests...');
    
    // Test health endpoints
    for (const endpoint of HEALTH_ENDPOINTS) {
        try {
            const response = await makeRequest(endpoint);
            const success = response.statusCode === 200 && 
                          response.headers['content-type'].includes('application/json');
            
            console.log(`✅ ${endpoint}: HTTP ${response.statusCode} ${success ? 'OK' : 'FAIL'}`);
            
            if (success) {
                const health = JSON.parse(response.body);
                console.log(`   Status: ${health.status}, Service: ${health.service || 'proxy'}`);
            }
            
            results.push({ endpoint, success, statusCode: response.statusCode });
        } catch (error) {
            console.log(`❌ ${endpoint}: ${error.message}`);
            results.push({ endpoint, success: false, error: error.message });
        }
    }
    
    // Test VS Code interface
    console.log('\n🌐 Testing VS Code interface...');
    try {
        const response = await makeRequest('/');
        const isVSCode = response.body.includes('VS Code') || 
                        response.body.includes('Microsoft Corporation') ||
                        response.body.includes('code/didStartRenderer');
        
        console.log(`✅ VS Code interface: HTTP ${response.statusCode} ${isVSCode ? 'OK' : 'FAIL'}`);
        console.log(`   Content type: ${response.headers['content-type']}`);
        console.log(`   Contains VS Code content: ${isVSCode}`);
        
        results.push({ 
            endpoint: '/', 
            success: response.statusCode === 200 && isVSCode,
            statusCode: response.statusCode,
            isVSCode
        });
    } catch (error) {
        console.log(`❌ VS Code interface: ${error.message}`);
        results.push({ endpoint: '/', success: false, error: error.message });
    }
    
    return results;
}

/**
 * Main test function
 */
async function main() {
    console.log('🔧 Railway VS Code Server Validation\n');
    
    try {
        // Start server
        await startTestServer();
        
        // Wait a moment for full startup
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Run tests
        const results = await runTests();
        
        // Analyze results
        const passedTests = results.filter(r => r.success).length;
        const totalTests = results.length;
        
        console.log(`\n📊 Test Results: ${passedTests}/${totalTests} passed`);
        
        if (passedTests === totalTests) {
            console.log('🎉 All tests passed! Railway health check override issue is fixed.');
            process.exit(0);
        } else {
            console.log('❌ Some tests failed. Please check the implementation.');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Test setup failed:', error.message);
        process.exit(1);
    } finally {
        if (testServer) {
            console.log('\n🛑 Stopping test server...');
            testServer.kill();
        }
    }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
    if (testServer) testServer.kill();
    process.exit(1);
});

process.on('SIGTERM', () => {
    if (testServer) testServer.kill();
    process.exit(1);
});

main().catch((error) => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
});