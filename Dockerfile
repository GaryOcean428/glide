# Use the latest official code-server image
FROM codercom/code-server:latest

# Copy project files to workspace
COPY . /home/coder/workspace

# Set proper ownership
USER root
RUN chown -R coder:coder /home/coder/workspace
USER coder

# Set working directory
WORKDIR /home/coder

# Expose port
EXPOSE 8080

# Start code-server
CMD ["code-server", "--bind-addr", "0.0.0.0:8080", "--auth", "password", "workspace"]
