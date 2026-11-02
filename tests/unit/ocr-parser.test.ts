import { describe, expect, it } from "vitest";
import { parseReceiptText } from "@/lib/ocr-parser";

const TEXT = `Local Grocery
10/03/2026 14:05
Yellow Onion 2 lb 2.79
Garlic 3 ct 1.99
SUBTOTAL 4.78
TAX 0.00
TOTAL 4.78`;

describe("parseReceiptText", () => {
  const parsed = parseReceiptText(TEXT);

  it("takes the first line as merchant and joins date with time", () => {
    expect(parsed.merchant).toBe("Local Grocery");
    expect(parsed.purchasedAt).toBe("10/03/2026 14:05");
  });

  it("keeps item lines and drops subtotal, tax and total", () => {
    expect(parsed.items.map((i) => i.description)).toEqual(["Yellow Onion 2 lb", "Garlic 3 ct"]);
  });

  it("reads quantity and per-unit price", () => {
    expect(parsed.items[1]).toEqual({
      description: "Garlic 3 ct",
      quantity: 3,
      unitPrice: 0.66,
      lineTotal: 1.99
    });
  });

  it("leaves quantity empty when the line has none", () => {
    const { items } = parseReceiptText("Shop\nMilk 4.69");
    expect(items[0]).toMatchObject({ quantity: null, unitPrice: null, lineTotal: 4.69 });
  });

  it("ignores blank lines and CRLF line endings", () => {
    const { merchant, items } = parseReceiptText("Shop\r\n\r\nMilk 4.69\r\n");
    expect(merchant).toBe("Shop");
    expect(items).toHaveLength(1);
  });

  it("reports a date without a time", () => {
    expect(parseReceiptText("Shop\n10/03/2026\nMilk 4.69").purchasedAt).toBe("10/03/2026");
  });

  it("copes with empty or item-less text", () => {
    expect(parseReceiptText("")).toEqual({ merchant: null, purchasedAt: null, items: [] });
    expect(parseReceiptText("Just a name")).toEqual({ merchant: "Just a name", purchasedAt: null, items: [] });
  });

  it("only treats two-decimal amounts as prices", () => {
    expect(parseReceiptText("Shop\nMilk 4").items).toEqual([]);
  });
});
