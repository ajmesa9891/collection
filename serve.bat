@echo off
title Local App Collection Server
echo Starting local web server on http://localhost:8000 ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause
