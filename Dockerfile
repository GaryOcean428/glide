# Railway-optimized Node.js deployment with code-server
FROM node:20-slim AS base

# Set environment variables to optimize build
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    NPM_CONFIG_OPTIONAL=false \
    DISABLE_TELEMETRY=true \
    DISABLE_UPDATE_CHECK=true \
    NODE_ENV=production

# Install essential system dependencies and code-server
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    git \
    build-essential \
    python3 \
    && curl -fsSL https://code-server.dev/install.sh | sh \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install minimal dependencies needed for proxy functionality
RUN npm install express http-proxy-middleware minimist open --production --no-optional --no-fund --no-audit

# Copy application code
COPY . .

# Make scripts executable
RUN chmod +x scripts/*.js

# Create workspace directory
RUN mkdir -p /tmp/workspace

# Create non-root user with robust UID conflict resolution
RUN if id -u 1000 >/dev/null 2>&1; then \
      echo "UID 1000 already exists, using alternative approach"; \
      if id -un 1000 | grep -q "node"; then \
        usermod -l railway -d /home/railway -m node && \
        groupmod -n railway node; \
      else \
        userdel -r $(id -un 1000) 2>/dev/null || true; \
        useradd -m -u 1000 railway; \
      fi; \
    else \
      useradd -m -u 1000 railway; \
    fi && \
    chown -R railway:railway /app /tmp/workspace
USER railway

# Expose Railway port
EXPOSE $PORT

# Health check - bind to 0.0.0.0 for Railway external access
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://0.0.0.0:$PORT/healthz || exit 1

# Start application
CMD ["npm", "run", "railway:start"]