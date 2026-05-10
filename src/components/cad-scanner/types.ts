export interface CadEntity {
  entity_type: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cx: number;
  cy: number;
  radius: number;
  start_angle: number;
  end_angle: number;
  vertices: number[][];
  closed: boolean;
  text: string;
  text_height: number;
  color: [number, number, number];
  layer: string;
  line_type: string;
}

export interface BoundingBox {
  min_x: number;
  min_y: number;
  max_x: number;
  max_y: number;
}

export interface DetectedPlan {
  id: number;
  label: string;
  min_x: number;
  min_y: number;
  max_x: number;
  max_y: number;
  inner_entities: number[];
}

export interface CadRenderData {
  entities: CadEntity[];
  extents: BoundingBox;
  layers: string[];
  file_name: string;
  entity_count: number;
  detected_plans: DetectedPlan[];
}

export interface PlanSelection {
  id: number;
  label: string;
  min_x: number;
  min_y: number;
  max_x: number;
  max_y: number;
}

export interface PaperSizeDef {
  name: string;
  width_cm: number;
  height_cm: number;
}

export interface ScaleOption {
  label: string;
  denominator: number;
}

export type CadMode = "auto" | "manual";

export interface SelectionRect {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ViewportState {
  offset_x: number;
  offset_y: number;
  zoom: number;
}

export const PAPER_SIZES: PaperSizeDef[] = [
  { name: "Arch D", width_cm: 60, height_cm: 45 },
  { name: "Carta", width_cm: 21.6, height_cm: 27.9 },
  { name: "Oficio", width_cm: 21.6, height_cm: 35.6 },
  { name: "A4", width_cm: 21.0, height_cm: 29.7 },
  { name: "A3", width_cm: 29.7, height_cm: 42.0 },
  { name: "Tabloide", width_cm: 27.9, height_cm: 43.2 },
  { name: "A2", width_cm: 42.0, height_cm: 59.4 },
  { name: "A1", width_cm: 59.4, height_cm: 84.1 },
  { name: "A0", width_cm: 84.1, height_cm: 118.9 },
];

export const SCALE_OPTIONS: ScaleOption[] = [
  { label: "1:50", denominator: 50 },
  { label: "1:75", denominator: 75 },
  { label: "1:100", denominator: 100 },
  { label: "1:125", denominator: 125 },
  { label: "1:200", denominator: 200 },
  { label: "1:250", denominator: 250 },
  { label: "1:500", denominator: 500 },
  { label: "1:1000", denominator: 1000 },
  { label: "Personalizada", denominator: 0 },
];
