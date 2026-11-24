"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { getLang, subscribeLang } from "@/lib/lang";
import { copy } from "@/lib/messages";
import { publicPath } from "@/lib/public-path";

const HIPPARCOS_LICENSE = "https://creativecommons.org/licenses/by-nc/3.0/igo/legalcode";

/** Altijd zichtbare bronnen. De sterdata zijn niet Apache-2.0. */
export function CreditsButton() {
  const lang = useSyncExternalStore(subscribeLang, getLang, () => "en" as const);
  const m = copy(lang);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => setOpen(true)}
      >
        {m.sources}
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-labelledby="bronnen-titel"
            className="pointer-events-auto max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/15 bg-[#0c101c] p-4 text-sm text-[#f3eadc]"
          >
            <h2 id="bronnen-titel" className="text-lg">
              {m.sourcesTitle}
            </h2>
            <p className="mt-2 text-[#d9d0c0]">{m.creditsLead}</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[#e7dece]">
              <li>
                {m.creditsStars}{" "}
                <a className="underline" href={HIPPARCOS_LICENSE}>
                  {HIPPARCOS_LICENSE}
                </a>
                .
              </li>
              <li>
                {m.creditsSky}{" "}
                <a className="underline" href={publicPath("/LICENSES/sterrenkaart.txt")}>
                  {publicPath("/LICENSES/sterrenkaart.txt")}
                </a>
                .
              </li>
              <li>{m.creditsMercury}</li>
              <li>{m.creditsUranus}</li>
              <li>{m.creditsOtherMaps}</li>
              <li>{m.creditsNames}</li>
            </ul>
            <p className="mt-3 flex flex-col gap-1 text-[#d9d0c0]">
              <a className="underline" href={publicPath("/LICENSE")}>
                {m.linkCode}
              </a>
              <a className="underline" href={publicPath("/NOTICE")}>
                {m.linkNotice}
              </a>
              <a className="underline" href={publicPath("/LICENSES/hipparcos.txt")}>
                {m.linkHip}
              </a>
              <a className="underline" href={publicPath("/LICENSES/sterrenkaart.txt")}>
                {m.linkSky}
              </a>
            </p>
            <Button type="button" className="mt-3" onClick={() => setOpen(false)}>
              {m.close}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
