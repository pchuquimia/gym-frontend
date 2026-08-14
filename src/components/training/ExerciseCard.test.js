import { describe, expect, it } from "vitest";
import { parseLocalCalendarDate } from "../../utils/localCalendarDate";

describe("parseLocalCalendarDate", () => {
  it("interpreta una fecha de calendario en la zona horaria local", () => {
    const parsed = parseLocalCalendarDate("2026-08-11");

    expect(parsed).not.toBeNull();
    expect([
      parsed.getFullYear(),
      parsed.getMonth() + 1,
      parsed.getDate(),
      parsed.getHours(),
    ]).toEqual([2026, 8, 11, 0]);
  });
});
