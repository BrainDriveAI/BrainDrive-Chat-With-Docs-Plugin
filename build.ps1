# BrainDriveChatWithDocs Plugin Build Script
Write-Host "Building BrainDriveChatWithDocs Plugin..." -ForegroundColor Cyan

# Check if node_modules exists, if not install dependencies
if (-Not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Clean previous build
Write-Host "Cleaning previous build..." -ForegroundColor Yellow
npm run clean

# Build the plugin
Write-Host "Building plugin..." -ForegroundColor Yellow
npm run build

# Check if build was successful
if (Test-Path "dist/remoteEntry.js") {
    Write-Host "✅ Build successful! Plugin bundle created at dist/remoteEntry.js" -ForegroundColor Green
    Write-Host "📦 Plugin is ready for installation" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed! Please check the errors above." -ForegroundColor Red
    exit 1
}

Write-Host "🎉 BrainDriveChatWithDocs plugin build complete!" -ForegroundColor Green
