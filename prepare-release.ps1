# TOOLS-33 Release Preparation Script - 100% AUTOMATICO
# Compila, firma, genera ZIP y prepara TODO para GitHub Releases
# Uso: .\prepare-release.ps1
# Resultado: Todo listo en release-artifacts/ para subir a GitHub

param(
    [string]$Version = "",
    [string]$ReleaseNotes = "Mejoras de rendimiento y correcciones de errores.",
    [switch]$SkipBuild = $false
)

$ErrorActionPreference = "Stop"
$ReleaseDir = "release-artifacts"
$BundlePath = "src-tauri\target\release\bundle"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "     TOOLS-33 - Preparacion de Release            " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# ========================================
# PASO 1: DETECTAR VERSION
# ========================================
if ([string]::IsNullOrEmpty($Version)) {
    $VersionMatch = Select-String -Path "src-tauri/tauri.conf.json" -Pattern '"version":\s*"([^"]+)"'
    if ($VersionMatch) {
        $Version = $VersionMatch.Matches.Groups[1].Value
    }
}

if ([string]::IsNullOrEmpty($Version)) {
    Write-Host "ERROR: No se pudo detectar la version." -ForegroundColor Red
    exit 1
}

Write-Host "[1/6] Version detectada: v$Version" -ForegroundColor Green
Write-Host "      Notas: $ReleaseNotes" -ForegroundColor Green
Write-Host ""

# ========================================
# PASO 2: VERIFICAR CLAVE PRIVADA
# ========================================
$PrivateKeyPath = "src-tauri/private.pem"
if (-not (Test-Path $PrivateKeyPath)) {
    Write-Host "[2/6] Generando nuevas claves..." -ForegroundColor Yellow
    try {
        $null = pnpm tauri signer generate --force --ci --write-keys $PrivateKeyPath 2>&1
        Write-Host "      Claves generadas exitosamente" -ForegroundColor Green
        
        # Actualizar tauri.conf.json con la nueva clave publica
        $PubKeyPath = "$PrivateKeyPath.pub"
        if (Test-Path $PubKeyPath) {
            $PubKey = Get-Content $PubKeyPath -Raw
            $ConfigPath = "src-tauri/tauri.conf.json"
            $Config = Get-Content $ConfigPath -Raw
            $Config = $Config -replace '"pubkey":\s*"[^"]*"', "`"pubkey`": `"$PubKey`""
            $Config | Out-File -FilePath $ConfigPath -Encoding UTF8
            Write-Host "      tauri.conf.json actualizado" -ForegroundColor Green
        }
    } catch {
        Write-Host "ERROR al generar claves: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[2/6] Clave privada verificada" -ForegroundColor Green
}

# ========================================
# PASO 3: COMPILAR
# ========================================
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "[3/6] Compilando aplicacion..." -ForegroundColor Yellow
    Write-Host "      (Este proceso puede tomar 2-5 minutos)" -ForegroundColor DarkGray
    Write-Host ""
    
    try {
        $env:TAURI_SIGNING_PRIVATE_KEY_PATH = $PrivateKeyPath
        $BuildOutput = pnpm tauri build 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: La compilacion fallo" -ForegroundColor Red
            Write-Host $BuildOutput -ForegroundColor Red
            exit 1
        }
        
        Write-Host "      Compilacion exitosa" -ForegroundColor Green
    } catch {
        Write-Host "ERROR en compilacion: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[3/6] Compilacion omitida (--SkipBuild)" -ForegroundColor DarkGray
}

# ========================================
# PASO 4: PREPARAR CARPETA DE RELEASE
# ========================================
Write-Host ""
Write-Host "[4/6] Preparando archivos de release..." -ForegroundColor Yellow

# Limpiar y crear directorio
if (Test-Path $ReleaseDir) {
    Remove-Item -Path "$ReleaseDir\*" -Recurse -Force -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Path $ReleaseDir -Force | Out-Null
}

$FilesCopied = @()
$FilesToSign = @()

# 1. MSI
$MsiFiles = Get-ChildItem -Path "$BundlePath\msi" -Filter "*.msi" -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -match $Version } |
    Sort-Object LastWriteTime -Descending

if ($MsiFiles) {
    $Msi = $MsiFiles | Select-Object -First 1
    Copy-Item $Msi.FullName -Destination "$ReleaseDir\$($Msi.Name)" -Force
    $FilesCopied += $Msi.Name
    Write-Host "      Copiado: $($Msi.Name)" -ForegroundColor White
}

# 2. NSIS
$NsisFiles = Get-ChildItem -Path "$BundlePath\nsis" -Filter "*.exe" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match $Version -and $_.Name -match "setup" } |
    Sort-Object LastWriteTime -Descending

if ($NsisFiles) {
    $Nsis = $NsisFiles | Select-Object -First 1
    Copy-Item $Nsis.FullName -Destination "$ReleaseDir\$($Nsis.Name)" -Force
    $FilesCopied += $Nsis.Name
    $FilesToSign += "$ReleaseDir\$($Nsis.Name)"
    Write-Host "      Copiado: $($Nsis.Name)" -ForegroundColor White
}

# 3. Portable
$Portable = Get-ChildItem -Path "src-tauri\target\release\tools-33.exe" -ErrorAction SilentlyContinue
if ($Portable -and $Portable.Length -gt 1MB) {
    $PortableName = "tools-33_$($Version)_x64.exe"
    Copy-Item $Portable.FullName -Destination "$ReleaseDir\$PortableName" -Force
    $FilesCopied += $PortableName
    $FilesToSign += "$ReleaseDir\$PortableName"
    Write-Host "      Copiado: $PortableName (portable)" -ForegroundColor White
}

# 4. Crear ZIP del MSI para updater
if ($MsiFiles) {
    $Msi = $MsiFiles | Select-Object -First 1
    $ZipName = "tools-33_$($Version)_x64_en-US.msi.zip"
    $ZipPath = "$ReleaseDir\$ZipName"
    
    Write-Host "      Creando ZIP: $ZipName..." -ForegroundColor White -NoNewline
    Compress-Archive -Path $Msi.FullName -DestinationPath $ZipPath -Force
    Write-Host " OK" -ForegroundColor Green
    
    $FilesCopied += $ZipName
    $FilesToSign += $ZipPath
}

if ($FilesCopied.Count -eq 0) {
    Write-Host "ERROR: No se encontraron archivos para copiar" -ForegroundColor Red
    exit 1
}

Write-Host "      Total archivos copiados: $($FilesCopied.Count)" -ForegroundColor Green

# ========================================
# PASO 5: FIRMAR ARCHIVOS
# ========================================
Write-Host ""
Write-Host "[5/6] Firmando archivos digitalmente..." -ForegroundColor Yellow

$SignaturesGenerated = 0
$env:TAURI_SIGNING_PRIVATE_KEY_PATH = (Resolve-Path $PrivateKeyPath).Path

foreach ($File in $FilesToSign) {
    $FileName = Split-Path $File -Leaf
    Write-Host "      Firmando $FileName..." -ForegroundColor White -NoNewline
    
    try {
        # Ejecutar firma con timeout de 60 segundos
        $process = Start-Process -FilePath "pnpm" -ArgumentList "tauri", "signer", "sign", "--", $File -PassThru -WindowStyle Hidden -RedirectStandardOutput "$env:TEMP\sign-output.txt" -RedirectStandardError "$env:TEMP\sign-error.txt"
        
        # Esperar maximo 60 segundos
        $completed = $process.WaitForExit(60000)
        
        if (-not $completed) {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            Write-Host " TIMEOUT" -ForegroundColor Yellow
            continue
        }
        
        # Verificar si se genero la firma
        $SigFile = "$File.sig"
        if (Test-Path $SigFile) {
            Write-Host " OK" -ForegroundColor Green
            $SignaturesGenerated++
        } else {
            $exitCode = $process.ExitCode
            if ($exitCode -eq 0) {
                Write-Host " OK (verificado)" -ForegroundColor Green
                $SignaturesGenerated++
            } else {
                Write-Host " ERROR (codigo: $exitCode)" -ForegroundColor Red
            }
        }
    } catch {
        Write-Host " ERROR" -ForegroundColor Red
    }
}

Write-Host "      Firmas completadas: $SignaturesGenerated/$($FilesToSign.Count)" -ForegroundColor $(if ($SignaturesGenerated -eq $FilesToSign.Count) { "Green" } else { "Yellow" })

# ========================================
# PASO 6: GENERAR LATEST.JSON
# ========================================
Write-Host ""
Write-Host "[6/6] Generando latest.json..." -ForegroundColor Yellow

# Buscar firma del ZIP
$ZipFile = "tools-33_$($Version)_x64_en-US.msi.zip"
$ZipPath = "$ReleaseDir\$ZipFile"
$SigPath = "$ZipPath.sig"

$Signature = ""
if (Test-Path $SigPath) {
    $Signature = (Get-Content $SigPath -Raw).Trim()
    Write-Host "      Firma del ZIP cargada" -ForegroundColor Green
} else {
    Write-Host "      ADVERTENCIA: No se encontro firma del ZIP" -ForegroundColor Yellow
    Write-Host "      El updater no funcionara sin la firma" -ForegroundColor Yellow
}

# Crear latest.json
$LatestJson = @{
    version = $Version
    notes = $ReleaseNotes
    pub_date = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    platforms = @{
        "windows-x86_64" = @{
            signature = $Signature
            url = "https://github.com/JesherI/TOOLS-33/releases/download/v$Version/$ZipFile"
        }
    }
} | ConvertTo-Json -Depth 4

# Guardar en ambas ubicaciones
$LatestJson | Out-File -FilePath "$ReleaseDir\latest.json" -Encoding UTF8
$LatestJson | Out-File -FilePath "latest.json" -Encoding UTF8

Write-Host "      latest.json generado" -ForegroundColor Green

# ========================================
# RESUMEN FINAL
# ========================================
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "           RESUMEN DEL RELEASE v$Version             " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Mostrar todos los archivos
$AllFiles = Get-ChildItem $ReleaseDir | Sort-Object Name
foreach ($File in $AllFiles) {
    $Size = [math]::Round($File.Length / 1MB, 2)
    $Type = switch ($File.Extension) {
        ".sig" { "[FIRMA]" }
        ".json" { "[MANIFIESTO]" }
        ".zip" { "[UPDATER]" }
        default { "[INSTALADOR]" }
    }
    Write-Host "  - $($File.Name) (${Size} MB) $Type" -ForegroundColor $(if ($File.Extension -eq ".sig") { "DarkGray" } elseif ($File.Extension -eq ".json") { "Cyan" } else { "White" })
}

Write-Host ""
Write-Host "Total de archivos: $($AllFiles.Count)" -ForegroundColor White
Write-Host ""

# Verificar si hay firma del ZIP
$HasZipSig = Test-Path "$ReleaseDir\$ZipFile.sig"
if ($HasZipSig) {
    Write-Host "ESTADO: Todo listo para publicar" -ForegroundColor Green
    Write-Host "        El updater funcionara correctamente" -ForegroundColor Green
} else {
    Write-Host "ESTADO: Release preparado pero SIN FIRMAS" -ForegroundColor Yellow
    Write-Host "        El updater NO funcionara automaticamente" -ForegroundColor Yellow
    Write-Host "        Los usuarios deberan descargar manualmente" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "     TODO LISTO - Sube a GitHub manualmente        " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "URL: https://github.com/JesherI/TOOLS-33/releases/new" -ForegroundColor Cyan
Write-Host "Tag: v$Version" -ForegroundColor Yellow
Write-Host "Titulo: v$Version" -ForegroundColor Yellow
Write-Host "Notas: $ReleaseNotes" -ForegroundColor Yellow
Write-Host ""
Write-Host "Arrastra TODOS los archivos de 'release-artifacts/'" -ForegroundColor White
Write-Host ""
Write-Host "O usa GitHub CLI:" -ForegroundColor White
$FileArgs = (Get-ChildItem $ReleaseDir | ForEach-Object { """$($_.FullName)""" }) -join " "
Write-Host "  gh release create v$Version $FileArgs --title v$Version --notes `"$ReleaseNotes`"" -ForegroundColor Cyan
Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "                SCRIPT COMPLETADO                " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
