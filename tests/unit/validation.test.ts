import { describe, expect, it } from "vitest";
import { dominantCategory } from "@/lib/receipts/mapper";
import { MAX_UPLOAD_BYTES, receiptUpdateSchema, validateUpload } from "@/lib/receipts/validation";

describe("validateUpload", () => {
  it.each(["image/jpeg", "image/png", "image/webp", "image/heic"])("accepts %s", (type) => {
    expect(validateUpload({ type, size: 10 })).toBeNull();
  });

  it("rejects other types", () => {
    expect(validateUpload({ type: "image/gif", size: 10 })).toMatch(/Unsupported/);
    expect(validateUpload({ type: "", size: 10 })).toMatch(/Unsupported/);
  });

  it("rejects empty files", () => {
    expect(validateUpload({ type: "image/png", size: 0 })).toBe("File is empty.");
  });

  it("allows exactly the limit and rejects one byte over", () => {
    expect(validateUpload({ type: "image/png", size: MAX_UPLOAD_BYTES })).toBeNull();
    expect(validateUpload({ type: "image/png", size: MAX_UPLOAD_BYTES + 1 })).toMatch(/too large/);
  });
});

describe("receiptUpdateSchema", () => {
  const item = {
    name: "Milk",
    quantityText: "1 gal",
    lineTotalCents: 469,
    category: "dairy",
    necessity: "necessary"
  };
  const valid = { merchant: "Shop", purchasedAt: "2026-10-03T12:00:00.000Z", items: [item] };

  it("accepts a valid update and trims the merchant", () => {
    const parsed = receiptUpdateSchema.parse({ ...valid, merchant: "  Shop  " });
    expect(parsed.merchant).toBe("Shop");
  });

  it("defaults quantityText to an empty string", () => {
    const withoutQty = Object.fromEntries(Object.entries(item).filter(([key]) => key !== "quantityText"));
    const parsed = receiptUpdateSchema.parse({ ...valid, items: [withoutQty] });
    expect(parsed.items[0].quantityText).toBe("");
  });

  it("accepts a receipt with no items", () => {
    expect(receiptUpdateSchema.safeParse({ ...valid, items: [] }).success).toBe(true);
  });

  it.each([
    ["an empty merchant", { merchant: "   " }],
    ["a non-ISO date", { purchasedAt: "10/03/2026" }],
    ["a negative price", { items: [{ ...item, lineTotalCents: -1 }] }],
    ["a fractional price", { items: [{ ...item, lineTotalCents: 4.5 }] }],
    ["an unknown category", { items: [{ ...item, category: "snacks" }] }],
    ["an unknown necessity", { items: [{ ...item, necessity: "maybe" }] }],
    ["an empty item name", { items: [{ ...item, name: " " }] }],
    ["more than 500 items", { items: Array.from({ length: 501 }, () => item) }]
  ])("rejects %s", (_label, patch) => {
    expect(receiptUpdateSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});

describe("dominantCategory", () => {
  it("defaults to other with no items", () => {
    expect(dominantCategory([])).toBe("other");
  });

  it("sums spend per category", () => {
    expect(
      dominantCategory([
        { category: "dairy", lineTotalCents: 300 },
        { category: "pantry", lineTotalCents: 200 },
        { category: "pantry", lineTotalCents: 200 }
      ])
    ).toBe("pantry");
  });

  it("keeps the first category on a tie", () => {
    expect(
      dominantCategory([
        { category: "dairy", lineTotalCents: 100 },
        { category: "pantry", lineTotalCents: 100 }
      ])
    ).toBe("dairy");
  });
});
