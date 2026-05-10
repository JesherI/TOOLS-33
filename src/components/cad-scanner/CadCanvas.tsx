import { useRef, useEffect, useCallback } from "react";
import { CadRenderData, DetectedPlan, SelectionRect, ViewportState, CadEntity } from "./types";

interface CadCanvasProps {
  data: CadRenderData | null;
  detectedPlans: DetectedPlan[];
  selectedPlanIds: Set<number>;
  selections: SelectionRect[];
  onAddSelection: (x1: number, y1: number, x2: number, y2: number) => void;
  isManualMode: boolean;
}

const TAU = Math.PI * 2;

function tessellateCircle(cx: number, cy: number, r: number): number[][] {
  const segments = Math.max(32, Math.ceil(TAU * r / 2));
  const pts: number[][] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * TAU;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

function tessellateArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): number[][] {
  let start = (startDeg * Math.PI) / 180;
  let end = (endDeg * Math.PI) / 180;
  while (end < start) end += TAU;
  const angleRange = end - start;
  const segments = Math.max(16, Math.ceil(angleRange * r / 2));
  const pts: number[][] = [];
  for (let i = 0; i <= segments; i++) {
    const a = start + (i / segments) * angleRange;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

function tessellateEllipse(cx: number, cy: number, rx: number, ry: number, startDeg: number, endDeg: number): number[][] {
  let start = (startDeg * Math.PI) / 180;
  let end = (endDeg * Math.PI) / 180;
  while (end < start) end += TAU;
  const angleRange = end - start;
  const segments = Math.max(16, Math.ceil(angleRange * Math.max(rx, ry) / 2));
  const pts: number[][] = [];
  for (let i = 0; i <= segments; i++) {
    const a = start + (i / segments) * angleRange;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function CadCanvas({
  data, detectedPlans, selectedPlanIds, selections, onAddSelection, isManualMode,
}: CadCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<ViewportState>({ offset_x: 0, offset_y: 0, zoom: 1 });
  const targetViewportRef = useRef<ViewportState>({ offset_x: 0, offset_y: 0, zoom: 1 });
  const isPanning = useRef(false);
  const panStartWorld = useRef({ x: 0, y: 0 });
  const mouseWorld = useRef({ x: 0, y: 0 });
  const dimsRef = useRef({ w: 800, h: 600 });
  const isSelecting = useRef(false);
  const selectStart = useRef({ x: 0, y: 0 });
  const isSmoothZooming = useRef(false);
  const animFrameRef = useRef<number>(0);
  const extentsRef = useRef({ min_x: 0, max_x: 1, min_y: 0, max_y: 1 });

  const getCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const vp = viewportRef.current;
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const { w, h } = dimsRef.current;
    return {
      x: (px - w / 2) / vp.zoom - vp.offset_x,
      y: (py - h / 2) / vp.zoom - vp.offset_y,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !data) return;

    const ext = data.extents;
    extentsRef.current = ext;
    const { w, h } = dimsRef.current;
    const extW = ext.max_x - ext.min_x || 1;
    const extH = ext.max_y - ext.min_y || 1;
    const fitZoom = Math.min(
      w / extW,
      h / extH
    ) * 0.85;

    const initVp: ViewportState = {
      offset_x: -(data.extents.min_x + data.extents.max_x) / 2,
      offset_y: -(data.extents.min_y + data.extents.max_y) / 2,
      zoom: fitZoom,
    };
    viewportRef.current = initVp;
    targetViewportRef.current = initVp;
  }, [data]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const vp = viewportRef.current;
    const target = targetViewportRef.current;

    if (isSmoothZooming.current) {
      const zoomDiff = target.zoom - vp.zoom;
      if (Math.abs(zoomDiff) > 0.001) {
        vp.zoom = lerp(vp.zoom, target.zoom, 0.25);
        vp.offset_x = lerp(vp.offset_x, target.offset_x, 0.25);
        vp.offset_y = lerp(vp.offset_y, target.offset_y, 0.25);
      } else {
        vp.zoom = target.zoom;
        vp.offset_x = target.offset_x;
        vp.offset_y = target.offset_y;
        isSmoothZooming.current = false;
      }
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const { w, h } = dimsRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(w / 2, h / 2);
    ctx.scale(vp.zoom, vp.zoom);
    ctx.translate(vp.offset_x, vp.offset_y);

    if (data) {
      const margin = 100 / vp.zoom;
      const viewMinX = -w / 2 / vp.zoom - vp.offset_x - margin;
      const viewMinY = -h / 2 / vp.zoom - vp.offset_y - margin;
      const viewMaxX = w / 2 / vp.zoom - vp.offset_x + margin;
      const viewMaxY = h / 2 / vp.zoom - vp.offset_y + margin;

      for (const entity of data.entities) {
        let visible = false;
        if (entity.entity_type === "Line") {
          visible = lineInView(entity, viewMinX, viewMinY, viewMaxX, viewMaxY);
        } else if (entity.entity_type === "Circle") {
          visible = circleInView(entity, viewMinX, viewMinY, viewMaxX, viewMaxY);
        } else {
          visible = entityInView(entity, viewMinX, viewMinY, viewMaxX, viewMaxY);
        }
        if (!visible) continue;

        const [r, g, b] = entity.color;
        const isBlack = r === 0 && g === 0 && b === 0;
        ctx.strokeStyle = isBlack ? "#ffffff" : `rgb(${r},${g},${b})`;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.lineWidth = 1 / vp.zoom;

        switch (entity.entity_type) {
          case "Line": {
            ctx.beginPath();
            ctx.moveTo(entity.x1, entity.y1);
            ctx.lineTo(entity.x2, entity.y2);
            ctx.stroke();
            break;
          }
          case "Circle": {
            const pts = tessellateCircle(entity.cx, entity.cy, entity.radius);
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
            ctx.stroke();
            break;
          }
          case "Arc": {
            const arcs = tessellateArc(entity.cx, entity.cy, entity.radius, entity.start_angle, entity.end_angle);
            if (arcs.length > 1) {
              ctx.beginPath();
              ctx.moveTo(arcs[0][0], arcs[0][1]);
              for (let i = 1; i < arcs.length; i++) ctx.lineTo(arcs[i][0], arcs[i][1]);
              ctx.stroke();
            }
            break;
          }
          case "Ellipse": {
            const ell = tessellateEllipse(entity.cx, entity.cy, entity.x1, entity.y1, entity.start_angle, entity.end_angle);
            if (ell.length > 1) {
              ctx.beginPath();
              ctx.moveTo(ell[0][0], ell[0][1]);
              for (let i = 1; i < ell.length; i++) ctx.lineTo(ell[i][0], ell[i][1]);
              ctx.stroke();
            }
            break;
          }
          case "Polyline": {
            if (entity.vertices.length < 2) break;
            ctx.beginPath();
            ctx.moveTo(entity.vertices[0][0], entity.vertices[0][1]);
            for (let i = 1; i < entity.vertices.length; i++) {
              ctx.lineTo(entity.vertices[i][0], entity.vertices[i][1]);
            }
            if (entity.closed) ctx.closePath();
            ctx.stroke();
            break;
          }
          case "Text": {
            const size = entity.text_height / vp.zoom;
            if (size < 1) break;
            ctx.font = `${entity.text_height}px monospace`;
            ctx.fillStyle = isBlack ? "#ffffff" : `rgb(${r},${g},${b})`;
            ctx.fillText(entity.text.substring(0, 50), entity.x1, entity.y1);
            break;
          }
        }
      }

      for (const plan of detectedPlans) {
        const isSelected = selectedPlanIds.has(plan.id);
        ctx.strokeStyle = isSelected ? "rgba(249, 115, 22, 0.8)" : "rgba(59, 130, 246, 0.4)";
        ctx.lineWidth = isSelected ? 2.5 / vp.zoom : 1.5 / vp.zoom;
        ctx.setLineDash(isSelected ? [] : [5 / vp.zoom, 5 / vp.zoom]);
        ctx.strokeRect(plan.min_x, plan.min_y, plan.max_x - plan.min_x, plan.max_y - plan.min_y);
        ctx.setLineDash([]);

        if (isSelected) {
          ctx.fillStyle = "rgba(249, 115, 22, 0.1)";
          ctx.fillRect(plan.min_x, plan.min_y, plan.max_x - plan.min_x, plan.max_y - plan.min_y);
          ctx.fillStyle = "rgba(249, 115, 22, 0.9)";
          const fontSize = Math.max(8, 12 / vp.zoom);
          ctx.font = `${fontSize}px sans-serif`;
          ctx.fillText(plan.label, plan.min_x + 3 / vp.zoom, plan.min_y + fontSize + 3 / vp.zoom);
        }
      }

      for (const sel of selections) {
        const x = Math.min(sel.x1, sel.x2);
        const y = Math.min(sel.y1, sel.y2);
        const sw = Math.abs(sel.x2 - sel.x1);
        const sh = Math.abs(sel.y2 - sel.y1);
        ctx.strokeStyle = "rgba(249, 115, 22, 0.9)";
        ctx.lineWidth = 2 / vp.zoom;
        ctx.setLineDash([6 / vp.zoom, 4 / vp.zoom]);
        ctx.strokeRect(x, y, sw, sh);
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(249, 115, 22, 0.08)";
        ctx.fillRect(x, y, sw, sh);
      }

      if (isManualMode) {
        const mx = mouseWorld.current.x;
        const my = mouseWorld.current.y;

        ctx.strokeStyle = "rgba(249, 115, 22, 0.6)";
        ctx.lineWidth = 0.5 / vp.zoom;
        const cs = 20 / vp.zoom;
        ctx.beginPath();
        ctx.moveTo(mx - cs, my); ctx.lineTo(mx + cs, my);
        ctx.moveTo(mx, my - cs); ctx.lineTo(mx, my + cs);
        ctx.stroke();

        if (isSelecting.current) {
          const sp = selectStart.current;
          const sx = Math.min(sp.x, mx);
          const sy = Math.min(sp.y, my);
          const sw = Math.abs(mx - sp.x);
          const sh = Math.abs(my - sp.y);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
          ctx.lineWidth = 1 / vp.zoom;
          ctx.setLineDash([5 / vp.zoom, 5 / vp.zoom]);
          ctx.strokeRect(sx, sy, sw, sh);
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(249, 115, 22, 0.06)";
          ctx.fillRect(sx, sy, sw, sh);
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(drawFrame);
  }, [data, detectedPlans, selectedPlanIds, selections, isManualMode]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [drawFrame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      dimsRef.current = { w, h };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      const worldPt = getCanvasPoint(e.clientX, e.clientY);

      if (e.button === 1) {
        isPanning.current = true;
        panStartWorld.current = worldPt;
        canvas.style.cursor = isManualMode ? "none" : "grabbing";
        return;
      }

      if (e.button === 0 && isManualMode) {
        selectStart.current = worldPt;
        isSelecting.current = true;
        canvas.style.cursor = "none";
        return;
      }

      if (e.button === 0) {
        isPanning.current = true;
        panStartWorld.current = worldPt;
        canvas.style.cursor = "grabbing";
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const worldPt = getCanvasPoint(e.clientX, e.clientY);
      mouseWorld.current = worldPt;

      if (isPanning.current) {
        const vp = viewportRef.current;
        const vpTarget = targetViewportRef.current;
        const dx = worldPt.x - panStartWorld.current.x;
        const dy = worldPt.y - panStartWorld.current.y;
        vp.offset_x += dx;
        vp.offset_y += dy;
        vpTarget.offset_x = vp.offset_x;
        vpTarget.offset_y = vp.offset_y;
        panStartWorld.current = worldPt;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isSelecting.current) {
        const endPt = getCanvasPoint(e.clientX, e.clientY);
        const sp = selectStart.current;
        const dx = Math.abs(endPt.x - sp.x);
        const dy = Math.abs(endPt.y - sp.y);
        if (dx > 1 && dy > 1) {
          onAddSelection(sp.x, sp.y, endPt.x, endPt.y);
        }
        isSelecting.current = false;
        canvas.style.cursor = isManualMode ? "none" : "crosshair";
      }
      isPanning.current = false;
      if (!isManualMode) canvas.style.cursor = "default";
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const vp = viewportRef.current;
      const vpTarget = targetViewportRef.current;
      const worldPt = getCanvasPoint(e.clientX, e.clientY);
      const rect = canvas.getBoundingClientRect();
      const { w, h } = dimsRef.current;

      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
      const newZoom = Math.max(0.05, Math.min(100, vp.zoom * zoomFactor));

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      vpTarget.zoom = newZoom;
      vpTarget.offset_x = screenX / newZoom - w / 2 / newZoom - worldPt.x;
      vpTarget.offset_y = screenY / newZoom - h / 2 / newZoom - worldPt.y;
      isSmoothZooming.current = true;
    };

    const handleContextMenu = (e: Event) => e.preventDefault();

    const handleDblClick = () => {
      const ext = extentsRef.current;
      const { w, h } = dimsRef.current;
      const extW = ext.max_x - ext.min_x || 1;
      const extH = ext.max_y - ext.min_y || 1;
      const fitZoom = Math.min(
        w / extW,
        h / extH
      ) * 0.85;
      targetViewportRef.current = {
        offset_x: -(ext.min_x + ext.max_x) / 2,
        offset_y: -(ext.min_y + ext.max_y) / 2,
        zoom: fitZoom,
      };
      isSmoothZooming.current = true;
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("contextmenu", handleContextMenu);
    canvas.addEventListener("dblclick", handleDblClick);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("contextmenu", handleContextMenu);
      canvas.removeEventListener("dblclick", handleDblClick);
    };
  }, [getCanvasPoint, onAddSelection, isManualMode]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden rounded-xl">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 ${isManualMode ? "cursor-none" : "cursor-grab"}`}
      />
      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-gray-400 font-mono select-none pointer-events-none">
        {(isManualMode
          ? "Click+Arrastra: Seleccionar | Rueda: Zoom | Botón medio: Pan"
          : "Click+Arrastra: Pan | Rueda: Zoom | Botón medio: Pan") + " | Doble Click: Ajustar"}
      </div>
      {data && (
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-gray-500 font-mono select-none pointer-events-none">
          <div>{data.entity_count} entidades</div>
          <div>{data.file_name}</div>
        </div>
      )}
    </div>
  );
}

function lineInView(e: CadEntity, minX: number, minY: number, maxX: number, maxY: number): boolean {
  const ex1 = Math.min(e.x1, e.x2) > maxX;
  const ex2 = Math.max(e.x1, e.x2) < minX;
  const ey1 = Math.min(e.y1, e.y2) > maxY;
  const ey2 = Math.max(e.y1, e.y2) < minY;
  return !(ex1 || ex2 || ey1 || ey2);
}

function circleInView(e: CadEntity, minX: number, minY: number, maxX: number, maxY: number): boolean {
  return e.cx + e.radius >= minX && e.cx - e.radius <= maxX &&
         e.cy + e.radius >= minY && e.cy - e.radius <= maxY;
}

function entityInView(e: CadEntity, minX: number, minY: number, maxX: number, maxY: number): boolean {
  if (e.vertices.length === 0) return true;
  for (const [x, y] of e.vertices) {
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) return true;
  }
  return false;
}
