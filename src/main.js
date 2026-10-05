// Entry point: wires the modules together and starts the render loop.
import { HEADS, CATALOG, CALS } from "./config.js";
import { renderer, scene, camera, controls } from "./viewer.js";
import { loadHead, syncDots } from "./head.js";
import { wearGlasses, currentName, productName } from "./glasses.js";
import { autoFit } from "./fit.js";
import { initShop, markSelected, renderThumbnails } from "./shop.js";
import { initDev } from "./dev.js";
import { camTick } from "./webcam.js";
import { setStatus } from "./status.js";

// Glasses are fitted automatically after every glasses load and every head load.
async function pickGlasses(file) {
  setStatus("Loading " + productName(file) + "...");
  markSelected(file);
  let worn;
  try { worn = await wearGlasses(file); }
  catch (err) { setStatus("Failed to load " + file + ":\n" + (err.message || err)); return; }
  if (!worn) return;                         // a newer selection was made while this one was loading
  setStatus(autoFit() ? "Wearing " + productName(file) : "Loaded " + productName(file) + ".");
}

async function pickHead(name) {
  // keep loadHead's status (it explains a missing face_frame.json) unless the glasses could be fitted
  if (await loadHead(name) && autoFit()) setStatus("Wearing " + productName(currentName));
}

const headSelect = document.getElementById("headSelect");
for (const h of HEADS) headSelect.add(new Option(h, h));
headSelect.onchange = () => pickHead(headSelect.value);

initShop(pickGlasses);
initDev(() => {
  if (!autoFit()) return setStatus("No face_frame.json for this head.\nRun: python pipeline/fit_face.py <headname>");
  setStatus(CALS[currentName] ? "Re-fit applied (saved calibration)." : "Re-fit applied with DEFAULT_CAL.");
});

pickHead(HEADS[0]).then(() => pickGlasses(CATALOG[0].file)).then(renderThumbnails);

renderer.setAnimationLoop(() => {
  syncDots();
  camTick();
  controls.update();
  renderer.render(scene, camera);
});
