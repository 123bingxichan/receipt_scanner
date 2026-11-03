import { ReceiptRecord } from "@/lib/types";

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
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
        return /[",\r\n]/.test(safe) ? `"${safe.replaceAll("\"", "\"\"")}"` : safe;
      })
      .join(",")
  );

  return escaped.join("\n");
}
