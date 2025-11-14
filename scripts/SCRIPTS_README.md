# Anvil Application Management Scripts

This document describes the scripts available for managing the Anvil application.

## Quick Start Scripts

### Full Restart (Recommended)
```bash
# Kill all processes and start fresh
./restart.sh

# OR using npm
npm run restart
```

This script will:
1. ✅ Kill all running server processes (port 3005)
2. ✅ Kill all running client processes (port 5173)
3. ✅ Clean up all Node/Vite processes
4. ✅ Start the server in the background
5. ✅ Start the client in the background
6. ✅ Provide status output and URLs

### Stop All Processes
```bash
# Stop everything
./stop.sh

# OR using npm
npm run stop
```

This script will:
1. ✅ Kill all server processes
2. ✅ Kill all client processes
3. ✅ Clean up all related processes

## Manual Starting (Alternative)

If you prefer to start components individually:

### Start Server Only
```bash
npm start
```
- Runs on: http://localhost:3005
- Backend API server

### Start Client Only
```bash
npm run client
# OR
cd client && npm run dev
```
- Runs on: http://localhost:5173
- Frontend React application

### Start Both with Hot Reload (Development)
```bash
npm run dev
```
- Uses `concurrently` to run both server and client
- Includes hot reload for both

## Application URLs

After running `./restart.sh`:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3005

## Viewing Logs

After using `./restart.sh`, logs are saved to:
```bash
# Server logs
tail -f /tmp/anvil-server.log

# Client logs
tail -f /tmp/anvil-client.log
```

## Troubleshooting

### Ports Already in Use
If you get port conflicts:
```bash
./stop.sh
# Wait a moment
./restart.sh
```

### Script Permission Denied
If you get permission errors:
```bash
chmod +x restart.sh stop.sh
```

### Processes Won't Die
Force kill by port:
```bash
# Kill server (port 3005)
lsof -ti:3005 | xargs kill -9

# Kill client (port 5173)
lsof -ti:5173 | xargs kill -9
```

## Script Features

### restart.sh
- ✅ Colored output for status messages
- ✅ Process validation
- ✅ Port availability checking
- ✅ Background process management
- ✅ Log file creation
- ✅ Success/failure reporting

### stop.sh
- ✅ Graceful process termination
- ✅ Cleanup of all related processes
- ✅ Status reporting

## Best Practices

1. **Use restart.sh for clean starts**: Always use this when switching branches or making configuration changes
2. **Check logs if issues occur**: The log files provide detailed information
3. **Use stop.sh before system shutdown**: Clean up processes properly
4. **Monitor ports**: Ensure ports 3005 and 5173 are available

## Common Workflows

### After Pulling Latest Code
```bash
npm run stop
npm install
cd client && npm install && cd ..
npm run restart
```

### Switching Workspaces
```bash
npm run stop
# Edit config.json or config.local.json
npm run restart
```

### Before Committing Changes
```bash
npm run stop
# Make sure no background processes are running
git add .
git commit -m "Your message"
```

## Architecture

```
┌─────────────────────────────────────┐
│         Anvil Application           │
├─────────────────────────────────────┤
│                                     │
│  Server (Port 3005)                 │
│  ├─ Express API                     │
│  ├─ File Watcher                    │
│  ├─ Authentication                  │
│  └─ WebSocket (optional)            │
│                                     │
│  Client (Port 5173)                 │
│  ├─ Vite Dev Server                 │
│  ├─ React Application               │
│  ├─ Tailwind CSS v4                 │
│  └─ Proxies /api to Server          │
│                                     │
└─────────────────────────────────────┘
```

## Environment

- **Node.js**: v20.19.5
- **Package Manager**: npm
- **Server Runtime**: ts-node
- **Client Bundler**: Vite
- **CSS Framework**: Tailwind CSS v4
