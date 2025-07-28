# Railway-optimized Node.js deployment with native module support
FROM node:22-bookworm-slim

# Set environment variables to handle native modules and skip downloads
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    NPM_CONFIG_OPTIONAL=false \
    DISABLE_TELEMETRY=true \
    DISABLE_UPDATE_CHECK=true \
    NODE_ENV=production \
    SKIP_NATIVE_MODULES=1 \
    VSCODE_SKIP_NODE_VERSION_CHECK=1 \
    npm_config_target_platform=linux \
    npm_config_arch=x64 \
    npm_config_target_arch=x64 \
    npm_config_disturl=https://nodejs.org/dist \
    npm_config_runtime=node \
    npm_config_devdir=/tmp/.node-gyp \
    npm_config_build_from_source=false

# Configure APT to prevent hangs and timeouts
RUN echo 'Acquire::http::Timeout "30";' > /etc/apt/apt.conf.d/99timeout && \
    echo 'Acquire::https::Timeout "30";' >> /etc/apt/apt.conf.d/99timeout && \
    echo 'Acquire::ftp::Timeout "30";' >> /etc/apt/apt.conf.d/99timeout && \
    echo 'Acquire::Retries "3";' >> /etc/apt/apt.conf.d/99timeout && \
    echo 'APT::Get::Assume-Yes "true";' >> /etc/apt/apt.conf.d/99timeout && \
    echo 'Dpkg::Options "--force-confdef";' >> /etc/apt/apt.conf.d/99timeout && \
    echo 'Dpkg::Options "--force-confold";' >> /etc/apt/apt.conf.d/99timeout

# Install system dependencies needed for native builds in multi-stage
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
    --no-install-recommends \
    curl \
    python3 \
    python3-pip \
    make \
    g++ \
    gcc \
    libc6-dev \
    pkg-config \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /app

# Copy package files and build scripts
COPY package*.json ./
COPY build/npm/ ./build/npm/
COPY .npmrc ./

# Copy essential scripts before dependency installation
COPY scripts/railway-vscode-server.mjs scripts/
COPY scripts/setup-env.js scripts/
COPY scripts/verify-setup.js scripts/
COPY railway.json railway.toml ./

# Pre-configure npm for Railway environment with only valid options
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-timeout 120000 && \
    npm config set fetch-retries 5 && \
    npm config set legacy-peer-deps true

# Install dependencies with Railway-optimized configuration
# Use npm instead of yarn for better native module handling
RUN npm install --omit=dev --omit=optional --legacy-peer-deps --no-audit --no-fund --verbose

# Make scripts executable
RUN chmod +x scripts/railway-vscode-server.mjs

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

# Start application using VS Code web server
CMD ["node", "scripts/railway-vscode-server.mjs"]