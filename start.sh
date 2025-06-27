#!/bin/bash
# Simple start script for code-server on Railway
# Uses Railway's PORT environment variable with fallback to 8080
# Binds to all interfaces (0.0.0.0) as required by Railway

PORT=${PORT:-8080}
exec code-server --bind-addr "0.0.0.0:${PORT}" --auth password workspace