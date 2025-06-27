# Use the latest official code-server image
FROM codercom/code-server:latest

# Copy project files to workspace
COPY . /home/coder/workspace

# Copy and make start script executable
COPY start.sh /home/coder/start.sh

# Set proper ownership
USER root
RUN chown -R coder:coder /home/coder/workspace && \
    chown coder:coder /home/coder/start.sh && \
    chmod +x /home/coder/start.sh
USER coder

# Set working directory
WORKDIR /home/coder

# Start code-server using the start script
CMD ["./start.sh"]
