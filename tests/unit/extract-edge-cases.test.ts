import { describe, expect, it } from "vitest";
import { extractReceipt, parseDate, toCents } from "@/lib/receipts/extract";

describe("parseDate", () => {
  it("reads 12-hour times", () => {
    expect(parseDate("10/03/2026 9:05 AM")?.toISOString()).toBe("2026-10-03T09:05:00.000Z");
    expect(parseDate("10/03/2026 12:30 AM")?.toISOString()).toBe("2026-10-03T00:30:00.000Z");
    expect(parseDate("10/03/2026 12:30 PM")?.toISOString()).toBe("2026-10-03T12:30:00.000Z");
  });

  it("reads 24-hour times", () => {
    expect(parseDate("10/03/2026 14:05")?.toISOString()).toBe("2026-10-03T14:05:00.000Z");
  });

  it("expands two-digit years and accepts dashes", () => {
    expect(parseDate("1-2-26")?.toISOString()).toBe("2026-01-02T12:00:00.000Z");
  });

  it("defaults to noon UTC when no time is given", () => {
    expect(parseDate("10/03/2026")?.toISOString()).toBe("2026-10-03T12:00:00.000Z");
  });

  it("returns null for empty or unparseable text", () => {
    expect(parseDate(null)).toBeNull();
    expect(parseDate("")).toBeNull();
    expect(parseDate("not a date")).toBeNull();
  });

  it("rejects out-of-range months and days", () => {
    expect(parseDate("00/10/2026")).toBeNull();
    expect(parseDate("10/32/2026")).toBeNull();
  });
});

describe("toCents", () => {
  it("rounds to whole cents", () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(0)).toBe(0);
  });
});

describe("extractReceipt edge cases", () => {
  it("reads a GRAND TOTAL line", () => {
    expect(extractReceipt("Shop\nMilk 4.69\nGRAND TOTAL 5.00").totalCents).toBe(500);
  });

  it("prefers the printed total over the item sum", () => {
    expect(extractReceipt("Shop\nMilk 4.69\nTOTAL 5.00").totalCents).toBe(500);
  });

  it("does not mistake SUBTOTAL for TOTAL", () => {
    const r = extractReceipt("Shop\nMilk 4.69\nSUBTOTAL 4.69");
    expect(r.subtotalCents).toBe(469);
    expect(r.totalCents).toBe(469); // falls back to the item sum
  });

  it("returns a total with no item lines", () => {
    const r = extractReceipt("Shop\nTOTAL 9.99");
    expect(r.items).toEqual([]);
    expect(r.totalCents).toBe(999);
  });

  it("returns null totals when there is nothing to total", () => {
    expect(extractReceipt("Just a name")).toMatchObject({
      merchantName: "Just a name",
      items: [],
      totalCents: null,
      subtotalCents: null,
      taxCents: null,
      purchasedAt: null
    });
  });

  it("converts weights to grams and keeps the quantity text", () => {
    const { items } = extractReceipt("Shop\nBananas 1.5 kg 2.10\nCheese 8 oz 4.00");
    expect(items.map((i) => [i.description, i.quantityText, i.quantityGrams])).toEqual([
      ["Bananas", "1.5 kg", 1500],
      ["Cheese", "8 oz", 227]
    ]);
  });

  it("keeps counts as text without inventing grams", () => {
    const [eggs] = extractReceipt("Shop\nEggs 12 ct 4.19").items;
    expect(eggs.quantityText).toBe("12 ct");
    expect(eggs.quantityGrams).toBeNull();
  });
});
