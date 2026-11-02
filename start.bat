@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$port='3000'; if (Test-Path '.env') { Get-Content '.env' | ForEach-Object { if ($_ -match '^\s*FRONTEND_PORT\s*=\s*(\d+)') { $port=$matches[1] } } }; docker compose up -d; if ($LASTEXITCODE -eq 0) { Start-Process \"http://localhost:$port\" }"
pause
