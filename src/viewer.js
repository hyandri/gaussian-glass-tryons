// Renderer, scene, camera, orbit controls and the rig that holds head + glasses + dots.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SparkRenderer } from "@sparkjsdev/spark";

export const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.01, 100);
camera.position.set(0, 0, 3);

scene.add(new SparkRenderer({ renderer }));
scene.add(new THREE.AmbientLight(0xffffff, 1.2));
const dl = new THREE.DirectionalLight(0xffffff, 2);
dl.position.set(2, 3, 4);
scene.add(dl);

export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// rig = parent of head, glasses holder and dots; rotating the rig turns all three together (webcam pose drives it).
// Head, holder and dots all live in rig-local coordinates; the rig itself stays at the origin.
export const rig = new THREE.Group();
scene.add(rig);

// Camera preset buttons (data-view="front|back|side|top").
const D = 3;
document.querySelectorAll("[data-view]").forEach((b) => {
  b.onclick = () => {
    const v = b.dataset.view;
    if (v === "front") camera.position.set(0, 0, D);
    if (v === "back")  camera.position.set(0, 0, -D);
    if (v === "side")  camera.position.set(D, 0, 0);
    if (v === "top")   camera.position.set(0, D, 0.001);
    controls.target.set(0, 0, 0);
    controls.update();
  };
});
