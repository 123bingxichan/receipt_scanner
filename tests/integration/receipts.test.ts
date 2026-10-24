import { afterAll, describe, expect, it } from "vitest";

// Runs only when a real Postgres is available: RUN_DB_TESTS=1 DATABASE_URL=... npm test
const run = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;

run("receipt persistence", () => {
  it("create -> update -> approve (idempotent) -> user isolation -> delete", async () => {
    const { prisma } = await import("@/lib/db/client");
    const db = await import("@/lib/db/receipts");
    const { extractReceipt } = await import("@/lib/receipts/extract");

    const a = await prisma.user.create({ data: { email: `a-${Date.now()}@t.dev` } });
    const b = await prisma.user.create({ data: { email: `b-${Date.now()}@t.dev` } });

    const created = await db.createReceipt(a.id, {
      imageKey: "k",
      originalName: "r.png",
      mimeType: "image/png",
      sizeBytes: 3,
      rawText: "x",
      extracted: extractReceipt("Shop\n10/03/2026\nMilk 4.69\nRice 10.99\nTOTAL 15.68")
    });
    expect(created.status).toBe("NEEDS_REVIEW");
    expect(created.lineItems).toHaveLength(2);

    const updated = await db.updateReceipt(a.id, created.id, {
      merchant: "Shop 2",
      purchasedAt: "2026-10-03T12:00:00.000Z",
      items: [{ name: "Rice", quantityText: "", lineTotalCents: 1099, category: "pantry", necessity: "necessary" }]
    });
    expect(updated?.totalCents).toBe(1099);

    const first = await db.approveReceipt(a.id, created.id);
    const again = await db.approveReceipt(a.id, created.id);
    expect(first?.status).toBe("APPROVED");
    expect(again?.status).toBe("APPROVED");
    const expenses = await prisma.expense.findMany({ where: { receiptId: created.id }, include: { category: true } });
    expect(expenses).toHaveLength(1);
    expect(expenses[0].amountCents).toBe(1099);
    expect(expenses[0].category?.name).toBe("pantry");

    await expect(
      db.updateReceipt(a.id, created.id, { merchant: "x", purchasedAt: "2026-10-03T12:00:00.000Z", items: [] })
    ).rejects.toThrow(/Approved/);

    expect(await db.getReceipt(b.id, created.id)).toBeNull();
    expect(await db.approveReceipt(b.id, created.id)).toBeNull();
    expect(await db.deleteReceipt(a.id, created.id)).toBe("k");
    await prisma.user.deleteMany({ where: { id: { in: [a.id, b.id] } } });
  });
  afterAll(async () => {
    const { prisma } = await import("@/lib/db/client");
    await prisma.$disconnect();
  });
});
