# Script de instalación de Ghostscript para Windows
# Versión mejorada con mejor manejo de errores

param(
    [switch]$Silent,
    [switch]$CheckOnly
)

$ErrorActionPreference = "Continue"
$ProgressPreference = "Continue"

# Archivo de log
$logFile = Join-Path $env:TEMP "ghostscript-install.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Add-Content -Path $logFile -Value $logEntry -ErrorAction SilentlyContinue
    if (-not $Silent) {
        switch ($Level) {
            "ERROR" { Write-Host $Message -ForegroundColor Red }
            "WARN"  { Write-Host $Message -ForegroundColor Yellow }
            "SUCCESS" { Write-Host $Message -ForegroundColor Green }
            default { Write-Host $Message }
        }
    }
}

# Limpiar log anterior
if (Test-Path $logFile) { Remove-Item $logFile -Force -ErrorAction SilentlyContinue }
Write-Log "========================================"
Write-Log "  Instalador de Ghostscript - TOOLS 33"
Write-Log "========================================"
Write-Log ""

# Verificar si ya está instalado
function Find-Ghostscript {
    Write-Log "Buscando Ghostscript instalado..."
    
    # Buscar en ubicaciones comunes
    $gsPaths = @()
    
    # Buscar en C:\Program Files\gs dinámicamente
    if (Test-Path "C:\Program Files\gs") {
        $dirs = Get-ChildItem -Path "C:\Program Files\gs" -Directory -ErrorAction SilentlyContinue
        foreach ($dir in $dirs) {
            $exePath = Join-Path $dir.FullName "bin\gswin64c.exe"
            if (Test-Path $exePath) {
                $gsPaths += $exePath
            }
        }
    }
    
    # También buscar en x86
    if (Test-Path "C:\Program Files (x86)\gs") {
        $dirs = Get-ChildItem -Path "C:\Program Files (x86)\gs" -Directory -ErrorAction SilentlyContinue
        foreach ($dir in $dirs) {
            $exePath = Join-Path $dir.FullName "bin\gswin32c.exe"
            if (Test-Path $exePath) {
                $gsPaths += $exePath
            }
        }
    }
    
    # Verificar en PATH
    try {
        $gs = Get-Command gswin64c -ErrorAction SilentlyContinue
        if ($gs -and ($gsPaths -notcontains $gs.Source)) {
            $gsPaths += $gs.Source
        }
        
        $gs32 = Get-Command gswin32c -ErrorAction SilentlyContinue
        if ($gs32 -and ($gsPaths -notcontains $gs32.Source)) {
            $gsPaths += $gs32.Source
        }
    } catch {}
    
    # Verificar que funcionan
    foreach ($path in $gsPaths) {
        try {
            $version = & $path "--version" 2>$null
            if ($version) {
                Write-Log "✓ Ghostscript encontrado: $path (v$version)" "SUCCESS"
                return $path
            }
        } catch {}
    }
    
    Write-Log "✗ Ghostscript no encontrado" "WARN"
    return $null
}

# Modo solo verificar
if ($CheckOnly) {
    $found = Find-Ghostscript
    if ($found) {
        exit 0
    } else {
        exit 1
    }
}

# Verificar si ya está instalado
$existingGs = Find-Ghostscript
if ($existingGs) {
    Write-Log ""
    Write-Log "Ghostscript ya está instalado y funcionando." "SUCCESS"
    Write-Log "Ubicación: $existingGs"
    exit 0
}

# Verificar permisos de administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
Write-Log "Permisos de administrador: $isAdmin"

if (-not $isAdmin) {
    Write-Log ""
    Write-Log "⚠ NO SE DETECTARON PERMISOS DE ADMINISTRADOR" "WARN"
    Write-Log "La instalación de Ghostscript requiere permisos de administrador." "WARN"
    Write-Log ""
    Write-Log "Opciones:" "WARN"
    Write-Log "1. Cierra TOOLS 33 y ejecútalo como administrador (clic derecho > Ejecutar como administrador)" "WARN"
    Write-Log "2. Descarga e instala Ghostscript manualmente desde ghostscript.com" "WARN"
    Write-Log ""
    
    if (-not $Silent) {
        Write-Host ""
        Write-Host "Presiona cualquier tecla para salir..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    exit 2
}

# Determinar arquitectura
$is64Bit = [Environment]::Is64BitOperatingSystem
$arch = if ($is64Bit) { "64-bit" } else { "32-bit" }
Write-Log "Arquitectura detectada: $arch"

# URL de descarga - Usar mirrors más confiables
$gsVersion = "10.04.0"
if ($is64Bit) {
    $downloadUrl = "https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs10040/gs10040w64.exe"
    $installerName = "gs10040w64.exe"
} else {
    $downloadUrl = "https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs10040/gs10040w32.exe"
    $installerName = "gs10040w32.exe"
}

$tempDir = $env:TEMP
$installerPath = Join-Path $tempDir $installerName

Write-Log ""
Write-Log "Descargando Ghostscript $gsVersion..."
Write-Log "URL: $downloadUrl"
Write-Log "Destino: $installerPath"

# Eliminar instalador anterior si existe
if (Test-Path $installerPath) {
    Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
}

# Descargar con mejor manejo de errores
try {
    # Usar WebClient para mejor compatibilidad
    $webClient = New-Object System.Net.WebClient
    $webClient.DownloadFile($downloadUrl, $installerPath)
    
    if (-not (Test-Path $installerPath)) {
        throw "El archivo no se descargó correctamente"
    }
    
    $fileSize = (Get-Item $installerPath).Length
    Write-Log "✓ Descarga completada ($(($fileSize / 1MB).ToString('F1')) MB)" "SUCCESS"
} catch {
    Write-Log "✗ Error al descargar: $_" "ERROR"
    Write-Log "Error detallado: $($_.Exception.Message)" "ERROR"
    
    # Intentar método alternativo
    try {
        Write-Log "Intentando método alternativo de descarga..."
        Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing -MaximumRedirection 5
        
        if (Test-Path $installerPath) {
            Write-Log "✓ Descarga completada (método alternativo)" "SUCCESS"
        } else {
            throw "El archivo no se descargó"
        }
    } catch {
        Write-Log "✗ Falló el método alternativo también" "ERROR"
        if (-not $Silent) { pause }
        exit 1
    }
}

# Verificar que el instalador es válido
if (-not (Test-Path $installerPath)) {
    Write-Log "✗ El instalador no existe después de descargar" "ERROR"
    exit 1
}

# Instalar
Write-Log ""
Write-Log "Instalando Ghostscript..."
Write-Log "Esto puede tardar unos minutos..."

try {
    # Ejecutar instalador silencioso
    $process = Start-Process -FilePath $installerPath -ArgumentList "/S" -Wait -PassThru -NoNewWindow
    
    Write-Log "Código de salida del instalador: $($process.ExitCode)"
    
    if ($process.ExitCode -eq 0) {
        Write-Log "✓ Instalación completada exitosamente" "SUCCESS"
    } else {
        Write-Log "⚠ El instalador devolvió código: $($process.ExitCode)" "WARN"
    }
} catch {
    Write-Log "✗ Error durante la instalación: $_" "ERROR"
    Write-Log "StackTrace: $($_.ScriptStackTrace)" "ERROR"
    
    if (-not $Silent) { pause }
    exit 1
}

# Limpiar
Write-Log ""
Write-Log "Limpiando archivos temporales..."
Remove-Item $installerPath -Force -ErrorAction SilentlyContinue

# Esperar un momento para que Windows termine de configurar
Write-Log "Esperando configuración final..."
Start-Sleep -Seconds 3

# Verificar instalación
Write-Log ""
Write-Log "Verificando instalación..."
$gsPath = Find-Ghostscript

if ($gsPath) {
    Write-Log ""
    Write-Log "========================================" "SUCCESS"
    Write-Log "  ¡Ghostscript instalado correctamente!" "SUCCESS"
    Write-Log "========================================" "SUCCESS"
    Write-Log ""
    Write-Log "Ubicación: $gsPath"
    Write-Log ""
    Write-Log "IMPORTANTE: Reinicia TOOLS 33 para usar la compresión" "WARN"
    Write-Log "Log guardado en: $logFile"
    
    if (-not $Silent) {
        Write-Host ""
        Write-Host "Presiona cualquier tecla para salir..." -ForegroundColor Cyan
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    exit 0
} else {
    Write-Log ""
    Write-Log "⚠ No se pudo verificar la instalación" "WARN"
    Write-Log "Esto puede ocurrir si:" "WARN"
    Write-Log "  - La instalación necesita reiniciar" "WARN"
    Write-Log "  - Ghostscript se instaló en una ubicación inesperada" "WARN"
    Write-Log ""
    Write-Log "Prueba reiniciar TOOLS 33 o instala manualmente desde ghostscript.com" "WARN"
    Write-Log "Log guardado en: $logFile"
    
    if (-not $Silent) {
        Write-Host ""
        Write-Host "Presiona cualquier tecla para salir..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    exit 3
}
