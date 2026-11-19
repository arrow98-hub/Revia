import { describe, expect, it } from "vitest";
import { buildCodePrefix, formatProductCode } from "./codes";
import { addDaysISO, relativeDay, todayISO } from "./dates";
import { displayStatus } from "./status";
import { contactLink, normalizeUrl } from "./labels";

describe("buildCodePrefix", () => {
  it("toma 2 letras del nombre y 2 del primer apellido", () => {
    expect(buildCodePrefix("Jane", "Doe")).toBe("JADO");
  });
  it("quita tildes y convierte ñ", () => {
    expect(buildCodePrefix("Ángela", "Muñoz García")).toBe("ANMU");
    expect(buildCodePrefix("Ñico", "Íñiguez")).toBe("NIIN");
  });
  it("rellena con X si faltan letras", () => {
    expect(buildCodePrefix("Li", "O")).toBe("LIOX");
    expect(buildCodePrefix("A", "")).toBe("AXXX");
  });
  it("usa solo el primer nombre y primer apellido", () => {
    expect(buildCodePrefix("María José", "de la Cruz")).toBe("MADE");
  });
});

describe("formatProductCode", () => {
  it("rellena con ceros a 5 dígitos", () => {
    expect(formatProductCode("JADO", 1)).toBe("JADO-00001");
    expect(formatProductCode("JADO", 12345)).toBe("JADO-12345");
  });
});

describe("fechas", () => {
  it("todayISO respeta la zona horaria", () => {
    const instant = new Date("2026-11-19T03:30:00Z"); // 22:30 del 18 en Nueva York
    expect(todayISO("America/New_York", instant)).toBe("2026-11-18");
    expect(todayISO("Europe/Madrid", instant)).toBe("2026-11-19");
  });
  it("suma días cruzando cambio de horario", () => {
    expect(addDaysISO("2026-11-01", 7)).toBe("2026-11-08");
    expect(addDaysISO("2026-03-07", 7)).toBe("2026-03-14");
  });
  it("relativeDay", () => {
    expect(relativeDay("2026-11-18", "2026-11-18")).toBe("Hoy");
    expect(relativeDay("2026-11-19", "2026-11-18")).toBe("Mañana");
    expect(relativeDay("2026-11-15", "2026-11-18")).toBe("Hace 3 días");
  });
});

describe("displayStatus", () => {
  const base = { requires_review: true, review_due_date: null, expected_arrival_date: "2026-11-18" };
  const today = "2026-11-18";
  it("en camino", () => {
    expect(displayStatus({ ...base, status: "in_transit" }, today)).toBe("arrives_today");
    expect(displayStatus({ ...base, status: "in_transit", expected_arrival_date: "2026-11-20" }, today)).toBe("in_transit");
    expect(displayStatus({ ...base, status: "in_transit", expected_arrival_date: "2026-11-16" }, today)).toBe("arrival_unconfirmed");
  });
  it("retrasado", () => {
    expect(displayStatus({ ...base, status: "delayed", expected_arrival_date: "2026-11-25" }, today)).toBe("delayed");
    expect(displayStatus({ ...base, status: "delayed" }, today)).toBe("arrives_today");
  });
  it("reviews", () => {
    expect(displayStatus({ ...base, status: "received", review_due_date: "2026-11-25" }, today)).toBe("review_pending");
    expect(displayStatus({ ...base, status: "received", review_due_date: "2026-11-18" }, today)).toBe("review_today");
    expect(displayStatus({ ...base, status: "received", review_due_date: "2026-11-10" }, today)).toBe("review_overdue");
  });
  it("completados", () => {
    expect(displayStatus({ ...base, status: "completed" }, today)).toBe("review_done");
    expect(displayStatus({ ...base, status: "completed", requires_review: false }, today)).toBe("received_no_review");
    expect(displayStatus({ ...base, status: "returned" }, today)).toBe("returned");
    expect(displayStatus({ ...base, status: "cancelled" }, today)).toBe("cancelled");
  });
});

describe("links", () => {
  it("normaliza links", () => {
    expect(normalizeUrl("a.co/d/abc")).toBe("https://a.co/d/abc");
    expect(normalizeUrl("  https://www.amazon.com/dp/B0X  ")).toBe("https://www.amazon.com/dp/B0X");
    expect(normalizeUrl("hola")).toBeNull();
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
  });
  it("enlaces de contacto", () => {
    expect(contactLink("whatsapp", "+1 (305) 555-1234")).toBe("https://wa.me/13055551234");
    expect(contactLink("instagram", "@tienda")).toBe("https://ig.me/m/tienda");
    expect(contactLink("messenger", null)).toBeNull();
  });
});

import { digestCounts } from "./dashboard";

describe("digestCounts", () => {
  const base = { requires_review: true, arrived_on: null, reviewed_on: null, store: "amazon" as const, registered_at: "2026-11-01T00:00:00Z", review_due_date: null };
  it("cuenta llegadas, reviews, vencidos y sin confirmar", () => {
    const c = digestCounts(
      [
        { ...base, status: "in_transit", expected_arrival_date: "2026-11-18" },
        { ...base, status: "delayed", expected_arrival_date: "2026-11-15" },
        { ...base, status: "received", expected_arrival_date: "2026-11-01", review_due_date: "2026-11-18" },
        { ...base, status: "received", expected_arrival_date: "2026-11-01", review_due_date: "2026-11-10" },
        { ...base, status: "in_transit", expected_arrival_date: "2026-11-25" },
      ],
      "2026-11-18",
    );
    expect(c).toEqual({ arrivals: 1, reviews: 1, overdue: 1, unconfirmed: 1 });
  });
});
