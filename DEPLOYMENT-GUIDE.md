# GIDE Railway Deployment Guide

## Quick Deploy

After these changes are merged, Railway will automatically redeploy with the fixed configuration. The deployment should now serve VS Code directly instead of a status page.

## Environment Variables Setup

Set these in Railway dashboard:

```bash
# Required
PASSWORD=your-secure-password

# Optional but recommended
DISABLE_TELEMETRY=true
DISABLE_UPDATE_CHECK=true
```

## Verification Steps

1. **After deployment completes:**
   ```bash
   curl -I https://gide.up.railway.app
   ```
   Should return 200 OK with authentication prompt

2. **Open in browser:**
   - Visit: https://gide.up.railway.app
   - Should see VS Code password prompt
   - Enter password set in environment variables
   - Should load full VS Code web interface

3. **Check logs:**
   ```bash
   railway logs --tail
   ```
   Should show:
   ```
   🚀 Starting code-server on Railway...
   📍 Port: 8080
   🌐 URL: https://gide.up.railway.app
   [timestamp] info  code-server running at...
   ```

## Troubleshooting

### Still seeing status page?
- Check Railway environment variables are set
- Verify deployment is using updated code
- Check Railway service port is set to 8080

### Authentication not working?
- Verify PASSWORD environment variable is set
- Check Railway logs for errors
- Try refreshing the page

### Build failures?
- Check Dockerfile.codeserver is being used
- Verify Railway build command is correct
- Review build logs for specific errors

## Manual Deployment Commands

If needed, deploy manually:

```bash
# Commit changes
git add .
git commit -m "fix: Remove status page, enable direct VS Code access"
git push origin main

# Monitor deployment
railway logs --tail -f

# Test after deployment
curl -I https://gide.up.railway.app
```

## Success Indicators

✅ Railway logs show code-server starting
✅ URL returns 200 status
✅ Browser shows VS Code authentication
✅ After auth, full VS Code interface loads
✅ No status page or fallback mode messages