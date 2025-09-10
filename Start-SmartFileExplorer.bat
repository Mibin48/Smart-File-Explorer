@echo off
title Smart AI File Explorer
echo.
echo ====================================
echo    Smart AI File Explorer Launcher
echo ====================================
echo.
echo Starting the application...
echo.

cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

REM Check if dist folder exists, if not build the app
if not exist "dist" (
    echo Building the application...
    npm run build
    echo.
)

echo Launching Smart AI File Explorer...
npm start

echo.
echo Application closed.
pause
