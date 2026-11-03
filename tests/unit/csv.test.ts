import { describe, expect, it } from "vitest";
import { formatUsd, receiptToCsv } from "@/lib/receipt-utils";
import type { ReceiptRecord } from "@/lib/types";

const HEADER =
  "receipt_id,merchant,purchased_at,item_name,quantity_text,quantity_grams,line_total_usd,category,necessity";

function receipt(overrides: Partial<ReceiptRecord> = {}): ReceiptRecord {
  return {
    id: "r1",
    merchant: "Shop, Inc",
    purchasedAt: "2026-10-03T12:00:00.000Z",
    totalCents: 998,
    rawOcrText: "",
    createdAt: "2026-10-03T12:00:00.000Z",
    items: [
      {
        id: "i1",
        name: 'Chips "Family"',
        quantityText: "1 bag",
        quantityGrams: 262,
        lineTotalCents: 529,
        category: "junk_food",
        necessity: "non_necessary"
      },
      {
        id: "i2",
        name: "Milk",
        quantityText: "",
        lineTotalCents: 469,
        category: "dairy",
        necessity: "necessary"
      }
    ],
    ...overrides
  };
}

describe("receiptToCsv", () => {
  it("emits only the header for no receipts", () => {
    expect(receiptToCsv([])).toBe(HEADER);
  });

  it("writes one row per item, in dollars, escaping commas and quotes", () => {
    expect(receiptToCsv([receipt()]).split("\n")).toEqual([
      HEADER,
      'r1,"Shop, Inc",2026-10-03T12:00:00.000Z,"Chips ""Family""",1 bag,262,5.29,junk_food,non_necessary',
      'r1,"Shop, Inc",2026-10-03T12:00:00.000Z,Milk,,,4.69,dairy,necessary'
    ]);
  });

  it("quotes values containing newlines so rows stay intact", () => {
    const csv = receiptToCsv([receipt({ merchant: "Line1\nLine2", items: receipt().items.slice(1) })]);
    expect(csv).toContain('"Line1\nLine2"');
  });

  it("skips receipts that have no items", () => {
    expect(receiptToCsv([receipt({ items: [] })])).toBe(HEADER);
  });
});

describe("formatUsd", () => {
  it("formats cents as dollars", () => {
    expect(formatUsd(0)).toBe("$0.00");
    expect(formatUsd(1099)).toBe("$10.99");
    expect(formatUsd(1234567)).toBe("$12,345.67");
  });
});
