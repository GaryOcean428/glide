# Railway Deployment Fix Documentation

## Issue Resolution: Health Check Override

### Problem
Railway's health check was displaying instead of the VS Code web interface, causing the main application routes to be intercepted.

### Solution Implemented
Created a new proxy server (`railway-vscode-server.mjs`) that properly isolates health checks from the main VS Code application.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Railway       │    │  Proxy Server   │    │  VS Code Web    │
│   Load Balancer │────│  Port: 8080     │────│  Port: 9888     │
│                 │    │                 │    │  (Internal)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ├─ /healthz ──────────┐
                              ├─ /health ───────────┤ Direct Response
                              ├─ /api/health ───────┘ (No Proxy)
                              │
                              └─ /* ────────────────→ Proxy to VS Code
```

## Key Features

### 1. Isolated Health Checks
- `/healthz` - Railway-compatible health endpoint
- `/health` - Alias for Railway health check
- `/api/health` - Detailed service status

Health checks respond directly without proxying to VS Code, ensuring they never interfere with the main application.

### 2. VS Code Proxy
- All other routes (`/`, `/out/*`, etc.) are proxied to VS Code web server
- WebSocket support for real-time VS Code features
- Proper error handling and startup detection

### 3. Production Ready
- Comprehensive logging
- Graceful shutdown handling
- Startup timeout and error recovery
- Security headers

## Usage

### Development
```bash
npm start
# or
node scripts/railway-vscode-server.mjs
```

### Railway Deployment
The server automatically configures itself based on Railway environment variables:
- `PORT` - Railway-assigned port (defaults to 8080)
- `NODE_ENV` - Environment mode

### Validation
Test the fix locally:
```bash
npm run validate-railway-fix
```

## Configuration

### Railway Settings
- **Health Check Path**: `/healthz` (configured in `railway.json`)
- **Health Check Timeout**: 300s
- **Start Command**: `npm run railway:start`

### Environment Variables
- `PORT` - Server port (set by Railway)
- `NODE_ENV` - Environment mode
- Standard VS Code environment variables

## Troubleshooting

### Health Check Issues
- Verify `/healthz` returns HTTP 200 with JSON response
- Check Railway health check timeout settings
- Review server logs for startup issues

### VS Code Interface Issues
- Ensure VS Code server starts successfully on internal port
- Check proxy logs for routing errors
- Verify WebSocket connections for interactive features

### Common Commands
```bash
# Test health endpoints
curl http://localhost:8080/healthz
curl http://localhost:8080/api/health

# Test VS Code interface
curl http://localhost:8080/

# Monitor server logs
npm start 2>&1 | grep -E "(INFO|ERROR|WARN)"
```

## Migration Notes

This replaces the previous `railway-server-production-fixed.mjs` which served static HTML. The new implementation:

1. ✅ Serves actual VS Code web interface instead of static page
2. ✅ Isolates health checks from main application routes  
3. ✅ Supports WebSocket connections for VS Code features
4. ✅ Provides comprehensive logging and error handling
5. ✅ Maintains Railway deployment compatibility

The fix resolves the core issue where Railway health checks were overriding the VS Code UI.

---

## Additional Fix: "Cannot find module @vscode/test-web" Error

### Problem Summary

The Railway deployment was also failing with:
```
Cannot find module '@vscode/test-web'
```

This occurred because Railway's default Railpack builder prunes `devDependencies` during production builds.

### Root Cause

1. **Railway's Default Behavior**: `RAILPACK_PRUNE_DEPS=true` by default executes `npm prune --omit=dev`
2. **Previous Docker Approach**: Using Dockerfile bypassed Railpack but had dependency availability issues
3. **Runtime Requirement**: `railway-vscode-server.mjs` requires `@vscode/test-web` at runtime

### Solution Applied

#### 1. Switched to Railpack Builder

**Changed railway.json:**
```json
{
  "build": {
    "builder": "RAILPACK"
  }
}
```

#### 2. Prevented Dependency Pruning

**Added to railway.toml:**
```toml
[env]
RAILPACK_PRUNE_DEPS = "false"
```

#### 3. Verified Dependencies

- ✅ `@vscode/test-web: ^0.0.62` in dependencies (not devDependencies)
- ✅ `http-proxy-middleware: ^2.0.6` in dependencies  
- ✅ `express: ^4.18.2` in dependencies

### Validation

Run verification:
```bash
node scripts/verify-railway-fix.mjs
```

### Expected Results

1. **Build Success**: All dependencies installed without pruning
2. **Module Resolution**: `@vscode/test-web` available at runtime
3. **VS Code UI**: Interface displays correctly
4. **Extension Ready**: `gide-coding-agent` extension properly set up

This implements the exact solution from the problem statement: *"modify Railway's build configuration by setting the `RAILPACK_PRUNE_DEPS` environment variable to `false`"*