#!/bin/bash

# Lactate Dashboard Update Script
# This script pulls the latest code from git main branch,
# builds the production version, and restarts the service

set -e  # Exit on any error

echo "================================================"
echo "Lactate Dashboard Update Script"
echo "================================================"
echo ""

GIT_ROOT=.
# Get the directory where the script is located
SCRIPT_DIR=$GIT_ROOT/lactate-dashboard


echo "Script directory: $SCRIPT_DIR"
echo "Git root: $GIT_ROOT"
echo ""

# Pull latest changes from git main branch
echo "Step 1: Pulling latest changes from git main branch..."
cd "$GIT_ROOT"
git fetch origin
git checkout main
git pull origin main
echo "✓ Git pull completed"
echo ""

# Install/update dependencies
echo "Step 2: Installing/updating dependencies..."
cd "$SCRIPT_DIR"
npm install
echo "✓ Dependencies updated"
echo ""

# Build production version
echo "Step 3: Building production version..."
npm run build
echo "✓ Production build completed"
echo ""

# Restart the Next.js service
echo "Step 4: Restarting Next.js service..."
if [[ -n "${SUDO_PASSWORD}" ]]; then
	echo "${SUDO_PASSWORD}" | sudo -S systemctl restart nextjs
else
	sudo systemctl restart nextjs
fi
echo "✓ Service restarted"
echo ""

# Check service status
echo "Step 5: Checking service status..."
sudo systemctl status nextjs --no-pager | head -10
echo ""

echo "================================================"
echo "Update completed successfully!"
echo "================================================"
