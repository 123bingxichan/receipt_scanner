import { z } from "zod";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const;

export function validateUpload(file: { type: string; size: number }): string | null {
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Unsupported file type. Use JPEG, PNG, WebP or HEIC.";
  }
  if (file.size === 0) return "File is empty.";
  if (file.size > MAX_UPLOAD_BYTES) return "File is too large (max 10 MB).";
  return null;
}

const category = z.enum([
  "produce",
  "pantry",
  "junk_food",
  "household",
  "protein",
  "dairy",
  "beverage",
  "other"
]);
const necessity = z.enum(["necessary", "non_necessary", "unknown"]);

export const itemSchema = z.object({
  name: z.string().trim().min(1).max(300),
  quantityText: z.string().max(100).default(""),
  quantityGrams: z.number().int().nonnegative().optional(),
  lineTotalCents: z.number().int().min(0).max(100_000_000),
  category,
  necessity
});

export const receiptUpdateSchema = z.object({
  merchant: z.string().trim().min(1).max(200),
  purchasedAt: z.string().datetime(),
  items: z.array(itemSchema).max(500)
});

export type ReceiptUpdate = z.infer<typeof receiptUpdateSchema>;
