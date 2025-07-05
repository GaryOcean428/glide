# Multi-stage build optimized for Railway deployment
# Stage 1: Build the extension
FROM node:20-slim AS builder

# Install minimal system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    python3 \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Copy extension source
COPY extensions/gide-coding-agent /app/extension
WORKDIR /app/extension

# Use npm instead of yarn to avoid certificate issues
RUN npm config set strict-ssl false \
    && npm install \
    && npm run build \
    && npm config set strict-ssl true \
    && npx vsce package --no-dependencies --allow-missing-repository --skip-license

# Stage 2: Runtime with code-server
FROM codercom/code-server:latest

# Switch to root to copy files
USER root

# Copy the built extension and workspace files
COPY --from=builder --chown=coder:coder /app/extension/gide-coding-agent-*.vsix /home/coder/extensions/
COPY --chown=coder:coder . /home/coder/workspace/
COPY --chown=coder:coder start.sh /home/coder/

# Set permissions
RUN chmod +x /home/coder/start.sh

# Switch back to coder user
USER coder
WORKDIR /home/coder

# Use Railway's PORT variable
EXPOSE ${PORT:-8080}

CMD ["/home/coder/start.sh"]
