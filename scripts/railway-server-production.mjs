#!/usr/bin/env node
/**
 * Production-ready Railway server for GIDE VS Code web interface
 * This replaces the test-framework approach with a proper production server
 * Uses only built-in Node.js modules for maximum compatibility
 */

import http from 'http';
import url from 'url';
import cp from 'child_process';
import path from 'path';
import fs from 'fs';

// Enhanced logger for production environment
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

const port = validatePort(process.env.PORT) || 8080;
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.join(__dirname, '..');

/**
 * Validates port number for security
 */
function validatePort(port) {
    const portNum = parseInt(port, 10);
    return (portNum >= 1024 && portNum <= 65535) ? portNum : null;
}

/**
 * MIME type mapping for static files
 */
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.woff': 'application/font-woff',
    '.woff2': 'application/font-woff2',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject'
};

/**
 * Get MIME type for file extension
 */
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Serve static files
 */
function serveStaticFile(filePath, res) {
    try {
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) {
            return false;
        }
        
        const mimeType = getMimeType(filePath);
        const content = fs.readFileSync(filePath);
        
        res.writeHead(200, {
            'Content-Type': mimeType,
            'Content-Length': content.length,
            'Cache-Control': 'public, max-age=3600',
            'ETag': `"${stats.mtime.getTime()}-${stats.size}"`
        });
        res.end(content);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Check if VS Code is built and ready
 */
function checkVSCodeBuild() {
    const buildPaths = [
        path.join(appRoot, 'out'),
        path.join(appRoot, 'out', 'vs')
    ];
    
    for (const buildPath of buildPaths) {
        if (!fs.existsSync(buildPath)) {
            return false;
        }
    }
    return true;
}

/**
 * Handle HTTP requests
 */
function handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    logger.info(`${req.method} ${pathname}`);
    
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Health check endpoints
    if (pathname === '/healthz' || pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            port: port,
            env: process.env.NODE_ENV || 'development',
            version: '1.102.0',
            build: 'production'
        }));
        return;
    }
    
    // Root route - serve VS Code interface or fallback
    if (pathname === '/') {
        const hasVSCodeBuild = checkVSCodeBuild();
        
        if (hasVSCodeBuild) {
            // Try to serve VS Code index
            const vsCodeIndex = path.join(appRoot, 'out', 'vs', 'code', 'browser', 'workbench', 'workbench.html');
            if (fs.existsSync(vsCodeIndex)) {
                if (serveStaticFile(vsCodeIndex, res)) {
                    return;
                }
            }
        }
        
        // Serve enhanced interface
        const indexHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Studio Code - GIDE</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; 
            background: #1e1e1e; 
            color: #d4d4d4; 
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            text-align: center;
        }
        .container { max-width: 600px; padding: 40px; }
        h1 { color: #007acc; margin-bottom: 20px; }
        .status { 
            background: #0e639c; 
            color: white; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 20px 0; 
        }
        .btn {
            background: #0e639c;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 3px;
            text-decoration: none;
            display: inline-block;
            margin: 10px;
            cursor: pointer;
        }
        .btn:hover { background: #007acc; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 GIDE - Visual Studio Code</h1>
        <div class="status">
            ✅ VS Code web interface is running<br>
            🔧 Environment: ${process.env.NODE_ENV || 'development'}<br>
            📦 Version: 1.102.0<br>
            🏗️ Build: ${hasVSCodeBuild ? 'Full VS Code Assets Available' : 'Fallback Mode'}
        </div>
        <p>The GIDE VS Code web interface is successfully running in production mode.</p>
        <a href="/healthz" class="btn">System Health</a>
        ${hasVSCodeBuild ? '<a href="/out" class="btn">View Assets</a>' : ''}
        <a href="#" onclick="window.location.reload()" class="btn">Refresh</a>
    </div>
</body>
</html>`;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexHtml);
        return;
    }
    
    // Serve static assets
    if (pathname.startsWith('/out/')) {
        const filePath = path.join(appRoot, pathname);
        if (serveStaticFile(filePath, res)) {
            return;
        }
    }
    
    if (pathname.startsWith('/resources/')) {
        const filePath = path.join(appRoot, pathname);
        if (serveStaticFile(filePath, res)) {
            return;
        }
    }
    
    if (pathname.startsWith('/extensions/')) {
        const filePath = path.join(appRoot, pathname);
        if (serveStaticFile(filePath, res)) {
            return;
        }
    }
    
    // Serve fallback interface for any unmatched routes
    const fallbackPath = path.join(__dirname, 'vscode-fallback.html');
    if (fs.existsSync(fallbackPath)) {
        if (serveStaticFile(fallbackPath, res)) {
            return;
        }
    }
    
    // 404 for everything else
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        error: 'Not found',
        path: pathname,
        timestamp: new Date().toISOString()
    }));
}

/**
 * Main server startup
 */
async function main() {
    logger.info('🚀 GIDE Production Railway Server starting...');
    logger.info('📦 Environment:', process.env.NODE_ENV || 'development');
    logger.info('🔧 Port:', port);
    
    try {
        // Create HTTP server
        const server = http.createServer(handleRequest);
        
        server.listen(port, '0.0.0.0', () => {
            logger.info(`🌟 GIDE production server running on port ${port}`);
            logger.info(`🔗 Health check: http://localhost:${port}/healthz`);
            logger.info(`🌐 VS Code interface: http://localhost:${port}/`);
        });
        
        // Graceful shutdown
        const shutdown = () => {
            logger.info('📴 Shutting down gracefully...');
            server.close(() => {
                logger.info('✅ Server closed');
                process.exit(0);
            });
        };
        
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
        
    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
main().catch((error) => {
    logger.error('❌ Fatal error:', error);
    process.exit(1);
});