@echo off
setlocal
title Editor de landings
cd /d "%~dp0studio"

where node >nul 2>&1
if errorlevel 1 (
  echo No encuentro Node.js. Instalá Node y volvé a abrir este archivo.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo No encuentro npm. Instalá Node.js y volvé a abrir este archivo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Instalando dependencias...
  call npm.cmd install
  if errorlevel 1 (
    echo No se pudieron instalar las dependencias.
    pause
    exit /b 1
  )
)

echo Editor de landings. Cerra la ventana de la aplicación para apagarlo.
call npm.cmd run app
if errorlevel 1 pause
