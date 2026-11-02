import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOcrProvider, mockOcr, ocrSpace } from "@/lib/ocr";

const INPUT = { bytes: Buffer.from("img"), mimeType: "image/png", filename: "r.png" };

const saved = { provider: process.env.OCR_PROVIDER, key: process.env.OCR_SPACE_API_KEY };

beforeEach(() => {
  delete process.env.OCR_PROVIDER;
  delete process.env.OCR_SPACE_API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const [name, value] of [
    ["OCR_PROVIDER", saved.provider],
    ["OCR_SPACE_API_KEY", saved.key]
  ] as const) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("getOcrProvider", () => {
  it("defaults to the mock provider", () => {
    expect(getOcrProvider()).toBe(mockOcr);
  });

  it("selects a provider by OCR_PROVIDER", () => {
    process.env.OCR_PROVIDER = "ocr_space";
    expect(getOcrProvider()).toBe(ocrSpace);
    process.env.OCR_PROVIDER = "mock";
    expect(getOcrProvider()).toBe(mockOcr);
  });

  it("throws for an unknown provider", () => {
    process.env.OCR_PROVIDER = "bogus";
    expect(() => getOcrProvider()).toThrow(/Unknown OCR_PROVIDER "bogus"/);
  });
});

describe("mockOcr", () => {
  it("returns fixed sample text with a total line", async () => {
    const text = await mockOcr.extractText(INPUT);
    expect(text).toContain("Local Grocery");
    expect(text).toMatch(/^TOTAL 24\.65$/m);
  });
});

describe("ocrSpace", () => {
  function stubFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, ...response });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("requires OCR_SPACE_API_KEY", async () => {
    await expect(ocrSpace.extractText(INPUT)).rejects.toThrow(/OCR_SPACE_API_KEY/);
  });

  it("posts the image with the API key and returns trimmed text", async () => {
    process.env.OCR_SPACE_API_KEY = "test-key";
    const fetchMock = stubFetch({
      json: async () => ({ ParsedResults: [{ ParsedText: "  Shop\nMilk 4.69  \n" }] })
    });

    await expect(ocrSpace.extractText(INPUT)).resolves.toBe("Shop\nMilk 4.69");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.ocr.space/parse/image");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ apikey: "test-key" });
    expect((init.body as FormData).get("file")).toBeInstanceOf(Blob);
  });

  it("surfaces provider error messages", async () => {
    process.env.OCR_SPACE_API_KEY = "test-key";
    stubFetch({ json: async () => ({ IsErroredOnProcessing: true, ErrorMessage: ["bad image", "try again"] }) });
    await expect(ocrSpace.extractText(INPUT)).rejects.toThrow("OCR provider error: bad image; try again");
  });

  it("fails on a non-2xx response", async () => {
    process.env.OCR_SPACE_API_KEY = "test-key";
    stubFetch({ ok: false, status: 500 });
    await expect(ocrSpace.extractText(INPUT)).rejects.toThrow(/status 500/);
  });

  it("fails when no text comes back", async () => {
    process.env.OCR_SPACE_API_KEY = "test-key";
    stubFetch({ json: async () => ({ ParsedResults: [{ ParsedText: "   " }] }) });
    await expect(ocrSpace.extractText(INPUT)).rejects.toThrow("OCR returned no text");
  });
});
