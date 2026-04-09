# Configuración de Actualizaciones Automáticas

Este documento explica cómo configurar las actualizaciones automáticas para TOOLS 33 usando GitHub Releases.

**Repositorio:** https://github.com/JesherI/TOOLS-33

## 🚀 Publicar Actualización (Rápido)

```powershell
# Todo en uno: compila, genera JSON y sube a GitHub
.\scripts\publish-release.ps1
```

## Resumen

- Las actualizaciones se descargan automáticamente desde GitHub Releases
- Se verifican al iniciar la aplicación (silenciosamente)
- El usuario puede verificar manualmente desde la UI
- Las actualizaciones están firmadas criptográficamente para seguridad

---

## Paso 1: Generar Claves de Firma (IMPORTANTE)

Las actualizaciones deben estar firmadas para que el updater las acepte. Necesitas generar un par de claves.

### Opción A: Script Automático (Recomendado)

Ejecuta este script en PowerShell:

```powershell
# Instalar minisign si no lo tienes
# scoop install minisign
# o descarga desde: https://github.com/jedisct1/minisign/releases

# Generar claves
minisign -G

# Esto creará:
# - minisign.pub (clave pública)
# - minisign.key (clave privada - GUÁRDALA BIEN)
```

### Opción B: Usar Tauri Sign

```bash
# En la carpeta del proyecto
pnpm tauri signer generate

# Esto generará:
# - src-tauri/secret.key (privada)
# - src-tauri/public.pub (pública)
```

---

## Paso 2: Configurar Claves en tauri.conf.json

### 2.1 Clave Pública

Copia el contenido de tu clave pública (archivo `.pub`) y pégalo en `tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "pubkey": "TU_CLAVE_PUBLICA_AQUI",
      "endpoints": [
        "https://github.com/JesherI/TOOLS-33/releases/latest/download/latest.json"
      ]
    }
  }
}
```

### 2.2 Clave Privada (para compilar)

**Opción 1 - Variable de entorno (Recomendada):**
```powershell
# Windows PowerShell
$env:TAURI_SIGNING_PRIVATE_KEY = "contenido-de-tu-clave-privada"

# O apuntar al archivo
$env:TAURI_SIGNING_PRIVATE_KEY_PATH = "C:\ruta\a\tu\secret.key"
```

**Opción 2 - Archivo .env:**
Crea un archivo `.env` en la raíz del proyecto:
```
TAURI_SIGNING_PRIVATE_KEY=contenido-de-tu-clave-privada
```

⚠️ **IMPORTANTE:** Nunca subas la clave privada a GitHub. Agrega `.env` y `*.key` a tu `.gitignore`.

---

## Paso 3: Crear un Release en GitHub

### 3.1 Compilar la aplicación

```bash
pnpm tauri build
```

Esto generará:
- `src-tauri/target/release/bundle/nsis/TOOLS-33_0.1.4_x64-setup.exe`
- Archivos `.sig` (firmas) junto a cada instalador

### 3.2 Generar latest.json

Ejecuta el script para generar el archivo de actualización:

```powershell
# Detecta versión automáticamente desde tauri.conf.json
.\scripts\generate-update-json.ps1

# O especifica la versión manualmente
.\scripts\generate-update-json.ps1 -Version "0.1.4" -ReleaseNotes "Nueva versión con mejoras"

# Subir automáticamente a GitHub (requiere gh CLI)
.\scripts\generate-update-json.ps1 -AutoUpload

# Crear release como borrador
.\scripts\generate-update-json.ps1 -AutoUpload -DraftRelease
```

El script automáticamente:
- ✅ Detecta la versión desde `tauri.conf.json`
- ✅ Busca los archivos de instalación en `src-tauri/target/release/bundle/`
- ✅ Extrae la firma del archivo `.sig`
- ✅ Genera `latest.json` con todas las URLs correctas

### 3.3 Subir a GitHub Releases

#### Opción Automática (Recomendada)

Si usaste `-AutoUpload` en el paso anterior, ¡los archivos ya están subidos! 

#### Opción Manual

1. Ve a tu repositorio en GitHub: https://github.com/JesherI/TOOLS-33/releases
2. Clic en "Releases" → "Draft a new release"
3. Crea un tag: `v0.1.4`
4. Título: `v0.1.4`
5. Descripción: Notas de la versión
6. **Adjunta los archivos:**
   - `TOOLS-33_0.1.4_x64-setup.exe`
   - `TOOLS-33_0.1.4_x64-setup.exe.sig` (firma del archivo)
   - `latest.json`
7. Publica el release

#### Opción GitHub CLI

```powershell
# El script te dará el comando exacto, o usa:
gh release create v0.1.4 `
  "src-tauri/target/release/bundle/nsis/TOOLS-33_0.1.4_x64-setup.exe" `
  "src-tauri/target/release/bundle/nsis/TOOLS-33_0.1.4_x64-setup.exe.sig" `
  "latest.json" `
  --title "v0.1.4" `
  --notes "Descripción de la versión"
```

---

## Paso 4: Actualizar URLs

Asegúrate de que `tauri.conf.json` tenga la URL correcta de tu repositorio:

```json
"endpoints": [
  "https://github.com/JesherI/TOOLS-33/releases/latest/download/latest.json"
]
```

---

## Cómo Funciona

### Verificación Automática
- Al iniciar la app (después de 5 segundos), se verifica silenciosamente
- Si hay actualización, se descarga e instala automáticamente
- La app se reinicia con la nueva versión

### Verificación Manual
- El usuario puede hacer clic en "Buscar actualizaciones" en la UI
- Se muestra un diálogo con la información de la nueva versión
- El usuario decide si instalar o no

---

## Flujo de Trabajo para Nuevas Versiones

Cada vez que quieras lanzar una actualización, tienes dos opciones:

### Opción A: Script Completo (Recomendado) 🚀

Un solo comando que hace todo: compila, genera el JSON y sube a GitHub:

```powershell
# Publicar automáticamente (detecta versión de tauri.conf.json)
.\scripts\publish-release.ps1

# Especificar versión manualmente
.\scripts\publish-release.ps1 -Version "0.1.6"

# Con notas de release
.\scripts\publish-release.ps1 -ReleaseNotes "Nuevas características y mejoras"

# Crear como borrador (para revisar antes de publicar)
.\scripts\publish-release.ps1 -Draft

# Omitir build (si ya compilaste)
.\scripts\publish-release.ps1 -SkipBuild
```

### Opción B: Pasos Manuales

1. **Actualiza la versión** en:
   - `src-tauri/tauri.conf.json`

2. **Compila:**
   ```bash
   pnpm tauri build
   ```

3. **Genera latest.json y sube automáticamente:**
   ```powershell
   # Detecta versión automáticamente y sube a GitHub
   .\scripts\generate-update-json.ps1 -AutoUpload
   
   # O con opciones específicas
   .\scripts\generate-update-json.ps1 -Version "0.1.6" -ReleaseNotes "Nuevas mejoras" -AutoUpload
   ```

4. **Listo** - Los usuarios recibirán la actualización automáticamente

---

## Solución de Problemas

### Error: "Update signature verification failed"
- La clave pública en `tauri.conf.json` no coincide con la privada usada para firmar
- Asegúrate de usar el mismo par de claves

### Error: "Failed to download update"
- Verifica que la URL en `tauri.conf.json` sea correcta
- Asegúrate de que `latest.json` esté en el release
- Verifica que los archivos sean públicos

### No se detectan actualizaciones
- Verifica que la versión en `latest.json` sea mayor que la instalada
- Comprueba la consola del navegador (F12) para errores
- Revisa que el endpoint URL sea accesible

---

## Seguridad

- **Nunca compartas tu clave privada**
- **No subas claves privadas a GitHub**
- Las actualizaciones solo funcionan si están firmadas correctamente
- Esto previene que usuarios instalen versiones maliciosas

---

## Notas Adicionales

- Las actualizaciones solo funcionan en builds de producción (no en desarrollo)
- Windows requiere que el instalador esté firmado (puedes usar un certificado gratuito de `https://www.certum.eu/en/cert_offer_code_signing/`)
- Para pruebas, puedes usar el modo dev descomentando las líneas en `lib.rs`
