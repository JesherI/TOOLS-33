# TOOLS 33

**Multi-herramienta de productividad para Windows** — construida con Tauri v2, React y Rust.

Compresión de PDFs, unión de PDFs, generación de cuadernillos, escalado de imágenes, generación de texturas y monitor de sistema en tiempo real, todo en una interfaz moderna con partículas animadas.

## Características

- **Monitor de Sistema** — CPU, RAM, GPU y Disco en tiempo real con información detallada del sistema operativo.
- **PDF Compress** — Compresión de PDFs con Ghostscript en múltiples niveles (ligera, media, alta) y modo flatten para CAD.
- **PDF Merge** — Unión rápida de múltiples PDFs con procesamiento en Rust (no bloquea la UI).
- **Magazine** — Generador de cuadernillos/revistas a partir de imágenes numeradas con distribución automática de páginas.
- **Image Scaler** — Escalado de imágenes con algoritmos avanzados (Lanczos, Lanczos+Sharp, Bicúbica, Bilineal, Vecino) y slider de comparación.
- **Texture Generator** — Generación de texturas repetidas para papel tapiz/fondos con exportación a PDF y PowerPoint.

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS 4, Framer Motion |
| Backend | Rust, Tauri v2 |
| Plugins Tauri | dialog, fs, updater, process, opener |
| Build | Vite 7 |

## Requisitos

- Windows 10/11
- [Ghostscript](https://ghostscript.com/) (para compresión de PDFs)

## Instalación

Descarga el instalador desde la [página de releases](https://github.com/JesherI/TOOLS-33/releases) e instálalo como cualquier aplicación de Windows.

Las actualizaciones automáticas se instalarán cuando estén disponibles.

## Desarrollo

```bash
pnpm install
pnpm tauri dev     # Desarrollo
pnpm tauri build   # Producción
```

## Licencia

MIT
