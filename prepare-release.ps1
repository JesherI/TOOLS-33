# TOOLS-33 Release Preparation Script
# Compila, firma y prepara archivos para publicar en GitHub

param(
    [string]$Version = "",
    [string]$ReleaseNotes = "Mejoras de rendimiento y correcciones de errores."
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TOOLS-33 Release Preparation Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Detectar version
if ([string]::IsNullOrEmpty($Version)) {
    $VersionMatch = Select-String -Path "src-tauri/tauri.conf.json" -Pattern '"version":\s*"([^"]+)"'
    if ($VersionMatch) {
        $Version = $VersionMatch.Matches.Groups[1].Value
    }
}

if ([string]::IsNullOrEmpty($Version)) {
    Write-Host "ERROR: No se pudo detectar la version." -ForegroundColor Red
    Write-Host "Especifica la version manualmente: .\prepare-release.ps1 -Version '0.1.6'" -ForegroundColor Yellow
    exit 1
}

Write-Host "Version: v$Version" -ForegroundColor Green
Write-Host ""

# 2. Verificar clave privada
$PrivateKeyPath = "src-tauri/private.pem"
if (-not (Test-Path $PrivateKeyPath)) {
    Write-Host "ERROR: No se encontro la clave privada." -ForegroundColor Red
    Write-Host "Ejecuta primero: .\generate-keys.ps1" -ForegroundColor Yellow
    exit 1
}

$PrivateKey = Get-Content $PrivateKeyPath -Raw
if ([string]::IsNullOrWhiteSpace($PrivateKey)) {
    Write-Host "ERROR: La clave privada esta vacia." -ForegroundColor Red
    exit 1
}

Write-Host "[1/5] Clave privada encontrada" -ForegroundColor Green

# 3. Compilar
Write-Host "[2/5] Compilando aplicacion..." -ForegroundColor Yellow
Write-Host ""

$env:TAURI_SIGNING_PRIVATE_KEY = $PrivateKey
$BuildResult = npm run tauri build 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: La compilacion fallo." -ForegroundColor Red
    Write-Host $BuildResult -ForegroundColor Red
    exit 1
}

Write-Host "Compilacion exitosa!" -ForegroundColor Green
Write-Host ""

# 4. Firmar archivos
Write-Host "[3/5] Firmando archivos..." -ForegroundColor Yellow
Write-Host ""

# Buscar el ejecutable principal
$ExePath = "src-tauri\target\release\tools-33.exe"
if (-not (Test-Path $ExePath)) {
    Write-Host "ERROR: No se encontro el ejecutable." -ForegroundColor Red
    exit 1
}

# Firmar con Tauri
Write-Host "Firmando: $ExePath" -ForegroundColor White
$SignResult = npm run tauri signer sign -- "$ExePath" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ADVERTENCIA: Error al firmar ejecutable. Intentando con NSIS..." -ForegroundColor Yellow
} else {
    Write-Host "Firmado exitosamente!" -ForegroundColor Green
}

# Buscar archivos de instalacion
$BundlePath = "src-tauri\target\release\bundle"
$InstallerFiles = @()
$SignedFiles = @()

# Buscar NSIS installer
$NsisPath = Join-Path $BundlePath "nsis"
if (Test-Path $NsisPath) {
    $NsisExe = Get-ChildItem -Path $NsisPath -Filter "*.exe" | Where-Object { $_.Name -like "*setup*" } | Select-Object -First 1
    if ($NsisExe) {
        $InstallerFiles += $NsisExe
        Write-Host "Firmando: $($NsisExe.Name)" -ForegroundColor White
        $env:TAURI_SIGNING_PRIVATE_KEY = $PrivateKey
        npm run tauri signer sign -- "$($NsisExe.FullName)" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $SignedFiles += $NsisExe
            Write-Host "  -> Firmado!" -ForegroundColor Green
        }
    }
}

# Buscar MSI
$MsiPath = Join-Path $BundlePath "msi"
if (Test-Path $MsiPath) {
    $MsiFiles = Get-ChildItem -Path $MsiPath -Filter "*.msi"
    $InstallerFiles += $MsiFiles
    foreach ($Msi in $MsiFiles) {
        Write-Host "Firmando: $($Msi.Name)" -ForegroundColor White
        $env:TAURI_SIGNING_PRIVATE_KEY = $PrivateKey
        npm run tauri signer sign -- "$($Msi.FullName)" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $SignedFiles += $Msi
            Write-Host "  -> Firmado!" -ForegroundColor Green
        }
    }
}

Write-Host ""

# 5. Generar latest.json con firmas
Write-Host "[4/5] Generando latest.json..." -ForegroundColor Yellow
Write-Host ""

$platforms = @{}

# Windows x86_64
$WinFile = $SignedFiles | Where-Object { $_.Extension -eq ".exe" -or $_.Extension -eq ".msi" } | Select-Object -First 1
if ($WinFile) {
    $SigPath = "$($WinFile.FullName).sig"
    $Signature = ""
    if (Test-Path $SigPath) {
        $Signature = Get-Content $SigPath -Raw
    }
    
    $InstallerUrl = "https://github.com/JesherI/TOOLS-33/releases/download/v$Version/$($WinFile.Name)"
    
    $platforms["windows-x86_64"] = @{
        signature = $Signature.Trim()
        installer_url = $InstallerUrl
        bytes = $WinFile.Length
    }
    
    Write-Host "URL del instalador: $InstallerUrl" -ForegroundColor White
    if ($Signature) {
        Write-Host "Firma encontrada!" -ForegroundColor Green
    } else {
        Write-Host "ADVERTENCIA: No se encontro firma. El updater puede fallar." -ForegroundColor Yellow
    }
}

$LatestJson = @{
    version = $Version
    notes = $ReleaseNotes
    pub_date = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    platforms = $platforms
} | ConvertTo-Json -Depth 4

$LatestJson | Out-File -FilePath "latest.json" -Encoding UTF8

Write-Host "latest.json generado!" -ForegroundColor Green
Write-Host ""

# 6. Mostrar resumen
Write-Host "[5/5] Resumen" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ARCHIVOS PARA SUBIR A GITHUB" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Version: v$Version" -ForegroundColor White
Write-Host ""

Write-Host "Archivos encontrados:" -ForegroundColor Yellow
foreach ($File in $InstallerFiles) {
    $SigStatus = if ((Test-Path "$($File.FullName).sig") -or $SignedFiles -contains $File) { "[FIRMADO]" } else { "" }
    Write-Host "  - $($File.Name) $SigStatus" -ForegroundColor White
}

# Portable exe
$PortableExe = Get-ChildItem -Path "src-tauri\target\release" -Filter "*.exe" | Where-Object { $_.Name -eq "tools-33.exe" }
if ($PortableExe) {
    Write-Host "  - $($PortableExe.Name) (portable)" -ForegroundColor White
}

Write-Host ""
Write-Host "  - latest.json" -ForegroundColor White
Write-Host ""

# Generar comando para subir a GitHub
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  COMANDOS PARA SUBIR A GITHUB" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ve a: https://github.com/JesherI/TOOLS-33/releases/new" -ForegroundColor White
Write-Host ""
Write-Host "1. Tag: v$Version" -ForegroundColor White
Write-Host "2. Titulo: v$Version" -ForegroundColor White
Write-Host "3. Descripcion: $ReleaseNotes" -ForegroundColor White
Write-Host ""
Write-Host "4. Adjunta estos archivos:" -ForegroundColor Yellow
foreach ($File in $InstallerFiles) {
    Write-Host "   - $($File.FullName)" -ForegroundColor White
}
Write-Host "   - latest.json" -ForegroundColor White
Write-Host ""
Write-Host "O usa GitHub CLI:" -ForegroundColor Yellow
$FileArgs = ($InstallerFiles | ForEach-Object { """$($_.FullName)""" }) -join " "
Write-Host "   gh release create v$Version $FileArgs latest.json --title v$Version --notes `"$ReleaseNotes`"" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  LISTO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
