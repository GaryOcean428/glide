# Railway-optimized Node.js deployment with minimal dependencies
# Use official Node.js image to avoid NodeSource installation issues
FROM node:20-bookworm-slim

# Set environment variables to skip native compilation
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    NPM_CONFIG_OPTIONAL=false \
    DISABLE_TELEMETRY=true \
    DISABLE_UPDATE_CHECK=true \
    NODE_ENV=production \
    SKIP_NATIVE_MODULES=1

# Configure APT to prevent hangs and timeouts
RUN echo 'Acquire::http::Timeout "30";' > /etc/apt/apt.conf.d/99timeout && \
    echo 'Acquire::https::Timeout "30";' >> /etc/apt/apt.conf.d/99timeout && \
    echo 'Acquire::ftp::Timeout "30";' >> /etc/apt/apt.conf.d/99timeout && \
    echo 'Acquire::Retries "3";' >> /etc/apt/apt.conf.d/99timeout && \
    echo 'APT::Get::Assume-Yes "true";' >> /etc/apt/apt.conf.d/99timeout && \
    echo 'Dpkg::Options "--force-confdef";' >> /etc/apt/apt.conf.d/99timeout && \
    echo 'Dpkg::Options "--force-confold";' >> /etc/apt/apt.conf.d/99timeout

# Install minimal system dependencies
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
    --no-install-recommends \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only essential dependencies without native modules
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5 && \
    npm install express http-proxy-middleware minimist --omit=optional --no-fund --no-audit

# Copy application code (minimal files needed)
COPY scripts/railway-server.js scripts/
COPY railway.json railway.toml ./

# Make scripts executable
RUN chmod +x scripts/*.js

# Create workspace directory and setup user
RUN mkdir -p /tmp/workspace && \
    useradd -m -u 1000 -g users -s /bin/bash railway && \
    chown -R railway:users /app /tmp/workspace

# Switch to railway user
USER railway

# Expose Railway port
EXPOSE $PORT

# Health check - bind to 0.0.0.0 for Railway external access
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://0.0.0.0:${PORT:-8080}/healthz || exit 1

# Start application using minimal server
CMD ["node", "scripts/railway-server.js"]