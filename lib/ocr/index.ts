export interface OcrProvider {
  extractText(input: { bytes: Buffer; mimeType: string; filename: string }): Promise<string>;
}

const MOCK_TEXT = `Local Grocery
10/03/2026 14:05
Yellow Onion 2 lb 2.79
Garlic 3 ct 1.99
Jasmine Rice 5 lb 10.99
Milk 1 gal 4.69
Eggs 12 ct 4.19
SUBTOTAL 24.65
TAX 0.00
TOTAL 24.65`;

export const mockOcr: OcrProvider = {
  async extractText() {
    return MOCK_TEXT;
  }
};

export const ocrSpace: OcrProvider = {
  async extractText({ bytes, mimeType, filename }) {
    const apiKey = process.env.OCR_SPACE_API_KEY;
    if (!apiKey) {
      throw new Error("OCR_SPACE_API_KEY is not set (or use OCR_PROVIDER=mock for development).");
    }
    const form = new FormData();
    form.append("language", "eng");
    form.append("OCREngine", "2");
    form.append("isTable", "true");
    form.append("file", new Blob([new Uint8Array(bytes)], { type: mimeType }), filename);

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { apikey: apiKey },
      body: form,
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`OCR provider request failed with status ${response.status}`);
    }
    const payload = await response.json();
    if (payload?.IsErroredOnProcessing) {
      const message = Array.isArray(payload.ErrorMessage) ? payload.ErrorMessage.join("; ") : payload.ErrorMessage;
      throw new Error(`OCR provider error: ${message ?? "unknown"}`);
    }
    const text = String(payload?.ParsedResults?.[0]?.ParsedText ?? "").trim();
    if (!text) throw new Error("OCR returned no text");
    return text;
  }
};

export function getOcrProvider(): OcrProvider {
  const name = process.env.OCR_PROVIDER ?? "mock";
  if (name === "mock") return mockOcr;
  if (name === "ocr_space") return ocrSpace;
  throw new Error(`Unknown OCR_PROVIDER "${name}" (use "mock" or "ocr_space").`);
}
