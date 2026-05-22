import { NextRequest, NextResponse } from "next/server";
import { parseReceiptText } from "@/lib/ocr-parser";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const ocrForm = new FormData();
    ocrForm.append("language", "eng");
    ocrForm.append("isOverlayRequired", "true");
    ocrForm.append("OCREngine", "2");
    ocrForm.append("file", file);

    const apiKey = process.env.OCR_SPACE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OCR_SPACE_API_KEY in environment." },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { apikey: apiKey },
      body: ocrForm,
      cache: "no-store"
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `OCR provider request failed with status ${response.status}` },
        { status: 502 }
      );
    }

    const payload = await response.json();
    const first = payload?.ParsedResults?.[0];
    const fullText = String(first?.ParsedText ?? "").trim();

    if (!fullText) {
      return NextResponse.json({ error: "OCR returned no text" }, { status: 422 });
    }

    const parsed = parseReceiptText(fullText);

    return NextResponse.json({
      fullText,
      merchant: parsed.merchant,
      purchasedAt: parsed.purchasedAt,
      items: parsed.items
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected OCR error" },
      { status: 500 }
    );
  }
}
