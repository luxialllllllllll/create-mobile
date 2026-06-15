@echo off
setlocal
cd /d "%~dp0"
if "%PORT%"=="" set PORT=4175
powershell -ExecutionPolicy Bypass -File "%~dp0start-mobile.ps1"
