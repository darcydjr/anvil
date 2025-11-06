#!/bin/bash

# Anvil Application Restart Script
# This script kills all running instances and starts fresh

echo "================================================"
echo "🔄 Anvil Application Restart Script"
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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Kill all related processes
print_status "Stopping all Anvil processes..."
echo ""

# Kill processes by port
print_status "Checking for processes on port 3005 (server)..."
if lsof -ti:3005 >/dev/null 2>&1; then
    lsof -ti:3005 | xargs kill -9 2>/dev/null
    print_success "Killed processes on port 3005"
else
    print_warning "No processes found on port 3005"
fi

print_status "Checking for processes on port 5173 (client)..."
if lsof -ti:5173 >/dev/null 2>&1; then
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    print_success "Killed processes on port 5173"
else
    print_warning "No processes found on port 5173"
fi

# Kill all node processes related to this project
print_status "Killing all Anvil-related Node processes..."
pkill -f "ts-node server.ts" 2>/dev/null && print_success "Killed server processes" || print_warning "No server processes found"
pkill -f "vite.*anvil" 2>/dev/null && print_success "Killed Vite processes" || print_warning "No Vite processes found"

# Wait a moment for processes to fully terminate
sleep 1

echo ""
print_success "All processes stopped"
echo ""

# Step 2: Start the server
print_status "Starting Anvil server..."
echo ""
print_status "Server will run on: http://localhost:3005"

cd /Users/jamesreynolds/Documents/Development/Quade/anvil

# Start server in background
npm start > /tmp/anvil-server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
print_status "Waiting for server to initialize..."
sleep 3

# Check if server started successfully
if ps -p $SERVER_PID > /dev/null; then
    print_success "Server started successfully (PID: $SERVER_PID)"

    # Check if port is listening
    if lsof -ti:3005 >/dev/null 2>&1; then
        print_success "Server is listening on port 3005"
    else
        print_warning "Server process running but port 3005 not yet listening"
    fi
else
    print_error "Server failed to start. Check logs: tail -f /tmp/anvil-server.log"
    exit 1
fi

echo ""

# Step 3: Start the client
print_status "Starting Anvil client..."
echo ""
print_status "Client will run on: http://localhost:5173"

cd /Users/jamesreynolds/Documents/Development/Quade/anvil/client

# Start client in background
npm run dev > /tmp/anvil-client.log 2>&1 &
CLIENT_PID=$!

# Wait for client to start
print_status "Waiting for client to initialize..."
sleep 3

# Check if client started successfully
if ps -p $CLIENT_PID > /dev/null; then
    print_success "Client started successfully (PID: $CLIENT_PID)"

    # Check if port is listening
    if lsof -ti:5173 >/dev/null 2>&1; then
        print_success "Client is listening on port 5173"
    else
        print_warning "Client process running but port 5173 not yet listening"
    fi
else
    print_error "Client failed to start. Check logs: tail -f /tmp/anvil-client.log"
    exit 1
fi

echo ""
echo "================================================"
print_success "Anvil Application Started Successfully!"
echo "================================================"
echo ""
echo "📊 Server:  http://localhost:3005"
echo "🌐 Client:  http://localhost:5173"
echo ""
echo "📝 Logs:"
echo "   Server: tail -f /tmp/anvil-server.log"
echo "   Client: tail -f /tmp/anvil-client.log"
echo ""
echo "🛑 To stop all processes, run:"
echo "   ./restart.sh stop"
echo ""
