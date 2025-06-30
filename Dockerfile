# Use a specific Node.js version
FROM node:20

# Install code-server
RUN npm install -g code-server --unsafe-perm

# Install yarn
USER root
RUN apt-get update && \
    apt-get install -y curl gnupg && \
    curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | gpg --dearmor | tee /usr/share/keyrings/yarnkey.gpg > /dev/null && \
    echo "deb [signed-by=/usr/share/keyrings/yarnkey.gpg] https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
    apt-get update && apt-get install -y yarn && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd -ms /bin/bash coder

# Copy project files to workspace
COPY . /home/coder/workspace

# Copy and make start script executable
COPY start.sh /home/coder/start.sh

# Set proper ownership
RUN chown -R coder:coder /home/coder/workspace && \
    chown coder:coder /home/coder/start.sh && \
    chmod +x /home/coder/start.sh

USER coder
WORKDIR /home/coder

# Build the Gide Coding Agent extension
WORKDIR /home/coder/workspace/extensions/gide-coding-agent
RUN yarn install --frozen-lockfile && yarn build

# Set working directory back to home
WORKDIR /home/coder

# Start code-server using the start script
CMD ["./start.sh"]
