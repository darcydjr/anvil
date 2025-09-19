#!/bin/bash

# Read version from package.json
VERSION=$(cat package.json | grep -Po '"version":\s*"\K[^"]*')

echo "============================================"
echo "       Starting Anvil v$VERSION - Level 1!"
echo "============================================"
echo

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing server dependencies..."
    npm install
    echo
fi

# Check if client node_modules exists
if [ ! -d "client/node_modules" ]; then
    echo "Installing client dependencies..."
    cd client
    npm install
    cd ..
    echo
fi

# Check if dist directory exists, if not build the client
if [ ! -d "dist" ]; then
    echo "Building React client application..."
    cd client
    npm run build
    cd ..
    echo
fi

echo "Starting Anvil server..."
echo
echo "Anvil will be available at: http://localhost:3000"
echo
echo "Press Ctrl+C to stop the server"
echo "============================================"
echo

npm start