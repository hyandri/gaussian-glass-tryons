/* ====== EDIT THESE ====== */

// One folder per person under heads/. Each needs gaussians.ply (+ landmarks3d.json and face_frame.json from pipeline/fit_face.py)
export const HEADS = ["head1", "head2", "head3", "head4", "head5"];

// Shop catalog (right panel). Glasses live in glasses/. Names, colours and prices are dummy placeholders.
export const BRAND = "Halden Eyewear";
export const CATALOG = [
  { file: "glasses/glasses.glb",   name: "Aurora Classic",  colour: "Matte Black",    price: 129 },
  { file: "glasses/glasses01.glb", name: "Metro Square",    colour: "Graphite",       price: 149 },
  { file: "glasses/glasses02.glb", name: "Lumen Slim",      colour: "Charcoal",       price: 99  },
  { file: "glasses/glasses03.glb", name: "Vista Wide",      colour: "Smoke Grey",     price: 169 },
  { file: "glasses/glasses04.glb", name: "Orbit Wire",      colour: "Brushed Silver", price: 189 },
  { file: "glasses/glasses05.glb", name: "Harbor Bold",     colour: "Midnight",       price: 139 },
  { file: "glasses/glasses06.glb", name: "Summit Sport",    colour: "Jet Black",      price: 159 },
];

// Per-model axis fix (degrees about Y), for models not authored "wide along X, facing +Z".
// Found from the task-2 logs: 03 has its frame at -X (faces left), 06 has its frame at +X (faces right).
export const GLASSES_FIX = { "glasses/glasses03.glb": { ry: 90 }, "glasses/glasses06.glb": { ry: -90 } };

// Glasses calibration, in face-frame units (offsets in pupil-distances, rotations in degrees,
// s = glasses width / pupil distance). DEFAULT_CAL is shared; CALS holds per-model overrides.
// rx 2.5: forward tilt that looked right on all heads (user, by eye) once "up" became the splat vertical (src/fit.js).
// oy/oz: the old (0, 0, -0.7) re-expressed in the new frame, averaged over head1-5, so the height stays where it was.
export const DEFAULT_CAL = { ox: 0, oy: -0.18, oz: -0.68, rx: 2.5, ry: 0, rz: 0, s: 2.2 };
export const CALS = {
  // e.g. "glasses/glasses01.glb": { oy: -0.20 },   (only the keys that differ from DEFAULT_CAL)
};

// MediaPipe web files (tasks-vision 0.10.21) are self-hosted in vendor/mediapipe/; the model is the local .task file.
export const MP_BUNDLE = "./vendor/mediapipe/vision_bundle.mjs";
export const MP_WASM = "./vendor/mediapipe/wasm";
export const MP_MODEL = "pipeline/face_landmarker.task";   // shared with pipeline/fit_face.py
