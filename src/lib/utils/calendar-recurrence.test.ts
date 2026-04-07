import { describe, expect, it } from "vitest";
import {
  parseStoredDate,
  toDateStr,
  weekSunday,
} from "@/lib/utils/calendar-recurrence";

describe("calendar-recurrence", () => {
  it("toDateStr formats local calendar date", () => {
    expect(toDateStr(new Date(2026, 3, 6))).toBe("2026-04-06");
  });

  it("parseStoredDate uses date part without UTC day shift for midnight UTC", () => {
    const d = parseStoredDate("2026-04-11T00:00:00+00:00");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(11);
  });

  it("weekSunday returns Sunday of the same week (local)", () => {
    const wed = new Date(2026, 3, 8);
    const sun = weekSunday(wed);
    expect(sun.getDay()).toBe(0);
    expect(toDateStr(sun)).toBe("2026-04-05");
  });
});
