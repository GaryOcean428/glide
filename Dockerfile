# Railway-optimized Node.js deployment with code-server
FROM codercom/code-server:latest AS base

# Set environment variables to skip native compilation
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    NPM_CONFIG_OPTIONAL=false \
    DISABLE_TELEMETRY=true \
    DISABLE_UPDATE_CHECK=true \
    NODE_ENV=production \
    SKIP_NATIVE_MODULES=1

# Switch to root for installation
USER root

# Install minimal system dependencies and Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs npm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only essential dependencies without native modules
RUN npm install express http-proxy-middleware minimist --production --omit=optional --no-fund --no-audit

# Copy application code (minimal files needed)
COPY scripts/railway-server.js scripts/
COPY railway.json railway.toml ./

# Make scripts executable
RUN chmod +x scripts/*.js

# Create workspace directory
RUN mkdir -p /tmp/workspace && \
    chown -R coder:coder /app /tmp/workspace

# Switch back to coder user (from code-server image)
USER coder

# Expose Railway port
EXPOSE $PORT

# Health check - bind to 0.0.0.0 for Railway external access
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://0.0.0.0:$PORT/healthz || exit 1

# Start application using minimal server
CMD ["node", "scripts/railway-server.js"]