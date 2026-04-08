# Script para generar latest.json para actualizaciones automáticas
# Ejecutar después de crear el release en GitHub

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [Parameter(Mandatory=$true)]
    [string]$RepoOwner,
    
    [Parameter(Mandatory=$true)]
    [string]$RepoName,
    
    [string]$ReleaseNotes = "",
    
    [string]$OutputPath = "latest.json"
)

$ErrorActionPreference = "Stop"

# URL base del release
$baseUrl = "https://github.com/$RepoOwner/$RepoName/releases/download/v$Version"

# Generar JSON para Windows (NSIS - .exe)
$latestJson = @{
    version = $Version
    notes = $ReleaseNotes
    pub_date = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    platforms = @{
        "windows-x86_64" = @{
            signature = ""  # Se genera automáticamente con la clave privada
            url = "$baseUrl/tools-33_${Version}_x64-setup.exe"
        }
        "windows-i686" = @{
            signature = ""
            url = "$baseUrl/tools-33_${Version}_x86-setup.exe"
        }
    }
} | ConvertTo-Json -Depth 10

# Guardar archivo
$latestJson | Out-File -FilePath $OutputPath -Encoding UTF8

Write-Host "✓ Archivo latest.json generado: $OutputPath" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANTE: Para que las actualizaciones funcionen:" -ForegroundColor Yellow
Write-Host "1. Sube el archivo latest.json al release de GitHub" -ForegroundColor Yellow
Write-Host "2. Asegúrate de que la URL en tauri.conf.json apunte correctamente" -ForegroundColor Yellow
Write-Host "3. Las firmas se generan automáticamente al compilar con 'pnpm tauri build'" -ForegroundColor Yellow
Write-Host ""
Write-Host "Contenido generado:" -ForegroundColor Cyan
Write-Host $latestJson
