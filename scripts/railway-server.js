#!/usr/bin/env node

const http = require('http');
const port = process.env.PORT || 3000;

// Simple health check server for Railway testing
const server = http.createServer((req, res) => {
  if (req.url === '/healthz' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      port: port,
      env: process.env.NODE_ENV || 'development'
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head><title>GIDE - Railway Deployment Ready</title></head>
        <body>
          <h1>🚀 GIDE Railway Deployment</h1>
          <p>✅ Environment setup completed successfully!</p>
          <p>Port: ${port}</p>
          <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
          <a href="/healthz">Health Check</a>
        </body>
      </html>
    `);
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`🌟 GIDE Railway server running on port ${port}`);
  console.log(`🔗 Health check available at http://localhost:${port}/healthz`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});