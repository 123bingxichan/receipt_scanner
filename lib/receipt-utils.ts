import { ItemCategory, NecessityLevel, ReceiptItem, ReceiptRecord } from "@/lib/types";

const CATEGORY_KEYWORDS: Array<{ category: ItemCategory; keywords: string[] }> = [
  { category: "produce", keywords: ["onion", "garlic", "tomato", "lettuce", "spinach", "apple", "banana"] },
  { category: "pantry", keywords: ["rice", "flour", "soy sauce", "oil", "beans", "pasta", "salt", "sugar"] },
  { category: "junk_food", keywords: ["chips", "doritos", "poptart", "candy", "soda", "cookie"] },
  { category: "household", keywords: ["soap", "wipes", "detergent", "toilet paper", "paper towel"] },
  { category: "protein", keywords: ["chicken", "beef", "tofu", "fish", "egg", "eggs"] },
  { category: "dairy", keywords: ["milk", "yogurt", "cheese", "butter"] },
  { category: "beverage", keywords: ["coffee", "tea", "juice", "water", "sake"] }
];

const NECESSARY_KEYWORDS = [
  "milk",
  "egg",
  "eggs",
  "onion",
  "garlic",
  "rice",
  "beans",
  "tomato",
  "lettuce",
  "chicken",
  "tofu",
  "soap",
  "wipes"
];

const MOCK_ITEMS = [
  { name: "Yellow Onion", quantityText: "2 lb", quantityGrams: 907, lineTotalCents: 279 },
  { name: "Garlic", quantityText: "3 bulbs", quantityGrams: 135, lineTotalCents: 199 },
  { name: "Doritos Nacho", quantityText: "1 bag", quantityGrams: 262, lineTotalCents: 529 },
  { name: "Soy Sauce", quantityText: "1 bottle", quantityGrams: 500, lineTotalCents: 449 },
  { name: "Jasmine Rice", quantityText: "5 lb", quantityGrams: 2268, lineTotalCents: 1099 },
  { name: "Milk", quantityText: "1 gallon", quantityGrams: 3785, lineTotalCents: 469 },
  { name: "Eggs", quantityText: "12 ct", quantityGrams: 680, lineTotalCents: 419 },
  { name: "Dish Soap", quantityText: "1 bottle", quantityGrams: 560, lineTotalCents: 399 },
  { name: "Paper Towels", quantityText: "6 ct", quantityGrams: 950, lineTotalCents: 999 },
  { name: "Pop Tarts", quantityText: "1 box", quantityGrams: 384, lineTotalCents: 479 },
  { name: "Sake", quantityText: "1 bottle", quantityGrams: 720, lineTotalCents: 1299 }
];

export function inferCategory(name: string): ItemCategory {
  const normalized = name.toLowerCase();
  const hit = CATEGORY_KEYWORDS.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(keyword))
  );
  return hit?.category ?? "other";
}

export function inferNecessity(name: string): NecessityLevel {
  const normalized = name.toLowerCase();
  if (NECESSARY_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "necessary";
  }
  if (["chips", "doritos", "candy", "poptart", "cookie", "soda"].some((keyword) => normalized.includes(keyword))) {
    return "non_necessary";
  }
  return "unknown";
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}

export function generateMockExtraction(fileName: string): Omit<ReceiptRecord, "id" | "createdAt"> {
  const lowerFile = fileName.toLowerCase();
  const merchant = lowerFile.includes("costco")
    ? "Costco"
    : lowerFile.includes("trader")
      ? "Trader Joe's"
      : lowerFile.includes("target")
        ? "Target"
        : "Local Grocery";

  const itemCount = 4 + (fileName.length % 4);
  const picked = Array.from({ length: itemCount }).map((_, idx) => {
    const sample = MOCK_ITEMS[(idx + fileName.length) % MOCK_ITEMS.length];
    const name = sample.name;
    const lineTotalCents = sample.lineTotalCents + ((idx * 17) % 90);
    const item: ReceiptItem = {
      id: crypto.randomUUID(),
      name,
      quantityText: sample.quantityText,
      quantityGrams: sample.quantityGrams,
      lineTotalCents,
      category: inferCategory(name),
      necessity: inferNecessity(name)
    };
    return item;
  });

  const totalCents = picked.reduce((acc, item) => acc + item.lineTotalCents, 0);

  return {
    merchant,
    purchasedAt: new Date().toISOString(),
    items: picked,
    totalCents
  };
}

export function receiptToCsv(receipts: ReceiptRecord[]): string {
  const headers = [
    "receipt_id",
    "merchant",
    "purchased_at",
    "item_name",
    "quantity_text",
    "quantity_grams",
    "line_total_usd",
    "category",
    "necessity"
  ];

  const rows = receipts.flatMap((receipt) =>
    receipt.items.map((item) => [
      receipt.id,
      receipt.merchant,
      receipt.purchasedAt,
      item.name,
      item.quantityText,
      item.quantityGrams?.toString() ?? "",
      (item.lineTotalCents / 100).toFixed(2),
      item.category,
      item.necessity
    ])
  );

  const escaped = [headers, ...rows].map((row) =>
    row
      .map((value) => {
        const safe = String(value ?? "");
        return safe.includes(",") || safe.includes("\"") ? `"${safe.replaceAll("\"", "\"\"")}"` : safe;
      })
      .join(",")
  );

  return escaped.join("\n");
}
