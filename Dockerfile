# Use the latest official code-server image
FROM codercom/code-server:latest

# Install yarn (if not already available)
USER root
RUN apt-get update && apt-get install -y curl gnupg && \
    curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
    apt-get update && apt-get install -y yarn && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy project files to workspace
COPY . /home/coder/workspace

# Copy and make start script executable
COPY start.sh /home/coder/start.sh

# Set proper ownership
RUN chown -R coder:coder /home/coder/workspace && \
    chown coder:coder /home/coder/start.sh && \
    chmod +x /home/coder/start.sh

USER coder

# Build the Gide Coding Agent extension
WORKDIR /home/coder/workspace/extensions/gide-coding-agent
RUN yarn install --frozen-lockfile && yarn build

# Set working directory back to home
WORKDIR /home/coder

# Start code-server using the start script
CMD ["./start.sh"]
