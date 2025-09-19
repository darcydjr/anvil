@echo off
setlocal enabledelayedexpansion

REM Read version from package.json
for /f "tokens=*" %%i in ('powershell -Command "(Get-Content package.json | ConvertFrom-Json).version"') do set VERSION=%%i

echo ============================================
echo        Starting Anvil v%VERSION% - Level 1!
echo ============================================
echo.

REM Check if server dependencies need to be installed/updated
set NEED_SERVER_INSTALL=false
if not exist "node_modules" (
    echo Server node_modules not found...
    set NEED_SERVER_INSTALL=true
) else (
    REM Check if all dependencies from package.json are installed
    echo Checking for missing server dependencies...
    call npm ls --depth=0 --silent >nul 2>&1
    if !errorlevel! neq 0 (
        echo Missing server dependencies detected...
        set NEED_SERVER_INSTALL=true
    )
)

if "%NEED_SERVER_INSTALL%"=="true" (
    echo Installing/updating server dependencies...
    call npm install
    echo.
)

REM Check if client dependencies need to be installed/updated
set NEED_CLIENT_INSTALL=false
if not exist "client\node_modules" (
    echo Client node_modules not found...
    set NEED_CLIENT_INSTALL=true
) else (
    REM Check if all client dependencies from package.json are installed
    echo Checking for missing client dependencies...
    cd client
    call npm ls --depth=0 --silent >nul 2>&1
    if !errorlevel! neq 0 (
        echo Missing client dependencies detected...
        set NEED_CLIENT_INSTALL=true
    )
    cd ..
)

if "%NEED_CLIENT_INSTALL%"=="true" (
    echo Installing/updating client dependencies...
    cd client
    call npm install
    cd ..
    echo.
)

REM Check if client needs to be built/rebuilt
set NEED_CLIENT_BUILD=false

if not exist "dist" (
    echo Client dist directory not found...
    set NEED_CLIENT_BUILD=true
) else if not exist "dist\index.html" (
    echo Client build incomplete - missing index.html...
    set NEED_CLIENT_BUILD=true
) else (
    REM Check if any client source files are newer than the built index.html
    echo Checking if client source files have changed...

    REM Check if client package.json is newer than dist/index.html
    for /f %%i in ('powershell -Command "if ((Get-Item client/package.json).LastWriteTime -gt (Get-Item dist/index.html).LastWriteTime) { Write-Output 'true' } else { Write-Output 'false' }"') do set PKG_NEWER=%%i
    if "!PKG_NEWER!"=="true" (
        echo client/package.json has changed...
        set NEED_CLIENT_BUILD=true
    )

    REM Check if any .jsx, .js, .css files in client/src are newer than dist/index.html
    for /f %%i in ('powershell -Command "Get-ChildItem -Path client/src -Recurse -Include *.jsx,*.js,*.css,*.ts,*.tsx | Where-Object { $_.LastWriteTime -gt (Get-Item dist/index.html).LastWriteTime } | Measure-Object | Select-Object -ExpandProperty Count"') do set SOURCE_NEWER_COUNT=%%i
    if !SOURCE_NEWER_COUNT! gtr 0 (
        echo Client source files have changed ^(!SOURCE_NEWER_COUNT! files^)...
        set NEED_CLIENT_BUILD=true
    )

    REM Check if vite.config.js or index.html template changed
    for /f %%i in ('powershell -Command "if (Test-Path client/vite.config.js) { if ((Get-Item client/vite.config.js).LastWriteTime -gt (Get-Item dist/index.html).LastWriteTime) { Write-Output 'true' } else { Write-Output 'false' } } else { Write-Output 'false' }"') do set VITE_CONFIG_NEWER=%%i
    if "!VITE_CONFIG_NEWER!"=="true" (
        echo Vite configuration has changed...
        set NEED_CLIENT_BUILD=true
    )

    for /f %%i in ('powershell -Command "if (Test-Path client/index.html) { if ((Get-Item client/index.html).LastWriteTime -gt (Get-Item dist/index.html).LastWriteTime) { Write-Output 'true' } else { Write-Output 'false' } } else { Write-Output 'false' }"') do set INDEX_NEWER=%%i
    if "!INDEX_NEWER!"=="true" (
        echo HTML template has changed...
        set NEED_CLIENT_BUILD=true
    )
)

if "%NEED_CLIENT_BUILD%"=="true" (
    echo Building/rebuilding React client application...
    cd client
    call npm run build
    cd ..
    echo.
) else (
    echo Client is up to date, skipping build.
)

echo Starting Anvil server...
echo.
echo Anvil will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo ============================================
echo.

npm start