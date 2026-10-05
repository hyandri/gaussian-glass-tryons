// Dev-only controls (shown with the "dev" checkbox): manual fit sliders, Re-fit, Reset, head flips, landmark dots.
import { head, dots } from "./head.js";
import { state, DEFAULT, applyState, onStateChange } from "./glasses.js";

// Builds the sliders; onRefit() is called by the "Re-fit" button.
export function initDev(onRefit) {
  const inputs = {};
  function makeRow(parent, label, key, min, max, step) {
    const row = document.createElement("div");
    row.className = "row";
    const l = document.createElement("span"); l.textContent = label;
    const r = document.createElement("input");
    r.type = "range"; r.min = min; r.max = max; r.step = step;
    const n = document.createElement("input");
    n.type = "number"; n.step = step;
    const update = (v) => { state[key] = parseFloat(v); applyState(); };
    r.oninput = () => update(r.value);
    n.oninput = () => update(n.value);
    row.append(l, r, n);
    parent.appendChild(row);
    inputs[key] = { r, n };
  }
  const posRows = document.getElementById("posRows");
  const rotRows = document.getElementById("rotRows");
  makeRow(posRows, "X", "px", -2, 2, 0.001);
  makeRow(posRows, "Y", "py", -2, 2, 0.001);
  makeRow(posRows, "Z", "pz", -2, 2, 0.001);
  makeRow(rotRows, "X", "rx", -180, 180, 0.5);
  makeRow(rotRows, "Y", "ry", -180, 180, 0.5);
  makeRow(rotRows, "Z", "rz", -180, 180, 0.5);
  makeRow(document.getElementById("scaleRow"), "S", "s", 0.05, 3, 0.001);
  // keep the sliders showing the holder state whenever anything (auto-fit, reset, a slider) changes it
  onStateChange(() => { for (const k in inputs) inputs[k].r.value = inputs[k].n.value = state[k]; });

  document.getElementById("autoBtn").onclick = onRefit;
  document.getElementById("resetBtn").onclick = () => { Object.assign(state, DEFAULT); applyState(); };

  const flip = (axis) => { if (head) head.rotation[axis] += Math.PI; };
  document.getElementById("flipX").onclick = () => flip("x");
  document.getElementById("flipY").onclick = () => flip("y");
  document.getElementById("flipZ").onclick = () => flip("z");

  const dotsToggle = document.getElementById("dotsToggle");
  const devToggle = document.getElementById("devToggle");
  dotsToggle.onchange = () => { dots.visible = dotsToggle.checked; };
  devToggle.onchange = () => document.body.classList.toggle("dev", devToggle.checked);
  // browsers may restore checkbox state on a soft reload; sync once at startup
  dots.visible = dotsToggle.checked;
  document.body.classList.toggle("dev", devToggle.checked);
}
