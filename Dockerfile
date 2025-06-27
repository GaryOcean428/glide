# Use the official code-server image which has everything pre-compiled
FROM codercom/code-server:4.23.1

# Switch to root for installation
USER root

# Install additional tools and dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    vim \
    nano \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Create project directory
RUN mkdir -p /home/coder/project

# Copy your project files
COPY . /home/coder/project/

# Change ownership to coder user
RUN chown -R coder:coder /home/coder/project

# Switch back to coder user
USER coder

# Set working directory
WORKDIR /home/coder

# Expose port
EXPOSE 8080

# Set environment variables
ENV PASSWORD=${PASSWORD:-changeme}

# Start code-server with the project directory
CMD ["code-server", "--bind-addr", "0.0.0.0:8080", "--auth", "password", "project"]
