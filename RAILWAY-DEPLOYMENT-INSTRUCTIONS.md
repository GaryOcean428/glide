# Railway Deployment Instructions

## ✅ Configuration Complete

This repository is now properly configured for Railway deployment with Node.js (no more Deno detection issues).

## What Was Fixed

1. **Replaced non-standard configuration**: `railpack.json` → Native Railway formats
2. **Added `railway.toml`**: Official Railway configuration file
3. **Added `nixpacks.toml`**: Forces Node.js detection, prevents Deno confusion
4. **Updated `.nvmrc`**: Simplified to `22` for better Railway detection
5. **Made scripts executable**: Proper permissions for deployment

## Deployment Steps

### 1. Push Changes (Already Done)
```bash
git push origin main
```

### 2. Railway Will Now Detect:
- ✅ **Runtime**: Node.js 22 (not Deno)
- ✅ **Start Command**: `node scripts/railway-vscode-server.mjs`
- ✅ **Health Check**: `/healthz`
- ✅ **Build Command**: `npm install --omit=dev --legacy-peer-deps`

### 3. Expected Build Process:
```
1. Railway detects Node.js from .nvmrc and package.json
2. Nixpacks uses nodejs_22 (specified in nixpacks.toml)
3. Runs: npm install --omit=dev --legacy-peer-deps
4. Runs: npm run install-essentials
5. Makes scripts executable
6. Starts: node scripts/railway-vscode-server.mjs
```

### 4. Verify Deployment:
After Railway deploys, check:
- ✅ Build logs show "Node.js" (not "Deno")
- ✅ Start logs show: `INFO: Starting Railway VS Code Web Server...`
- ✅ Health check: `https://your-app.railway.app/healthz`

## Health Check Response
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "vscode-web",
  "version": "1.102.0",
  "uptime": 123.456
}
```

## If Issues Persist

If Railway still detects Deno (unlikely now), manually configure via Railway CLI:

```bash
# Force Node.js runtime
railway service update --runtime nodejs

# Set start command  
railway service update --start-command "node scripts/railway-vscode-server.mjs"

# Set health check
railway service update --health-check-path "/healthz"
```

## Environment Variables

These are automatically set by the configuration files:
- `NODE_ENV=production`
- `ELECTRON_SKIP_BINARY_DOWNLOAD=1`
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` 
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
- `VSCODE_SKIP_NODE_VERSION_CHECK=1`

## Troubleshooting

### Issue: "node: command not found"
**Solution**: ✅ Fixed by nixpacks.toml forcing Node.js runtime

### Issue: "Start Command: Not set"  
**Solution**: ✅ Fixed by railway.toml native configuration

### Issue: Health check fails
**Check**: The `/healthz` endpoint is implemented in `scripts/railway-vscode-server.mjs`

### Issue: Build timeout
**Check**: The `--omit=dev` and `--legacy-peer-deps` flags reduce install time

## Next Steps

1. Monitor the Railway deployment logs
2. Test the `/healthz` endpoint once live
3. Verify VS Code interface loads correctly
4. Check that all extensions work as expected

## Files Added/Modified

- ✅ `.nvmrc` - Updated to `22`
- ✅ `railway.toml` - New native Railway config
- ✅ `nixpacks.toml` - New Nixpacks config  
- ✅ `.gitignore` - Added Railway build artifacts
- ✅ `scripts/railway-vscode-server.mjs` - Made executable

The deployment should now work correctly with Node.js instead of Deno! 🚀