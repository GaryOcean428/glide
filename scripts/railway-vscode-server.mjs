#!/usr/bin/env node
/**
 * Railway VS Code Web Server
 * Properly serves VS Code web interface with isolated health checks
 */

import { spawn } from 'child_process';
import http from 'http';
import url from 'url';
import path from 'path';
import { createRequire } from 'module';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Create require function for ES modules
const require = createRequire(import.meta.url);

// Configuration
const RAILWAY_PORT = process.env.PORT || 8080;
const VSCODE_PORT = 9888; // Internal port for VS Code
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const APP_ROOT = path.join(__dirname, '..');

// Enhanced logger
const logger = {
    info: (message, ...args) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] INFO: ${message}`, ...args);
    },
    warn: (message, ...args) => {
        const timestamp = new Date().toISOString();
        console.warn(`[${timestamp}] WARN: ${message}`, ...args);
    },
    error: (message, ...args) => {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] ERROR: ${message}`, ...args);
    }
};

/**
 * Start VS Code web server on internal port
 */
function startVSCodeServer() {
    return new Promise((resolve, reject) => {
        const testWebLocation = require.resolve('@vscode/test-web');
        
        const vsCodeArgs = [
            testWebLocation,
            '--host', '127.0.0.1',
            '--port', VSCODE_PORT.toString(),
            '--browserType', 'none',
            '--sourcesPath', APP_ROOT,
            '--folder-uri', 'file:///tmp/workspace'
        ];

        logger.info('Starting VS Code web server...', { port: VSCODE_PORT });
        
        const vsCodeProcess = spawn(process.execPath, vsCodeArgs, {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {
                ...process.env,
                VSCODE_SERVER_PORT: VSCODE_PORT.toString()
            }
        });

        let serverReady = false;
        let startupTimeout;

        // Monitor stdout for server ready signal
        vsCodeProcess.stdout.on('data', (data) => {
            const output = data.toString();
            logger.info('VS Code output:', output.trim());
            
            if (output.includes('Listening on') && output.includes(`127.0.0.1:${VSCODE_PORT}`)) {
                if (!serverReady) {
                    serverReady = true;
                    clearTimeout(startupTimeout);
                    logger.info('VS Code server is ready');
                    resolve(vsCodeProcess);
                }
            }
        });

        vsCodeProcess.stderr.on('data', (data) => {
            logger.warn('VS Code stderr:', data.toString().trim());
        });

        vsCodeProcess.on('error', (error) => {
            logger.error('VS Code server error:', error);
            reject(error);
        });

        vsCodeProcess.on('exit', (code, signal) => {
            logger.error('VS Code server exited:', { code, signal });
            if (!serverReady) {
                reject(new Error(`VS Code server failed to start (exit code: ${code})`));
            }
        });

        // Timeout for server startup
        startupTimeout = setTimeout(() => {
            if (!serverReady) {
                logger.error('VS Code server startup timeout');
                vsCodeProcess.kill();
                reject(new Error('VS Code server startup timeout'));
            }
        }, 30000); // 30 second timeout

        return vsCodeProcess;
    });
}

/**
 * Create proxy server that routes to VS Code with health checks
 */
function createProxyServer(vsCodeProcess) {
    const server = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;
        
        // Security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        
        // Health check endpoints - handle directly without proxying
        if (pathname === '/healthz' || pathname === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                service: 'vscode-web',
                port: RAILWAY_PORT,
                internal_port: VSCODE_PORT,
                version: '1.102.0'
            }));
            return;
        }

        // API health endpoint for more detailed status
        if (pathname === '/api/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                timestamp: new Date().toISOString(),
                status: 'healthy',
                services: {
                    proxy: {
                        status: 'running',
                        port: RAILWAY_PORT
                    },
                    vscode: {
                        status: vsCodeProcess && !vsCodeProcess.killed ? 'running' : 'stopped',
                        port: VSCODE_PORT,
                        pid: vsCodeProcess ? vsCodeProcess.pid : null
                    }
                },
                environment: process.env.NODE_ENV || 'development'
            }));
            return;
        }

        // Proxy all other requests to VS Code server
        const proxy = createProxyMiddleware({
            target: `http://127.0.0.1:${VSCODE_PORT}`,
            changeOrigin: true,
            ws: true, // Enable WebSocket proxying
            timeout: 30000,
            proxyTimeout: 30000,
            onError: (err, req, res) => {
                logger.error('Proxy error:', err.message);
                if (!res.headersSent) {
                    res.writeHead(502, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: 'VS Code server unavailable',
                        message: 'The VS Code web interface is starting up...',
                        timestamp: new Date().toISOString()
                    }));
                }
            },
            onProxyReq: (proxyReq, req, res) => {
                logger.info(`Proxying: ${req.method} ${req.url}`);
            }
        });

        proxy(req, res);
    });

    // Handle WebSocket upgrades for VS Code
    server.on('upgrade', (request, socket, head) => {
        const proxy = createProxyMiddleware({
            target: `http://127.0.0.1:${VSCODE_PORT}`,
            changeOrigin: true,
            ws: true
        });
        
        proxy.upgrade(request, socket, head);
    });

    return server;
}

/**
 * Main startup function
 */
async function main() {
    logger.info('🚀 Starting Railway VS Code Web Server...');
    logger.info('Configuration:', { 
        railwayPort: RAILWAY_PORT, 
        vsCodePort: VSCODE_PORT,
        nodeEnv: process.env.NODE_ENV || 'development'
    });

    try {
        // Start VS Code server first
        const vsCodeProcess = await startVSCodeServer();
        
        // Create proxy server
        const proxyServer = createProxyServer(vsCodeProcess);
        
        // Start proxy server
        proxyServer.listen(RAILWAY_PORT, '0.0.0.0', () => {
            logger.info(`🌟 Railway proxy server listening on port ${RAILWAY_PORT}`);
            logger.info(`🔗 Health check: http://localhost:${RAILWAY_PORT}/healthz`);
            logger.info(`🌐 VS Code web interface: http://localhost:${RAILWAY_PORT}/`);
        });

        // Graceful shutdown
        const shutdown = () => {
            logger.info('📴 Shutting down gracefully...');
            
            proxyServer.close(() => {
                logger.info('✅ Proxy server closed');
                
                if (vsCodeProcess && !vsCodeProcess.killed) {
                    vsCodeProcess.kill('SIGTERM');
                    setTimeout(() => {
                        if (!vsCodeProcess.killed) {
                            vsCodeProcess.kill('SIGKILL');
                        }
                    }, 5000);
                }
                
                process.exit(0);
            });
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
        
        // Handle VS Code process exit
        vsCodeProcess.on('exit', (code, signal) => {
            logger.error('VS Code server exited unexpectedly:', { code, signal });
            process.exit(1);
        });

    } catch (error) {
        logger.error('❌ Failed to start servers:', error);
        process.exit(1);
    }
}

// Start the application
main().catch((error) => {
    logger.error('❌ Fatal error:', error);
    process.exit(1);
});