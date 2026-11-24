"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { CreditsButton } from "@/components/credits-panel";
import { DateControl } from "@/components/date-control";
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
  MAX_YEAR,
  MIN_YEAR,
  jdToYearFloat,
  yearFloatToJd,
} from "@/lib/constants";
import { HoldButton, distanceMeters } from "@/components/hud-controls";
import { getFrameSnap, subscribeFrame } from "@/lib/frame";
import {
  formatClock,
  formatClockPreset,
  formatDistance,
  formatFactor,
  formatFlight,
  formatMag,
  formatSize,
  formatSpeed,
} from "@/lib/format";
import { getLang, setLang, subscribeLang, type Lang } from "@/lib/lang";
import { copy } from "@/lib/messages";
import { kindLabel, objectName, objectSizeNote, objectSummary, realmLabel } from "@/lib/present";
import { scaleBar } from "@/lib/scale";
import { speedPhrase } from "@/lib/motion";
import { sunDistanceM, trueMeters } from "@/lib/positions";
import {
  canTopDown,
  emitUi,
  getUiSnap,
  selectObject,
  setClockFactor,
  setFlightFactor,
  setFreeNav,
  setSimTime,
  setTopDown,
  sim,
  subscribeUi,
} from "@/lib/sim";

export function Hud() {
  const lang = useSyncExternalStore(subscribeLang, getLang, () => "en" as const);
  const m = copy(lang);
  const ui = useSyncExternalStore(subscribeUi, getUiSnap, getUiSnap);
  const frame = useSyncExternalStore(subscribeFrame, getFrameSnap, getFrameSnap);
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const selected = ui.selectedId ? getObject(ui.selectedId) : undefined;
  const realm = frame.realm;
  const q = query.trim().toLocaleLowerCase(lang);

  const rows = useMemo(() => {
    const source = q
      ? objects.filter((o) => o.search.includes(q))
      : objects.filter((o) => o.realms.includes(realm));
    return source
      .slice()
      .sort((a, b) => objectName(a, lang).localeCompare(objectName(b, lang), lang))
      .slice(0, q ? 80 : 120);
  }, [q, realm, lang]);

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
          <p className="text-xs text-[#d9d0c0] sm:text-sm">{m.tagline}</p>
          <div className="mt-2 flex items-center gap-2">
            <CreditsButton />
            <div className="flex rounded-lg border border-white/15 p-0.5" role="group" aria-label={m.langLabel}>
              <Button
                type="button"
                size="sm"
                variant={lang === "en" ? "default" : "ghost"}
                className="h-7 px-2"
                aria-pressed={lang === "en"}
                onClick={() => chooseLang("en")}
              >
                {m.langEn}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={lang === "nl" ? "default" : "ghost"}
                className="h-7 px-2 text-[#f3eadc]"
                aria-pressed={lang === "nl"}
                onClick={() => chooseLang("nl")}
              >
                {m.langNl}
              </Button>
            </div>
          </div>
        </div>
        <div className="pointer-events-auto w-full sm:max-w-sm">
          <Label htmlFor="zoek" className="sr-only">
            {m.searchLabel}
          </Label>
          <Input
            id="zoek"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={m.searchPlaceholder}
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
              {q ? m.searchAll : realmLabel(realm, lang)}
            </h2>
            <span className="text-[11px] text-[#c9c0b2]">{rows.length}</span>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {rows.length === 0 ? (
              <p className="px-2 py-6 text-sm text-[#d9d0c2]">
                {m.searchEmpty(query.trim())}
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
                          <span className="truncate">{objectName(row, lang)}</span>
                        </span>
                        <span className="mt-0.5 block truncate pl-3.5 text-[11px] text-[#c9c0b2]">
                          {row.evidence === "model" ? m.model : m.observed}
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

        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-between overflow-hidden">
          <div className="pointer-events-auto flex items-start justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="md:hidden"
              onClick={() => setListOpen((open) => !open)}
            >
              {listOpen ? m.closeList : m.objects}
            </Button>
            <p className="ml-auto max-w-xs rounded-lg border border-white/10 bg-black/45 px-2 py-1 text-right text-[11px] leading-snug text-[#efe6d6] backdrop-blur-md sm:text-xs">
              {m.youAre(you)}
              <span className="mt-0.5 block text-[#c9c0b2]">{realmLabel(realm, lang)}</span>
            </p>
          </div>

          {selected ? (
            <article className="pointer-events-auto mt-2 min-h-0 max-h-full max-w-md self-end overflow-y-auto rounded-xl border border-white/10 bg-black/55 p-3 text-sm text-[#f3eadc] backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl">{objectName(selected, lang)}</h2>
                <Badge
                  variant="secondary"
                  className={
                    selected.evidence === "model"
                      ? "bg-[#c4b0ff]/20 text-[#e4d8ff]"
                      : "bg-[#f0d7a2]/20 text-[#f6efe2]"
                  }
                >
                  {selected.evidence === "model" ? m.model : m.observed}
                </Badge>
              </div>
              <p className="mt-1 text-xs uppercase tracking-wide text-[#c9c0b2]">
                {kindLabel(selected.kind, lang)}
                {selected.mag != null ? ` · ${formatMag(selected.mag)}` : ""}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#e7dece]">{objectSummary(selected, lang)}</p>
              <dl className="mt-3 space-y-1 text-xs text-[#f0e6d6]">
                <div className="flex justify-between gap-3">
                  <dt className="text-[#c9c0b2]">{m.distanceSun}</dt>
                  <dd>{formatDistance(sunDistanceM(selected.id, ui.jd))}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#c9c0b2]">{m.distanceYou}</dt>
                  <dd>{selectedDistance}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#c9c0b2]">{m.size}</dt>
                  <dd className="text-right">{formatSize(selected.radiusM, objectSizeNote(selected, lang))}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#c9c0b2]">{m.speed}</dt>
                  <dd className="text-right">{speedPhrase(selected.id, ui.jd)}</dd>
                </div>
              </dl>
              <Button
                type="button"
                size="sm"
                className="mt-3"
                onClick={() => selectObject(selected.id)}
              >
                {m.flyTo}
              </Button>
            </article>
          ) : (
            <p className="pointer-events-none mt-auto max-w-sm self-end text-sm text-[#d9d0c2]">
              {m.pickOne}
            </p>
          )}
        </div>
      </div>

      <div className="pointer-events-none mt-2 flex">
        <div className="pointer-events-auto max-w-xs rounded-xl border border-white/10 bg-black/55 px-3 py-2 text-xs text-[#f3eadc] backdrop-blur-md">
          <p className="flex justify-between gap-4">
            <span className="text-[#c9c0b2]">{m.distanceSun}</span>
            <span>{you}</span>
          </p>
          <p className="mt-0.5 flex justify-between gap-4">
            <span className="text-[#c9c0b2]">{m.yourSpeed}</span>
            <span>{formatSpeed(frame.speedMps)}</span>
          </p>
          {bar ? (
            <div className="mt-2">
              <div className="h-1 rounded-full bg-[#f0d7a2]" style={{ width: bar.px }} />
              <p className="mt-1 text-[11px] text-[#d9d0c2]">
                {m.scaleBar(bar.label)}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <footer className="pointer-events-auto mt-2 max-h-[42vh] overflow-y-auto rounded-xl border border-white/10 bg-black/55 p-3 backdrop-blur-md sm:max-h-none sm:overflow-visible">
        <div className="grid grid-cols-3 gap-2">
          <ModeButton
            active={!ui.freeNav && !ui.topDown}
            label={m.modeOrbit}
            onClick={() => {
              setFreeNav(false);
              setTopDown(false);
            }}
          />
          <ModeButton
            active={ui.topDown}
            disabled={!ui.topDown && !canTopDown(ui.selectedId)}
            label={m.modeTop}
            title={canTopDown(ui.selectedId) ? m.modeHintTop : m.modeTopDisabled}
            onClick={() => setTopDown(true)}
          />
          <ModeButton
            active={ui.freeNav}
            label={m.modeFree}
            title={m.modeHintFree}
            onClick={() => setFreeNav(true)}
          />
        </div>
        <p className="mt-2 hidden text-center text-xs text-[#f0e6d4] sm:block">
          {ui.freeNav ? m.modeHintFree : ui.topDown ? m.modeHintTop : m.modeHintOrbit}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={ui.playing ? "default" : "secondary"}
            onClick={() => {
              sim.playing = !sim.playing;
              emitUi();
            }}
          >
            {ui.playing ? m.pause : m.play}
          </Button>
          <span className="text-[11px] tracking-wide text-[#c9c0b2]">{m.clock}</span>
          <span className="text-sm text-[#f6efe2]">{formatClock(ui.clockFactor)}</span>
          <Button
            type="button"
            size="sm"
            variant={ui.clockFactor === 1 ? "default" : "secondary"}
            onClick={() => setClockFactor(1)}
          >
            {m.backTo1}
          </Button>
          {CLOCK_PRESETS.map((option) => (
            <Button
              key={option.factor}
              type="button"
              size="sm"
              variant={sameFactor(ui.clockFactor, option.factor) ? "default" : "ghost"}
              className="text-[#f3eadc]"
              onClick={() => setClockFactor(option.factor)}
            >
              {formatClockPreset(option.factor)}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-[#f3eadc]"
            onClick={() => setSimTime(INITIAL_JD)}
          >
            {m.today}
          </Button>
          <DateControl jd={ui.jd} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] tracking-wide text-[#c9c0b2]">{m.flight}</span>
          <span className="text-sm text-[#f6efe2]">
            {formatFlight(frame.flightFactor, frame.boost)}
          </span>
          <Button
            type="button"
            size="sm"
            variant={frame.flightFactor === 1 && !frame.boost ? "default" : "secondary"}
            onClick={() => setFlightFactor(1)}
          >
            {m.backTo1}
          </Button>
          {FLIGHT_PRESETS.map((option) => (
            <Button
              key={option.factor}
              type="button"
              size="sm"
              variant={sameFactor(frame.flightFactor, option.factor) ? "default" : "ghost"}
              className="text-[#f3eadc]"
              onClick={() => setFlightFactor(option.factor)}
            >
              {formatFactor(option.factor)}
            </Button>
          ))}
        </div>
        <div className="mt-3 px-1">
          <Label htmlFor="tijd" className="mb-1 block text-[11px] text-[#c9c0b2]">
            {m.timeSlider}
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
        <p className="mt-2 hidden text-[11px] leading-relaxed text-[#d5ccbe] sm:block">
          {frame.compressed ? m.compressed : m.linear} {m.rates}
        </p>
        <p className="mt-1 hidden text-[11px] text-[#b7ae9f] sm:block">
          {ui.freeNav ? m.hintFree : m.hintOrbit}
        </p>
        <div className="mt-2 grid grid-cols-3 gap-1 sm:hidden">
          <span />
          <HoldButton label={ui.freeNav ? m.forward : m.closer} code="forward" />
          <span />
          <HoldButton label={ui.freeNav ? m.left : m.turnLeft} code="left" />
          <HoldButton label={ui.freeNav ? m.up : m.higher} code="up" />
          <HoldButton label={ui.freeNav ? m.right : m.turnRight} code="right" />
          <HoldButton label={ui.freeNav ? m.back : m.farther} code="back" />
          <HoldButton label={ui.freeNav ? m.down : m.lower} code="down" />
          <HoldButton label={m.boost} code="boost" />
        </div>
      </footer>
    </div>
  );
}

function chooseLang(next: Lang) {
  setLang(next);
  const url = new URL(window.location.href);
  url.searchParams.set("lang", next);
  window.history.replaceState(null, "", url);
}

function sameFactor(a: number, b: number) {
  return Math.abs(a - b) / b < 0.02;
}

function ModeButton({
  active,
  disabled,
  label,
  title,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  title?: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      title={title}
      onClick={onClick}
      variant="ghost"
      className={`h-11 text-sm font-medium ${
        active
          ? "bg-[#f0d7a2] text-[#1a140c] hover:bg-[#f0d7a2]/90"
          : "border border-white/20 bg-white/10 text-[#f6efe2] hover:bg-white/20"
      }`}
    >
      {label}
    </Button>
  );
}
