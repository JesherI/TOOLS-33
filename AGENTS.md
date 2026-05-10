# AGENTS.md - TOOLS 33

## Descripción del Proyecto

**TOOLS 33** es una aplicación de escritorio multi-herramienta construida con **Tauri v2** (Rust backend + React frontend). Proporciona herramientas de productividad con una interfaz moderna y partículas animadas.

### Tecnologías Principales
- **Frontend**: React 19 + TypeScript + Tailwind CSS 4 + Framer Motion
- **Backend**: Rust + Tauri v2
- **Plugins Tauri**: dialog, fs, updater, process, opener
- **Build Tool**: Vite 7

---

## Estructura del Proyecto

```
TOOLS-33/
├── src/                          # Frontend React
│   ├── components/               # Componentes reutilizables
│   │   ├── pdf/                  # Componentes para PDF Compress
│   │   │   ├── AddFilesButton.tsx
│   │   │   ├── CompressionLevelSelector.tsx
│   │   │   ├── CompressButton.tsx
│   │   │   ├── FileDropZone.tsx
│   │   │   ├── FileItem.tsx
│   │   │   ├── FileList.tsx
│   │   │   ├── FileListHeader.tsx
│   │   │   ├── FlattenModeSelector.tsx
│   │   │   └── SuccessMessage.tsx
│   │   ├── texture/              # Componentes para Texture Generator
│   │   │   ├── Ruler.tsx
│   │   │   ├── TextureCanvas.tsx
│   │   │   ├── ImageList.tsx
│   │   │   ├── EditableValue.tsx
│   │   │   ├── BottomControls.tsx
│   │   │   ├── PaperSizeSelector.tsx
│   │   │   ├── ExportFormatSelector.tsx
│   │   │   └── types.ts
│   │   ├── magazine/             # Componentes para Magazine
│   │   │   ├── AlertModal.tsx
│   │   │   ├── BackCoverToggle.tsx
│   │   │   ├── DistributionInfo.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── GeneratingState.tsx
│   │   │   ├── GeneratePdfButton.tsx
│   │   │   ├── LoadingState.tsx
│   │   │   ├── PagesGrid.tsx
│   │   │   ├── PreviewHeader.tsx
│   │   │   └── SpreadsGrid.tsx
│   │   ├── particles/            # Sistema de partículas
│   │   │   ├── ParticleCanvas.tsx
│   │   │   └── index.ts
│   │   ├── window/               # Controles de ventana
│   │   │   └── WindowControls.tsx
│   │   ├── sidebar/              # Sidebar de navegación
│   │   │   └── Sidebar.tsx
│   │   ├── toast/                # Notificaciones toast
│   │   │   └── Toast.tsx
│   │   └── system/               # Componentes de sistema
│   ├── screens/                  # Pantallas principales
│   │   ├── HomeScreen.tsx        # Pantalla principal (info básica)
│   │   ├── ParticlesScreen.tsx   # Home con info de sistema detallada
│   │   ├── LoadingScreen.tsx     # Pantalla de carga inicial
│   │   ├── PdfCompressScreen.tsx # Compresión de PDFs
│   │   ├── MagazineScreen.tsx    # Generador de revistas/cuadernillos
│   │   ├── ImageScalerScreen.tsx # Escalado de imágenes con slider
│   │   └── TextureGeneratorScreen.tsx # Generador de texturas
│   ├── hooks/                    # Custom hooks
│   ├── utils/                    # Utilidades
│   ├── workers/                  # Web Workers
│   └── App.tsx                   # Componente raíz con routing
├── src-tauri/                    # Backend Rust
│   ├── src/
│   │   ├── main.rs              # Punto de entrada Rust
│   │   ├── lib.rs               # Librería principal
│   │   ├── pdf_compression.rs   # Compresión PDF con Ghostscript
│   │   ├── pdf_compress_pure.rs # Compresión PDF pura Rust
│   │   └── pdf_merge.rs         # Merge PDFs en Rust (sin bloquear UI)
│   ├── Cargo.toml               # Dependencias Rust
│   ├── tauri.conf.json          # Configuración Tauri (versión aquí)
│   └── icons/                   # Iconos de la app
├── scripts/                      # Scripts PowerShell
│   ├── generate-keys.ps1
│   └── prepare-release.ps1
├── package.json
├── tailwind.config.ts
└── vite.config.ts
```

---

## Estilo Visual y Diseño

### Paleta de Colores Principal
```
Primario (Naranja):     #f97316  (orange-500)
Secundario:             #ea580c  (orange-600)
Acento:                 #fb923c  (orange-400)
Fondo:                  #000000  (black)
Fondo semitransparente: rgba(0, 0, 0, 0.6)  (bg-black/60)
Texto principal:        #ffffff  (white)
Texto secundario:       #9ca3af  (gray-400)
Bordes:                 rgba(255, 255, 255, 0.1)  (border-white/10)
```

### Patrones de UI

#### 1. Contenedores Principales
```tsx
<div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
```

#### 2. Botones Primarios
```tsx
<button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-medium py-3 rounded-xl transition-all">
```

#### 3. Botones Secundarios
```tsx
<button className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl transition-all">
```

#### 4. Checkboxes Personalizados (NARANJA)
```tsx
<div className="relative">
  <input type="checkbox" className="peer sr-only" />
  <div className="w-6 h-6 rounded-lg border-2 transition-all duration-200 flex items-center justify-center
    peer-checked:bg-gradient-to-br from-orange-500 to-orange-600 peer-checked:border-orange-500 peer-checked:shadow-lg peer-checked:shadow-orange-500/25
    bg-black/40 border-white/20">
    {/* Checkmark SVG */}
  </div>
</div>
```

#### 5. Selectores de Opciones (Grid)
```tsx
<div className="grid grid-cols-3 gap-3">
  <button className={`
    p-4 rounded-xl border text-left transition-all duration-200
    ${selected 
      ? "border-orange-500 bg-orange-500/20" 
      : "border-white/10 bg-white/5 hover:border-white/20"
    }
  `}>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full bg-orange-500" />
      <span className={selected ? "text-orange-400" : "text-gray-300"}>
        Opción
      </span>
    </div>
  </button>
</div>
```

#### 6. Fondo con Partículas
```tsx
<ParticleCanvas
  config={{
    connectionDistance: 120,
    mouseInfluenceRadius: 300,
    mouseInfluenceStrength: 0.03,
    returnSpeed: 0.05,
    colors: {
      particle: "#f97316",
      connection: "rgba(249, 115, 22,",
    },
  }}
  density={15000}
/>
```

---

## Patrones de Código

### Estructura de Pantallas
Todas las pantallas deben seguir este patrón:

```tsx
export function ScreenName() {
  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Particles Background */}
      <ParticleCanvas config={{...}} density={15000} />
      
      {/* Main Content */}
      <div className="absolute inset-0 pl-20 flex items-center justify-center">
        <div className="w-full max-w-4xl mx-8">
          {/* Contenido */}
        </div>
      </div>
    </div>
  );
}
```

### Window Controls
**IMPORTANTE**: Los `WindowControls` están en `App.tsx` (fuera de las animaciones) para que NUNCA se desvanezcan durante las transiciones de pantalla.

```tsx
// En App.tsx - NO en las pantallas individuales
<div className="absolute top-4 right-4 z-[100]" data-tauri-drag-region>
  <WindowControls />
</div>
```

### Manejo de Archivos (Tauri Nativo)
Para descargas/guardar archivos, SIEMPRE usar el plugin dialog nativo:

```tsx
const { save } = await import("@tauri-apps/plugin-dialog");
const { writeFile } = await import("@tauri-apps/plugin-fs");

const savePath = await save({
  defaultPath: filename,
  filters: [{ name: "PDF", extensions: ["pdf"] }],
  title: "Guardar archivo",
});

if (savePath) {
  await writeFile(savePath, data);
}
```

**NUNCA** usar el método del navegador (`URL.createObjectURL` + `document.createElement('a')`) porque muestra el diálogo de seguridad "Download multiple files".

### Versión de la App
La versión se obtiene dinámicamente desde `tauri.conf.json` usando `getVersion()`:

```tsx
import { getVersion } from "@tauri-apps/api/app";

const [appVersion, setAppVersion] = useState<string>("");

useEffect(() => {
  getVersion().then(setAppVersion).catch(() => setAppVersion("0.2.4"));
}, []);
```

---

## Funcionalidades Actuales

### 1. Monitor de Sistema (Home)
- CPU, RAM, GPU, Disco en tiempo real
- Información del sistema operativo
- Partículas animadas de fondo
- Versión dinámica desde tauri.conf.json

### 2. PDF Compress
- Compresión con Ghostscript
- Niveles: Ligera, Media, Alta
- Modo Flatten para CAD
- Múltiples archivos
- Guardado nativo (sin diálogo del navegador)

### 3. PDF Merge
- Unión de múltiples PDFs en uno solo
- Procesamiento en Rust (no bloquea la UI)
- Lista simple con nombre del archivo
- Reordenar archivos con flechas arriba/abajo
- Eliminar archivos individuales
- Toast de éxito al guardar

### 4. Magazine / Cuadernillo
- Carga de imágenes numeradas
- Distribución automática de páginas blancas
- Generación de PDF de cuadernillo
- Vista previa de spreads

### 5. Image Scaler
- Escalado con algoritmos: Lanczos, Lanczos+Sharp, Bicúbica, Bilineal, Vecino
- Slider de comparación antes/después (aparece solo después de escalar)
- Control de DPI
- Ajuste de nitidez
- Preview de imagen original antes de escalar

### 6. Texture Generator
- Generación de texturas repetidas para papel tapiz/fondos
- Soporta múltiples tamaños de papel (Carta, Oficio, Tabloide, Personalizado)
- Configuración por imagen: escala, rotación, opacidad, flip alternado
- Regletas de medición (cm) horizontales y verticales
- Zoom con Ctrl + Scroll (30% por defecto)
- Exportación a PDF o PowerPoint (una página/slide por textura)
- Guardado optimizado para PCs de bajos recursos (procesamiento por lotes)
- Toast notifications personalizadas (sin alert nativas)

---

## Convenciones de Código

### Nombres de Archivos
- Componentes: `PascalCase.tsx`
- Utilidades: `camelCase.ts`
- Hooks: `useCamelCase.ts`

### Imports
```tsx
// React y librerías primero
import { useState, useRef } from "react";
import { motion } from "framer-motion";

// Componentes locales
import { ParticleCanvas } from "../components/particles";
import { WindowControls } from "../components/window";

// Utilidades
import { someUtil } from "../utils";
```

### Animaciones (Framer Motion)
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.2 }}
>
```

---

## Plugins Tauri Habilitados

```toml
[dependencies]
tauri-plugin-opener = "2"
tauri-plugin-fs = "2.5.0"
tauri-plugin-dialog = "2.7.0"
tauri-plugin-updater = "2"
tauri-plugin-process = "2"
```

---

## Comandos Útiles

```bash
# Desarrollo
pnpm tauri dev

# Build producción
pnpm tauri build

# Solo frontend
pnpm dev
pnpm build
```

---

## Notas Importantes

1. **NO agregar controles de ventana** en las pantallas individuales - están centralizados en App.tsx
2. **NO usar descargas del navegador** - siempre usar el plugin dialog de Tauri
3. **Mantener consistencia visual** - usar los patrones de UI definidos arriba
4. **Colores**: Naranja (#f97316) es el color principal de la marca
5. **Partículas**: TODAS las pantallas principales deben tener el fondo de partículas
6. **Transiciones**: Las pantallas usan AnimatePresence con modo="wait"

---

## Historial de Cambios Recientes

- **PDF Merge completamente reescrito**: Procesamiento movido a Rust con `lopdf` (no bloquea UI)
- **PDF Merge UI simplificada**: Lista de archivos sin previsualización, reordenamiento con flechas
- **Toast notifications agregadas**: PDF Compress, PDF Merge, Image Scaler ahora muestran toast al guardar
- **Nombres de archivos preservados**: En drag & drop de PDF Merge se conserva el nombre original
- **Versión 0.4.0**: Actualizada en package.json, tauri.conf.json y fallbacks de UI
- **Versión dinámica**: La versión se obtiene automáticamente de `tauri.conf.json` en HomeScreen, ParticlesScreen y Sidebar
- **Sidebar actualizado**: Agregado item "Textures" y versión en la parte inferior
- **Image Scaler mejorado**: Slider de comparación solo aparece después de escalar, título eliminado
- **HomeScreen**: Versión dinámica en el footer
- **ParticlesScreen**: Versión dinámica en el footer con timestamp de última actualización
- Agregado TextureGeneratorScreen completo con componentes modulares
- Texture Generator: Regletas de medición (cm) alineadas correctamente
- Texture Generator: Zoom con Ctrl+Scroll (30% por defecto)
- Texture Generator: Guardado optimizado por lotes para PCs de bajos recursos
- Texture Generator: Valores editables (escala, rotación, opacidad) sin flechas
- Texture Generator: Toast notifications personalizadas
- Eliminado botón "Buscar actualizaciones" del sidebar
- Eliminado chequeo de actualizaciones del LoadingScreen
- Cambiado FlattenModeToggle a FlattenModeSelector (diseño consistente)
- WindowControls movidos a App.tsx (nunca se desvanecen)
- Checkboxes personalizados con diseño naranja
- Descargas usando plugin dialog nativo (sin diálogo del navegador)
- Scrollbar personalizado con estilo naranja en toda la aplicación
