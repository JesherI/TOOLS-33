# TOOLS-33 Release Preparation Script - OPTIMIZADO
# Compila, firma, genera ZIP y prepara todo para GitHub Releases
# Uso: .\prepare-release.ps1 -Version "0.1.8" -ReleaseNotes "Mis mejoras"

param(
    [string]$Version = "",
    [string]$ReleaseNotes = "Mejoras de rendimiento y correcciones de errores.",
    [switch]$SkipBuild = $false,
    [switch]$AutoUpload = $false
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TOOLS-33 Release Preparation" -ForegroundColor Cyan
Write-Host "  (Script Optimizado)" -ForegroundColor DarkCyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ========================================
# PASO 1: DETECTAR VERSIÓN
# ========================================
if ([string]::IsNullOrEmpty($Version)) {
    $VersionMatch = Select-String -Path "src-tauri/tauri.conf.json" -Pattern '"version":\s*"([^"]+)"'
    if ($VersionMatch) {
        $Version = $VersionMatch.Matches.Groups[1].Value
    }
}

if ([string]::IsNullOrEmpty($Version)) {
    Write-Host "❌ ERROR: No se pudo detectar la versión." -ForegroundColor Red
    Write-Host "   Usa: .\prepare-release.ps1 -Version '0.1.8'" -ForegroundColor Yellow
    exit 1
}

Write-Host "📦 Versión: v$Version" -ForegroundColor Green
Write-Host "📝 Notas: $ReleaseNotes" -ForegroundColor Green
Write-Host ""

# ========================================
# PASO 2: VERIFICAR CLAVE PRIVADA
# ========================================
$PrivateKeyPath = "src-tauri/private.pem"
if (-not (Test-Path $PrivateKeyPath)) {
    Write-Host "❌ ERROR: No se encontró la clave privada." -ForegroundColor Red
    Write-Host "   Ejecuta primero: .\generate-keys.ps1" -ForegroundColor Yellow
    exit 1
}

$PrivateKey = Get-Content $PrivateKeyPath -Raw
if ([string]::IsNullOrWhiteSpace($PrivateKey)) {
    Write-Host "❌ ERROR: La clave privada está vacía." -ForegroundColor Red
    exit 1
}

# Establecer variable de entorno para toda la sesión
$env:TAURI_SIGNING_PRIVATE_KEY = $PrivateKey
Write-Host "✅ [1/6] Clave privada cargada" -ForegroundColor Green

# ========================================
# PASO 3: COMPILAR (si no se omite)
# ========================================
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "🔨 [2/6] Compilando aplicación..." -ForegroundColor Yellow
    Write-Host "    (Esto puede tomar varios minutos)" -ForegroundColor DarkGray
    Write-Host ""
    
    $BuildResult = pnpm tauri build 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ ERROR: La compilación falló." -ForegroundColor Red
        Write-Host $BuildResult -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Compilación exitosa!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⏭️  [2/6] Compilación omitida (--SkipBuild)" -ForegroundColor DarkGray
}

# ========================================
# PASO 4: BUSCAR Y PREPARAR ARCHIVOS
# ========================================
Write-Host ""
Write-Host "🔍 [3/6] Buscando archivos de instalación..." -ForegroundColor Yellow

$BundlePath = "src-tauri\target\release\bundle"
$ReleaseDir = "release-artifacts"

# Crear directorio de release
if (-not (Test-Path $ReleaseDir)) {
    New-Item -ItemType Directory -Path $ReleaseDir -Force | Out-Null
}

# Buscar archivos MSI
$MsiPath = Join-Path $BundlePath "msi"
$SourceMsi = $null
$ZipFiles = @()

if (Test-Path $MsiPath) {
    $MsiFiles = Get-ChildItem -Path $MsiPath -Filter "*.msi" | Sort-Object Length -Descending
    if ($MsiFiles.Count -gt 0) {
        $SourceMsi = $MsiFiles | Select-Object -First 1
        Write-Host "   📄 Encontrado: $($SourceMsi.Name)" -ForegroundColor White
    }
}

if (-not $SourceMsi) {
    Write-Host "❌ ERROR: No se encontró archivo MSI." -ForegroundColor Red
    Write-Host "   Asegúrate de que el build se completó correctamente." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# ========================================
# PASO 5: GENERAR ZIP Y FIRMAR
# ========================================
Write-Host "📦 [4/6] Generando ZIP y firmando..." -ForegroundColor Yellow

# Nombre del archivo ZIP (formato que espera Tauri updater)
$ZipFileName = "tools-33_$($Version)_x64_en-US.msi.zip"
$ZipPath = Join-Path $ReleaseDir $ZipFileName

# Crear ZIP del MSI
Write-Host "   🗜️  Creando ZIP: $ZipFileName" -ForegroundColor White

try {
    Compress-Archive -Path $SourceMsi.FullName -DestinationPath $ZipPath -Force
    Write-Host "   ✅ ZIP creado exitosamente" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR al crear ZIP: $_" -ForegroundColor Red
    exit 1
}

# Firmar el archivo ZIP (necesario para el updater)
Write-Host "   ✍️  Firmando ZIP..." -ForegroundColor White
$SigOutput = pnpm tauri signer sign -- "$ZipPath" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ ZIP firmado exitosamente" -ForegroundColor Green
    $ZipFiles += (Get-Item $ZipPath)
} else {
    Write-Host "⚠️  ADVERTENCIA: Error al firmar ZIP. Intentando con método alternativo..." -ForegroundColor Yellow
    # Intentar firmar con la clave directamente
    $env:TAURI_SIGNING_PRIVATE_KEY = $PrivateKey
    $SigOutput = pnpm tauri signer sign -- "$ZipPath" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ ZIP firmado (segundo intento)" -ForegroundColor Green
        $ZipFiles += (Get-Item $ZipPath)
    } else {
        Write-Host "❌ ERROR: No se pudo firmar el archivo. Firma manual requerida." -ForegroundColor Red
        Write-Host $SigOutput -ForegroundColor DarkGray
    }
}

# Verificar que existe el archivo .sig
$SigPath = "$ZipPath.sig"
if (-not (Test-Path $SigPath)) {
    Write-Host "⚠️  ADVERTENCIA: No se generó archivo .sig" -ForegroundColor Yellow
    Write-Host "    El updater no funcionará sin la firma." -ForegroundColor Yellow
}

# También copiar el MSI original
$DestMsi = Join-Path $ReleaseDir $SourceMsi.Name
Copy-Item -Path $SourceMsi.FullName -Destination $DestMsi -Force
Write-Host "   📋 MSI copiado: $($SourceMsi.Name)" -ForegroundColor White

Write-Host ""

# ========================================
# PASO 6: GENERAR LATEST.JSON
# ========================================
Write-Host "📄 [5/6] Generando latest.json..." -ForegroundColor Yellow

$Signature = ""
if (Test-Path $SigPath) {
    $Signature = (Get-Content $SigPath -Raw).Trim()
}

# Calcular el hash SHA256 del ZIP (opcional pero útil)
$ZipHash = (Get-FileHash -Path $ZipPath -Algorithm SHA256).Hash

# URL para el updater (usa el formato correcto)
$DownloadUrl = "https://github.com/JesherI/TOOLS-33/releases/download/v$Version/$ZipFileName"

$LatestJsonContent = @{
    version = $Version
    notes = $ReleaseNotes
    pub_date = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    platforms = @{
        "windows-x86_64" = @{
            signature = $Signature
            url = $DownloadUrl
        }
    }
} | ConvertTo-Json -Depth 4

# Guardar en la raíz del proyecto (para GitHub)
$LatestJsonPath = Join-Path (Get-Location) "latest.json"
$LatestJsonContent | Out-File -FilePath $LatestJsonPath -Encoding UTF8

# También copiar a release-artifacts
$LatestJsonContent | Out-File -FilePath (Join-Path $ReleaseDir "latest.json") -Encoding UTF8

Write-Host "   ✅ latest.json generado" -ForegroundColor Green
Write-Host "   📎 URL del instalador: $DownloadUrl" -ForegroundColor White
if ($Signature) {
    Write-Host "   🔐 Firma incluida" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Sin firma - updater no funcionará" -ForegroundColor Yellow
}

Write-Host ""

# ========================================
# PASO 7: RESUMEN Y SUBIDA
# ========================================
Write-Host "📊 [6/6] Resumen de archivos" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ARCHIVOS LISTOS PARA GITHUB" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Versión: v$Version" -ForegroundColor White
Write-Host ""

$FilesToUpload = @()

# Listar archivos
foreach ($File in (Get-ChildItem $ReleaseDir)) {
    $Size = [math]::Round($File.Length / 1MB, 2)
    $Status = if ($File.Extension -eq ".sig") { " [FIRMA]" } elseif ($File.Name -eq "latest.json") { " [MANIFIESTO]" } else { "" }
    Write-Host "  ✓ $($File.Name) (${Size} MB)$Status" -ForegroundColor Green
    $FilesToUpload += $File.FullName
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PRÓXIMOS PASOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($AutoUpload -and (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "🚀 Subiendo automáticamente con GitHub CLI..." -ForegroundColor Yellow
    
    # Verificar si el release ya existe
    $ReleaseCheck = gh release view "v$Version" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Release v$Version ya existe. Subiendo archivos..." -ForegroundColor Yellow
        foreach ($File in $FilesToUpload) {
            gh release upload "v$Version" "$File" --clobber
        }
    } else {
        Write-Host "   Creando nuevo release v$Version..." -ForegroundColor Yellow
        gh release create "v$Version" $FilesToUpload --title "v$Version" --notes "$ReleaseNotes"
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Release publicado exitosamente!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔗 URL: https://github.com/JesherI/TOOLS-33/releases/tag/v$Version" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Error al subir. Intenta manualmente:" -ForegroundColor Red
        ShowManualInstructions
    }
} else {
    ShowManualInstructions
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ¡LISTO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Función auxiliar
function ShowManualInstructions {
    Write-Host "1. Ve a: https://github.com/JesherI/TOOLS-33/releases/new" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Configura el release:" -ForegroundColor White
    Write-Host "   Tag: v$Version" -ForegroundColor Yellow
    Write-Host "   Título: v$Version" -ForegroundColor Yellow
    Write-Host "   Descripción: $ReleaseNotes" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "3. Arrastra estos archivos desde 'release-artifacts/':" -ForegroundColor White
    foreach ($File in (Get-ChildItem $ReleaseDir)) {
        Write-Host "   - $($File.Name)" -ForegroundColor Cyan
    }
    Write-Host ""
    Write-Host "   O usa GitHub CLI:" -ForegroundColor White
    $FileArgs = (Get-ChildItem $ReleaseDir | ForEach-Object { """$($_.FullName)""" }) -join " "
    Write-Host "   gh release create v$Version $FileArgs --title v$Version --notes `"$ReleaseNotes`"" -ForegroundColor Cyan
    Write-Host ""
}
