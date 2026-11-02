import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/user", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/lib/db/receipts", () => {
  class ReceiptLockedError extends Error {
    constructor() {
      super("Approved receipts cannot be edited.");
    }
  }
  return {
    ReceiptLockedError,
    listReceipts: vi.fn(),
    getReceipt: vi.fn(),
    createReceipt: vi.fn(),
    updateReceipt: vi.fn(),
    approveReceipt: vi.fn(),
    deleteReceipt: vi.fn()
  };
});

import { POST as APPROVE } from "@/app/api/receipts/[id]/approve/route";
import { DELETE, PATCH } from "@/app/api/receipts/[id]/route";
import { GET, POST } from "@/app/api/receipts/route";
import {
  approveReceipt,
  createReceipt,
  deleteReceipt,
  listReceipts,
  ReceiptLockedError,
  updateReceipt
} from "@/lib/db/receipts";
import { getCurrentUserId } from "@/lib/db/user";
import { getStorage } from "@/lib/storage";

let uploadDir: string;
const saved = {
  provider: process.env.OCR_PROVIDER,
  key: process.env.OCR_SPACE_API_KEY,
  dir: process.env.LOCAL_STORAGE_DIR
};

beforeEach(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), "rs-api-"));
  process.env.LOCAL_STORAGE_DIR = uploadDir;
  process.env.OCR_PROVIDER = "mock";
  vi.mocked(getCurrentUserId).mockResolvedValue("u1");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(uploadDir, { recursive: true, force: true });
  for (const [name, value] of [
    ["OCR_PROVIDER", saved.provider],
    ["OCR_SPACE_API_KEY", saved.key],
    ["LOCAL_STORAGE_DIR", saved.dir]
  ] as const) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

const png = () => new File([new Uint8Array([137, 80, 78, 71])], "r.png", { type: "image/png" });

function upload(file?: File) {
  const form = new FormData();
  if (file) form.append("file", file);
  return new NextRequest("http://localhost/api/receipts", { method: "POST", body: form });
}

/** A DB row shaped like what createReceipt returns, built from what the route passed in. */
function rowFromInput(input: {
  rawText: string;
  extracted: {
    merchantName: string | null;
    purchasedAt: Date | null;
    totalCents: number | null;
    items: Array<{
      description: string;
      totalCents: number;
      quantityText: string | null;
      quantityGrams: number | null;
      category: string;
      necessity: string;
    }>;
  };
}) {
  return {
    id: "r1",
    merchantName: input.extracted.merchantName,
    purchasedAt: input.extracted.purchasedAt,
    totalCents: input.extracted.totalCents,
    rawText: input.rawText,
    createdAt: new Date("2026-10-04T00:00:00Z"),
    lineItems: input.extracted.items.map((i, n) => ({ id: `i${n}`, ...i }))
  };
}

const dbRow = {
  id: "r1",
  merchantName: "Shop",
  purchasedAt: new Date("2026-10-03T12:00:00Z"),
  totalCents: 469,
  rawText: "Shop",
  createdAt: new Date("2026-10-04T00:00:00Z"),
  lineItems: []
};

describe("POST /api/receipts", () => {
  it("400s when no file is sent", async () => {
    const res = await POST(upload());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No file uploaded" });
  });

  it("400s for unsupported file types", async () => {
    const res = await POST(upload(new File(["%PDF"], "r.pdf", { type: "application/pdf" })));
    expect(res.status).toBe(400);
    expect(getCurrentUserId).not.toHaveBeenCalled();
  });

  it("saves the image and a NEEDS_REVIEW receipt for a valid upload", async () => {
    vi.mocked(createReceipt).mockImplementation((async (
      _userId: string,
      input: Parameters<typeof rowFromInput>[0]
    ) => rowFromInput(input)) as never);

    const res = await POST(upload(png()));

    expect(res.status).toBe(201);
    const { receipt } = await res.json();
    expect(receipt.merchant).toBe("Local Grocery");
    expect(receipt.totalCents).toBe(2465);
    expect(receipt.items.map((i: { name: string }) => i.name)).toEqual([
      "Yellow Onion",
      "Garlic",
      "Jasmine Rice",
      "Milk",
      "Eggs"
    ]);
    expect(receipt.rawOcrText).toContain("SUBTOTAL");

    expect(createReceipt).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ originalName: "r.png", mimeType: "image/png", sizeBytes: 4 })
    );
    expect(await readdir(path.join(uploadDir, "u1"))).toHaveLength(1);
  });

  it("502s with the OCR error and stores nothing when OCR fails", async () => {
    process.env.OCR_PROVIDER = "ocr_space";
    process.env.OCR_SPACE_API_KEY = "";

    const res = await POST(upload(png()));

    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/OCR_SPACE_API_KEY/);
    expect(createReceipt).not.toHaveBeenCalled();
    await expect(readdir(path.join(uploadDir, "u1"))).rejects.toThrow();
  });

  it("503s with JSON (not an empty 500) when the database is unreachable", async () => {
    vi.mocked(getCurrentUserId).mockRejectedValue(
      new Prisma.PrismaClientInitializationError("can't reach", "5.22.0", "P1001")
    );

    const res = await POST(upload(png()));

    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/Database is unavailable/);
  });

  it("removes the stored image when saving the receipt fails", async () => {
    vi.mocked(createReceipt).mockRejectedValue(new Error("insert failed"));

    const res = await POST(upload(png()));

    expect(res.status).toBe(500);
    expect(await readdir(path.join(uploadDir, "u1"))).toEqual([]);
  });
});

describe("GET /api/receipts", () => {
  const get = (query = "") => GET(new NextRequest(`http://localhost/api/receipts${query}`));

  it("lists the current user's receipts", async () => {
    vi.mocked(listReceipts).mockResolvedValue([dbRow] as never);
    const res = await get();
    expect(res.status).toBe(200);
    expect((await res.json()).receipts).toHaveLength(1);
    expect(listReceipts).toHaveBeenCalledWith("u1", undefined);
  });

  it("passes through known status filters and ignores unknown ones", async () => {
    vi.mocked(listReceipts).mockResolvedValue([]);
    await get("?status=APPROVED");
    await get("?status=NEEDS_REVIEW");
    await get("?status=bogus");
    expect(vi.mocked(listReceipts).mock.calls.map((c) => c[1])).toEqual([
      "APPROVED",
      "NEEDS_REVIEW",
      undefined
    ]);
  });

  it("returns JSON when the database is down", async () => {
    vi.mocked(getCurrentUserId).mockRejectedValue(
      new Prisma.PrismaClientInitializationError("can't reach", "5.22.0", "P1001")
    );
    const res = await get();
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/Database/);
  });
});

describe("PATCH /api/receipts/:id", () => {
  const ctx = { params: Promise.resolve({ id: "r1" }) };
  const valid = {
    merchant: "Shop",
    purchasedAt: "2026-10-03T12:00:00.000Z",
    items: [{ name: "Milk", quantityText: "", lineTotalCents: 469, category: "dairy", necessity: "necessary" }]
  };
  const patch = (body: unknown) =>
    PATCH(
      new NextRequest("http://localhost/api/receipts/r1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body)
      }),
      ctx
    );

  it("updates and returns the receipt", async () => {
    vi.mocked(updateReceipt).mockResolvedValue(dbRow as never);
    const res = await patch(valid);
    expect(res.status).toBe(200);
    expect(updateReceipt).toHaveBeenCalledWith("u1", "r1", valid);
  });

  it("400s on an invalid body without touching the database", async () => {
    const res = await patch({ ...valid, merchant: "" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid receipt");
    expect(updateReceipt).not.toHaveBeenCalled();
  });

  it("400s on malformed JSON", async () => {
    expect((await patch("{not json")).status).toBe(400);
  });

  it("404s when the receipt is not the user's", async () => {
    vi.mocked(updateReceipt).mockResolvedValue(null);
    expect((await patch(valid)).status).toBe(404);
  });

  it("409s once the receipt is approved", async () => {
    vi.mocked(updateReceipt).mockRejectedValue(new ReceiptLockedError());
    const res = await patch(valid);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/Approved/);
  });
});

describe("POST /api/receipts/:id/approve", () => {
  const approve = () =>
    APPROVE(new NextRequest("http://localhost/api/receipts/r1/approve", { method: "POST" }), {
      params: Promise.resolve({ id: "r1" })
    });

  it("approves and returns the receipt", async () => {
    vi.mocked(approveReceipt).mockResolvedValue(dbRow as never);
    const res = await approve();
    expect(res.status).toBe(200);
    expect(approveReceipt).toHaveBeenCalledWith("u1", "r1");
  });

  it("404s for an unknown receipt", async () => {
    vi.mocked(approveReceipt).mockResolvedValue(null);
    expect((await approve()).status).toBe(404);
  });
});

describe("DELETE /api/receipts/:id", () => {
  const del = () =>
    DELETE(new NextRequest("http://localhost/api/receipts/r1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "r1" })
    });

  it("deletes the receipt and its stored image", async () => {
    const key = await getStorage().save({ userId: "u1", bytes: Buffer.from("x"), mimeType: "image/png" });
    vi.mocked(deleteReceipt).mockResolvedValue(key);

    const res = await del();

    expect(res.status).toBe(204);
    await expect(getStorage().read(key)).rejects.toThrow();
  });

  it("404s for an unknown receipt", async () => {
    vi.mocked(deleteReceipt).mockResolvedValue(null);
    expect((await del()).status).toBe(404);
  });
});
