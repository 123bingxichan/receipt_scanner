import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Runs only when a real Postgres is available: RUN_DB_TESTS=1 npm test
// Drives the real route handlers end to end (mock OCR, temp-dir storage, real database).
const run = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;

const email = `flow-${Date.now()}@t.dev`;
const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
let dir: string;
const saved = {
  email: process.env.DEFAULT_USER_EMAIL,
  provider: process.env.OCR_PROVIDER,
  dir: process.env.LOCAL_STORAGE_DIR
};

function json(url: string, method: string, body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

run("upload flow through the API routes", () => {
  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "rs-flow-"));
    process.env.DEFAULT_USER_EMAIL = email;
    process.env.OCR_PROVIDER = "mock";
    process.env.LOCAL_STORAGE_DIR = dir;
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db/client");
    await prisma.user.deleteMany({ where: { email } }); // cascades to receipts, items, expenses
    await prisma.$disconnect();
    await rm(dir, { recursive: true, force: true });
    for (const [name, value] of [
      ["DEFAULT_USER_EMAIL", saved.email],
      ["OCR_PROVIDER", saved.provider],
      ["LOCAL_STORAGE_DIR", saved.dir]
    ] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it("upload -> review -> edit -> approve -> image -> delete", async () => {
    const collection = await import("@/app/api/receipts/route");
    const single = await import("@/app/api/receipts/[id]/route");
    const approve = await import("@/app/api/receipts/[id]/approve/route");
    const image = await import("@/app/api/receipts/[id]/image/route");

    // upload
    const form = new FormData();
    form.append("file", new File([bytes], "receipt.png", { type: "image/png" }));
    const created = await collection.POST(
      new NextRequest("http://localhost/api/receipts", { method: "POST", body: form })
    );
    expect(created.status).toBe(201);
    const { receipt } = await created.json();
    expect(receipt.merchant).toBe("Local Grocery");
    expect(receipt.items).toHaveLength(5);
    const id: string = receipt.id;

    // it is pending review, not yet counted as saved
    const ids = async (status: string) =>
      ((await (await collection.GET(json(`/api/receipts?status=${status}`, "GET"))).json()).receipts as Array<{ id: string }>).map(
        (r) => r.id
      );
    expect(await ids("NEEDS_REVIEW")).toContain(id);
    expect(await ids("APPROVED")).not.toContain(id);

    // edit
    const edited = await single.PATCH(
      json(`/api/receipts/${id}`, "PATCH", {
        merchant: "Corner Shop",
        purchasedAt: "2026-10-03T12:00:00.000Z",
        items: [{ name: "Rice", quantityText: "5 lb", lineTotalCents: 1099, category: "pantry", necessity: "necessary" }]
      }),
      ctx(id)
    );
    expect(edited.status).toBe(200);
    expect((await edited.json()).receipt.totalCents).toBe(1099);

    // approve (twice, to prove idempotence)
    for (let i = 0; i < 2; i++) {
      const res = await approve.POST(json(`/api/receipts/${id}/approve`, "POST"), ctx(id));
      expect(res.status).toBe(200);
    }
    expect(await ids("APPROVED")).toContain(id);
    expect(await ids("NEEDS_REVIEW")).not.toContain(id);

    const { prisma } = await import("@/lib/db/client");
    const expenses = await prisma.expense.findMany({ where: { receiptId: id } });
    expect(expenses).toHaveLength(1);
    expect(expenses[0]).toMatchObject({ merchant: "Corner Shop", amountCents: 1099 });

    // approved receipts are locked
    const locked = await single.PATCH(
      json(`/api/receipts/${id}`, "PATCH", { merchant: "x", purchasedAt: "2026-10-03T12:00:00.000Z", items: [] }),
      ctx(id)
    );
    expect(locked.status).toBe(409);

    // the original image is served back unchanged
    const img = await image.GET(json(`/api/receipts/${id}/image`, "GET"), ctx(id));
    expect(img.status).toBe(200);
    expect(img.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await img.arrayBuffer())).toEqual(bytes);

    // delete
    expect((await single.DELETE(json(`/api/receipts/${id}`, "DELETE"), ctx(id))).status).toBe(204);
    expect((await single.GET(json(`/api/receipts/${id}`, "GET"), ctx(id))).status).toBe(404);
  });
});
