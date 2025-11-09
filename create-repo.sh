#!/bin/bash
# Script to create GitHub repository and push code

echo "🚀 Creating GitHub repository..."

# Authenticate with GitHub
echo "Please authenticate with GitHub..."
gh auth login --web

# Create repository
echo "Creating repository: fawaskoya/superlist-clone"
gh repo create fawaskoya/superlist-clone --public --source=. --remote=origin --push

echo "✅ Repository created and code pushed!"
