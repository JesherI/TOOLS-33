import { useState, useCallback, useRef } from "react";
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
    setSelections((prev) => [
      ...prev,
      { id: `sel-${Date.now()}-${Math.random()}`, x1, y1, x2, y2 },
    ]);
  }, []);

  const handleRemoveSelection = useCallback((id: string) => {
    setSelections((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleClearSelections = useCallback(() => {
    setSelections([]);
  }, []);

  const handleExport = useCallback(async () => {
    if (!cadData) return;

    let selectedPlans;
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
    } else {
      if (selections.length === 0) {
        showToast("Selecciona al menos un área en el canvas", "error");
        return;
      }
      selectedPlans = selections.map((s, i) => ({
        id: i,
        label: `Selección ${i + 1}`,
        min_x: Math.min(s.x1, s.x2),
        min_y: Math.min(s.y1, s.y2),
        max_x: Math.max(s.x1, s.x2),
        max_y: Math.max(s.y1, s.y2),
      }));
    }

    try {
      const outputPath = await save({
        defaultPath: `planos_export_${scale}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
        title: "Guardar PDF con planos",
      });

      if (!outputPath) return;

      setPhase("exporting");
      setLoadMessage("Generando PDF...");

      const request = {
        input_path: tempPathRef.current || "",
        selected_plans: selectedPlans,
        scale_denominator: scale,
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
  }, [cadData, mode, selectedPlanIds, detectedPlans, selections, scale, paperSize, showToast]);

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

                  <ScaleInput scale={scale} onScaleChange={setScale} />
                  <PaperSizeSelector size={paperSize} onSizeChange={setPaperSize} />

                  {mode === "auto" && detectedPlans.length > 0 && (
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

                  {mode === "manual" && (
                    <ManualControls
                      selections={selections}
                      onRemoveSelection={handleRemoveSelection}
                      onClearAll={handleClearSelections}
                    />
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
