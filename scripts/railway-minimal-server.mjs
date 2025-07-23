#!/usr/bin/env node
/**
 * Minimal Railway VS Code Web Server
 * Fallback server for Railway deployment when full VS Code dependencies fail
 */

import http from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAILWAY_PORT = process.env.PORT || 8080;

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

// Simple HTML page for VS Code web interface placeholder
const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VS Code Web - Railway Deployment</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background: #1e1e1e;
            color: #cccccc;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }
        .container {
            text-align: center;
            max-width: 600px;
            padding: 2rem;
        }
        h1 {
            color: #007acc;
            margin-bottom: 1rem;
        }
        .status {
            background: #252526;
            border: 1px solid #3c3c3c;
            border-radius: 8px;
            padding: 1.5rem;
            margin: 1rem 0;
        }
        .success {
            border-color: #4caf50;
            background: #1e3e1e;
        }
        .loading {
            border-color: #ff9800;
            background: #3e2e1e;
        }
        .info {
            background: #252526;
            border: 1px solid #007acc;
            border-radius: 4px;
            padding: 1rem;
            margin-top: 1rem;
            text-align: left;
        }
        .health-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #4caf50;
            margin-right: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 VS Code Web - Railway Deployment</h1>
        
        <div class="status success">
            <h2><span class="health-indicator"></span>Deployment Successful</h2>
            <p>Your VS Code web server is running on Railway!</p>
        </div>

        <div class="info">
            <h3>System Information</h3>
            <ul>
                <li><strong>Status:</strong> Healthy</li>
                <li><strong>Port:</strong> ${RAILWAY_PORT}</li>
                <li><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</li>
                <li><strong>Node.js:</strong> ${process.version}</li>
                <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
            </ul>
        </div>

        <div class="status loading">
            <h3>VS Code Web Interface</h3>
            <p>The full VS Code web interface will be available once all dependencies are properly built and configured.</p>
            <p>This minimal server confirms that Railway deployment is working correctly.</p>
        </div>
    </div>
</body>
</html>`;

/**
 * Create minimal HTTP server for Railway deployment
 */
function createServer() {
    const server = http.createServer((req, res) => {
        const url = new URL(req.url, `http://localhost:${RAILWAY_PORT}`);
        const pathname = url.pathname;
        
        // Security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        
        // Health check endpoints
        if (pathname === '/healthz' || pathname === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                service: 'vscode-web-minimal',
                port: RAILWAY_PORT,
                version: '1.102.0',
                deployment: 'railway',
                mode: 'minimal'
            }));
            return;
        }

        // API health endpoint for detailed status
        if (pathname === '/api/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                timestamp: new Date().toISOString(),
                status: 'healthy',
                services: {
                    server: {
                        status: 'running',
                        port: RAILWAY_PORT,
                        mode: 'minimal'
                    }
                },
                environment: process.env.NODE_ENV || 'development',
                node_version: process.version,
                uptime: process.uptime()
            }));
            return;
        }

        // Main page - serve HTML interface
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(htmlTemplate);
    });

    return server;
}

/**
 * Main startup function
 */
async function main() {
    logger.info('🚀 Starting Railway VS Code Minimal Web Server...');
    logger.info('Configuration:', { 
        port: RAILWAY_PORT,
        nodeEnv: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
    });

    try {
        // Create and start server
        const server = createServer();
        
        server.listen(RAILWAY_PORT, '0.0.0.0', () => {
            logger.info(`🌟 Railway minimal server listening on port ${RAILWAY_PORT}`);
            logger.info(`🔗 Health check: http://localhost:${RAILWAY_PORT}/healthz`);
            logger.info(`🌐 Web interface: http://localhost:${RAILWAY_PORT}/`);
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

// Start the application
main().catch((error) => {
    logger.error('❌ Fatal error:', error);
    process.exit(1);
});