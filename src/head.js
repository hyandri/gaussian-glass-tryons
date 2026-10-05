// The Gaussian-splat head, its face frame (face_frame.json) and the landmark debug dots.
import * as THREE from "three";
import { SplatMesh } from "@sparkjsdev/spark";
import { rig } from "./viewer.js";
import { setStatus } from "./status.js";

export let head = null;
export let FF = null;                       // face_frame.json of the current head
export const dots = new THREE.Group();      // landmark dots, kept beside the head in the rig and synced to its rotation
dots.visible = false;                       // off for the demo; "show landmarks" turns them on
rig.add(dots);

export async function loadHead(name) {
  setStatus("Loading head " + name + "...");
  if (head) { rig.remove(head); if (head.dispose) head.dispose(); }
  dots.clear();
  FF = null;

  head = new SplatMesh({ url: `heads/${name}/gaussians.ply` });
  head.rotation.x = -Math.PI / 2;           // FaceLift frame is Z-up with the face toward -Y
  rig.add(head);
  try { await head.initialized; }
  catch (e) { setStatus("Head failed: " + e); return false; }

  let note = "Head loaded.";
  try {
    const r = await fetch(`heads/${name}/face_frame.json?v=${Date.now()}`);
    if (!r.ok) throw new Error("HTTP " + r.status);
    FF = await r.json();
  } catch (e) { note += `\nNo face_frame.json (run: python pipeline/fit_face.py ${name}). Auto-fit is off.`; }

  try {
    const r = await fetch(`heads/${name}/landmarks3d.json?v=${Date.now()}`);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const L = await r.json();
    for (const [k, p] of Object.entries(L)) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.012),
        new THREE.MeshBasicMaterial({
          color: k.startsWith("iris") ? 0xff0000 : (k === "bridge_low" ? 0xffff00 : 0x00ff00),
          depthTest: false, depthWrite: false, transparent: true
        })
      );
      m.position.set(p[0], p[1], p[2]);
      m.renderOrder = 999;
      dots.add(m);
    }
  } catch (e) { /* landmarks are optional */ }
  setStatus(note);
  return true;
}

// Called every frame: dots sit beside the head in the rig, so they copy its (rig-local) rotation, e.g. after a flip.
export function syncDots() {
  if (head) dots.quaternion.copy(head.quaternion);
}
