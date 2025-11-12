#!/bin/bash

# Anvil Application Stop Script
# This script kills all running instances

echo "================================================"
echo "🛑 Anvil Application Stop Script"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Kill processes by port
print_status "Stopping server (port 3005)..."
if lsof -ti:3000 >/dev/null 2>&1; then
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    print_success "Server stopped"
else
    print_warning "No server processes found on port 3005"
fi

print_status "Stopping client (port 5173)..."
if lsof -ti:5173 >/dev/null 2>&1; then
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    print_success "Client stopped"
else
    print_warning "No client processes found on port 5173"
fi

# Kill all node processes related to this project
print_status "Cleaning up remaining processes..."
pkill -f "ts-node server.ts" 2>/dev/null
pkill -f "vite.*anvil" 2>/dev/null

sleep 1

echo ""
print_success "All Anvil processes stopped"
echo ""
