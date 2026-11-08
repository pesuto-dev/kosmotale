"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { CreditsButton } from "@/components/credits-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { objects, getObject } from "@/lib/catalog";
import {
  CLOCK_PRESETS,
  FLIGHT_PRESETS,
  INITIAL_JD,
  KIND_LABEL,
  MAX_YEAR,
  MIN_YEAR,
  REALM_LABEL,
  formatDutchDate,
  jdToYearFloat,
  yearFloatToJd,
} from "@/lib/constants";
import { HoldButton, distanceMeters } from "@/components/hud-controls";
import { getFrameSnap, subscribeFrame } from "@/lib/frame";
import { formatClock, formatDistance, formatFlight, formatMag, formatSize, formatSpeed } from "@/lib/format";
import { scaleBar } from "@/lib/scale";
import { speedPhrase } from "@/lib/motion";
import { sunDistanceM, trueMeters } from "@/lib/positions";
import {
  emitUi,
  getUiSnap,
  selectObject,
  setClockFactor,
  setFlightFactor,
  setSimTime,
  sim,
  subscribeUi,
} from "@/lib/sim";

export function Hud() {
  const ui = useSyncExternalStore(subscribeUi, getUiSnap, getUiSnap);
  const frame = useSyncExternalStore(subscribeFrame, getFrameSnap, getFrameSnap);
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const selected = ui.selectedId ? getObject(ui.selectedId) : undefined;
  const realm = frame.realm;
  const q = query.trim().toLocaleLowerCase("nl");

  const rows = useMemo(() => {
    const source = q
      ? objects.filter((o) => o.search.includes(q))
      : objects.filter((o) => o.realms.includes(realm));
    return source
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "nl"))
      .slice(0, q ? 80 : 120);
  }, [q, realm]);

  const bar = scaleBar(frame.scaleDepthM, frame.viewW, frame.viewH);
  const year = jdToYearFloat(ui.jd);
  const you = formatDistance(frame.trueM);
  const selectedDistance = selected
    ? formatDistance(
        distanceMeters(
          frame.camera,
          trueMeters(selected.id, ui.jd),
        ),
      )
    : null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col p-2 sm:p-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="pointer-events-auto max-w-md">
          <h1 className="font-display text-2xl tracking-tight text-[#f6efe2] sm:text-3xl">
            kosmotale
          </h1>
          <p className="text-xs text-[#d9d0c0] sm:text-sm">
            Van de aarde tot de rand van wat we kunnen zien.
          </p>
          <CreditsButton />
        </div>
        <div className="pointer-events-auto w-full sm:max-w-sm">
          <Label htmlFor="zoek" className="sr-only">
            Zoek een object
          </Label>
          <Input
            id="zoek"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Zoek een ster, planeet, stelsel…"
            className="border-white/15 bg-black/50 text-[#f6efe2] placeholder:text-[#b7ae9f]"
          />
        </div>
      </header>

      <div className="mt-2 flex min-h-0 flex-1 gap-3">
        <section
          className={`pointer-events-auto flex min-h-0 w-full flex-col rounded-xl border border-white/10 bg-black/45 p-2 backdrop-blur-md sm:w-72 ${
            listOpen ? "flex" : "hidden"
          } md:flex`}
        >
          <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
            <h2 className="text-sm font-medium text-[#f6efe2]">
              {q ? "Zoeken in het hele heelal" : REALM_LABEL[realm]}
            </h2>
            <span className="text-[11px] text-[#c9c0b2]">{rows.length}</span>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {rows.length === 0 ? (
              <p className="px-2 py-6 text-sm text-[#d9d0c2]">
                Niets gevonden voor „{query.trim()}”.
              </p>
            ) : (
              <ul className="space-y-1 pr-2">
                {rows.map((row) => {
                  const active = row.id === ui.selectedId;
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => selectObject(row.id)}
                        className={`w-full rounded-lg px-2 py-1.5 text-left text-sm ${
                          active
                            ? "bg-[#f0d7a2]/15 text-[#f6efe2]"
                            : "text-[#ebe3d4] hover:bg-white/5"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`size-1.5 shrink-0 rounded-full ${
                              row.evidence === "model" ? "bg-[#c4b0ff]" : "bg-[#f0d7a2]"
                            }`}
                          />
                          <span className="truncate">{row.name}</span>
                        </span>
                        <span className="mt-0.5 block truncate pl-3.5 text-[11px] text-[#c9c0b2]">
                          {row.evidence === "model" ? "Model" : "Waargenomen"}
                          {" · "}
                          {formatDistance(sunDistanceM(row.id, ui.jd))}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </section>

        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div className="pointer-events-auto flex items-start justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="md:hidden"
              onClick={() => setListOpen((open) => !open)}
            >
              {listOpen ? "Sluit lijst" : "Objecten"}
            </Button>
            <p className="ml-auto max-w-xs rounded-lg border border-white/10 bg-black/45 px-2 py-1 text-right text-[11px] leading-snug text-[#efe6d6] backdrop-blur-md sm:text-xs">
              Jij bent {you} van de zon
              <span className="mt-0.5 block text-[#c9c0b2]">{REALM_LABEL[realm]}</span>
            </p>
          </div>

          {selected ? (
            <article className="pointer-events-auto mt-2 max-w-md self-end rounded-xl border border-white/10 bg-black/55 p-3 text-sm text-[#f3eadc] backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl">{selected.name}</h2>
                <Badge
                  variant="secondary"
                  className={
                    selected.evidence === "model"
                      ? "bg-[#c4b0ff]/20 text-[#e4d8ff]"
                      : "bg-[#f0d7a2]/20 text-[#f6efe2]"
                  }
                >
                  {selected.evidence === "model" ? "Model" : "Waargenomen"}
                </Badge>
              </div>
              <p className="mt-1 text-xs uppercase tracking-wide text-[#c9c0b2]">
                {KIND_LABEL[selected.kind] ?? selected.kind}
                {selected.mag != null ? ` · ${formatMag(selected.mag)}` : ""}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#e7dece]">{selected.summary}</p>
              <dl className="mt-3 space-y-1 text-xs text-[#f0e6d6]">
                <div className="flex justify-between gap-3">
                  <dt className="text-[#c9c0b2]">Afstand tot de zon</dt>
                  <dd>{formatDistance(sunDistanceM(selected.id, ui.jd))}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#c9c0b2]">Afstand tot jou</dt>
                  <dd>{selectedDistance}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#c9c0b2]">Grootte</dt>
                  <dd className="text-right">{formatSize(selected.radiusM, selected.sizeNote)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#c9c0b2]">Snelheid</dt>
                  <dd className="text-right">{speedPhrase(selected.id, ui.jd)}</dd>
                </div>
              </dl>
              <Button
                type="button"
                size="sm"
                className="mt-3"
                onClick={() => selectObject(selected.id)}
              >
                Vlieg erheen
              </Button>
            </article>
          ) : (
            <p className="pointer-events-none mt-auto max-w-sm self-end text-sm text-[#d9d0c2]">
              Klik een wereld aan, of kies er een in de lijst.
            </p>
          )}
        </div>
      </div>

      <div className="pointer-events-none mt-2 flex">
        <div className="pointer-events-auto max-w-xs rounded-xl border border-white/10 bg-black/55 px-3 py-2 text-xs text-[#f3eadc] backdrop-blur-md">
          <p className="flex justify-between gap-4">
            <span className="text-[#c9c0b2]">Afstand tot de zon</span>
            <span>{you}</span>
          </p>
          <p className="mt-0.5 flex justify-between gap-4">
            <span className="text-[#c9c0b2]">Jouw snelheid</span>
            <span>{formatSpeed(frame.speedMps)}</span>
          </p>
          {bar ? (
            <div className="mt-2">
              <div className="h-1 rounded-full bg-[#f0d7a2]" style={{ width: bar.px }} />
              <p className="mt-1 text-[11px] text-[#d9d0c2]">
                Deze streep is {bar.label}, ware maat op de afstand tot de dichtstbijzijnde wereld.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <footer className="pointer-events-auto mt-2 rounded-xl border border-white/10 bg-black/55 p-3 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={ui.playing ? "default" : "secondary"}
            onClick={() => {
              sim.playing = !sim.playing;
              emitUi();
            }}
          >
            {ui.playing ? "Pauze" : "Afspelen"}
          </Button>
          <span className="text-[11px] tracking-wide text-[#c9c0b2]">Klok</span>
          <span className="text-sm text-[#f6efe2]">{formatClock(ui.clockFactor)}</span>
          <Button
            type="button"
            size="sm"
            variant={ui.clockFactor === 1 ? "default" : "secondary"}
            onClick={() => setClockFactor(1)}
          >
            Naar 1×
          </Button>
          {CLOCK_PRESETS.map((option) => (
            <Button
              key={option.label}
              type="button"
              size="sm"
              variant={sameFactor(ui.clockFactor, option.factor) ? "default" : "ghost"}
              className="text-[#f3eadc]"
              onClick={() => setClockFactor(option.factor)}
            >
              {option.label}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-[#f3eadc]"
            onClick={() => setSimTime(INITIAL_JD)}
          >
            Vandaag
          </Button>
          <p className="ml-auto font-display text-lg text-[#f6efe2] sm:text-2xl">
            {formatDutchDate(ui.jd)}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] tracking-wide text-[#c9c0b2]">Vlucht</span>
          <span className="text-sm text-[#f6efe2]">
            {formatFlight(frame.flightFactor, frame.boost)}
          </span>
          <Button
            type="button"
            size="sm"
            variant={frame.flightFactor === 1 && !frame.boost ? "default" : "secondary"}
            onClick={() => setFlightFactor(1)}
          >
            Naar 1×
          </Button>
          {FLIGHT_PRESETS.map((option) => (
            <Button
              key={option.label}
              type="button"
              size="sm"
              variant={sameFactor(frame.flightFactor, option.factor) ? "default" : "ghost"}
              className="text-[#f3eadc]"
              onClick={() => setFlightFactor(option.factor)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <div className="mt-3 px-1">
          <Label htmlFor="tijd" className="mb-1 block text-[11px] text-[#c9c0b2]">
            Tijd, van 3000 v.Chr. tot 3000 n.Chr. Alleen de banen in het zonnestelsel schuiven mee.
          </Label>
          <Slider
            id="tijd"
            min={MIN_YEAR}
            max={MAX_YEAR}
            step={0.25}
            value={[Math.min(MAX_YEAR, Math.max(MIN_YEAR, year))]}
            onValueChange={(value) => {
              const next = value[0];
              if (next == null) return;
              setSimTime(yearFloatToJd(next));
            }}
          />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-[#d5ccbe]">
          {frame.compressed
            ? "Buiten de Kuipergordel is het beeld logaritmisch samengedrukt. De getallen op de labels zijn ware afstand, grootte en snelheid."
            : "In het zonnestelsel kloppen de afstanden. Planeten en manen houden hun onderlinge snelheid, ook als de klok sneller staat. Mimas, Amalthea, Miranda en de kleine zwermen laat ik weg: naast hun planeet zijn ze zo goed als onzichtbaar. Phobos en Deimos staan er wel bij."}{" "}
          1× op de klok is ware tijd. 1× vliegen is 1 km/s. Sterrenstelsels, het kosmisch web en de
          achtergrondstraling blijven op nu.
        </p>
        <p className="mt-1 hidden text-[11px] text-[#b7ae9f] sm:block">
          Slepen: kijken. WASD: vliegen. Q/E: omhoog en omlaag. Shift: vlucht even ×10. Scrollwiel:
          vliegsnelheid. Klik: ernaartoe. Spatie: klok.
        </p>
        <div className="mt-2 grid grid-cols-3 gap-1 sm:hidden">
          <span />
          <HoldButton label="Vooruit" code="forward" />
          <span />
          <HoldButton label="Links" code="left" />
          <HoldButton label="Omhoog" code="up" />
          <HoldButton label="Rechts" code="right" />
          <HoldButton label="Achteruit" code="back" />
          <HoldButton label="Omlaag" code="down" />
          <HoldButton label="Snel" code="boost" />
        </div>
      </footer>
    </div>
  );
}

function sameFactor(a: number, b: number) {
  return Math.abs(a - b) / b < 0.02;
}
