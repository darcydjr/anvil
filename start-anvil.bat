@echo off

REM Read version from package.json
for /f "tokens=*" %%i in ('powershell -Command "(Get-Content package.json | ConvertFrom-Json).version"') do set VERSION=%%i

echo ============================================
echo        Starting Anvil v%VERSION% - Level 1!
echo ============================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing server dependencies...
    call npm install
    echo.
)

REM Check if client node_modules exists
if not exist "client\node_modules" (
    echo Installing client dependencies...
    cd client
    call npm install
    cd ..
    echo.
)

REM Check if dist directory exists, if not build the client
if not exist "dist" (
    echo Building React client application...
    cd client
    call npm run build
    cd ..
    echo.
)

echo Starting Anvil server...
echo.
echo Anvil will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo ============================================
echo.

npm start