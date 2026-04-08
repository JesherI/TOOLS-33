# Configuración de Actualizaciones Automáticas

Este documento explica cómo configurar las actualizaciones automáticas para TOOLS 33 usando GitHub Releases.

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
        "https://github.com/jeshe114/tools-33/releases/latest/download/latest.json"
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
- `src-tauri/target/release/bundle/nsis/tools-33_0.1.4_x64-setup.exe`
- Archivos `.sig` (firmas) junto a cada instalador

### 3.2 Generar latest.json

Ejecuta el script para generar el archivo de actualización:

```powershell
.\scripts\generate-update-json.ps1 `
  -Version "0.1.4" `
  -RepoOwner "jeshe114" `
  -RepoName "tools-33" `
  -ReleaseNotes "Nueva versión con mejoras"
```

Esto creará `latest.json` en la carpeta actual.

### 3.3 Subir a GitHub Releases

1. Ve a tu repositorio en GitHub
2. Clic en "Releases" → "Draft a new release"
3. Crea un tag: `v0.1.4`
4. Título: `v0.1.4`
5. Descripción: Notas de la versión
6. **Adjunta los archivos:**
   - `tools-33_0.1.4_x64-setup.exe`
   - `tools-33_0.1.4_x64-setup.exe.sig` (firma del archivo)
   - `latest.json`
7. Publica el release

---

## Paso 4: Actualizar URLs

Asegúrate de que `tauri.conf.json` tenga la URL correcta de tu repositorio:

```json
"endpoints": [
  "https://github.com/jeshe114/tools-33/releases/latest/download/latest.json"
]
```

Cambia `jeshe114` y `tools-33` por tu usuario y nombre de repositorio.

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

Cada vez que quieras lanzar una actualización:

1. **Actualiza la versión** en:
   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`

2. **Compila:**
   ```bash
   pnpm tauri build
   ```

3. **Genera latest.json:**
   ```powershell
   .\scripts\generate-update-json.ps1 -Version "0.1.5" -RepoOwner "jeshe114" -RepoName "tools-33"
   ```

4. **Crea Release en GitHub** con:
   - Instalador `.exe`
   - Archivo `.sig`
   - `latest.json`

5. **Listo** - Los usuarios recibirán la actualización automáticamente

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
