import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/ocr/route";

const saved = { provider: process.env.OCR_PROVIDER, key: process.env.OCR_SPACE_API_KEY };

beforeEach(() => {
  process.env.OCR_PROVIDER = "mock";
});

afterEach(() => {
  for (const [name, value] of [
    ["OCR_PROVIDER", saved.provider],
    ["OCR_SPACE_API_KEY", saved.key]
  ] as const) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

function request(file?: File) {
  const form = new FormData();
  if (file) form.append("file", file);
  return new NextRequest("http://localhost/api/ocr", { method: "POST", body: form });
}

const png = () => new File([new Uint8Array([137, 80, 78, 71])], "r.png", { type: "image/png" });

describe("POST /api/ocr", () => {
  it("returns the OCR text and its non-empty lines", async () => {
    const res = await POST(request(png()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fullText).toContain("Local Grocery");
    expect(body.lines[0]).toEqual({ text: "Local Grocery" });
    expect(body.lines.every((l: { text: string }) => l.text.length > 0)).toBe(true);
  });

  it("400s when no file is sent", async () => {
    const res = await POST(request());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No file uploaded" });
  });

  it("400s when the body is not multipart form data", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/ocr", { method: "POST", body: "plain text" })
    );
    expect(res.status).toBe(400);
  });

  it("400s for unsupported file types", async () => {
    const res = await POST(request(new File(["%PDF"], "r.pdf", { type: "application/pdf" })));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Unsupported/);
  });

  it("502s with the provider's message when OCR fails", async () => {
    process.env.OCR_PROVIDER = "ocr_space";
    process.env.OCR_SPACE_API_KEY = "";
    const res = await POST(request(png()));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/OCR_SPACE_API_KEY/);
  });
});
