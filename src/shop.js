// Right-hand shop panel: one card per CATALOG entry, with a product picture rendered in the browser.
import * as THREE from "three";
import { BRAND, CATALOG } from "./config.js";
import { normalizedGlasses } from "./glasses.js";

const cards = {};                    // file -> { el, pic, img }

// Builds the cards; onPick(file) is called when a card is clicked.
export function initShop(onPick) {
  document.getElementById("shopBrand").textContent = BRAND;
  document.getElementById("shopSub").textContent = `Frames · ${CATALOG.length} styles · tap to try on`;
  const list = document.getElementById("shopList");
  for (const c of CATALOG) {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `<span class="tag">Wearing</span><div class="pic"><img alt=""></div>
      <div class="info"><span class="name"></span><span class="price"></span><span class="colour"></span></div>`;
    el.querySelector(".name").textContent = c.name;
    el.querySelector(".price").textContent = "$" + c.price;
    el.querySelector(".colour").textContent = c.colour;
    el.querySelector("img").alt = c.name;
    el.onclick = () => onPick(c.file);
    list.appendChild(el);
    cards[c.file] = { el, pic: el.querySelector(".pic"), img: el.querySelector("img") };
  }
}

export function markSelected(file) {
  for (const f in cards) cards[f].el.classList.toggle("selected", f === file);
}

// Product pictures: rendered once with a small offscreen renderer, one model at a time, then the renderer is freed.
export async function renderThumbnails() {
  const W = 320, H = 200;
  const tr = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  tr.setSize(W, H, false);
  tr.setClearColor(0x000000, 0);
  const ts = new THREE.Scene();
  ts.add(new THREE.AmbientLight(0xffffff, 1.0));
  ts.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  key.position.set(1.5, 2, 3);
  ts.add(key);
  const tc = new THREE.PerspectiveCamera(30, W / H, 0.01, 20);
  tc.position.set(0.55, 0.25, 1.75);   // 3/4 front: normalised glasses are width 1, facing +Z
  tc.lookAt(0, 0, 0);
  for (const c of CATALOG) {
    try {
      const norm = await normalizedGlasses(c.file);
      ts.add(norm);
      tr.render(ts, tc);
      cards[c.file].img.src = tr.domElement.toDataURL("image/png");
      cards[c.file].pic.classList.add("ready");
      ts.remove(norm);
    } catch (e) { console.warn("thumbnail failed", c.file, e); }
  }
  tr.dispose();
  tr.forceContextLoss();               // free the second WebGL context
}
