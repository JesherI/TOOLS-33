use serde::{Serialize, Deserialize};
use lopdf::{Document, Object, Stream, Dictionary};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct PaperSizeCm {
    pub width_cm: f64,
    pub height_cm: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportRequest {
    pub input_path: String,
    pub selected_plans: Vec<PlanSelection>,
    #[allow(dead_code)]
    pub scale_denominator: f64,
    pub paper_size: PaperSizeDef,
    pub output_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanSelection {
    pub id: u32,
    pub label: String,
    pub min_x: f64,
    pub min_y: f64,
    pub max_x: f64,
    pub max_y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaperSizeDef {
    pub name: String,
    pub width_cm: f64,
    pub height_cm: f64,
}

fn cm_to_points(cm: f64) -> f64 {
    cm * 10.0 * 72.0 / 25.4
}

pub fn export_plans_to_pdf(request: &ExportRequest) -> Result<String, String> {
    let parsed = crate::cad_parser::parse_cad_file(&request.input_path)?;
    let paper_w = cm_to_points(request.paper_size.width_cm);
    let paper_h = cm_to_points(request.paper_size.height_cm);

    let mut doc = Document::new();
    let mut pages = Vec::new();

    for plan in &request.selected_plans {
        let plan_w = plan.max_x - plan.min_x;
        let plan_h = plan.max_y - plan.min_y;
        if plan_w <= 0.0 || plan_h <= 0.0 { continue; }

        // Scale the plan to fit within the paper, preserving aspect ratio
        let s = (paper_w / plan_w).min(paper_h / plan_h);
        let cw = plan_w * s;
        let ch = plan_h * s;
        let ox = (paper_w - cw) / 2.0;
        let oy = (paper_h - ch) / 2.0;

        let content = generate_page_content(&parsed, plan, s, ox, oy, paper_w, paper_h);

        let mut stream_dict = Dictionary::new();
        stream_dict.set("Length", Object::Integer(content.len() as i64));
        let content_id = doc.add_object(Stream::new(stream_dict, content));

        let page_id = doc.new_object_id();
        let page_dict = Dictionary::from_iter(vec![
            ("Type", Object::Name("Page".as_bytes().to_vec())),
            ("MediaBox", Object::Array(vec![
                Object::Real(0.0),
                Object::Real(0.0),
                Object::Real(paper_w as f32),
                Object::Real(paper_h as f32),
            ])),
            ("Contents", Object::Reference(content_id)),
            ("Resources", Object::Dictionary(Dictionary::from_iter(vec![
                ("ProcSet", Object::Array(vec![
                    Object::Name("PDF".as_bytes().to_vec()),
                    Object::Name("Text".as_bytes().to_vec()),
                ])),
                ("Font", Object::Dictionary(Dictionary::from_iter(vec![
                    ("F1", Object::Dictionary(Dictionary::from_iter(vec![
                        ("Type", Object::Name("Font".as_bytes().to_vec())),
                        ("Subtype", Object::Name("Type1".as_bytes().to_vec())),
                        ("BaseFont", Object::Name("Helvetica".as_bytes().to_vec())),
                    ]))),
                ]))),
            ]))),
        ]);
        doc.objects.insert(page_id, Object::Dictionary(page_dict));
        pages.push(page_id);
    }

    let pages_id = doc.new_object_id();
    let kids: Vec<Object> = pages.iter().map(|id| Object::Reference(*id)).collect();
    let pages_dict = Dictionary::from_iter(vec![
        ("Type", Object::Name("Pages".as_bytes().to_vec())),
        ("Kids", Object::Array(kids)),
        ("Count", Object::Integer(pages.len() as i64)),
    ]);
    doc.objects.insert(pages_id, Object::Dictionary(pages_dict));

    for page in &pages {
        if let Some(Object::Dictionary(dict)) = doc.objects.get_mut(page) {
            dict.set("Parent", Object::Reference(pages_id));
        }
    }

    let catalog_id = doc.new_object_id();
    let catalog_dict = Dictionary::from_iter(vec![
        ("Type", Object::Name("Catalog".as_bytes().to_vec())),
        ("Pages", Object::Reference(pages_id)),
    ]);
    doc.objects.insert(catalog_id, Object::Dictionary(catalog_dict));

    doc.trailer.set("Root", Object::Reference(catalog_id));
    doc.compress();

    doc.save(&request.output_path)
        .map_err(|e| format!("Error saving PDF: {}", e))?;

    Ok(request.output_path.clone())
}

fn generate_page_content(
    data: &crate::cad_parser::CadRenderData,
    plan: &PlanSelection,
    s: f64,
    ox: f64,
    oy: f64,
    _page_w: f64,
    page_h: f64,
) -> Vec<u8> {
    let mut ops = Vec::new();
    let plan_w = plan.max_x - plan.min_x;
    let plan_h = plan.max_y - plan.min_y;

    // Draw entities at the transformed CAD position
    ops.push("q".to_string());
    ops.push(format!("{} 0 0 {} {} {} cm", s, s, ox, oy));
    ops.push(format!("0.5 w"));

    for entity in &data.entities {
        let [cr, cg, cb] = entity.color;
        let rr = cr as f64 / 255.0;
        let gg = cg as f64 / 255.0;
        let bb = cb as f64 / 255.0;

        // CAD sobre fondo negro → invertir blanco a negro para PDF (fondo blanco)
        let (sr, sg, sb) = if cr >= 200 && cg >= 200 && cb >= 200 {
            (0.0, 0.0, 0.0)
        } else if cr == 0 && cg == 0 && cb == 0 {
            (1.0, 1.0, 1.0)
        } else {
            (rr, gg, bb)
        };

        match entity.entity_type.as_str() {
            "Line" => {
                let x1 = entity.x1 - plan.min_x;
                let y1 = entity.y1 - plan.min_y;
                let x2 = entity.x2 - plan.min_x;
                let y2 = entity.y2 - plan.min_y;
                if rect_overlap(x1, y1, x2, y2, 0.0, 0.0, plan_w, plan_h) {
                    ops.push(format!("{} {} {} RG", sr, sg, sb));
                    ops.push(format!("{} {} m {} {} l S", x1, y1, x2, y2));
                }
            }
            "Polyline" => {
                if entity.vertices.len() < 2 { continue; }
                let verts: Vec<(f64, f64)> = entity.vertices.iter()
                    .map(|v| (v[0] - plan.min_x, v[1] - plan.min_y))
                    .collect();
                let in_bounds = verts.iter().any(|(x, y)| {
                    *x >= -1.0 && *x <= plan_w + 1.0 && *y >= -1.0 && *y <= plan_h + 1.0
                });
                if !in_bounds { continue; }
                ops.push(format!("{} {} {} RG", sr, sg, sb));
                ops.push(format!("{} {} m", verts[0].0, verts[0].1));
                for i in 1..verts.len() {
                    ops.push(format!("{} {} l", verts[i].0, verts[i].1));
                }
                if entity.closed {
                    ops.push("h".to_string());
                }
                ops.push("S".to_string());
            }
            "Circle" => {
                let cx = entity.cx - plan.min_x;
                let cy = entity.cy - plan.min_y;
                let r = entity.radius;
                if cx + r < 0.0 || cx - r > plan_w || cy + r < 0.0 || cy - r > plan_h {
                    continue;
                }
                ops.push(format!("{} {} {} RG", sr, sg, sb));
                ops.push(format!("{} {} {} 0 360 arc S", cx, cy, r));
            }
            "Arc" => {
                let cx = entity.cx - plan.min_x;
                let cy = entity.cy - plan.min_y;
                let r = entity.radius;
                if cx + r < 0.0 || cx - r > plan_w || cy + r < 0.0 || cy - r > plan_h {
                    continue;
                }
                ops.push(format!("{} {} {} RG", sr, sg, sb));
                ops.push(format!("{} {} {} {} {} arc S", cx, cy, r, entity.start_angle, entity.end_angle));
            }
            "Ellipse" => {
                let cx = entity.cx - plan.min_x;
                let cy = entity.cy - plan.min_y;
                let rx = entity.x1;
                let ry = entity.y1;
                let sa = entity.start_angle;
                let ea = entity.end_angle;
                if cx + rx < 0.0 || cx - rx > plan_w || cy + ry < 0.0 || cy - ry > plan_h {
                    continue;
                }
                ops.push(format!("{} {} {} RG", sr, sg, sb));
                ops.push("q".to_string());
                ops.push(format!("1 0 0 {} {} {} cm", ry / rx, cx, cy));
                ops.push(format!("{} {} {} {} {} arc S", 0.0, 0.0, rx, sa, ea));
                ops.push("Q".to_string());
            }
            _ => {}
        }
    }

    ops.push("Q".to_string());

    // Plan label
    ops.push("BT".to_string());
    ops.push("/F1 8 Tf".to_string());
    ops.push(format!("0 0 0 rg"));
    ops.push(format!("{} {} Td ({}) Tj", 12.0, page_h - 14.0, plan.label));
    ops.push("ET".to_string());

    ops.join("\n").into_bytes()
}

fn rect_overlap(x1: f64, y1: f64, x2: f64, y2: f64,
    min_x: f64, min_y: f64, max_x: f64, max_y: f64) -> bool {
    let ex = x1.max(x2) < min_x || x1.min(x2) > max_x;
    let ey = y1.max(y2) < min_y || y1.min(y2) > max_y;
    !ex && !ey
}
