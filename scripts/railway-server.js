#!/usr/bin/env node

const http = require('http');
const https = require('https');
const url = require('url');
const cp = require('child_process');
const path = require('path');

const port = process.env.PORT || 8080;
const codeServerPort = 8443;

let codeServerProcess = null;
let codeServerReady = false;

// Start code-server (prefer global installation, fallback to showing proxy readiness)
function startCodeServer() {
	console.log('🚀 Attempting to start VS Code server...');
	
	// Try to find a working code-server installation
	const codeServerCandidates = [
		'code-server', // Global installation
		path.join(__dirname, '..', 'node_modules', '.bin', 'code-server'), // Local installation
		path.join(__dirname, 'code-web.js') // Local web script
	];
	
	let serverCommand = null;
	let serverArgs = [];
	
	// Try code-server binary first
	try {
		cp.execSync('which code-server', { stdio: 'ignore' });
		serverCommand = 'code-server';
		serverArgs = [
			'--bind-addr', `127.0.0.1:${codeServerPort}`,
			'--disable-telemetry',
			'--disable-update-check',
			'--auth', 'none',
			'/tmp/workspace'
		];
		console.log('Found global code-server installation');
	} catch (e) {
		console.log('Global code-server not found, checking for local scripts...');
		
		// Don't try code-web.js since it has missing dependencies
		console.log('⚠️  No working VS Code server found. Running in proxy-only mode.');
		// Set up a simple mock server to demonstrate proxy functionality
		startMockServer();
		return;
	}
	
	console.log(`Starting server: ${serverCommand} ${serverArgs.join(' ')}`);
	
	codeServerProcess = cp.spawn(serverCommand, serverArgs, {
		stdio: ['pipe', 'pipe', 'pipe'],
		env: {
			...process.env,
			NODE_ENV: 'production'
		}
	});

	codeServerProcess.stdout.on('data', (data) => {
		const output = data.toString();
		console.log('Code-server:', output.trim());
		
		// Look for server ready indicators
		if (output.includes('HTTP server listening') || 
			output.includes('listening on') || 
			output.includes('available at') ||
			output.includes('Server bound to')) {
			codeServerReady = true;
			console.log('✅ VS Code server is ready!');
		}
	});

	codeServerProcess.stderr.on('data', (data) => {
		const output = data.toString();
		console.error('Code-server error:', output.trim());
	});

	codeServerProcess.on('exit', (code, signal) => {
		console.log(`Code-server exited with code ${code}, signal ${signal}`);
		codeServerReady = false;
		if (code !== 0 && code !== null) {
			console.log('Restarting code-server in 5 seconds...');
			setTimeout(startCodeServer, 5000);
		}
	});

	codeServerProcess.on('error', (err) => {
		console.error('Failed to start code-server:', err);
		console.log('Falling back to mock server for proxy demonstration...');
		codeServerReady = false;
		startMockServer();
	});
	
	// Add a timeout fallback in case the process fails repeatedly
	setTimeout(() => {
		if (!codeServerReady) {
			console.log('⚠️  Code-server failed to start within timeout, using mock server...');
			if (codeServerProcess && !codeServerProcess.killed) {
				codeServerProcess.kill('SIGTERM');
			}
			startMockServer();
		}
	}, 10000); // 10 second timeout
}

// Start a simple mock server to demonstrate proxy functionality
function startMockServer() {
	console.log('🎭 Starting mock VS Code server for demonstration...');
	
	const mockServer = http.createServer((req, res) => {
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>GIDE - VS Code Server (Mock)</title>
				<style>
					body { font-family: Arial, sans-serif; margin: 40px; background: #1e1e1e; color: #d4d4d4; }
					.container { max-width: 800px; margin: 0 auto; }
					.header { background: #007acc; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
					.status { background: #0e639c; padding: 15px; border-radius: 5px; margin: 10px 0; }
					.info { background: #333; padding: 15px; border-radius: 5px; margin: 10px 0; }
					a { color: #007acc; text-decoration: none; }
					a:hover { text-decoration: underline; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<h1>🚀 GIDE - VS Code Server</h1>
						<p>Railway Deployment with Proxy Infrastructure</p>
					</div>
					
					<div class="status">
						<h2>✅ Proxy Server Active</h2>
						<p>The Railway proxy infrastructure is working correctly!</p>
						<p>Request: ${req.method} ${req.url}</p>
						<p>Time: ${new Date().toISOString()}</p>
					</div>
					
					<div class="info">
						<h3>🔧 Next Steps</h3>
						<p>To complete the setup:</p>
						<ul>
							<li>Install code-server binary in the Docker container</li>
							<li>Or build the VS Code project from source</li>
							<li>The proxy will automatically forward requests to the real server</li>
						</ul>
					</div>
					
					<div class="info">
						<h3>📊 System Status</h3>
						<p>Proxy Port: ${port}</p>
						<p>Target Port: ${codeServerPort}</p>
						<p>Environment: ${process.env.NODE_ENV || 'development'}</p>
						<p><a href="/healthz">Health Check</a></p>
					</div>
				</div>
			</body>
			</html>
		`);
	});
	
	mockServer.listen(codeServerPort, '127.0.0.1', () => {
		console.log(`🎭 Mock server listening on port ${codeServerPort}`);
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
		console.error('Proxy request failed:', err);
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
	console.log('WebSocket upgrade request for:', request.url);
	
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
	console.log(`${req.method} ${req.url}`);

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
	console.log(`🌟 GIDE Railway proxy server running on port ${port}`);
	console.log(`🔗 Health check available at http://localhost:${port}/healthz`);
	console.log(`📡 Will proxy to VS Code server on port ${codeServerPort}`);
	
	// Start code-server after a short delay
	setTimeout(startCodeServer, 2000);
});

// Graceful shutdown
function shutdown() {
	console.log('📴 Shutting down gracefully...');
	
	if (codeServerProcess && !codeServerProcess.killed) {
		console.log('🛑 Stopping code-server...');
		codeServerProcess.kill('SIGTERM');
	}
	
	server.close(() => {
		console.log('✅ Server closed');
		process.exit(0);
	});
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);