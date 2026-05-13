use dxf::{Drawing, entities::*};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct CadRenderData {
    pub entities: Vec<CadEntity>,
    pub extents: BoundingBox,
    pub layers: Vec<String>,
    pub file_name: String,
    pub entity_count: usize,
    pub detected_plans: Vec<DetectedPlan>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BoundingBox {
    pub min_x: f64,
    pub min_y: f64,
    pub max_x: f64,
    pub max_y: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct CadEntity {
    pub entity_type: String,
    pub x1: f64,
    pub y1: f64,
    pub x2: f64,
    pub y2: f64,
    pub cx: f64,
    pub cy: f64,
    pub radius: f64,
    pub start_angle: f64,
    pub end_angle: f64,
    pub vertices: Vec<[f64; 2]>,
    pub closed: bool,
    pub text: String,
    pub text_height: f64,
    pub color: [u8; 3],
    pub layer: String,
    pub line_type: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct DetectedPlan {
    pub id: u32,
    pub label: String,
    pub min_x: f64,
    pub min_y: f64,
    pub max_x: f64,
    pub max_y: f64,
    pub inner_entities: Vec<usize>,
}

impl BoundingBox {
    pub fn new() -> Self {
        Self {
            min_x: f64::MAX,
            min_y: f64::MAX,
            max_x: f64::MIN,
            max_y: f64::MIN,
        }
    }

    pub fn extend(&mut self, x: f64, y: f64) {
        if x < self.min_x { self.min_x = x; }
        if y < self.min_y { self.min_y = y; }
        if x > self.max_x { self.max_x = x; }
        if y > self.max_y { self.max_y = y; }
    }

    pub fn width(&self) -> f64 {
        (self.max_x - self.min_x).abs()
    }

    pub fn height(&self) -> f64 {
        (self.max_y - self.min_y).abs()
    }
}

fn dxf_color_to_rgb(color_index: i16) -> [u8; 3] {
    let idx = if (1..=255).contains(&color_index) { color_index } else { 7 };
    match idx {
        0 => [0, 0, 0],
        1 => [255, 0, 0],
        2 => [255, 255, 0],
        3 => [0, 255, 0],
        4 => [0, 255, 255],
        5 => [0, 0, 255],
        6 => [255, 0, 255],
        7 => [255, 255, 255],
        8 => [128, 128, 128],
        9 => [192, 192, 192],
        10 => [255, 0, 0],
        11 => [255, 127, 127],
        12 => [165, 0, 0],
        13 => [165, 82, 82],
        14 => [255, 165, 0],
        15 => [255, 200, 127],
        20 => [255, 255, 0],
        21 => [255, 255, 127],
        30 => [0, 255, 0],
        31 => [127, 255, 127],
        40 => [0, 255, 255],
        41 => [127, 255, 255],
        50 => [0, 0, 255],
        51 => [127, 127, 255],
        60 => [255, 0, 255],
        61 => [255, 127, 255],
        80 => [127, 127, 127],
        81 => [192, 192, 192],
        90 => [255, 255, 255],
        250 => [0, 0, 0],
        251 => [32, 32, 32],
        252 => [64, 64, 64],
        253 => [96, 96, 96],
        254 => [128, 128, 128],
        255 => [160, 160, 160],
        n @ 16..=19 => {
            let f = 1.0 - (n - 16) as f64 * 0.15;
            [(255.0 * f) as u8, (80.0 * f) as u8, (80.0 * f) as u8]
        }
        n @ 22..=29 => {
            let f = 1.0 - (n - 22) as f64 * 0.08;
            [(230.0 * f) as u8, (230.0 * f) as u8, (50.0 * f) as u8]
        }
        n @ 32..=39 => {
            let f = 1.0 - (n - 32) as f64 * 0.08;
            [(50.0 * f) as u8, (230.0 * f) as u8, (50.0 * f) as u8]
        }
        n @ 42..=49 => {
            let f = 1.0 - (n - 42) as f64 * 0.08;
            [(50.0 * f) as u8, (230.0 * f) as u8, (230.0 * f) as u8]
        }
        n @ 52..=59 => {
            let f = 1.0 - (n - 52) as f64 * 0.08;
            [(50.0 * f) as u8, (50.0 * f) as u8, (230.0 * f) as u8]
        }
        n @ 62..=69 => {
            let f = 1.0 - (n - 62) as f64 * 0.08;
            [(230.0 * f) as u8, (50.0 * f) as u8, (230.0 * f) as u8]
        }
        n @ 70..=79 => {
            let v = 200 - (n - 70) * 10;
            [v.max(0) as u8, v.max(0) as u8, v.max(0) as u8]
        }
        n @ 82..=89 => {
            let v = 160 + (n - 82) * 8;
            [v.min(255) as u8, v.min(255) as u8, v.min(255) as u8]
        }
        n @ 91..=99 => {
            let v = 200 + (n - 91) * 6;
            [v.min(255) as u8, v.min(255) as u8, v.min(255) as u8]
        }
        n @ 100..=249 => {
            let group = ((n - 100) / 10) as usize;
            let sub = (n % 10) as f64;
            let hues: [[u8; 3]; 15] = [
                [220, 120, 120], [220, 220, 120], [120, 220, 120],
                [120, 220, 220], [120, 120, 220], [220, 120, 220],
                [180, 180, 180], [200, 180, 180], [180, 200, 180],
                [180, 180, 200], [200, 160, 160], [200, 200, 160],
                [160, 200, 160], [160, 200, 200], [160, 160, 200],
            ];
            let [r, g, b] = if group < 15 { hues[group] } else { [128, 128, 128] };
            let f = 1.0 - sub * 0.05;
            [(r as f64 * f) as u8, (g as f64 * f) as u8, (b as f64 * f) as u8]
        }
        _ => {
            let v = 165;
            [v, v, v]
        }
    }
}

pub fn parse_cad_file(file_path: &str) -> Result<CadRenderData, String> {
    let path = std::path::Path::new(file_path);
    let file_name = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let ext = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let drawing = match ext.as_str() {
        "dxf" => {
            Drawing::load_file(file_path)
                .map_err(|e| format!("Error loading DXF: {}", e))?
        }
        _ => return Err(format!("Unsupported file format: {}", ext)),
    };

    let mut entities = Vec::new();
    let mut extents = BoundingBox::new();
    let mut layers: Vec<String> = Vec::new();

    for e in drawing.entities() {
        let layer_name = e.common.layer.clone();
        if !layers.contains(&layer_name) {
            layers.push(layer_name.clone());
        }

        let color_idx = e.common.color.index().unwrap_or(7) as i16;
        let color = dxf_color_to_rgb(color_idx);

        match &e.specific {
            EntityType::Line(line) => {
                let x1 = line.p1.x;
                let y1 = line.p1.y;
                let x2 = line.p2.x;
                let y2 = line.p2.y;
                extents.extend(x1, y1);
                extents.extend(x2, y2);
                entities.push(CadEntity {
                    entity_type: "Line".to_string(),
                    x1, y1, x2, y2,
                    cx: 0.0, cy: 0.0, radius: 0.0,
                    start_angle: 0.0, end_angle: 0.0,
                    vertices: vec![],
                    closed: false,
                    text: String::new(), text_height: 0.0,
                    color,
                    layer: layer_name,
                    line_type: String::new(),
                });
            }
            EntityType::Circle(circle) => {
                let cx = circle.center.x;
                let cy = circle.center.y;
                let r = circle.radius;
                extents.extend(cx - r, cy - r);
                extents.extend(cx + r, cy + r);
                entities.push(CadEntity {
                    entity_type: "Circle".to_string(),
                    x1: 0.0, y1: 0.0, x2: 0.0, y2: 0.0,
                    cx, cy, radius: r,
                    start_angle: 0.0, end_angle: 360.0,
                    vertices: vec![],
                    closed: true,
                    text: String::new(), text_height: 0.0,
                    color,
                    layer: layer_name,
                    line_type: String::new(),
                });
            }
            EntityType::Arc(arc) => {
                let cx = arc.center.x;
                let cy = arc.center.y;
                let r = arc.radius;
                extents.extend(cx - r, cy - r);
                extents.extend(cx + r, cy + r);
                entities.push(CadEntity {
                    entity_type: "Arc".to_string(),
                    x1: 0.0, y1: 0.0, x2: 0.0, y2: 0.0,
                    cx, cy, radius: r,
                    start_angle: arc.start_angle.to_degrees(),
                    end_angle: arc.end_angle.to_degrees(),
                    vertices: vec![],
                    closed: false,
                    text: String::new(), text_height: 0.0,
                    color,
                    layer: layer_name,
                    line_type: String::new(),
                });
            }
            EntityType::LwPolyline(poly) => {
                let verts: Vec<[f64; 2]> = poly.vertices.iter()
                    .map(|v| [v.x, v.y])
                    .collect();
                for v in &verts {
                    extents.extend(v[0], v[1]);
                }
                entities.push(CadEntity {
                    entity_type: "Polyline".to_string(),
                    x1: 0.0, y1: 0.0, x2: 0.0, y2: 0.0,
                    cx: 0.0, cy: 0.0, radius: 0.0,
                    start_angle: 0.0, end_angle: 0.0,
                    vertices: verts,
                    closed: (poly.flags & 1) != 0,
                    text: String::new(), text_height: 0.0,
                    color,
                    layer: layer_name,
                    line_type: String::new(),
                });
            }
            EntityType::Polyline(poly) => {
                let verts: Vec<[f64; 2]> = poly.vertices()
                    .map(|v| [v.location.x, v.location.y])
                    .collect();
                for v in &verts {
                    extents.extend(v[0], v[1]);
                }
                entities.push(CadEntity {
                    entity_type: "Polyline".to_string(),
                    x1: 0.0, y1: 0.0, x2: 0.0, y2: 0.0,
                    cx: 0.0, cy: 0.0, radius: 0.0,
                    start_angle: 0.0, end_angle: 0.0,
                    vertices: verts,
                    closed: (poly.flags & 1) != 0,
                    text: String::new(), text_height: 0.0,
                    color,
                    layer: layer_name,
                    line_type: String::new(),
                });
            }
            EntityType::Ellipse(ellipse) => {
                let cx = ellipse.center.x;
                let cy = ellipse.center.y;
                let rx = (ellipse.major_axis.x * ellipse.major_axis.x + ellipse.major_axis.y * ellipse.major_axis.y).sqrt();
                let ry = rx * ellipse.minor_axis_ratio;
                extents.extend(cx - rx, cy - ry);
                extents.extend(cx + rx, cy + ry);
                entities.push(CadEntity {
                    entity_type: "Ellipse".to_string(),
                    x1: rx, y1: ry, x2: 0.0, y2: 0.0,
                    cx, cy, radius: 0.0,
                    start_angle: ellipse.start_parameter.to_degrees(),
                    end_angle: ellipse.end_parameter.to_degrees(),
                    vertices: vec![],
                    closed: false,
                    text: String::new(), text_height: 0.0,
                    color,
                    layer: layer_name,
                    line_type: String::new(),
                });
            }
            EntityType::Text(text_entity) => {
                let x = text_entity.location.x;
                let y = text_entity.location.y;
                extents.extend(x, y);
                entities.push(CadEntity {
                    entity_type: "Text".to_string(),
                    x1: x, y1: y, x2: 0.0, y2: 0.0,
                    cx: 0.0, cy: 0.0, radius: 0.0,
                    start_angle: 0.0, end_angle: 0.0,
                    vertices: vec![],
                    closed: false,
                    text: text_entity.value.clone(),
                    text_height: text_entity.text_height,
                    color,
                    layer: layer_name,
                    line_type: String::new(),
                });
            }
            EntityType::MText(mtext) => {
                let x = mtext.insertion_point.x;
                let y = mtext.insertion_point.y;
                extents.extend(x, y);
                entities.push(CadEntity {
                    entity_type: "Text".to_string(),
                    x1: x, y1: y, x2: 0.0, y2: 0.0,
                    cx: 0.0, cy: 0.0, radius: 0.0,
                    start_angle: 0.0, end_angle: 0.0,
                    vertices: vec![],
                    closed: false,
                    text: mtext.text.clone(),
                    text_height: mtext.initial_text_height,
                    color,
                    layer: layer_name,
                    line_type: String::new(),
                });
            }
            EntityType::Insert(insert) => {
                let x = insert.location.x;
                let y = insert.location.y;
                extents.extend(x, y);
            }
            _ => {}
        }
    }

    if extents.min_x == f64::MAX {
        extents = BoundingBox { min_x: 0.0, min_y: 0.0, max_x: 100.0, max_y: 100.0 };
    }

    let detected_plans = auto_detect_plans(&entities);

    Ok(CadRenderData {
        entity_count: entities.len(),
        entities,
        extents,
        layers,
        file_name,
        detected_plans,
    })
}

pub fn auto_detect_plans(entities: &[CadEntity]) -> Vec<DetectedPlan> {
    let mut rects: Vec<(f64, f64, f64, f64)> = Vec::new();

    for (_idx, entity) in entities.iter().enumerate() {
        if entity.entity_type == "Polyline" && entity.closed {
            let verts = &entity.vertices;
            if verts.len() >= 4 && verts.len() <= 6 {
                let mut bb = BoundingBox::new();
                for v in verts {
                    bb.extend(v[0], v[1]);
                }
                let w = bb.width();
                let h = bb.height();
                if w > 1.0 && h > 1.0 && w < 50000.0 && h < 50000.0 {
                    rects.push((bb.min_x, bb.min_y, bb.max_x, bb.max_y));
                }
            }
        }
    }

    rects.sort_by(|a, b| {
        let _area_a = (a.2 - a.0) * (a.3 - a.1);
        let _area_b = (b.2 - b.0) * (b.3 - b.1);
        _area_b.partial_cmp(&_area_a).unwrap_or(std::cmp::Ordering::Equal)
    });

    let mut filtered: Vec<(f64, f64, f64, f64)> = Vec::new();
    for rect in &rects {
        let mut is_nested = false;
        for existing in &filtered {
            if rect.0 >= existing.0 - 1.0 && rect.1 >= existing.1 - 1.0 &&
               rect.2 <= existing.2 + 1.0 && rect.3 <= existing.3 + 1.0 {
                is_nested = true;
                break;
            }
        }
        if !is_nested {
            filtered.push(*rect);
        }
    }

    let mut plans = Vec::new();
    for (i, rect) in filtered.iter().enumerate() {
        let inner_entities: Vec<usize> = entities.iter().enumerate()
            .filter(|(_, e)| {
                let (ex, ey) = entity_center(e);
                ex >= rect.0 - 1.0 && ex <= rect.2 + 1.0 &&
                ey >= rect.1 - 1.0 && ey <= rect.3 + 1.0
            })
            .map(|(idx, _)| idx)
            .collect();

        plans.push(DetectedPlan {
            id: i as u32,
            label: format!("Plano {}", i + 1),
            min_x: rect.0,
            min_y: rect.1,
            max_x: rect.2,
            max_y: rect.3,
            inner_entities,
        });
    }

    plans
}

fn entity_center(e: &CadEntity) -> (f64, f64) {
    if e.entity_type == "Line" {
        ((e.x1 + e.x2) / 2.0, (e.y1 + e.y2) / 2.0)
    } else if e.entity_type == "Circle" || e.entity_type == "Arc" {
        (e.cx, e.cy)
    } else if !e.vertices.is_empty() {
        let cx: f64 = e.vertices.iter().map(|v| v[0]).sum::<f64>() / e.vertices.len() as f64;
        let cy: f64 = e.vertices.iter().map(|v| v[1]).sum::<f64>() / e.vertices.len() as f64;
        (cx, cy)
    } else {
        (e.x1, e.y1)
    }
}
