"use client";
import { useMemo } from "react";

const COMMON = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles",
  "America/Puerto_Rico", "America/Mexico_City", "America/Bogota", "America/Caracas", "America/Havana",
  "America/Santo_Domingo", "America/Lima", "America/Santiago", "America/Argentina/Buenos_Aires", "Europe/Madrid",
];

export function timezoneLabel(tz: string): string {
  try {
    const offset = new Intl.DateTimeFormat("es", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
    return `${city} (${offset ?? ""})`;
  } catch {
    return tz;
  }
}

export function TimezoneSelect({ id, value, onChange, name }: { id?: string; value: string; onChange: (tz: string) => void; name?: string }) {
  const all = useMemo(() => {
    try {
      return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone");
    } catch {
      return COMMON;
    }
  }, []);
  const rest = all.filter((t) => !COMMON.includes(t));
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-[var(--radius-field)] border border-border bg-surface px-3 text-[16px] shadow-xs focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12"
    >
      <optgroup label="Frecuentes">
        {COMMON.map((t) => (
          <option key={t} value={t}>
            {timezoneLabel(t)}
          </option>
        ))}
      </optgroup>
      <optgroup label="Todas">
        {rest.map((t) => (
          <option key={t} value={t}>
            {timezoneLabel(t)}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
