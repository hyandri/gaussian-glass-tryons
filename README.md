# Splat head + glasses try-on

Local browser viewer. A FaceLift single-photo Gaussian-splat head gets glasses placed on it automatically
(MediaPipe landmarks triangulated from FaceLift's 6 rendered views). A webcam can drive the head's pose live.
Everything runs locally and offline.

## Folder layout
```
index.html              page markup (left panel, shop panel); loads src/main.js
css/style.css           all styles
src/config.js           EDIT HERE: HEADS, BRAND, CATALOG (shop items), GLASSES_FIX, DEFAULT_CAL, CALS
src/main.js             entry point: wires modules, startup, render loop
src/viewer.js           renderer, scene, camera, orbit controls, rig, camera view buttons
src/head.js             splat head, face_frame.json, landmark dots
src/glasses.js          glasses loading (cached), axis fix + normalising, holder state
src/fit.js              auto-fit from the face frame
src/shop.js             right-hand catalog cards + in-browser thumbnails
src/webcam.js           webcam head pose (MediaPipe + One-Euro smoothing) -> rig rotation
src/dev.js              dev-only controls (sliders, Re-fit, flips, landmark toggle)
pipeline/fit_face.py    landmarks + face frame for each head (needs Python env, see below)
pipeline/opencv_cameras.json   FaceLift's 6 camera definitions
pipeline/face_landmarker.task  MediaPipe model (used by fit_face.py and by the browser webcam)
heads/<name>/           gaussians.ply, output.png (3072x512), optional input.png
                        + landmarks3d.json, face_frame.json (written by pipeline/fit_face.py)
glasses/*.glb           glasses models, listed in CATALOG in src/config.js
vendor/                 self-hosted libraries: three.js 0.178.0, its GLTFLoader/OrbitControls,
                        Spark 0.1.10, @mediapipe/tasks-vision 0.10.21 (+ WASM)
run.sh                  starts the local web server
```
Heads are generated elsewhere (FaceLift on a Kaggle T4) and copied into `heads/<name>/`.
FaceLift weights fall under the Adobe Research License: demo/academic use only.

## Run
```
./run.sh                # then open http://localhost:8000
```
Equivalent: `python3 -m http.server 8000` from this folder. **Windows:** open a terminal in this folder and run
`python -m http.server 8000`, then open http://localhost:8000. Do not open `index.html` directly (`file://`
blocks loading the models), and use `localhost` (the webcam needs localhost or HTTPS).
After changes, hard-refresh with Ctrl+Shift+R.

## Add a head
1. Copy `gaussians.ply` and `output.png` (and `input.png` if you have it) into `heads/<name>/`.
2. From the project folder run `python pipeline/fit_face.py <name>` (all heads: `--all`, recompute: `--force`).
   Needs Python 3 with mediapipe, opencv-python, numpy (conda env `3d_glasses`). It prints the views found and the
   reprojection error per head; a WARNING means check that head carefully.
3. Add `"<name>"` to `HEADS` in `src/config.js`, then hard-refresh.

## Add glasses
Put the `.glb` in `glasses/` and add an entry (file, name, colour, price) to `CATALOG` in `src/config.js`; its card and
picture appear automatically. If the lenses face sideways, add an entry to `GLASSES_FIX` (degrees about Y).
A shared calibration is in `DEFAULT_CAL`; per-model overrides go in `CALS`.

## Demo steps
1. `./run.sh`, open http://localhost:8000.
2. Pick a head on the left; click a frame in the shop panel on the right (glasses are fitted automatically).
3. Orbit with the mouse; the camera buttons give front/side/top views.
4. **Start webcam**, look straight, press **Calibrate neutral**; the head now follows your head pose
   (rotation only). The Mirror checkbox switches between mirror-like and camera-like behaviour.
   **Stop webcam** returns to orbit-only.
5. Heads are pre-generated; do not generate them live (about 50 s per photo on a Kaggle T4).

## Libraries (no build step, no network needed)
three.js 0.178.0, Spark 0.1.10, @mediapipe/tasks-vision 0.10.21, all under `vendor/`.
