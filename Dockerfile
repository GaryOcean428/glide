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

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only essential dependencies without dev packages
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5 && \
    NPM_CONFIG_PRODUCTION=true npm install express http-proxy-middleware minimist --omit=optional --omit=dev --no-fund --no-audit

# Copy application code (minimal files needed)
COPY scripts/railway-server.mjs scripts/
COPY railway.json railway.toml ./

# Make scripts executable
RUN chmod +x scripts/railway-server.mjs

# Create workspace directory and setup user with UID conflict resolution
RUN mkdir -p /tmp/workspace && \
    # Ensure users group exists
    groupadd -f users && \
    # Check if UID 1000 already exists and handle conflicts
    if id -u 1000 >/dev/null 2>&1; then \
        existing_user=$(id -nu 1000); \
        if [ "$existing_user" = "node" ]; then \
            # Rename the existing node user to railway and set proper group
            usermod -l railway -d /home/railway -m -g users node; \
        else \
            # Remove the existing user and create railway user
            userdel -r "$existing_user" 2>/dev/null || true; \
            useradd -m -u 1000 -g users -s /bin/bash railway; \
        fi; \
    else \
        # No conflict, create railway user normally
        useradd -m -u 1000 -g users -s /bin/bash railway; \
    fi && \
    # Ensure proper ownership
    chown -R railway:users /app /tmp/workspace

# Switch to railway user
USER railway

# Expose Railway port
EXPOSE $PORT

# Health check - bind to 0.0.0.0 for Railway external access
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://0.0.0.0:${PORT:-8080}/healthz || exit 1

# Start application using minimal server
CMD ["node", "scripts/railway-server.mjs"]