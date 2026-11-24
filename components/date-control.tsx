"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calendarToJd,
  jdToCalendar,
  MAX_YEAR,
  MIN_YEAR,
} from "@/lib/constants";
import { formatSimDate } from "@/lib/format";
import { getLang, subscribeLang } from "@/lib/lang";
import { copy } from "@/lib/messages";
import { MOMENTS, type MomentId } from "@/lib/moments";
import { setSimTime } from "@/lib/sim";

function monthLength(year: number, month: number) {
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  if (month !== 2) return 31;
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return leap ? 29 : 28;
}

const MOMENT_KEY: Record<MomentId, "momentToday" | "momentJ2000" | "momentApollo" | "momentVoyager"> = {
  today: "momentToday",
  j2000: "momentJ2000",
  apollo11: "momentApollo",
  voyager2: "momentVoyager",
};

export function DateControl({ jd }: { jd: number }) {
  const lang = useSyncExternalStore(subscribeLang, getLang, () => "en" as const);
  const m = copy(lang);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [place, setPlace] = useState({ right: 16, bottom: 96 });
  const cal = jdToCalendar(jd);
  const [year, setYear] = useState(String(cal.year));
  const [month, setMonth] = useState(String(cal.month));
  const [day, setDay] = useState(String(cal.day));

  function openPanel() {
    const now = jdToCalendar(jd);
    setYear(String(now.year));
    setMonth(String(now.month));
    setDay(String(now.day));
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setPlace({
        right: Math.max(8, window.innerWidth - rect.right),
        bottom: Math.max(8, window.innerHeight - rect.top + 8),
      });
    }
    setOpen(true);
  }

  function applyDraft() {
    const y = Math.round(Number(year));
    const mo = Math.round(Number(month));
    const d = Math.round(Number(day));
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return;
    const clampedYear = Math.min(MAX_YEAR, Math.max(MIN_YEAR, y));
    const clampedMonth = Math.min(12, Math.max(1, mo));
    const clampedDay = Math.min(monthLength(clampedYear, clampedMonth), Math.max(1, d));
    setSimTime(calendarToJd(clampedYear, clampedMonth, clampedDay + 0.5));
    setOpen(false);
  }

  return (
    <div className="relative ml-auto">
      <Button
        ref={buttonRef}
        type="button"
        size="sm"
        variant="secondary"
        className="h-10 px-3 font-display text-base text-[#f6efe2] sm:text-lg"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => (open ? setOpen(false) : openPanel())}
      >
        <span className="mr-2 text-[10px] font-sans tracking-wide text-[#c9c0b2]">{m.date}</span>
        {formatSimDate(jd)}
      </Button>
      {open
        ? createPortal(
        <div
          role="dialog"
          aria-label={m.date}
          style={{ right: place.right, bottom: place.bottom }}
          className="pointer-events-auto fixed z-[80] max-h-[min(32rem,calc(100vh-6rem))] w-72 overflow-y-auto rounded-xl border border-white/15 bg-[#0c101c] p-3 text-sm text-[#f3eadc] shadow-xl"
        >
          <div className="grid grid-cols-3 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-[#c9c0b2]">{m.year}</span>
              <Input
                inputMode="numeric"
                value={year}
                onChange={(event) => setYear(event.target.value)}
                className="border-white/15 bg-black/40 text-[#f6efe2]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-[#c9c0b2]">{m.month}</span>
              <select
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="h-8 rounded-lg border border-white/15 bg-black/40 px-2 text-sm text-[#f6efe2]"
              >
                {m.months.map((name, index) => (
                  <option key={name} value={String(index + 1)}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-[#c9c0b2]">{m.day}</span>
              <Input
                inputMode="numeric"
                value={day}
                onChange={(event) => setDay(event.target.value)}
                className="border-white/15 bg-black/40 text-[#f6efe2]"
              />
            </label>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-[#c9c0b2]">{m.yearHint}</p>
          <Button type="button" size="sm" className="mt-2 w-full" onClick={applyDraft}>
            {m.setDate}
          </Button>
          <p className="mt-3 text-[11px] tracking-wide text-[#c9c0b2]">{m.moments}</p>
          <div className="mt-1 flex flex-col gap-1">
            {MOMENTS.map((moment) => (
              <Button
                key={moment.id}
                type="button"
                size="sm"
                variant="ghost"
                className="justify-start text-[#f3eadc]"
                onClick={() => {
                  setSimTime(moment.jd);
                  setOpen(false);
                }}
              >
                {m[MOMENT_KEY[moment.id]]}
              </Button>
            ))}
          </div>
          <Label className="sr-only">{m.date}</Label>
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}
