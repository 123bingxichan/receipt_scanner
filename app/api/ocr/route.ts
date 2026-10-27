import { NextRequest, NextResponse } from "next/server";
import { getOcrProvider } from "@/lib/ocr";
import { validateUpload } from "@/lib/receipts/validation";

export const runtime = "nodejs";

/** Stateless OCR preview: returns text without saving anything. */
export async function POST(request: NextRequest) {
  const file = (await request.formData()).get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  const invalid = validateUpload(file);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  try {
    const fullText = await getOcrProvider().extractText({
      bytes: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type,
      filename: file.name
    });
    const lines = fullText.split(/\r?\n/).map((t) => t.trim()).filter(Boolean).map((text) => ({ text }));
    return NextResponse.json({ fullText, lines });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "OCR failed" }, { status: 502 });
  }
}
