# Build Error Fix - Node-gyp Python Error Resolution

## Problem
The Railway deployment was failing with node-gyp errors during `npm install`. The specific error was:
```
gyp ERR! stack Error: Could not find any Python installation to use
```

This occurs because the VS Code fork (gide) includes native modules like `@vscode/deviceid` that require compilation using node-gyp, which needs:
1. Python 3
2. Make
3. C++ compiler (g++)

## Root Cause
The original Dockerfile used `node:20-bookworm-slim` but only installed minimal dependencies (`curl`). When npm tried to install VS Code's native modules, node-gyp couldn't find Python or build tools.

## Solution
Modified the Dockerfile to include the required build dependencies:

```dockerfile
# Install system dependencies needed for native builds
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
    --no-install-recommends \
    curl \
    python3 \
    make \
    g++ \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
```

## Additional Improvements
1. **Skip dev dependencies**: Added `--omit=dev` and `NPM_CONFIG_PRODUCTION=true` to prevent unnecessary dev package installation
2. **Alternative approach**: Created `Dockerfile.codeserver` that installs pre-built code-server to avoid compilation entirely

## Files Modified
- `Dockerfile`: Added Python 3, make, and g++ build dependencies
- `Dockerfile.codeserver`: Alternative approach using pre-built code-server

## Testing
The fix ensures:
- ✅ Python 3 is available for node-gyp
- ✅ Build tools (make, g++) are available for native compilation
- ✅ Railway server starts successfully
- ✅ Health check endpoint works
- ✅ Proxy functionality is operational

## Deployment Impact
- **Build time**: Slightly increased due to installing additional packages
- **Image size**: Minimal increase (Python 3 + build tools ~50MB)
- **Functionality**: Full compatibility with VS Code native modules
- **Reliability**: Eliminates node-gyp build failures

## Usage
Use the standard Dockerfile for deployment:
```bash
docker build -t gide-app .
```

Or use the code-server variant for pre-built binary approach:
```bash
docker build -f Dockerfile.codeserver -t gide-app .
```