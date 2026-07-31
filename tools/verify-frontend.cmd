@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0verify-frontend.ps1" %*
