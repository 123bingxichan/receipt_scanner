import { inferCategory, inferNecessity } from "@/lib/categorize";
import { ReceiptItem, ReceiptRecord } from "@/lib/types";

export { inferCategory, inferNecessity };

// #region agent log
function debugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>
) {
  fetch("http://127.0.0.1:7334/ingest/e882d7d4-43fb-44ee-aeac-72c167409c81", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "737ace" },
    body: JSON.stringify({
      sessionId: "737ace",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now()
    })
  }).catch(() => {});
}

function cryptoDiagnostics() {
  const c = typeof crypto !== "undefined" ? (crypto as Crypto & { randomUUID?: () => string }) : null;
  return {
    hasWindow: typeof window !== "undefined",
    hasProcess: typeof process !== "undefined",
    nodeVersion: typeof process !== "undefined" ? process.versions?.node : null,
    cryptoType: typeof crypto,
    cryptoConstructor: c?.constructor?.name ?? null,
    hasRandomUUID: typeof c?.randomUUID === "function",
    cryptoKeys: c ? Object.keys(c).slice(0, 12) : [],
    isSecureContext:
      typeof globalThis !== "undefined" &&
      "isSecureContext" in globalThis &&
      Boolean((globalThis as { isSecureContext?: boolean }).isSecureContext)
  };
}

debugLog("B", "receipt-utils.ts:module", "module evaluated", cryptoDiagnostics());
// #endregion

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

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}

export function generateMockExtraction(fileName: string): Omit<ReceiptRecord, "id" | "createdAt"> {
  return generateMockExtractionFromSeed(fileName, fileName.length * 9973);
}

export async function generateMockExtractionFromFile(file: File): Promise<Omit<ReceiptRecord, "id" | "createdAt">> {
  // #region agent log
  debugLog("C", "receipt-utils.ts:generateMockExtractionFromFile", "file upload extraction start", {
    fileName: file.name,
    fileSize: file.size,
    ...cryptoDiagnostics()
  });
  // #endregion
  const fileSeed = await hashFile(file);
  return generateMockExtractionFromSeed(file.name, fileSeed);
}

function generateMockExtractionFromSeed(
  fileName: string,
  seed: number
): Omit<ReceiptRecord, "id" | "createdAt"> {
  const lowerFile = fileName.toLowerCase();
  const merchant = lowerFile.includes("costco")
    ? "Costco"
    : lowerFile.includes("trader")
      ? "Trader Joe's"
      : lowerFile.includes("target")
        ? "Target"
        : "Local Grocery";

  const itemCount = 4 + (seed % 6);
  // #region agent log
  debugLog("A", "receipt-utils.ts:generateMockExtractionFromSeed", "before randomUUID in map", {
    fileName,
    seed,
    itemCount,
    ...cryptoDiagnostics()
  });
  // #endregion
  const picked = Array.from({ length: itemCount }).map((_, idx) => {
    const sample = MOCK_ITEMS[(idx + (seed % MOCK_ITEMS.length)) % MOCK_ITEMS.length];
    const name = sample.name;
    const lineTotalCents = sample.lineTotalCents + ((idx * 17 + (seed % 97)) % 190);
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
    totalCents,
    rawOcrText: picked
      .map((item) => `${item.name} ${item.quantityText} ${(item.lineTotalCents / 100).toFixed(2)}`)
      .join("\n")
  };
}

async function hashFile(file: File): Promise<number> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let hash = 2166136261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  hash ^= file.name.length;
  hash ^= file.size;
  return Math.abs(hash >>> 0);
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
