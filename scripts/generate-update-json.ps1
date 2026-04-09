# Script mejorado para generar latest.json y facilitar la subida de actualizaciones
# Repositorio: https://github.com/JesherI/TOOLS-33
#
# Uso:
#   .\scripts\generate-update-json.ps1                              # Detecta versión automáticamente
#   .\scripts\generate-update-json.ps1 -Version "0.1.6"            # Versión específica
#   .\scripts\generate-update-json.ps1 -AutoUpload                  # Sube automáticamente a GitHub
#   .\scripts\generate-update-json.ps1 -DraftRelease                # Crea release como borrador

param(
    [Parameter(Mandatory=$false)]
    [string]$Version = "",
    
    [Parameter(Mandatory=$false)]
    [string]$RepoOwner = "JesherI",
    
    [Parameter(Mandatory=$false)]
    [string]$RepoName = "TOOLS-33",
    
    [string]$ReleaseNotes = "",
    
    [string]$OutputPath = "latest.json",
    
    [switch]$AutoUpload,
    
    [switch]$DraftRelease,
    
    [switch]$SkipBuildCheck,
    
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Colores para output
$Green = "`e[32m"
$Yellow = "`e[33m"
$Cyan = "`e[36m"
$Red = "`e[31m"
$Reset = "`e[0m"

function Write-Step($message) {
    Write-Host "${Cyan}→${Reset} $message" -ForegroundColor Cyan
}

function Write-Success($message) {
    Write-Host "${Green}✓${Reset} $message" -ForegroundColor Green
}

function Write-Warning($message) {
    Write-Host "${Yellow}⚠${Reset} $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "${Red}✗${Reset} $message" -ForegroundColor Red
}

# ============================================================
# PASO 1: Detectar versión automáticamente
# ============================================================
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "     TOOLS-33 - Generador de Actualizaciones" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if (-not $Version) {
    Write-Step "Detectando versión desde tauri.conf.json..."
    $tauriConfPath = "src-tauri\tauri.conf.json"
    
    if (Test-Path $tauriConfPath) {
        $tauriConf = Get-Content $tauriConfPath -Raw | ConvertFrom-Json
        $Version = $tauriConf.version
        Write-Success "Versión detectada: $Version"
    } else {
        Write-Error "No se encontró $tauriConfPath"
        Write-Host "   Por favor especifica la versión manualmente con -Version" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Success "Usando versión especificada: $Version"
}

# ============================================================
# PASO 2: Verificar archivos de build
# ============================================================
Write-Host ""
Write-Step "Buscando archivos de instalación..."

$bundleDir = "src-tauri\target\release\bundle"
$nsisDir = "$bundleDir\nsis"
$msiDir = "$bundleDir\msi"

$exeFile = $null
$msiFile = $null
$sigFile = $null

# Buscar instalador NSIS (.exe)
if (Test-Path $nsisDir) {
    $exeFiles = Get-ChildItem -Path $nsisDir -Filter "*.exe" -ErrorAction SilentlyContinue
    if ($exeFiles) {
        $exeFile = $exeFiles | Select-Object -First 1
        Write-Success "Instalador NSIS encontrado: $($exeFile.Name)"
    }
}

# Buscar firma (.sig)
if ($exeFile) {
    $sigPath = "$nsisDir\$($exeFile.Name).sig"
    if (Test-Path $sigPath) {
        $sigFile = Get-Item $sigPath
        Write-Success "Firma encontrada: $($sigFile.Name)"
    } else {
        Write-Warning "No se encontró archivo de firma (.sig)"
        Write-Host "   La firma es necesaria para actualizaciones seguras" -ForegroundColor Yellow
    }
}

# Buscar instalador MSI
if (Test-Path $msiDir) {
    $msiFiles = Get-ChildItem -Path $msiDir -Filter "*.msi" -ErrorAction SilentlyContinue
    if ($msiFiles) {
        $msiFile = $msiFiles | Select-Object -First 1
        Write-Success "Instalador MSI encontrado: $($msiFile.Name)"
    }
}

# Verificar si faltan archivos
if (-not $exeFile -and -not $SkipBuildCheck) {
    Write-Error "No se encontraron archivos de instalación"
    Write-Host "   Ejecuta primero: pnpm tauri build" -ForegroundColor Yellow
    
    $continue = Read-Host "   ¿Deseas continuar de todos modos? (s/N)"
    if ($continue -ne "s" -and $continue -ne "S") {
        exit 1
    }
}

# ============================================================
# PASO 3: Extraer firma del archivo .sig
# ============================================================
$signature = ""
if ($sigFile) {
    Write-Host ""
    Write-Step "Extrayendo firma del archivo..."
    
    # Leer contenido del archivo .sig (base64)
    $signature = Get-Content $sigFile.FullName -Raw
    $signature = $signature.Trim()
    
    # Mostrar preview
    $preview = if ($signature.Length -gt 50) { $signature.Substring(0, 50) + "..." } else { $signature }
    Write-Success "Firma extraída: $preview"
}

# ============================================================
# PASO 4: Generar latest.json
# ============================================================
Write-Host ""
Write-Step "Generando latest.json..."

# URL base del release
$baseUrl = "https://github.com/$RepoOwner/$RepoName/releases/download/v$Version"

# Generar JSON
$platforms = @{}

# NSIS installer
if ($exeFile) {
    $platforms["windows-x86_64"] = @{
        signature = $signature
        url = "$baseUrl/$($exeFile.Name)"
    }
}

# MSI installer
if ($msiFile) {
    $platforms["windows-x86_64-msi"] = @{
        signature = ""
        url = "$baseUrl/$($msiFile.Name)"
    }
}

$latestJson = @{
    version = $Version
    notes = if ($ReleaseNotes) { $ReleaseNotes } else { "Actualización a versión $Version" }
    pub_date = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    platforms = $platforms
} | ConvertTo-Json -Depth 10

# Guardar archivo
$latestJson | Out-File -FilePath $OutputPath -Encoding UTF8
Write-Success "Archivo latest.json generado: $OutputPath"

# ============================================================
# PASO 5: Resumen
# ============================================================
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "                    RESUMEN" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Versión: $Version" -ForegroundColor White
Write-Host "Repositorio: $RepoOwner/$RepoName" -ForegroundColor White
Write-Host ""
Write-Host "Archivos a subir:" -ForegroundColor Yellow

if ($exeFile) {
    $exeSize = [math]::Round($exeFile.Length / 1MB, 2)
    Write-Host "  📦 $($exeFile.Name) ($exeSize MB)" -ForegroundColor Green
}
if ($sigFile) {
    Write-Host "  🔑 $($sigFile.Name)" -ForegroundColor Green
}
if ($msiFile) {
    $msiSize = [math]::Round($msiFile.Length / 1MB, 2)
    Write-Host "  📦 $($msiFile.Name) ($msiSize MB)" -ForegroundColor Green
}
Write-Host "  📄 latest.json" -ForegroundColor Green

Write-Host ""
Write-Host "Contenido de latest.json:" -ForegroundColor Yellow
Write-Host $latestJson -ForegroundColor Gray

# ============================================================
# PASO 6: Subida automática (opcional)
# ============================================================
if ($AutoUpload) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "                SUBIENDO A GITHUB" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    # Verificar que gh CLI esté instalado
    $ghExists = Get-Command gh -ErrorAction SilentlyContinue
    if (-not $ghExists) {
        Write-Error "GitHub CLI (gh) no está instalado"
        Write-Host "   Instálalo desde: https://cli.github.com/" -ForegroundColor Yellow
        exit 1
    }
    
    # Verificar autenticación
    $authStatus = gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "No estás autenticado en GitHub CLI"
        Write-Host "   Ejecuta: gh auth login" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Step "Creando release v$Version..."
    
    # Preparar comando de creación de release
    $releaseArgs = @(
        "release", "create", "v$Version"
        "--title", "v$Version"
        "--notes", (if ($ReleaseNotes) { $ReleaseNotes } else { "Actualización a versión $Version" })
    )
    
    if ($DraftRelease) {
        $releaseArgs += "--draft"
        Write-Host "   (Modo borrador)" -ForegroundColor Yellow
    }
    
    # Crear release
    $releaseUrl = gh @releaseArgs 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Release creado exitosamente"
        Write-Host "   URL: $releaseUrl" -ForegroundColor Cyan
        
        # Subir archivos
        Write-Host ""
        Write-Step "Subiendo archivos..."
        
        $filesToUpload = @()
        if ($exeFile) { $filesToUpload += $exeFile.FullName }
        if ($sigFile) { $filesToUpload += $sigFile.FullName }
        if ($msiFile) { $filesToUpload += $msiFile.FullName }
        $filesToUpload += (Resolve-Path $OutputPath).Path
        
        foreach ($file in $filesToUpload) {
            $fileName = Split-Path $file -Leaf
            Write-Host "   Subiendo $fileName..." -NoNewline
            $uploadResult = gh release upload "v$Version" "$file" --clobber 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host " ${Green}✓${Reset}" -ForegroundColor Green
            } else {
                Write-Host " ${Red}✗${Reset}" -ForegroundColor Red
                Write-Error "Error subiendo $fileName`: $uploadResult"
            }
        }
        
        Write-Host ""
        Write-Success "¡Todos los archivos subidos exitosamente!"
        Write-Host "   URL del release: $releaseUrl" -ForegroundColor Cyan
        
        if (-not $DraftRelease) {
            Write-Host ""
            Write-Warning "Los usuarios recibirán la actualización automáticamente"
        }
    } else {
        Write-Error "Error creando el release: $releaseUrl"
        Write-Host "   Es posible que el release v$Version ya exista" -ForegroundColor Yellow
        Write-Host "   Intenta subir los archivos manualmente:" -ForegroundColor Yellow
        foreach ($file in $filesToUpload) {
            Write-Host "     gh release upload v$Version \"$file\" --clobber" -ForegroundColor Gray
        }
    }
} else {
    # Instrucciones manuales
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "          SIGUIENTES PASOS (Manual)" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Opción A - Usar GitHub CLI (recomendado):" -ForegroundColor Yellow
    Write-Host "  gh release create v$Version \\" -ForegroundColor White
    if ($exeFile) {
        Write-Host "    \"$($exeFile.FullName)\" \\" -ForegroundColor Gray
    }
    if ($sigFile) {
        Write-Host "    \"$($sigFile.FullName)\" \\" -ForegroundColor Gray
    }
    if ($msiFile) {
        Write-Host "    \"$($msiFile.FullName)\" \\" -ForegroundColor Gray
    }
    Write-Host "    \"$((Resolve-Path $OutputPath).Path)\" \\" -ForegroundColor Gray
    Write-Host "    --title \"v$Version\" \\" -ForegroundColor Gray
    Write-Host "    --notes \"$($ReleaseNotes ? $ReleaseNotes : "Actualización a versión $Version")\"" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Opción B - Subida manual:" -ForegroundColor Yellow
    Write-Host "  1. Ve a: https://github.com/$RepoOwner/$RepoName/releases/new" -ForegroundColor White
    Write-Host "  2. Crea un tag: v$Version" -ForegroundColor White
    Write-Host "  3. Sube estos archivos:" -ForegroundColor White
    if ($exeFile) { Write-Host "     - $($exeFile.FullName)" -ForegroundColor Gray }
    if ($sigFile) { Write-Host "     - $($sigFile.FullName)" -ForegroundColor Gray }
    if ($msiFile) { Write-Host "     - $($msiFile.FullName)" -ForegroundColor Gray }
    Write-Host "     - $((Resolve-Path $OutputPath).Path)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Para subida automática, ejecuta con -AutoUpload:" -ForegroundColor Cyan
    Write-Host "  .\scripts\generate-update-json.ps1 -AutoUpload" -ForegroundColor White
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "                    ¡LISTO!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
