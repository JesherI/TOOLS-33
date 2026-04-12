# TOOLS 33

Monitor del sistema y herramientas de productividad para Windows.

## Características

- Monitor de sistema en tiempo real (CPU, RAM, GPU, Disco)
- Compresión de archivos PDF
- Interfaz moderna con partículas animadas
- Actualizaciones automáticas

## Requisitos

- Node.js 18+
- Rust 1.70+
- Windows 10/11

## Desarrollo

```bash
# Instalar dependencias
pnpm install

# Ejecutar en modo desarrollo
pnpm tauri dev

# Compilar para producción
pnpm tauri build
```

## Publicar Release

### Primera vez: Generar claves

```powershell
.\generate-keys.ps1
```

Esto creará `src-tauri/private.pem` con tu clave privada.

**IMPORTANTE: Guarda `private.pem` en un lugar seguro. NUNCA lo subas a GitHub.**

### Publicar nueva versión

```powershell
# Compila, firma y genera latest.json
.\prepare-release.ps1 -ReleaseNotes "Nuevas caracteristicas"

# O especifica version manualmente
.\prepare-release.ps1 -Version "0.1.7" -ReleaseNotes "Bug fixes"
```

El script automáticamente:
1. Compila la aplicación
2. Firma los archivos de instalación
3. Genera `latest.json` con las URLs y firmas
4. Muestra los pasos para subir a GitHub

### Subir a GitHub

1. Ve a https://github.com/JesherI/TOOLS-33/releases/new
2. Crea un tag: `v0.1.7`
3. Adjunta los archivos generados
4. Publica el release

## Actualizaciones Automáticas

Los usuarios recibirán notificaciones de actualización cuando abras un nuevo release.

## Licencia

MIT
