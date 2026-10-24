import { NextRequest, NextResponse } from "next/server";
import { createReceipt, listReceipts } from "@/lib/db/receipts";
import { getCurrentUserId } from "@/lib/db/user";
import { getOcrProvider } from "@/lib/ocr";
import { extractReceipt } from "@/lib/receipts/extract";
import { toReceiptRecord } from "@/lib/receipts/mapper";
import { validateUpload } from "@/lib/receipts/validation";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const status = request.nextUrl.searchParams.get("status");
  const rows = await listReceipts(
    userId,
    status === "APPROVED" || status === "NEEDS_REVIEW" ? status : undefined
  );
  return NextResponse.json({ receipts: rows.map(toReceiptRecord) });
}

/** Upload a receipt image: store it, run OCR, save a NEEDS_REVIEW receipt. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  const invalid = validateUpload(file);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const userId = await getCurrentUserId();
  const bytes = Buffer.from(await file.arrayBuffer());
  const storage = getStorage();

  let rawText: string;
  try {
    rawText = await getOcrProvider().extractText({ bytes, mimeType: file.type, filename: file.name });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OCR failed" },
      { status: 502 }
    );
  }

  const imageKey = await storage.save({ userId, bytes, mimeType: file.type });
  try {
    const row = await createReceipt(userId, {
      imageKey,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      rawText,
      extracted: extractReceipt(rawText)
    });
    return NextResponse.json({ receipt: toReceiptRecord(row) }, { status: 201 });
  } catch (error) {
    await storage.remove(imageKey);
    throw error;
  }
}
