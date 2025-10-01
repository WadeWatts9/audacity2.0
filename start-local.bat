@echo off
echo Iniciando AUDACITY en modo local...
cd /d "C:\Users\Alan Canto\Downloads\audacity_contador-main\audacity_contador-main"
echo Directorio actual: %CD%
echo Verificando archivos...
dir app.js
echo.
echo Iniciando servidor...
node app.js
pause
