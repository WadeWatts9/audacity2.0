@echo off
title AUDACITY - Sistema de Contadores
echo.
echo ========================================
echo    AUDACITY - Sistema de Contadores
echo ========================================
echo.

cd /d "%~dp0"
echo Directorio actual: %CD%
echo.

echo Verificando archivos...
if not exist "server.js" (
    echo ERROR: No se encuentra server.js
    pause
    exit /b 1
)

if not exist "index.html" (
    echo ERROR: No se encuentra index.html
    pause
    exit /b 1
)

if not exist "package.json" (
    echo ERROR: No se encuentra package.json
    pause
    exit /b 1
)

echo Archivos encontrados correctamente.
echo.

echo Instalando dependencias...
call npm install
echo.

echo Iniciando servidor...
echo.
echo ========================================
echo   Servidor ejecutándose en puerto 3000
echo   URL: http://localhost:3000
echo   Sin redirecciones al dominio externo
echo ========================================
echo.
echo Presiona Ctrl+C para detener el servidor
echo.

node server.js

echo.
echo Servidor detenido.
pause
