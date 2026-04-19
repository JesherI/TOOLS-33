@echo off
echo ========================================
echo  TOOLS-33 - Firmar archivos manualmente
echo ========================================
echo.

REM Establecer la clave privada
set TAURI_SIGNING_PRIVATE_KEY_PATH=src-tauri\private.pem

echo Usando clave: %TAURI_SIGNING_PRIVATE_KEY_PATH%
echo.

if not exist "release-artifacts" (
    echo ERROR: No existe la carpeta release-artifacts
    echo Ejecuta primero: .\prepare-release.ps1
    pause
    exit /b 1
)

cd release-artifacts

echo Firmando archivos...
echo.

REM Firmar ZIP del MSI
echo - Firmando ZIP del MSI...
call pnpm tauri signer sign -- "tools-33_0.1.8_x64_en-US.msi.zip"
if %errorlevel% == 0 (
    echo   OK - ZIP firmado exitosamente
) else (
    echo   ERROR al firmar ZIP
)
echo.

REM Firmar NSIS installer
echo - Firmando NSIS installer...
call pnpm tauri signer sign -- "tools-33_0.1.8_x64-setup.exe"
if %errorlevel% == 0 (
    echo   OK - NSIS firmado exitosamente
) else (
    echo   ERROR al firmar NSIS
)
echo.

REM Firmar portable
echo - Firmando ejecutable portable...
call pnpm tauri signer sign -- "tools-33_0.1.8_x64.exe"
if %errorlevel% == 0 (
    echo   OK - Portable firmado exitosamente
) else (
    echo   ERROR al firmar portable
)
echo.

cd ..

echo ========================================
echo  Verificando firmas generadas...
echo ========================================
echo.

if exist "release-artifacts\tools-33_0.1.8_x64_en-US.msi.zip.sig" (
    echo FIRMA DEL ZIP GENERADA - El updater funcionara correctamente.
    echo.
    type "release-artifacts\tools-33_0.1.8_x64_en-US.msi.zip.sig"
) else (
    echo ERROR: No se genero la firma del ZIP. Revisa los errores arriba.
)

echo.
ls release-artifacts\*.sig 2>nul || echo No se encontraron archivos .sig

echo.
pause
