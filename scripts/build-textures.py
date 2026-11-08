#!/usr/bin/env python3
"""Haalt de NASA/USGS-texturen op en zet ze op browsermaat in public/textures.

Nodig: Python 3 met pillow en numpy. De JPEG's staan al in de repo; dit script
maakt ze opnieuw. Bronnen en licenties staan in de README en in NOTICE.
De hemel is procedureel en komt hier niet vandaan. Geen sterrenkaart downloaden.
"""

import io
import json
import struct
import sys
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

# Het MESSENGER-mozaïek is ongeveer 266 megapixels. Dat is het bronbestand, geen bom.
Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "textures"
CACHE = ROOT / ".texture-cache"

NASA3D = "https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/Images%20and%20Textures"


def nasa3d(name: str) -> str:
    q = urllib.parse.quote(name)
    return f"{NASA3D}/{q}/{q}.jpg"


# naam in de app -> (bron-URL, breedte)
SOURCES = {
    # Edition 3, publiek domein. De TIFF (~760 MB) blijft buiten de repo; .texture-cache ook.
    "mercurius": (
        "https://planetarymaps.usgs.gov/mosaic/Mercury_MESSENGER_ClrMosaic_global_665m_v3.tif",
        1024,
    ),
    "venus": (nasa3d("Venus"), 1440),
    "aarde-dag": ("https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74092/world.200407.3x5400x2700.jpg", 2048),
    "aarde-nacht": ("https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_01deg.jpg", 2048),
    "aarde-wolken": ("https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg", 2048),
    "maan": ("https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg", 2048),
    "mars": (nasa3d("Mars"), 1440),
    "jupiter": ("https://images-assets.nasa.gov/image/PIA07782/PIA07782~orig.jpg", 2048),
    "saturnus": (nasa3d("Saturn"), 720),
    "uranus": ("https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/u/Uranus_1_51118.glb", 1024),
    "neptunus": (nasa3d("Neptune"), 720),
    "pluto": (nasa3d("Pluto"), 720),
    "io": (nasa3d("Jupiter - Io (A)"), 1024),
    "europa": (nasa3d("Jupiter - Europa"), 1024),
    "ganymedes": (nasa3d("Jupiter - Ganymede"), 1024),
    "callisto": (nasa3d("Jupiter - Callisto"), 1024),
    "titan": (nasa3d("Saturn - Titan"), 720),
    "enceladus": (nasa3d("Saturn - Enceladus"), 1024),
    "tethys": (nasa3d("Saturn - Tethys"), 1024),
    "dione": (nasa3d("Saturn - Dione"), 1024),
    "rhea": (nasa3d("Saturn - Rhea"), 1024),
    "iapetus": (nasa3d("Saturn - Iapetus"), 1024),
    "ariel": (nasa3d("Uranus - Ariel"), 1024),
    "umbriel": (nasa3d("Uranus - Umbriel"), 1024),
    "titania": (nasa3d("Uranus - Titania"), 1024),
    "oberon": (nasa3d("Uranus - Oberon"), 1024),
    "triton": (nasa3d("Neptune - Triton"), 1024),
    "charon": (nasa3d("Pluto - Charon"), 720),
    "phobos": (nasa3d("Mars - Phobos"), 1024),
    "deimos": (nasa3d("Mars - Deimos"), 1024),
}

SUN_URL = "https://svs.gsfc.nasa.gov/vis/a000000/a003800/a003851/solarSphere304A.0200.jpg"


def fetch(url: str) -> bytes:
    CACHE.mkdir(exist_ok=True)
    key = CACHE / urllib.parse.quote(url, safe="")[-120:]
    if key.exists():
        return key.read_bytes()
    print("ophalen", url)
    req = urllib.request.Request(url, headers={"User-Agent": "kosmotale-textures"})
    with urllib.request.urlopen(req) as res:
        data = res.read()
    key.write_bytes(data)
    return data


def glb_image(data: bytes) -> Image.Image:
    json_len = struct.unpack("<I", data[12:16])[0]
    meta = json.loads(data[20 : 20 + json_len])
    bin_start = 20 + json_len + 8
    view = meta["bufferViews"][meta["images"][0]["bufferView"]]
    start = bin_start + view.get("byteOffset", 0)
    return Image.open(io.BytesIO(data[start : start + view["byteLength"]]))


def save(img: Image.Image, name: str, width: int, quality=84):
    img = img.convert("L" if img.mode == "L" else "RGB")
    if img.width != width:
        img = img.resize((width, width // 2), Image.LANCZOS)
    path = OUT / f"{name}.jpg"
    img.save(path, quality=quality, optimize=True, progressive=True)
    print(f"{path.relative_to(ROOT)}  {img.width}x{img.height}  {path.stat().st_size // 1024} kB")


def temper(img: Image.Image, keep: float) -> Image.Image:
    """Kaarten met opgerekte kleur (MDIS 1000/750/430 nm, de gele Saturnuskaart) terug naar
    een tint die dichter bij het oog ligt: een deel kleur, de rest grijswaarde."""
    rgb = img.convert("RGB")
    grey = rgb.convert("L").convert("RGB")
    return Image.blend(grey, rgb, keep)


def fill_gaps(img: Image.Image) -> Image.Image:
    """Waar Voyager geen beeld had is de kaart zwart; vul dat met de middelste grijswaarde."""
    a = np.asarray(img.convert("L"), dtype=np.uint8).copy()
    gap = a < 10
    a[gap] = int(np.median(a[~gap]))
    return Image.fromarray(a, "L")


def build_sun():
    img = Image.open(io.BytesIO(fetch(SUN_URL))).convert("L")
    a = np.asarray(img, dtype=np.float32)
    lo, hi = np.percentile(a, [1, 99.7])
    a = np.clip((a - lo) / (hi - lo), 0, 1)
    save(Image.fromarray((a * 255).astype(np.uint8), "L"), "zon", 2048)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    only = set(sys.argv[1:])
    for name, (url, width) in SOURCES.items():
        if only and name not in only:
            continue
        data = fetch(url)
        img = glb_image(data) if url.endswith(".glb") else Image.open(io.BytesIO(data))
        if name == "aarde-wolken":
            img = img.convert("L")
        if name == "mercurius":
            img = temper(img, 0.45)
        if name == "saturnus":
            img = temper(img, 0.6)
        if name == "oberon":
            img = fill_gaps(img)
        save(img, name, width)
    if not only or "zon" in only:
        build_sun()


if __name__ == "__main__":
    main()
