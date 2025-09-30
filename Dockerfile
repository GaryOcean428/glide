# Railway deployment - Force Node.js 22 (override Nixpacks Deno detection)
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Enable corepack for Yarn support
RUN corepack enable && corepack prepare yarn@4.9.2 --activate

# Copy package files
COPY package.json yarn.lock* .yarnrc.yml ./
COPY .yarn/ ./.yarn/

# Set environment variables for build optimization
ENV NODE_ENV=production
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1  
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NPM_CONFIG_OPTIONAL=false
ENV SKIP_NATIVE_MODULES=1
ENV VSCODE_SKIP_NODE_VERSION_CHECK=1

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN yarn build && chmod +x scripts/railway-vscode-server.mjs

# Expose port
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+process.env.PORT+'/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "scripts/railway-vscode-server.mjs"]