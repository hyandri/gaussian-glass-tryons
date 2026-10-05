// Auto-fit: places the worn glasses from the head's face frame and the calibration (see ARCHITECTURE.md).
import * as THREE from "three";
import { DEFAULT_CAL, CALS } from "./config.js";
import { head, FF } from "./head.js";
import { currentName, state, applyState } from "./glasses.js";

// Face frame in rig-local space. Head and holder share the rig as parent, so this is independent of the rig's
// current rotation: head.matrix / head.quaternion are relative to the rig.
// x = eye line (left iris -> right iris) from face_frame.json. "Up" is NOT face_frame.json's mouth->eyes axis:
// that axis leans back 10-20 deg by a different amount per face, which tilted the glasses differently on every
// head. FaceLift outputs every head upright, so the splat's own +Z (its vertical) is used instead,
// orthogonalised against the eye line. z = x cross y, pointing out of the face (as before).
const SPLAT_UP = new THREE.Vector3(0, 0, 1);           // FaceLift frame is Z-up
function faceFrame() {
  head.updateMatrix();
  const E = new THREE.Vector3(...FF.origin).applyMatrix4(head.matrix);
  const x = new THREE.Vector3(FF.R[0][0], FF.R[1][0], FF.R[2][0]).applyQuaternion(head.quaternion);
  const up = SPLAT_UP.clone().applyQuaternion(head.quaternion);
  const y = up.addScaledVector(x, -up.dot(x)).normalize();
  const z = new THREE.Vector3().crossVectors(x, y);
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  return { E, q, PD: FF.PD_splat };
}

// position = E + faceQuat * (o * PD), rotation = faceQuat * calRot, scale = s * PD.
// Returns false if nothing could be fitted (no glasses yet, or the head has no face_frame.json).
export function autoFit() {
  if (!currentName || !head || !FF) return false;
  const C = { ...DEFAULT_CAL, ...(CALS[currentName] || {}) };
  const f = faceFrame();
  const pos = new THREE.Vector3(C.ox, C.oy, C.oz).multiplyScalar(f.PD).applyQuaternion(f.q).add(f.E);
  const rel = new THREE.Quaternion().setFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(C.rx), THREE.MathUtils.degToRad(C.ry), THREE.MathUtils.degToRad(C.rz), "XYZ"));
  const e = new THREE.Euler().setFromQuaternion(f.q.clone().multiply(rel), "XYZ");
  Object.assign(state, {
    px: pos.x, py: pos.y, pz: pos.z,
    rx: THREE.MathUtils.radToDeg(e.x), ry: THREE.MathUtils.radToDeg(e.y), rz: THREE.MathUtils.radToDeg(e.z),
    s: C.s * f.PD
  });
  applyState();
  return true;
}
