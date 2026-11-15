# kosmotale

A small web app for flying through the universe: from Earth to the edge of what we can see. This is a hobby project. No accounts, no database, no API keys.

## License

- **Code:** [Apache License 2.0](LICENSE).
- **Star data** (`data/stars.json`): a derivative of the [Hipparcos](https://www.cosmos.esa.int/web/hipparcos) catalogue. This file is [Creative Commons Attribution-NonCommercial 3.0 IGO](LICENSES/hipparcos.txt), including for anyone who receives a copy. Do not use it commercially, do not imply ESA endorsement, and do not relabel it as Apache. See `LICENSES/hipparcos.txt` and `NOTICE`.

The distribution as a whole is therefore not Apache-2.0, and is not fully open source.

The background sky is a stylistic pattern of our own. It is not an astronomically accurate star map.

## Run locally

```bash
npm install
npm run dev
```

Then open [http://localhost:43127](http://localhost:43127). The dev server listens on port **43127**.

- `npm test` checks Kepler, IAU rotation and scale compression.
- `npm run build` writes a static site to `out/` and copies `LICENSE`, `NOTICE` and `LICENSES/hipparcos.txt` there from those source files.
- `npm run check:export` verifies that those copies match and that the CC URI and links are present in the export.
- `npm start` then serves `out/` on port 43127.

There is no live deploy in this repository.

## Static hosting

The export has no subpath by default. `NEXT_PUBLIC_BASE_PATH` is empty until the host has a real subpath; that value becomes `basePath` and the prefix for textures and license links. The files themselves stay at the root of `out/`, next to `index.html`.

## Controls

- Drag with the mouse to look around
- WASD to fly, Q and E to go up and down
- Flight and clock have two separate speed controls, each with a button back to 1×
- 1× flight is 1 km/s. Higher is a multiple. Shift holds ×10 for a moment. The scroll wheel changes flight speed
- 1× on the clock is real time
- Click an object, or pick it from the list, to fly there
- Sources: the button in the header

## Sources

- Planet orbits: E.M. Standish, Keplerian elements, JPL. Diameters: NASA Planetary Fact Sheet.
- Pluto and moons: osculating elements from JPL Horizons at J2000. An approximation, not a full ephemeris.
- Star positions: ESA (1997), *The Hipparcos and Tycho Catalogues*, I/239. Credit: ESA. CC BY-NC 3.0 IGO. See `LICENSES/hipparcos.txt`.
- Star names: IAU Catalog of Star Names (WGSN). No CC version number claimed.
- Mercury: USGS, MESSENGER MDIS Global Color Mosaic 665 m, edition 3, public domain, cite the authors. The TIFF is not committed. `python3 scripts/build-textures.py mercurius` fetches and scales it.
- Uranus: NASA VTAD, texture from the 3D model.
- Other maps: NASA or NASA-3D-Resources. No NC. No endorsement and no NASA logo.
- Cosmic distances are rounded, commonly cited values. Where it is a model, the UI says so.

`npm run check` remains available alongside `npm test`.
