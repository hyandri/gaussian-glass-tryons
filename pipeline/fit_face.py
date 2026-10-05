"""
fit_face.py - turn FaceLift's output.png into 3D landmarks + a face frame.

Usage (run from the glasses_tryon folder):
    python pipeline/fit_face.py head1            # one head
    python pipeline/fit_face.py head1 head2      # several heads
    python pipeline/fit_face.py --all            # every folder in heads/ that has output.png
    python pipeline/fit_face.py --all --force    # redo heads that already have face_frame.json

Needs in this folder (pipeline/):  opencv_cameras.json, face_landmarker.task
Heads are read from and written to ../heads/<name>/.
Needs in heads/<name>/: output.png   (the 3072x512 strip from FaceLift)
Writes in heads/<name>/: landmarks3d.json, face_frame.json
"""
import sys, json
from pathlib import Path
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

ROOT = Path(__file__).resolve().parent         # pipeline/ (cameras + model live here)
HEADS_DIR = ROOT.parent / "heads"               # project-root heads/
TILE = 512
TILE_TO_FRAME = [2, 1, 0, 5, 4, 3]      # from FaceLift inference.py: camera_indices
FRONT_TILES = (0, 1, 5)                 # only these tiles show the face; 2-4 are side/back (false detections)
KEYS = {"iris_L": 468, "iris_R": 473, "nose_bridge": 168, "bridge_low": 6, "nose_tip": 1,
        "chin": 152, "forehead": 10, "edge_A": 234, "edge_B": 454, "temple_A": 127, "temple_B": 356}

cams = json.load(open(ROOT / "opencv_cameras.json"))["frames"]
detector = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
    base_options=python.BaseOptions(model_asset_path=str(ROOT / "face_landmarker.task")),
    running_mode=vision.RunningMode.IMAGE, num_faces=1))


def process(folder: Path) -> bool:
    png = folder / "output.png"
    if not png.exists():
        print(f"[{folder.name}] missing output.png"); return False
    img = cv2.imread(str(png), cv2.IMREAD_UNCHANGED)
    if img is None or img.shape[1] != TILE * 6:
        print(f"[{folder.name}] output.png should be {TILE*6}x{TILE}, got "
              f"{None if img is None else img.shape[1::-1]}"); return False

    Ps, pts2d, views = [], [], []
    for t in FRONT_TILES:
        tile = img[:, t * TILE:(t + 1) * TILE]
        if tile.shape[2] == 4:                       # composite transparency onto white
            a = tile[..., 3:4] / 255.0
            tile = (tile[..., :3] * a + 255 * (1 - a)).astype(np.uint8)
        rgb = np.ascontiguousarray(cv2.cvtColor(tile, cv2.COLOR_BGR2RGB))
        res = detector.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
        if not res.face_landmarks:
            continue
        f = cams[TILE_TO_FRAME[t]]
        K = np.array([[f["fx"], 0, f["cx"]], [0, f["fy"], f["cy"]], [0, 0, 1]])
        Ps.append(K @ np.array(f["w2c"])[:3])
        pts2d.append(np.array([[p.x * TILE, p.y * TILE] for p in res.face_landmarks[0]]))
        views.append(t)

    print(f"[{folder.name}] views with a face: {views}")
    if len(views) < 2:
        print(f"[{folder.name}] need at least 2 views with a detected face - skipped"); return False

    def triangulate(i):
        rows = []
        for P, p in zip(Ps, pts2d):
            x, y = p[i]
            rows += [x * P[2] - P[0], y * P[2] - P[1]]
        X = np.linalg.svd(np.array(rows))[2][-1]
        return X[:3] / X[3]

    X = np.array([triangulate(i) for i in range(478)])
    errs = []
    for v, P, p in zip(views, Ps, pts2d):
        h = np.c_[X, np.ones(len(X))] @ P.T
        e = np.linalg.norm(h[:, :2] / h[:, 2:3] - p, axis=1).mean()
        errs.append(e)
        print(f"[{folder.name}] view {v}: mean reprojection error {e:.2f}px")

    IL, IR = X[468], X[473]
    E = (IL + IR) / 2
    PD = np.linalg.norm(IR - IL)
    xax = (IR - IL) / PD
    u = E - X[13]                                    # mouth -> eyes
    yax = u - (u @ xax) * xax
    yax /= np.linalg.norm(yax)
    zax = np.cross(xax, yax)
    R = np.stack([xax, yax, zax], 1)

    cam0 = np.linalg.inv(np.array(cams[TILE_TO_FRAME[views[0]]]["w2c"]))[:3, 3]
    ok = bool(zax @ (cam0 - E) > 0)
    print(f"[{folder.name}] z points toward front camera: {ok} (must be True) | PD {PD:.4f}")
    if not ok or max(errs) > 6:
        print(f"[{folder.name}] WARNING: check this head carefully (frame flipped or large error)")

    json.dump({k: X[i].tolist() for k, i in KEYS.items()}, open(folder / "landmarks3d.json", "w"))
    json.dump({"origin": E.tolist(), "R": R.tolist(), "PD_splat": float(PD)},
              open(folder / "face_frame.json", "w"))
    print(f"[{folder.name}] saved landmarks3d.json and face_frame.json")
    return True


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    if "--all" in sys.argv:
        names = sorted(d.name for d in HEADS_DIR.iterdir() if d.is_dir() and (d / "output.png").exists())
        if not force:
            names = [n for n in names if not (HEADS_DIR / n / "face_frame.json").exists()]
    else:
        names = args
    if not names:
        raise SystemExit("Nothing to do. Usage: python pipeline/fit_face.py head1 [head2 ...] | --all [--force]")
    done = sum(process(HEADS_DIR / n) for n in names)
    print(f"\nfinished: {done}/{len(names)} heads processed")
