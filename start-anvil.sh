#!/bin/bash

# Read version from package.json
VERSION=$(cat package.json | grep -Po '"version":\s*"\K[^"]*')

echo "============================================"
echo "       Starting Anvil v$VERSION - Level 1!"
echo "============================================"
echo

# Check if server dependencies need to be installed/updated
NEED_SERVER_INSTALL=false
if [ ! -d "node_modules" ]; then
    echo "Server node_modules not found..."
    NEED_SERVER_INSTALL=true
else
    # Check if all dependencies from package.json are installed
    echo "Checking for missing server dependencies..."
    if ! npm ls --depth=0 --silent > /dev/null 2>&1; then
        echo "Missing server dependencies detected..."
        NEED_SERVER_INSTALL=true
    fi
fi

if [ "$NEED_SERVER_INSTALL" = true ]; then
    echo "Installing/updating server dependencies..."
    npm install
    echo
fi

# Check if client dependencies need to be installed/updated
NEED_CLIENT_INSTALL=false
if [ ! -d "client/node_modules" ]; then
    echo "Client node_modules not found..."
    NEED_CLIENT_INSTALL=true
else
    # Check if all client dependencies from package.json are installed
    echo "Checking for missing client dependencies..."
    cd client
    if ! npm ls --depth=0 --silent > /dev/null 2>&1; then
        echo "Missing client dependencies detected..."
        NEED_CLIENT_INSTALL=true
    fi
    cd ..
fi

if [ "$NEED_CLIENT_INSTALL" = true ]; then
    echo "Installing/updating client dependencies..."
    cd client
    npm install
    cd ..
    echo
fi

# Check if client needs to be built/rebuilt
NEED_CLIENT_BUILD=false

if [ ! -d "dist" ]; then
    echo "Client dist directory not found..."
    NEED_CLIENT_BUILD=true
elif [ ! -f "dist/index.html" ]; then
    echo "Client build incomplete - missing index.html..."
    NEED_CLIENT_BUILD=true
else
    # Check if any client source files are newer than the built index.html
    echo "Checking if client source files have changed..."

    # Check if client package.json is newer than dist/index.html
    if [ "client/package.json" -nt "dist/index.html" ]; then
        echo "client/package.json has changed..."
        NEED_CLIENT_BUILD=true
    fi

    # Check if any source files in client/src are newer than dist/index.html
    if [ "$NEED_CLIENT_BUILD" = false ]; then
        SOURCE_NEWER_COUNT=$(find client/src -name "*.jsx" -o -name "*.js" -o -name "*.css" -o -name "*.ts" -o -name "*.tsx" | xargs ls -t 2>/dev/null | head -1 | xargs stat --format="%Y" 2>/dev/null || echo "0")
        DIST_TIME=$(stat --format="%Y" dist/index.html 2>/dev/null || echo "0")

        if [ "$SOURCE_NEWER_COUNT" -gt "$DIST_TIME" ]; then
            echo "Client source files have changed..."
            NEED_CLIENT_BUILD=true
        fi
    fi

    # Check if vite.config.js changed
    if [ "$NEED_CLIENT_BUILD" = false ] && [ -f "client/vite.config.js" ] && [ "client/vite.config.js" -nt "dist/index.html" ]; then
        echo "Vite configuration has changed..."
        NEED_CLIENT_BUILD=true
    fi

    # Check if HTML template changed
    if [ "$NEED_CLIENT_BUILD" = false ] && [ -f "client/index.html" ] && [ "client/index.html" -nt "dist/index.html" ]; then
        echo "HTML template has changed..."
        NEED_CLIENT_BUILD=true
    fi
fi

if [ "$NEED_CLIENT_BUILD" = true ]; then
    echo "Building/rebuilding React client application..."
    cd client
    npm run build
    cd ..
    echo
else
    echo "Client is up to date, skipping build."
fi

echo "Starting Anvil server..."
echo
echo "Anvil will be available at: http://localhost:3000"
echo
echo "Press Ctrl+C to stop the server"
echo "============================================"
echo

npm start