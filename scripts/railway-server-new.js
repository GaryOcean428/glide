#!/usr/bin/env node

const http = require('http');
const https = require('https');
const url = require('url');
const cp = require('child_process');
const path = require('path');

const port = process.env.PORT || 8080;
const codeServerPort = 8443;
const password = process.env.PASSWORD || 'railway-gide-2025';

let codeServerProcess = null;

// Start code-server process
function startCodeServer() {
	console.log('🚀 Starting VS Code server...');
	
	// Use the existing code-server.js script
	const codeServerScript = path.join(__dirname, 'code-server.js');
	
	console.log(`Starting VS Code server via: ${codeServerScript}`);
	
	// Set the port environment variable
	const env = {
		...process.env,
		VSCODE_SERVER_PORT: codeServerPort.toString(),
		NODE_ENV: 'production'
	};
	
	codeServerProcess = cp.spawn(process.execPath, [codeServerScript], {
		stdio: ['pipe', 'pipe', 'pipe'],
		env: env
	});

	codeServerProcess.stdout.on('data', (data) => {
		const output = data.toString();
		console.log('Code-server:', output.trim());
		
		// Look for the "Web UI available at" message to know when server is ready
		const match = output.match(/Web UI available at (.*)/);
		if (match) {
			console.log('✅ VS Code server is ready at:', match[1]);
		}
	});

	codeServerProcess.stderr.on('data', (data) => {
		const output = data.toString();
		console.error('Code-server error:', output.trim());
	});

	codeServerProcess.on('exit', (code, signal) => {
		console.log(`Code-server exited with code ${code}, signal ${signal}`);
		if (code !== 0 && code !== null) {
			console.log('Restarting code-server in 5 seconds...');
			setTimeout(startCodeServer, 5000);
		}
	});

	codeServerProcess.on('error', (err) => {
		console.error('Failed to start code-server:', err);
	});
}

// Proxy request to code-server
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
		// Forward status code and headers
		res.writeHead(proxyRes.statusCode, proxyRes.headers);
		proxyRes.pipe(res);
	});

	proxyReq.on('error', (err) => {
		console.error('Proxy request failed:', err);
		res.writeHead(502, { 'Content-Type': 'text/plain' });
		res.end('Bad Gateway: VS Code server unavailable');
	});

	// Forward request body
	req.pipe(proxyReq);
}

// Handle WebSocket upgrade for VS Code
function handleUpgrade(request, socket, head) {
	const target = `ws://127.0.0.1:${codeServerPort}`;
	console.log('WebSocket upgrade request for:', request.url);
	
	// Simple WebSocket proxy implementation
	const net = require('net');
	const client = net.connect(codeServerPort, '127.0.0.1');
	
	client.on('connect', () => {
		socket.write('HTTP/1.1 101 Switching Protocols\r\n' +
					'Upgrade: websocket\r\n' +
					'Connection: Upgrade\r\n\r\n');
		socket.pipe(client);
		client.pipe(socket);
	});
	
	client.on('error', (err) => {
		console.error('WebSocket proxy error:', err);
		socket.destroy();
	});
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
			env: process.env.NODE_ENV || 'development'
		}));
		return;
	}

	// Check if code-server is ready
	if (!codeServerProcess || codeServerProcess.killed) {
		res.writeHead(503, { 'Content-Type': 'text/html' });
		res.end(`
			<html>
				<head><title>GIDE - Starting VS Code Server</title></head>
				<body>
					<h1>🚀 GIDE - VS Code Server Starting</h1>
					<p>⏳ VS Code server is starting up...</p>
					<p>Please wait a moment and refresh the page.</p>
					<p>Port: ${port}</p>
					<p>Environment: ${process.env.NODE_ENV || 'development'}</p>
				</body>
			</html>
		`);
		return;
	}

	// Proxy all other requests to code-server
	proxyRequest(req, res);
});

// Handle WebSocket upgrades
server.on('upgrade', handleUpgrade);

server.listen(port, '0.0.0.0', () => {
	console.log(`🌟 GIDE Railway proxy server running on port ${port}`);
	console.log(`🔗 Health check available at http://localhost:${port}/healthz`);
	console.log(`📡 Proxying to VS Code server on port ${codeServerPort}`);
	
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