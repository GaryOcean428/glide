# Railway-optimized Node.js deployment
FROM node:20-slim AS base

# Install essential system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    build-essential \
    python3 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (without the problematic native modules during build)
RUN npm ci --only=production --ignore-scripts || npm install --only=production --ignore-scripts

# Copy application code
COPY . .

# Make scripts executable
RUN chmod +x scripts/*.js

# Run Railway build process
RUN npm run railway:build

# Create non-root user
RUN useradd -m -u 1001 railway && chown -R railway:railway /app
USER railway

# Expose Railway port
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:$PORT/healthz || exit 1

# Start application
CMD ["npm", "run", "railway:start"]
