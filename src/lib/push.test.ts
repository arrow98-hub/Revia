import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("./supabase/server", () => ({ getAdminSupabase: () => null }));
const { digestText } = await import("./push");

describe("digestText", () => {
  it("no envía nada si no hay pendientes", () => {
    expect(digestText({ arrivals: 0, reviews: 0, overdue: 0, unconfirmed: 0 })).toBeNull();
  });
  it("resume el día", () => {
    expect(digestText({ arrivals: 2, reviews: 1, overdue: 1, unconfirmed: 0 })).toBe("Hoy: 2 llegadas, 1 review. 1 review vencido.");
    expect(digestText({ arrivals: 0, reviews: 0, overdue: 0, unconfirmed: 2 })).toBe("2 llegadas sin confirmar.");
  });
});
