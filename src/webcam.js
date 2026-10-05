// Webcam head pose: MediaPipe FaceLandmarker (video mode) -> yaw/pitch/roll -> One-Euro smoothing -> rig rotation.
// Rotation only; translation and expressions are not used.
import * as THREE from "three";
import { MP_BUNDLE, MP_WASM, MP_MODEL } from "./config.js";
import { rig } from "./viewer.js";

const camBtn = document.getElementById("camBtn");
const camVideo = document.getElementById("camVideo");
const camStatus = document.getElementById("camStatus");
const camMirror = document.getElementById("camMirror");

// One-Euro filter (Casiez et al. 2012): light smoothing that backs off when the head moves fast.
class OneEuro {
  constructor(minCutoff = 1.5, beta = 0.05, dCutoff = 1) { Object.assign(this, { minCutoff, beta, dCutoff }); this.reset(); }
  reset() { this.x = null; this.dx = 0; this.t = null; }
  static alpha(cutoff, dt) { const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt); }
  filter(v, t) {                                   // t in seconds
    if (this.x === null) { this.x = v; this.t = t; return v; }
    const dt = Math.max(t - this.t, 1e-3); this.t = t;
    const dx = (v - this.x) / dt;
    this.dx += OneEuro.alpha(this.dCutoff, dt) * (dx - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += OneEuro.alpha(cutoff, dt) * (v - this.x);
    return this.x;
  }
}

const filters = [new OneEuro(), new OneEuro(), new OneEuro()];   // yaw, pitch, roll
const neutral = [0, 0, 0];                                       // filtered pose when "Calibrate neutral" was pressed
let filtered = [0, 0, 0];
const LIMIT = [70, 45, 45];                                      // clamp: yaw, pitch, roll (degrees)
let landmarker = null, stream = null, running = false, lastT = -1, hist = [];

async function startCam() {
  camStatus.textContent = "loading MediaPipe...";
  try {
    if (!landmarker) {
      const { FaceLandmarker, FilesetResolver } = await import(new URL(MP_BUNDLE, document.baseURI).href);
      const fileset = await FilesetResolver.forVisionTasks(MP_WASM);
      landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MP_MODEL },
        runningMode: "VIDEO", numFaces: 1, outputFacialTransformationMatrixes: true
      });
    }
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    camVideo.srcObject = stream;
    await camVideo.play();
    camVideo.style.display = "block";
    running = true; hist = [];
    filters.forEach((f) => f.reset());
    camBtn.textContent = "Stop webcam";
    camStatus.textContent = "running, no face yet";
  } catch (e) {
    camStatus.textContent = "webcam failed:\n" + (e.message || e);
    console.error(e);
  }
}

function stopCam() {
  running = false;
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null; camVideo.srcObject = null; camVideo.style.display = "none";
  camBtn.textContent = "Start webcam";
  camStatus.textContent = "webcam off";
  rig.rotation.set(0, 0, 0);                 // back to the orbit-only view
}

camBtn.onclick = () => (running ? stopCam() : startCam());
document.getElementById("camCalBtn").onclick = () => {
  if (!running) { camStatus.textContent = "start the webcam first"; return; }
  neutral[0] = filtered[0]; neutral[1] = filtered[1]; neutral[2] = filtered[2];
};

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();
const wrap = (a) => ((a + 540) % 360) - 180;

// Called every frame; does work only when the webcam has a new video frame.
export function camTick() {
  if (!running || camVideo.readyState < 2 || camVideo.currentTime === lastT) return;
  lastT = camVideo.currentTime;
  const res = landmarker.detectForVideo(camVideo, performance.now());
  const mat = res.facialTransformationMatrixes && res.facialTransformationMatrixes[0];
  if (!mat) { camStatus.textContent = "no face detected"; return; }   // the rig keeps its last pose
  // mat.data = 4x4, column-major, canonical face -> camera space (camera: x right, y up, z toward viewer).
  // decompose() strips the metric scale; Euler order YXZ = yaw (about y), pitch (about x), roll (about z).
  _m.fromArray(mat.data).decompose(_p, _q, _s);
  _e.setFromQuaternion(_q, "YXZ");
  const d = THREE.MathUtils.radToDeg;
  const cur = [d(_e.y), d(_e.x), d(_e.z)];
  const tSec = performance.now() / 1000;
  filtered = cur.map((v, i) => filters[i].filter(v, tSec));
  // pose relative to the neutral, clamped
  const [yaw, pitch, roll] = filtered.map((v, i) =>
    Math.max(-LIMIT[i], Math.min(LIMIT[i], wrap(v - neutral[i]))));
  // Viewer frame = MediaPipe camera frame (x right, y up, z toward viewer; the head faces +z), so the pose maps
  // straight onto the rig: yaw -> about y, pitch -> about x, roll -> about z (Euler order YXZ, same as extracted).
  // The raw camera image is NOT mirrored: user turning to their left shows the face turning toward screen right.
  // Mirror mode flips yaw and roll so the face behaves like a mirror reflection (pitch is unaffected).
  const mir = camMirror.checked ? -1 : 1;
  rig.rotation.order = "YXZ";
  rig.rotation.set(THREE.MathUtils.degToRad(pitch), THREE.MathUtils.degToRad(mir * yaw), THREE.MathUtils.degToRad(mir * roll));

  // dev readout: raw angles + jitter (std-dev over the last 30 frames; only meaningful when holding still)
  hist.push(cur); if (hist.length > 30) hist.shift();
  const sd = [0, 1, 2].map((i) => { const m = hist.reduce((a, h) => a + h[i], 0) / hist.length;
    return Math.sqrt(hist.reduce((a, h) => a + (h[i] - m) ** 2, 0) / hist.length); });
  const f = (v) => (v >= 0 ? "+" : "") + v.toFixed(1).padStart(5);
  camStatus.textContent =
    `yaw   ${f(cur[0])} deg  (jitter ${sd[0].toFixed(2)})\n` +
    `pitch ${f(cur[1])} deg  (jitter ${sd[1].toFixed(2)})\n` +
    `roll  ${f(cur[2])} deg  (jitter ${sd[2].toFixed(2)})\n` +
    `-> rig yaw ${f(yaw)} pitch ${f(pitch)} roll ${f(roll)}`;
}
