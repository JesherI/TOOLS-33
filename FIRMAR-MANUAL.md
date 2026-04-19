# INSTRUCCIONES MANUALES PARA FIRMAR
# ==================================

## Problema detectado:
El comando `pnpm tauri signer` no funciona correctamente en el entorno actual.

## Solución - Ejecutar en tu máquina local:

### Paso 1: Abre PowerShell en el directorio del proyecto
```powershell
cd "C:\Users\jeshe\OneDrive\Documentos\Proyecto 33\TOOLS-33"
```

### Paso 2: Configura la clave privada
```powershell
$env:TAURI_SIGNING_PRIVATE_KEY_PATH = (Resolve-Path "src-tauri/private.pem").Path
Write-Host "Clave configurada: $env:TAURI_SIGNING_PRIVATE_KEY_PATH"
```

### Paso 3: Crea el ZIP (si no existe)
```powershell
Compress-Archive -Path "release-artifacts/tools-33_0.1.8_x64_en-US.msi" -DestinationPath "release-artifacts/tools-33_0.1.8_x64_en-US.msi.zip" -Force
```

### Paso 4: Firma los archivos uno por uno
```powershell
# Firmar ZIP (IMPORTANTE - necesario para el updater)
pnpm tauri signer sign -- "release-artifacts/tools-33_0.1.8_x64_en-US.msi.zip"

# Firmar NSIS
pnpm tauri signer sign -- "release-artifacts/tools-33_0.1.8_x64-setup.exe"

# Firmar portable
pnpm tauri signer sign -- "release-artifacts/tools-33_0.1.8_x64.exe"
```

### Paso 5: Verifica las firmas
```powershell
Get-ChildItem "release-artifacts/*.sig"
```

Deberías ver 3 archivos .sig si todo salió bien.

### Paso 6: Actualiza latest.json con la firma del ZIP
Si la firma se generó correctamente, lee el contenido:
```powershell
$Signature = Get-Content "release-artifacts/tools-33_0.1.8_x64_en-US.msi.zip.sig" -Raw
Write-Host "Firma: $Signature"
```

Y actualiza el latest.json manualmente o ejecuta:
```powershell
# El prepare-release.ps1 debería hacer esto automáticamente si las firmas existen
.\prepare-release.ps1 -SkipBuild
```

## Alternativa: Script automático simplificado

Si los comandos anteriores funcionan, puedes usar este script:

```powershell
# firmar-release.ps1
$env:TAURI_SIGNING_PRIVATE_KEY_PATH = "src-tauri/private.pem"

# Firmar ZIP (esperar que termine)
Start-Process -FilePath "pnpm" -ArgumentList "tauri", "signer", "sign", "--", "release-artifacts/tools-33_0.1.8_x64_en-US.msi.zip" -Wait

# Firmar NSIS
Start-Process -FilePath "pnpm" -ArgumentList "tauri", "signer", "sign", "--", "release-artifacts/tools-33_0.1.8_x64-setup.exe" -Wait

# Firmar portable  
Start-Process -FilePath "pnpm" -ArgumentList "tauri", "signer", "sign", "--", "release-artifacts/tools-33_0.1.8_x64.exe" -Wait

Write-Host "Firmas generadas (espero):"
Get-ChildItem "release-artifacts/*.sig"
```

## IMPORTANTE:

1. **La firma del ZIP es obligatoria** para que el updater funcione
2. Sin la firma, los usuarios no podrán actualizar automáticamente
3. Puedes subir el release sin firmas, pero el updater no funcionará

## Si nada funciona:

Puedes subir el release a GitHub sin firmas y los usuarios tendrán que:
1. Descargar manualmente la nueva versión
2. Desinstalar la versión anterior
3. Instalar la nueva versión

El updater automático simplemente no funcionará sin la firma del ZIP.
