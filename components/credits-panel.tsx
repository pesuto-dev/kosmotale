"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { publicPath } from "@/lib/public-path";

const HIPPARCOS_LICENSE = "https://creativecommons.org/licenses/by-nc/3.0/igo/legalcode";

/** Altijd zichtbare bronnen. De sterdata zijn niet Apache-2.0. */
export function CreditsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="mt-2"
        onClick={() => setOpen(true)}
      >
        Bronnen
      </Button>
      {open ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4" role="presentation">
          <div
            role="dialog"
            aria-labelledby="bronnen-titel"
            className="pointer-events-auto max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/15 bg-[#0c101c] p-4 text-sm text-[#f3eadc]"
          >
            <h2 id="bronnen-titel" className="text-lg">
              Bronnen en licenties
            </h2>
            <p className="mt-2 text-[#d9d0c0]">
              De programmacode is Apache-2.0. De distributie als geheel is dat niet. De
              stercatalogus blijft apart niet-commercieel, ook voor wie dit ontvangt.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[#e7dece]">
              <li>
                Sterren in de lijst: ESA (1997), The Hipparcos and Tycho Catalogues, I/239.
                Subset met parallax boven 0,15 mas. Afstand = 1000/parallax in parsec, maal
                3,261563777 lichtjaar. Credit: ESA. CC BY-NC 3.0 IGO. Geen endorsement.
                Toegevoegde namen en aliassen staan in de licentietekst. Akte:{" "}
                <a className="underline" href={HIPPARCOS_LICENSE}>
                  {HIPPARCOS_LICENSE}
                </a>
                .
              </li>
              <li>
                De achtergrondhemel is een eigen stijlpatroon, geen astronomische kaart.
              </li>
              <li>
                Mercurius: USGS Astrogeology, MESSENGER MDIS Global Color Mosaic 665 m, edition 3,
                publiek domein, citeer de MESSENGER-auteurs. Geschaald naar 1024×512 en 45% naar
                grijswaarde gemengd.
              </li>
              <li>
                Uranus: NASA Visualization Technology Applications and Development (VTAD),
                textuur uit het 3D-model, geschaald. Geen endorsement.
              </li>
              <li>
                Overige planeet- en maankaarten: NASA of NASA-3D-Resources, met bronvermelding en
                zonder endorsement. Dat zijn geen NC-bestanden.
              </li>
              <li>
                Sternnamen: IAU WGSN, Catalog of Star Names. Geen specifiek CC-versienummer
                geclaimd. Etymologieteksten zitten er niet in.
              </li>
            </ul>
            <p className="mt-3 flex flex-col gap-1 text-[#d9d0c0]">
              <a className="underline" href={publicPath("/LICENSE")}>
                Apache-2.0 voor de code
              </a>
              <a className="underline" href={publicPath("/NOTICE")}>
                NOTICE
              </a>
              <a className="underline" href={publicPath("/LICENSES/hipparcos.txt")}>
                Hipparcos, CC BY-NC 3.0 IGO
              </a>
            </p>
            <Button type="button" className="mt-3" onClick={() => setOpen(false)}>
              Sluiten
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
