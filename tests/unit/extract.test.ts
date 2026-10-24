import { describe, expect, it } from "vitest";
import { extractReceipt, parseDate, toCents } from "@/lib/receipts/extract";
import { dominantCategory, toReceiptRecord } from "@/lib/receipts/mapper";
import { validateUpload } from "@/lib/receipts/validation";
import { createLocalStorage } from "@/lib/storage";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const TEXT = `Local Grocery
10/03/2026 2:05 PM
Yellow Onion 2 lb 2.79
Eggs 12 ct 4.19
Doritos Nacho 5.29
SUBTOTAL 12.27
TAX 0.50
TOTAL 12.77`;

describe("extractReceipt", () => {
  const r = extractReceipt(TEXT);
  it("reads merchant, totals and date", () => {
    expect(r.merchantName).toBe("Local Grocery");
    expect(r.subtotalCents).toBe(1227);
    expect(r.taxCents).toBe(50);
    expect(r.totalCents).toBe(1277);
    expect(r.purchasedAt?.toISOString()).toBe("2026-10-03T14:05:00.000Z");
  });
  it("keeps only item lines, in integer cents", () => {
    expect(r.items.map((i) => [i.description, i.totalCents])).toEqual([
      ["Yellow Onion", 279],
      ["Eggs", 419],
      ["Doritos Nacho", 529]
    ]);
    expect(r.items[0].quantityGrams).toBe(907);
    expect(r.items[2].necessity).toBe("non_necessary");
  });
  it("falls back to item sum when no total line", () => {
    expect(extractReceipt("Shop\nMilk 4.69\nEggs 4.19").totalCents).toBe(888);
  });
});

describe("helpers", () => {
  it("avoids float drift", () => expect(toCents(1.15)).toBe(115));
  it("rejects bad dates", () => expect(parseDate("13/45/2026")).toBeNull());
  it("picks dominant category by spend", () =>
    expect(
      dominantCategory([
        { category: "dairy", lineTotalCents: 100 },
        { category: "pantry", lineTotalCents: 900 }
      ])
    ).toBe("pantry"));
  it("maps db rows to UI records", () => {
    const rec = toReceiptRecord({
      id: "r1",
      merchantName: null,
      purchasedAt: null,
      totalCents: null,
      rawText: null,
      createdAt: new Date("2026-10-01T00:00:00Z"),
      lineItems: [
        { id: "i1", description: "Milk", totalCents: 469, quantityText: null, quantityGrams: null, category: "dairy", necessity: "necessary" }
      ]
    });
    expect(rec.merchant).toBe("Unknown merchant");
    expect(rec.totalCents).toBe(469);
    expect(rec.purchasedAt).toBe("2026-10-01T00:00:00.000Z");
  });
});

describe("validateUpload", () => {
  it("accepts images, rejects others", () => {
    expect(validateUpload({ type: "image/png", size: 10 })).toBeNull();
    expect(validateUpload({ type: "application/pdf", size: 10 })).toMatch(/Unsupported/);
    expect(validateUpload({ type: "image/png", size: 11 * 1024 * 1024 })).toMatch(/large/);
  });
});

describe("local storage", () => {
  it("round-trips and blocks path traversal", async () => {
    const s = createLocalStorage(await mkdtemp(path.join(tmpdir(), "rs-")));
    const key = await s.save({ userId: "u1", bytes: Buffer.from("abc"), mimeType: "image/png" });
    expect((await s.read(key)).toString()).toBe("abc");
    await expect(s.read("../../etc/passwd")).rejects.toThrow();
  });
});
