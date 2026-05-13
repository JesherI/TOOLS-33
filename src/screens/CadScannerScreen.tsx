import { useState, useCallback, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { tempDir } from "@tauri-apps/api/path";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeFile, remove } from "@tauri-apps/plugin-fs";
import { ParticleCanvas } from "../components/particles";
import { ToastContainer, useToast } from "../components/toast/Toast";
import {
  CadRenderData, CadMode, PaperSizeDef, SelectionRect, DetectedPlan,
} from "../components/cad-scanner/types";
import {
  CadCanvas, FileImporter, ScaleInput, PaperSizeSelector, ModeSelector,
  AutoPreviewGrid, ManualControls, LoadingOverlay, ExportButton,
} from "../components/cad-scanner";

interface CadScannerScreenProps {
  onNavigate?: (screen: "home" | "pdf-compress" | "pdf-merge" | "magazine" | "image-scaler" | "texture-generator") => void;
}

type Phase = "import" | "loaded" | "exporting";

export function CadScannerScreen({ onNavigate: _onNavigate }: CadScannerScreenProps) {
  const [phase, setPhase] = useState<Phase>("import");
  const [mode, setMode] = useState<CadMode>("auto");
  const [scale, setScale] = useState(100);
  const [paperSize, setPaperSize] = useState<PaperSizeDef>({
    name: "Arch D", width_cm: 60, height_cm: 45,
  });
  const [cadData, setCadData] = useState<CadRenderData | null>(null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<number>>(new Set());
  const [selections, setSelections] = useState<SelectionRect[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadMessage, setLoadMessage] = useState("Cargando...");
  const [detectedPlans, setDetectedPlans] = useState<DetectedPlan[]>([]);
  const { toasts, showToast, removeToast } = useToast();
  const tempPathRef = useRef<string | null>(null);

  const handleFilesSelected = useCallback(async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "dxf" && ext !== "dwg") {
      showToast("Solo se admiten archivos DXF y DWG", "error");
      return;
    }

    setIsLoading(true);
    setLoadMessage(`Analizando ${file.name}...`);

    try {
      const temp = await tempDir();
      const tempPath = `${temp}\\tools33_cad_${Date.now()}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();
      await writeFile(tempPath, new Uint8Array(arrayBuffer));
      tempPathRef.current = tempPath;

      const result = await invoke<CadRenderData>("open_cad_file", { path: tempPath });
      setCadData(result);

      if (result.detected_plans.length > 0) {
        setDetectedPlans(result.detected_plans);
        setSelectedPlanIds(new Set(result.detected_plans.map((p: DetectedPlan) => p.id)));
      } else {
        setDetectedPlans([]);
        setSelectedPlanIds(new Set());
      }

      setPhase("loaded");
      setSelections([]);
    } catch (e) {
      console.error("Error loading CAD file:", e);
      showToast(`Error al cargar: ${e}`, "error");
    }

    setIsLoading(false);
  }, [showToast]);

  const handleAddMore = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: "Archivos CAD", extensions: ["dxf", "dwg"] },
        ],
        title: "Seleccionar archivo CAD",
      });

      if (selected) {
        const path = Array.isArray(selected) ? selected[0] : selected;
        setIsLoading(true);
        setLoadMessage(`Analizando archivo...`);

        const result = await invoke<CadRenderData>("open_cad_file", { path });
        setCadData(result);

        if (result.detected_plans.length > 0) {
          setDetectedPlans(result.detected_plans);
          setSelectedPlanIds(new Set(result.detected_plans.map((p: DetectedPlan) => p.id)));
        } else {
          setDetectedPlans([]);
          setSelectedPlanIds(new Set());
        }

        setPhase("loaded");
        setSelections([]);
        setIsLoading(false);
      }
    } catch (e) {
      console.error("Error:", e);
      showToast(`Error al cargar: ${e}`, "error");
      setIsLoading(false);
    }
  }, [showToast]);

  const handleTogglePlan = useCallback((id: number) => {
    setSelectedPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedPlanIds(new Set(detectedPlans.map((p) => p.id)));
  }, [detectedPlans]);

  const handleDeselectAll = useCallback(() => {
    setSelectedPlanIds(new Set());
  }, []);

  const handleAddSelection = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const rx = Math.min(x1, x2);
    const ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1);
    const rh = Math.abs(y2 - y1);

    let minX = rx;
    let minY = ry;
    let maxX = rx + rw;
    let maxY = ry + rh;
    let foundAny = false;

    if (cadData) {
      for (const entity of cadData.entities) {
        let ex: number, ey: number;
        if (entity.entity_type === "Line") {
          ex = (entity.x1 + entity.x2) / 2;
          ey = (entity.y1 + entity.y2) / 2;
        } else if (entity.entity_type === "Circle" || entity.entity_type === "Arc") {
          ex = entity.cx;
          ey = entity.cy;
        } else if (entity.vertices.length > 0) {
          let sx = 0, sy = 0;
          for (const v of entity.vertices) { sx += v[0]; sy += v[1]; }
          ex = sx / entity.vertices.length;
          ey = sy / entity.vertices.length;
        } else {
          ex = entity.x1;
          ey = entity.y1;
        }
        if (ex >= rx && ex <= rx + rw && ey >= ry && ey <= ry + rh) {
          foundAny = true;
          if (entity.entity_type === "Circle" || entity.entity_type === "Arc") {
            minX = Math.min(minX, entity.cx - entity.radius);
            maxX = Math.max(maxX, entity.cx + entity.radius);
            minY = Math.min(minY, entity.cy - entity.radius);
            maxY = Math.max(maxY, entity.cy + entity.radius);
          } else if (entity.entity_type === "Line") {
            minX = Math.min(minX, entity.x1, entity.x2);
            maxX = Math.max(maxX, entity.x1, entity.x2);
            minY = Math.min(minY, entity.y1, entity.y2);
            maxY = Math.max(maxY, entity.y1, entity.y2);
          } else if (entity.vertices.length > 0) {
            for (const v of entity.vertices) {
              minX = Math.min(minX, v[0]);
              maxX = Math.max(maxX, v[0]);
              minY = Math.min(minY, v[1]);
              maxY = Math.max(maxY, v[1]);
            }
          } else {
            minX = Math.min(minX, entity.x1);
            maxX = Math.max(maxX, entity.x1);
            minY = Math.min(minY, entity.y1);
            maxY = Math.max(maxY, entity.y1);
          }
        }
      }
    }

    if (foundAny) {
      const marginW = Math.max((maxX - minX) * 0.05, 10);
      const marginH = Math.max((maxY - minY) * 0.05, 10);
      minX -= marginW;
      maxX += marginW;
      minY -= marginH;
      maxY += marginH;
    }

    setSelections([{
      id: "manual-sel",
      x1: minX,
      y1: minY,
      x2: maxX,
      y2: maxY,
    }]);
  }, [cadData]);

  const handleUpdateSelection = useCallback((id: string, nx1: number, ny1: number, nx2: number, ny2: number) => {
    setSelections([
      { id, x1: Math.min(nx1, nx2), y1: Math.min(ny1, ny2), x2: Math.max(nx1, nx2), y2: Math.max(ny1, ny2) },
    ]);
  }, []);

  const handleClearSelections = useCallback(() => {
    setSelections([]);
  }, []);

  const derivedScale = useMemo(() => {
    if (selections.length === 0) return 0;
    const sel = selections[0];
    const cadW = Math.max(Math.abs(sel.x2 - sel.x1), 1);
    const paperMM = paperSize.width_cm * 10;
    return Math.round(cadW / paperMM);
  }, [selections, paperSize]);

  const handleExport = useCallback(async () => {
    if (!cadData) return;

    let selectedPlans;
    let effectiveScale: number;
    if (mode === "auto") {
      if (selectedPlanIds.size === 0) {
        showToast("Selecciona al menos un plano", "error");
        return;
      }
      selectedPlans = detectedPlans
        .filter((p) => selectedPlanIds.has(p.id))
        .map((p) => ({
          id: p.id,
          label: p.label,
          min_x: p.min_x,
          min_y: p.min_y,
          max_x: p.max_x,
          max_y: p.max_y,
        }));
      effectiveScale = scale;
    } else {
      if (selections.length === 0) {
        showToast("Dibuja un rectángulo en el canvas para definir el área a exportar", "error");
        return;
      }
      const sel = selections[0];
      selectedPlans = [{
        id: 0,
        label: `Plano ${paperSize.name}`,
        min_x: Math.min(sel.x1, sel.x2),
        min_y: Math.min(sel.y1, sel.y2),
        max_x: Math.max(sel.x1, sel.x2),
        max_y: Math.max(sel.y1, sel.y2),
      }];
      effectiveScale = derivedScale || 100;
    }

    try {
      const outputPath = await save({
        defaultPath: `planos_escala_1-${effectiveScale}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
        title: "Guardar PDF con planos",
      });

      if (!outputPath) return;

      setPhase("exporting");
      setLoadMessage("Generando PDF...");

      const request = {
        input_path: tempPathRef.current || "",
        selected_plans: selectedPlans,
        scale_denominator: effectiveScale,
        paper_size: {
          name: paperSize.name,
          width_cm: paperSize.width_cm,
          height_cm: paperSize.height_cm,
        },
        output_path: outputPath,
      };

      await invoke("export_cad_pdf", { request });
      showToast(`PDF guardado en:\n${outputPath}`, "success");
      setPhase("loaded");
    } catch (e) {
      console.error("Error exporting:", e);
      showToast(`Error al exportar: ${e}`, "error");
      setPhase("loaded");
    }
  }, [cadData, mode, selectedPlanIds, detectedPlans, selections, scale, paperSize, derivedScale, showToast]);

  const handleBackToImport = useCallback(() => {
    setPhase("import");
    setCadData(null);
    setDetectedPlans([]);
    setSelectedPlanIds(new Set());
    setSelections([]);

    if (tempPathRef.current) {
      remove(tempPathRef.current).catch(() => {});
      tempPathRef.current = null;
    }
  }, []);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
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

      <div className="absolute inset-0 pl-20 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col p-4 gap-4 min-h-0">
          {phase === "import" ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-2xl">
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
                  <div className="mb-5">
                    <h1 className="text-xl font-bold text-white">CAD Scanner</h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Importa archivos DXF/DWG y exporta planos a PDF con escala
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <ScaleInput scale={scale} onScaleChange={setScale} />
                    <PaperSizeSelector size={paperSize} onSizeChange={setPaperSize} />
                  </div>
                  <div className="mb-4">
                    <ModeSelector mode={mode} onModeChange={setMode} />
                  </div>

                  <div className="relative">
                    {isLoading && <LoadingOverlay message={loadMessage} />}
                    <FileImporter
                      onFilesSelected={handleFilesSelected}
                      isLoading={isLoading}
                    />
                  </div>

                  <div className="mt-3">
                    <button
                      onClick={handleAddMore}
                      className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 
                        text-gray-300 text-xs font-medium transition-all"
                    >
                      O seleccionar desde el sistema de archivos
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex gap-4 min-h-0">
              <div className="w-72 shrink-0 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 space-y-3">
                  <button
                    onClick={handleBackToImport}
                    className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors mb-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                    Nuevo archivo
                  </button>

                  <div className="text-xs text-gray-400">
                    <span className="font-medium text-gray-200">{cadData?.file_name}</span>
                    <span className="ml-2">({cadData?.entity_count} ent.)</span>
                  </div>

                  <PaperSizeSelector size={paperSize} onSizeChange={setPaperSize} />

                  {mode === "auto" && (
                    <>
                      <ScaleInput scale={scale} onScaleChange={setScale} />
                      {detectedPlans.length > 0 && (
                        <>
                          <AutoPreviewGrid
                            plans={detectedPlans}
                            selectedPlans={selectedPlanIds}
                            onTogglePlan={handleTogglePlan}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSelectAll}
                              className="flex-1 px-2 py-1 rounded-lg text-[10px] bg-white/5 hover:bg-white/10 
                                text-gray-400 transition-all"
                            >
                              Todo
                            </button>
                            <button
                              onClick={handleDeselectAll}
                              className="flex-1 px-2 py-1 rounded-lg text-[10px] bg-white/5 hover:bg-white/10 
                                text-gray-400 transition-all"
                            >
                              Ninguno
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {mode === "manual" && (
                    <ManualControls
                      selections={selections}
                      onClearAll={handleClearSelections}
                      paperSize={paperSize}
                      derivedScale={derivedScale}
                    />
                  )}

                  {derivedScale > 0 && selections.length > 0 && (
                    <div className="text-xs text-gray-400 text-center py-1 bg-white/5 rounded-lg border border-white/5">
                      Escala derivada: <span className="text-orange-400 font-semibold">1:{derivedScale}</span>
                    </div>
                  )}

                  <ExportButton
                    onClick={handleExport}
                    disabled={
                      (mode === "auto" && selectedPlanIds.size === 0) ||
                      (mode === "manual" && selections.length === 0) ||
                      phase === "exporting"
                    }
                    isExporting={phase === "exporting"}
                    count={mode === "auto" ? selectedPlanIds.size : selections.length}
                  />
                </div>
              </div>

              <div className="flex-1 min-w-0 relative">
                {phase === "exporting" && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative w-10 h-10">
                        <div className="absolute inset-0 border-2 border-orange-500/30 rounded-full" />
                        <div className="absolute inset-0 border-2 border-transparent border-t-orange-500 rounded-full animate-spin" />
                      </div>
                      <p className="text-sm text-gray-300">{loadMessage}</p>
                    </div>
                  </div>
                )}
                <CadCanvas
                  data={cadData}
                  detectedPlans={detectedPlans}
                  selectedPlanIds={selectedPlanIds}
                  selections={selections}
                  onAddSelection={handleAddSelection}
                  onUpdateSelection={handleUpdateSelection}
                  isManualMode={mode === "manual"}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
