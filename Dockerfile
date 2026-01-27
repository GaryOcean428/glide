# Start from Node.js 22 (required by VS Code 1.109.0)
FROM node:22-bullseye

# Create a non-root user
RUN useradd -m -s /bin/bash coder && \
    mkdir -p /home/coder/.local/share && \
	    chown -R coder:coder /home/coder

		# Set working directory and ensure coder owns it
		WORKDIR /workspace
		RUN chown -R coder:coder /workspace

		# Install system dependencies required for VS Code build
		RUN apt-get update && apt-get install -y \
		    build-essential \
			    git \
				    curl \
					    wget \
						    libxkbfile-dev \
							    libsecret-1-dev \
								    python3 \
									    python3-pip \
										    pkg-config \
											    && rm -rf /var/lib/apt/lists/*

												# Install tsx globally for TypeScript execution (as root)
												RUN npm install -g tsx

												# Switch to coder user for the build
												USER coder

												# Copy package files first for better layer caching
												COPY --chown=coder:coder package.json .nvmrc ./

												# Copy the entire codebase
												COPY --chown=coder:coder . .

												# Set environment variables for build optimizations
												ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1 \
												    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
													    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
														    NPM_CONFIG_OPTIONAL=false \
															    SKIP_NATIVE_MODULES=1 \
																    NODE_ENV=production \
																	    VSCODE_SKIP_NODE_VERSION_CHECK=1

																		# Install dependencies and build
																		RUN npm install && \
																		    npm run compile && \
																			    chmod +x scripts/railway-vscode-server.mjs

																				# Expose the port Railway will use
																				EXPOSE 8080

																				# Health check
																				HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
																				    CMD curl -f http://localhost:${PORT:-8080}/api/health || exit 1

																					# Start the VS Code server
																					CMD ["node", "scripts/railway-vscode-server.mjs"]
