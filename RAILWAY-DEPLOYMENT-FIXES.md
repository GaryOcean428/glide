# Railway Deployment Fixes

## Summary of Changes

This document details the fixes applied to resolve Railway deployment build errors and optimize the deployment process.

## Issues Addressed

### 1. UID Conflict Resolution
**Problem**: Docker build fails when trying to create user with UID 1000 due to existing `node` user.
**Solution**: Added robust UID conflict resolution logic in Dockerfile that:
- Checks if UID 1000 already exists
- If it's the `node` user, renames to `railway`
- If it's another user, removes and recreates
- Handles edge cases gracefully

### 2. Health Check Binding Issue
**Problem**: Health check bound to `localhost:$PORT` not accessible from Railway's external monitoring.
**Solution**: Changed health check binding from `localhost` to `0.0.0.0` to enable external access.

### 3. Build Optimization
**Problem**: Long build times due to unnecessary binary downloads.
**Solution**: Added environment variables to skip optional downloads:
- `ELECTRON_SKIP_BINARY_DOWNLOAD=1`
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
- `NPM_CONFIG_OPTIONAL=false`

### 4. ES Module/CommonJS Conflict
**Problem**: Deployment fails with `ReferenceError: require is not defined in ES module scope` in the preinstall script.
**Root Cause**: Root `package.json` has `"type": "module"` which forces ES module interpretation, but `build/npm/preinstall.js` uses CommonJS `require()` syntax.
**Solution**: Added `build/npm/package.json` with `"type": "commonjs"` to override the root setting for that directory, ensuring preinstall and postinstall scripts are correctly interpreted as CommonJS modules.

## Files Modified

### Dockerfile
- Added environment variables for build optimization
- Implemented robust UID conflict resolution
- Changed health check binding from localhost to 0.0.0.0
- Optimized npm install command

### build/npm/package.json
- Added with `"type": "commonjs"` to resolve ES module/CommonJS conflict
- Ensures preinstall.js and postinstall.js are interpreted correctly

## Testing Results

✅ **UID Resolution**: Verified base image has UID 1000 (node user) and our logic handles it correctly
✅ **UID Conflict Fix**: Successfully implemented robust UID conflict resolution in Dockerfile
✅ **Docker Build**: Confirmed Docker build completes without UID 1000 conflict errors
✅ **Health Endpoint**: Confirmed `/healthz` endpoint returns proper JSON response
✅ **Server Binding**: Validated server binds to 0.0.0.0 for external access
✅ **Build Process**: Confirmed railway:build script executes successfully
✅ **ES Module Fix**: Verified preinstall.js and postinstall.js scripts parse correctly as CommonJS
✅ **Module Compatibility**: Confirmed `require()` statements work correctly in build/npm directory

## Railway Configuration

The following files work together for Railway deployment:

- `Dockerfile`: Contains the Docker build configuration
- `railway.json`: Railway-specific deployment configuration
- `scripts/railway-server.js`: Health check server implementation
- `package.json`: Contains railway:build and railway:start scripts

## Next Steps

1. Deploy to Railway to test the fixes in production environment
2. Monitor build times and health check accessibility
3. Verify that the deployment completes successfully without UID conflicts

## Health Check Verification

The health endpoint at `/healthz` returns:
```json
{
  "status": "healthy",
  "timestamp": "2025-07-06T23:58:26.968Z",
  "port": "8080",
  "env": "production"
}
```

## Environment Variables

The following environment variables are automatically set for Railway optimization:
- `NODE_ENV=production`
- `ELECTRON_SKIP_BINARY_DOWNLOAD=1`
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
- `NPM_CONFIG_OPTIONAL=false`
- `DISABLE_TELEMETRY=true`
- `DISABLE_UPDATE_CHECK=true`