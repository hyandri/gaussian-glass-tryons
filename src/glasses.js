// Glasses models: loading (cached), axis fix + normalising, and the holder transform that the fit and sliders drive.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CATALOG, GLASSES_FIX } from "./config.js";
import { rig } from "./viewer.js";

const loader = new GLTFLoader();
export const holder = new THREE.Group();     // the worn glasses; its transform comes from `state`
rig.add(holder);
export let currentName = null;               // file of the glasses being worn

// Holder transform in rig-local units: position, rotation in degrees, uniform scale.
export const DEFAULT = { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, s: 1 };
export const state = { ...DEFAULT };

const stateListeners = [];
export const onStateChange = (fn) => stateListeners.push(fn);   // dev sliders use this to stay in sync

export function applyState() {
  holder.position.set(state.px, state.py, state.pz);
  holder.rotation.set(
    THREE.MathUtils.degToRad(state.rx),
    THREE.MathUtils.degToRad(state.ry),
    THREE.MathUtils.degToRad(state.rz)
  );
  holder.scale.setScalar(state.s);
  for (const fn of stateListeners) fn();
}

// Each .glb is downloaded and parsed once; callers get their own clone (main viewer + thumbnails).
const glassesCache = {};
function getGlasses(file) {
  if (!glassesCache[file]) {
    glassesCache[file] = loader.loadAsync(file).then((g) => g.scene)
      .catch((e) => { delete glassesCache[file]; throw e; });   // allow a retry after a failed load
  }
  return glassesCache[file];
}

// A fresh copy of the model, axis-fixed (GLASSES_FIX), centred on its bounding box and normalised to width 1.
export async function normalizedGlasses(file) {
  const model = (await getGlasses(file)).clone(true);
  const fix = GLASSES_FIX[file];
  if (fix) { model.rotation.y = THREE.MathUtils.degToRad(fix.ry || 0); }
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  const norm = new THREE.Group();
  norm.add(model);
  norm.scale.setScalar(1 / Math.max(size.x, 0.0001));
  return norm;
}

export const productName = (file) => (CATALOG.find((c) => c.file === file) || { name: file.split("/").pop() }).name;

// Puts the model in the holder (reset to DEFAULT). Returns true if this call's model is now worn, false if a newer
// call superseded it while loading. Throws if the file fails to load.
let glassesToken = 0;
export async function wearGlasses(file) {
  const token = ++glassesToken;
  let norm;
  try { norm = await normalizedGlasses(file); }
  catch (err) { if (token === glassesToken) throw err; return false; }
  if (token !== glassesToken) return false;
  holder.clear();
  holder.add(norm);
  currentName = file;
  Object.assign(state, DEFAULT);
  applyState();
  return true;
}
