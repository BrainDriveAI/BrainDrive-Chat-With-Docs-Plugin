#!/bin/bash

# BrainDriveChatWithDocs Plugin Build Script
echo "Building BrainDriveChatWithDocs Plugin..."

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Clean previous build
echo "Cleaning previous build..."
npm run clean

# Build the plugin
echo "Building plugin..."
npm run build

# Check if build was successful
if [ -f "dist/remoteEntry.js" ]; then
    echo "✅ Build successful! Plugin bundle created at dist/remoteEntry.js"
    echo "📦 Plugin is ready for installation"
else
    echo "❌ Build failed! Please check the errors above."
    exit 1
fi

echo "🎉 BrainDriveChatWithDocs plugin build complete!"