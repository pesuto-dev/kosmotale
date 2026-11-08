# kosmotale

Een kleine webapp om door het heelal te vliegen: van de aarde tot de rand van wat we kunnen zien. Dit is een hobbyproject. Geen account, geen database, geen API-sleutel.

De programmacode is Apache-2.0. De distributie als geheel is dat niet, en is niet volledig open source. `data/stars.json` is een bewerking van de Hipparcos-catalogus en blijft Creative Commons Attribution-NonCommercial 3.0 IGO, ook voor wie de bestanden ontvangt. Niet commercieel gebruiken, geen endorsement door ESA, en dit bestand niet als Apache herlabelen. Zie `LICENSES/hipparcos.txt` en `NOTICE`.

De achtergrondhemel is een eigen stijlpatroon. Het is geen astronomisch correcte sterrenkaart.

## Starten

```bash
npm install
npm run dev
```

Open daarna [http://localhost:43127](http://localhost:43127). De ontwikkelserver luistert op poort **43127**.

`npm test` rekent Kepler, IAU-rotatie en de schaalcompressie na. `npm run build` schrijft een statische site in `out/` en kopieert `LICENSE`, `NOTICE` en `LICENSES/hipparcos.txt` daarheen vanuit die bronbestanden. `npm run check:export` controleert dat die kopieën gelijk zijn en dat de CC-URI en de links in de export staan. Daarna dient `npm start` die map op poort 43127. Er is geen live deploy in deze repository.

## Statische hosting

De export heeft standaard geen subpad. `NEXT_PUBLIC_BASE_PATH` is leeg tot de host een echt subpad heeft; die waarde wordt `basePath` en het voorvoegsel van texturen én van de licentielinks. De bestanden zelf blijven in de wortel van `out/`, naast `index.html`. Deze repo heet kosmotale.

Een GitHub Release van de bron of van `out/` is een later, apart besluit. Deze boom bevat geen workflow die publiceert of deployt.

## Latere overdracht

Een schone repository met de werknaam bestaat nog niet. Niets hier wijst naar zo’n remote. Publicatie van de geschiedenis van deze private repo is niet vrijgegeven: een verwijderde sterrenkaart blijft in oude commits staan.

Na een apart akkoord, en niet automatisch:

1. Exporteer alleen de tracked boom van de afgesproken commit, zonder `.git` en zonder lokale caches of artifacts (`git archive`, of een schone checkout).
2. Controleer dat er geen `sterren.jpg`, texture-cache of oude agent-artifacts in zitten.
3. Maak pas dan een lege repository en zet die boom erin als eerste commit.
4. Zet remote en, als de host een subpad heeft, `NEXT_PUBLIC_BASE_PATH` op dat echte pad.
5. Draai CI daar opnieuw. Geen import uit de oude geschiedenis.

## Besturing

- Slepen met de muis: kijken
- WASD: vliegen, Q en E omhoog en omlaag
- Vlucht en klok zijn twee aparte versnellingen, allebei met een knop terug naar 1×
- 1× vliegen is 1 km/s. Hoger is een veelvoud. Shift houdt even ×10. Het scrollwiel verandert de vlucht
- 1× op de klok is ware tijd
- Klik op een object, of kies het in de lijst: ernaartoe vliegen
- Bronnen: de knop in de kop

## Bronnen

- Planeetbanen: E.M. Standish, Kepler-elementen, JPL. Middellijnen: NASA Planetary Fact Sheet.
- Pluto en manen: osculerende elementen van JPL Horizons op J2000. Een benadering, geen volledige efemeride.
- Sterposities: ESA (1997), *The Hipparcos and Tycho Catalogues*, I/239. Credit: ESA. CC BY-NC 3.0 IGO. Zie `LICENSES/hipparcos.txt`.
- Sternamen: IAU Catalog of Star Names (WGSN). Geen CC-versienummer geclaimd.
- Mercurius: USGS, MESSENGER MDIS Global Color Mosaic 665 m, edition 3, publiek domein, citeer de auteurs. De TIFF wordt niet gecommit. `python3 scripts/build-textures.py mercurius` haalt hem op en schaalt hem.
- Uranus: NASA VTAD, textuur uit het 3D-model.
- Overige kaarten: NASA of NASA-3D-Resources. Geen NC. Geen endorsement en geen NASA-logo.
- Kosmische afstanden zijn afgeronde, gangbare waarden. Waar het een model is, staat dat in beeld.

`npm run check` blijft beschikbaar naast `npm test`.
