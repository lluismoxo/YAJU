"""Replace the site's text/dashboard images with the abstract Artlist versions.

Reads tools/image-replacements.csv and, for every row, downloads the new image,
center-crops it to the original aspect ratio, resizes it to the original pixel
size and overwrites the original file in place (same path, same format), so no
HTML/JS reference has to change. Aborts without writing anything if any image
fails to download.
"""
import csv
import io
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "tools" / "image-replacements.csv"


def download(url, attempts=4):
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            img = Image.open(io.BytesIO(data))
            img.load()
            return img
        except Exception as e:  # noqa: BLE001
            print(f"    attempt {i + 1} failed: {e}")
            time.sleep(2 ** i)
    raise RuntimeError(f"could not download {url}")


def fit(img, w, h):
    img = img.convert("RGB")
    target = w / h
    src = img.width / img.height
    if src > target:
        cw, ch = round(img.height * target), img.height
    else:
        cw, ch = img.width, round(img.width / target)
    left = (img.width - cw) // 2
    top = (img.height - ch) // 2
    img = img.crop((left, top, left + cw, top + ch))
    return img.resize((w, h), Image.LANCZOS)


def main():
    rows = list(csv.DictReader(CSV_PATH.open(newline="")))
    prepared = []
    for row in rows:
        target = ROOT / row["target"]
        if not target.is_file():
            sys.exit(f"target does not exist: {row['target']}")
        w, h = int(row["width"]), int(row["height"])
        print(f"[{row['n']}/{len(rows)}] {row['target']} ({w}x{h})")
        prepared.append((target, fit(download(row["url"]), w, h)))

    for target, img in prepared:
        ext = target.suffix.lower()
        if ext == ".webp":
            img.save(target, "WEBP", quality=88, method=6)
        elif ext == ".gif":
            q = img.quantize(colors=256, method=Image.Quantize.MEDIANCUT,
                             dither=Image.Dither.FLOYDSTEINBERG)
            q.save(target, "GIF", optimize=True)
        elif ext == ".png":
            img.save(target, "PNG", optimize=True)
        else:
            sys.exit(f"unsupported format: {target}")
        check = Image.open(target)
        assert check.size == img.size, f"size mismatch for {target}"

    print(f"Replaced {len(prepared)} images.")


if __name__ == "__main__":
    main()
