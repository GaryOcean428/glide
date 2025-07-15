#!/bin/bash

# Deployment rollback and tagging script for GIDE
# Creates stable deployment snapshots for quick recovery

set -e

echo "🏷️  GIDE Deployment Tagging & Rollback System"
echo "==============================================="

# Get current date for tagging
CURRENT_DATE=$(date +%Y%m%d-%H%M%S)
STABLE_TAG="stable-${CURRENT_DATE}"

# Function to create stable tag
create_stable_tag() {
    echo "📌 Creating stable deployment tag: ${STABLE_TAG}"
    
    if git tag -a "${STABLE_TAG}" -m "Stable deployment snapshot - $(date)"; then
        echo "✅ Tag created successfully"
        
        # Push tag to remote
        if git push origin "${STABLE_TAG}"; then
            echo "✅ Tag pushed to remote"
        else
            echo "⚠️  Warning: Failed to push tag to remote"
        fi
    else
        echo "❌ Failed to create tag"
        return 1
    fi
}

# Function to list available stable tags
list_stable_tags() {
    echo "📋 Available stable deployment tags:"
    git tag -l "stable-*" --sort=-creatordate | head -10
}

# Function to rollback to a specific tag
rollback_to_tag() {
    local tag=$1
    
    if [ -z "$tag" ]; then
        echo "❌ No tag specified for rollback"
        echo "Usage: $0 rollback <tag-name>"
        echo ""
        list_stable_tags
        return 1
    fi
    
    echo "🔄 Rolling back to tag: ${tag}"
    
    # Verify tag exists
    if ! git tag -l | grep -q "^${tag}$"; then
        echo "❌ Tag '${tag}' not found"
        echo ""
        list_stable_tags
        return 1
    fi
    
    # Create backup of current state before rollback
    local backup_tag="backup-before-rollback-$(date +%Y%m%d-%H%M%S)"
    git tag -a "${backup_tag}" -m "Backup before rollback to ${tag}"
    echo "💾 Created backup tag: ${backup_tag}"
    
    # Perform rollback
    if git checkout "${tag}"; then
        echo "✅ Successfully rolled back to ${tag}"
        echo "⚠️  Note: You are now in detached HEAD state"
        echo "   To create a new branch from this state:"
        echo "   git checkout -b rollback-${tag}"
    else
        echo "❌ Failed to rollback to ${tag}"
        return 1
    fi
}

# Function to check deployment health
check_deployment_health() {
    echo "🏥 Checking deployment health..."
    
    local health_url="${HEALTHCHECK_URL:-https://gide.up.railway.app/health}"
    
    if command -v curl >/dev/null 2>&1; then
        echo "Checking: ${health_url}"
        
        if curl -f -s -o /dev/null -w "%{http_code}" "${health_url}" | grep -q "200"; then
            echo "✅ Health check passed - deployment is healthy"
            return 0
        else
            echo "❌ Health check failed - deployment may be unhealthy"
            return 1
        fi
    else
        echo "⚠️  curl not available, skipping health check"
        return 0
    fi
}

# Function to validate deployment readiness
validate_deployment() {
    echo "🔍 Validating deployment readiness..."
    
    local validation_errors=0
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo "❌ Not in a git repository"
        ((validation_errors++))
    fi
    
    # Check if working directory is clean
    if ! git diff-index --quiet HEAD --; then
        echo "❌ Working directory has uncommitted changes"
        echo "   Commit or stash changes before creating stable tag"
        ((validation_errors++))
    else
        echo "✅ Working directory is clean"
    fi
    
    # Check if Railway configuration exists
    if [ ! -f "railway.toml" ]; then
        echo "❌ railway.toml not found"
        ((validation_errors++))
    else
        echo "✅ Railway configuration found"
    fi
    
    # Check if package.json has required scripts
    if [ ! -f "package.json" ]; then
        echo "❌ package.json not found"
        ((validation_errors++))
    else
        if grep -q '"railway:start"' package.json; then
            echo "✅ Railway start script found"
        else
            echo "❌ Railway start script missing in package.json"
            ((validation_errors++))
        fi
    fi
    
    if [ $validation_errors -eq 0 ]; then
        echo "✅ Deployment validation passed"
        return 0
    else
        echo "❌ Deployment validation failed with $validation_errors errors"
        return 1
    fi
}

# Main script logic
case "${1:-}" in
    "tag" | "create")
        if validate_deployment; then
            create_stable_tag
        else
            echo "❌ Validation failed, not creating tag"
            exit 1
        fi
        ;;
    "list")
        list_stable_tags
        ;;
    "rollback")
        rollback_to_tag "$2"
        ;;
    "health")
        check_deployment_health
        ;;
    "validate")
        validate_deployment
        ;;
    *)
        echo "Usage: $0 {tag|list|rollback <tag>|health|validate}"
        echo ""
        echo "Commands:"
        echo "  tag       - Create a new stable deployment tag"
        echo "  list      - List available stable tags"
        echo "  rollback  - Rollback to a specific tag"
        echo "  health    - Check deployment health"
        echo "  validate  - Validate deployment readiness"
        echo ""
        echo "Examples:"
        echo "  $0 tag                    # Create new stable tag"
        echo "  $0 list                   # Show available tags"
        echo "  $0 rollback stable-20240101-1200"
        echo "  $0 health                 # Check if deployment is healthy"
        exit 1
        ;;
esac