@echo off
cd /d "%~dp0"
docker compose down
echo.
echo Narralia stack stopped.
pause
