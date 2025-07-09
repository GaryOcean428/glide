#!/usr/bin/env node
// Logger setup for quality improvement
const logger = {
    info: (message, ...args) => {
        const timestamp = new Date().toISOString();
        process.stdout.write(`[${timestamp}] INFO: ${message}` + (args.length ? ` ${args.join(' ')}` : '') + '\n');
    },
    warn: (message, ...args) => {
        const timestamp = new Date().toISOString();
        process.stderr.write(`[${timestamp}] WARN: ${message}` + (args.length ? ` ${args.join(' ')}` : '') + '\n');
    },
    error: (message, ...args) => {
        const timestamp = new Date().toISOString();
        process.stderr.write(`[${timestamp}] ERROR: ${message}` + (args.length ? ` ${args.join(' ')}` : '') + '\n');
    }
};

import http from 'http';
import https from 'https';
import url from 'url';
import cp from 'child_process';
import path from 'path';
import fs from 'fs';

const port = validatePort(process.env.PORT) || 8080;

/**
 * Validates port number for security
 * @param {string|number} port - Port to validate
 * @returns {number|null} - Valid port number or null
 */
function validatePort(port) {
    const portNum = parseInt(port, 10);
    return (portNum >= 1024 && portNum <= 65535) ? portNum : null;
}

const codeServerPort = 8443;
let codeServerProcess = null;
let codeServerReady = false;

logger.info('🚀 GIDE Railway Server starting...');
logger.info('📦 Environment:', process.env.NODE_ENV || 'development');
logger.info('🔧 Skip native modules:', process.env.SKIP_NATIVE_MODULES === '1');

// Performance optimization: Cache native module checks
const moduleCache = new Map();

/**
 * Cached native module check for performance
 * @param {string} moduleName - Module name to check
 * @returns {boolean} - Whether module is available
 */
function isModuleAvailable(moduleName) {
    if (moduleCache.has(moduleName)) {
        return moduleCache.get(moduleName);
    }
    
    try {
        // Use dynamic import to check module availability in ES modules
        import.meta.resolve(moduleName);
        moduleCache.set(moduleName, true);
        return true;
    } catch (e) {
        moduleCache.set(moduleName, false);
        return false;
    }
}

// Check for native module availability (graceful fallback)
function checkNativeModules() {
    const nativeModules = ['native-keymap', 'native-watchdog', 'node-pty', 'kerberos'];
    const availableModules = [];
    
    for (const moduleName of nativeModules) {
        if (isModuleAvailable(moduleName)) {
            availableModules.push(moduleName);
        } else {
            logger.info(`⚠️ Native module ${moduleName} not available (this is expected in Railway deployment)`);
        }
    }
    
    logger.info(`✅ Available native modules: ${availableModules.length > 0 ? availableModules.join(', ') : 'none (using fallbacks)'}`);
    return availableModules;
}

// Start VS Code web server using the built-in test-web package
function startCodeServer() {
    logger.info('🚀 Starting VS Code web server...');
    
    // Get current directory from import.meta.url
    const __filename = url.fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const appRoot = path.join(__dirname, '..');
    
    // Try to use VS Code's built-in web server
    let testWebLocation;
    try {
        // Try to resolve @vscode/test-web package
        testWebLocation = path.join(appRoot, 'node_modules', '@vscode', 'test-web', 'out', 'server', 'index.js');
        if (!fs.existsSync(testWebLocation)) {
            throw new Error('Package not found');
        }
    } catch (e) {
        logger.error('❌ Cannot find @vscode/test-web package');
        logger.info('🎭 Starting fallback server...');
        startMockServer();
        return;
    }
    
    const serverArgs = [
        '--host', '127.0.0.1',
        '--port', codeServerPort.toString(),
        '--browserType', 'none',
        '--sourcesPath', appRoot
    ];
    
    logger.info(`Starting VS Code web server: ${testWebLocation} ${serverArgs.join(' ')}`);
    
    codeServerProcess = cp.spawn(process.execPath, [testWebLocation, ...serverArgs], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
            ...process.env,
            NODE_ENV: 'production'
        }
    });
    
    codeServerProcess.stdout.on('data', (data) => {
        const output = data.toString();
        logger.info('VS Code web:', output.trim());
        
        // Look for server ready indicators
        if (output.includes('Listening on') || 
            output.includes('Web UI available') || 
            output.includes('Server listening')) {
            codeServerReady = true;
            logger.info('✅ VS Code web server is ready!');
        }
    });
    
    codeServerProcess.stderr.on('data', (data) => {
        const output = data.toString();
        logger.error('VS Code web error:', output.trim());
    });
    
    codeServerProcess.on('exit', (code, signal) => {
        logger.info(`VS Code web server exited with code ${code}, signal ${signal}`);
        codeServerReady = false;
        
        if (code !== 0 && code !== null) {
            logger.info('Restarting VS Code web server in 5 seconds...');
            setTimeout(startCodeServer, 5000);
        }
    });
    
    codeServerProcess.on('error', (err) => {
        logger.error('Failed to start VS Code web server:', err);
        logger.info('🎭 Falling back to mock server...');
        codeServerReady = false;
        startMockServer();
    });
    
    // Add a timeout fallback in case the process fails repeatedly
    setTimeout(() => {
        if (!codeServerReady) {
            logger.info('⚠️ VS Code web server failed to start within timeout, checking again...');
            if (codeServerProcess && !codeServerProcess.killed) {
                // Give it a bit more time before killing
                setTimeout(() => {
                    if (!codeServerReady) {
                        logger.info('🛑 Stopping VS Code web server and using fallback...');
                        codeServerProcess.kill('SIGTERM');
                        setTimeout(startMockServer, 1000); // Wait 1 second before starting mock server
                    }
                }, 5000);
            } else {
                startMockServer();
            }
        }
    }, 30000); // 30 second timeout for first start
}

// Start a fallback server when VS Code web server is not available
function startMockServer() {
    logger.info('🎭 Starting VS Code-like fallback interface...');
    
    const mockServer = http.createServer((req, res) => {
        if (req.url === '/healthz' || req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'fallback',
                message: 'VS Code web server unavailable - serving fallback interface',
                timestamp: new Date().toISOString(),
                port: port,
                codeServerPort: codeServerPort,
                codeServerReady: false,
                env: process.env.NODE_ENV || 'development'
            }));
            return;
        }
        
        // Serve the VS Code-like fallback interface
        const __filename = url.fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const fallbackPath = path.join(__dirname, 'vscode-fallback.html');
        
        try {
            const fallbackContent = fs.readFileSync(fallbackPath, 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(fallbackContent);
        } catch (error) {
            logger.error('Failed to serve fallback interface:', error);
            res.writeHead(503, { 'Content-Type': 'text/html' });
            res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>GIDE - VS Code Server Unavailable</title>
    <meta http-equiv="refresh" content="10">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 40px; 
            background: #1e1e1e; 
            color: #d4d4d4; 
            text-align: center;
        }
        .error { background: #d73027; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="error">
        <h1>🚧 VS Code Server Unavailable</h1>
        <p><span class="spinner">🔄</span> The VS Code web interface could not be started.</p>
        <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
        <p><a href="/healthz">Health Check</a> | <a href="/">Retry</a></p>
    </div>
</body>
</html>
            `);
        }
    });
    
    mockServer.listen(codeServerPort, '127.0.0.1', () => {
        logger.info(`🎭 VS Code fallback interface listening on port ${codeServerPort}`);
        codeServerReady = true;
    });
}

// Simple HTTP proxy using built-in modules
function proxyRequest(req, res) {
    const targetUrl = `http://127.0.0.1:${codeServerPort}${req.url}`;
    const options = {
        ...url.parse(targetUrl),
        method: req.method,
        headers: {
            ...req.headers,
            host: `127.0.0.1:${codeServerPort}`
        }
    };
    
    const proxyReq = http.request(options, (proxyRes) => {
        // Copy status code and headers
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
        logger.error('Proxy request failed:', err);
        res.writeHead(502, { 'Content-Type': 'text/html' });
        res.end(`
<html>
    <head><title>GIDE - Service Unavailable</title></head>
    <body>
        <h1>🚧 VS Code Server Unavailable</h1>
        <p>The VS Code server is starting up or temporarily unavailable.</p>
        <p>Please wait a moment and refresh the page.</p>
        <p><a href="/">Refresh</a> | <a href="/healthz">Health Check</a></p>
    </body>
</html>
        `);
    });
    
    // Forward request body if present
    req.pipe(proxyReq);
}

// Handle WebSocket upgrade for VS Code
function handleWebSocketUpgrade(request, socket, head) {
    logger.info('WebSocket upgrade request for:', request.url);
    
    if (!codeServerReady) {
        socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
        socket.destroy();
        return;
    }
    
    const target = http.request({
        port: codeServerPort,
        host: '127.0.0.1',
        method: 'GET',
        path: request.url,
        headers: {
            ...request.headers,
            host: `127.0.0.1:${codeServerPort}`
        }
    });
    
    target.on('upgrade', (res, targetSocket, targetHead) => {
        socket.write('HTTP/1.1 101 Switching Protocols\r\n');
        const responseHeaders = res.headers;
        for (const key in responseHeaders) {
            socket.write(`${key}: ${responseHeaders[key]}\r\n`);
        }
        socket.write('\r\n');
        
        targetSocket.pipe(socket);
        socket.pipe(targetSocket);
    });
    
    target.on('error', () => {
        socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
        socket.destroy();
    });
    
    target.end();
}

// Main HTTP server
const server = http.createServer((req, res) => {
    logger.info(`${req.method} ${req.url}`);
    
    // Health check endpoint
    if (req.url === '/healthz' || req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            port: port,
            codeServerPort: codeServerPort,
            codeServerReady: codeServerReady,
            env: process.env.NODE_ENV || 'development'
        }));
        return;
    }
    
    // Check if code-server is ready
    if (!codeServerReady) {
        res.writeHead(503, { 'Content-Type': 'text/html' });
        res.end(`
<html>
    <head>
        <title>GIDE - Starting VS Code Server</title>
        <meta http-equiv="refresh" content="5">
    </head>
    <body>
        <h1>🚀 GIDE - VS Code Server Starting</h1>
        <p>⏳ VS Code server is starting up...</p>
        <p>This page will automatically refresh in 5 seconds.</p>
        <p>Port: ${port} | Code Server Port: ${codeServerPort}</p>
        <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
        <p><a href="/healthz">Health Check</a></p>
    </body>
</html>
        `);
        return;
    }
    
    // Proxy all other requests to code-server
    proxyRequest(req, res);
});

// Handle WebSocket upgrades
server.on('upgrade', handleWebSocketUpgrade);

server.listen(port, '0.0.0.0', () => {
    logger.info(`🌟 GIDE Railway proxy server running on port ${port}`);
    logger.info(`🔗 Health check available at http://localhost:${port}/healthz`);
    logger.info(`📡 Will proxy to VS Code server on port ${codeServerPort}`);
    
    // Start code-server after a short delay
    setTimeout(startCodeServer, 2000);
});

// Graceful shutdown
function shutdown() {
    logger.info('📴 Shutting down gracefully...');
    
    if (codeServerProcess && !codeServerProcess.killed) {
        logger.info('🛑 Stopping code-server...');
        codeServerProcess.kill('SIGTERM');
    }
    
    server.close(() => {
        logger.info('✅ Server closed');
        process.exit(0);
    });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);