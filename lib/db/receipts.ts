import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type { ExtractedReceipt } from "@/lib/receipts/extract";
import { dominantCategory } from "@/lib/receipts/mapper";
import type { ReceiptUpdate } from "@/lib/receipts/validation";

const withItems = { lineItems: { orderBy: { createdAt: "asc" as const } } };

export function listReceipts(userId: string, status?: "APPROVED" | "NEEDS_REVIEW") {
  return prisma.receipt.findMany({
    where: { userId, ...(status ? { status } : {}) },
    include: withItems,
    orderBy: { createdAt: "desc" }
  });
}

export function getReceipt(userId: string, id: string) {
  return prisma.receipt.findFirst({ where: { id, userId }, include: withItems });
}

export function createReceipt(
  userId: string,
  input: {
    imageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    rawText: string;
    extracted: ExtractedReceipt;
  }
) {
  const { extracted } = input;
  return prisma.receipt.create({
    data: {
      userId,
      imageUrl: input.imageKey,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      rawText: input.rawText,
      status: "NEEDS_REVIEW",
      merchantName: extracted.merchantName,
      purchasedAt: extracted.purchasedAt,
      subtotalCents: extracted.subtotalCents,
      taxCents: extracted.taxCents,
      totalCents: extracted.totalCents,
      lineItems: {
        create: extracted.items.map((i) => ({
          description: i.description,
          quantityText: i.quantityText,
          quantityGrams: i.quantityGrams,
          totalCents: i.totalCents,
          category: i.category,
          necessity: i.necessity
        }))
      }
    },
    include: withItems
  });
}

/** Replace merchant/date/items on a receipt that is not yet approved. Returns null if not found. */
export async function updateReceipt(userId: string, id: string, update: ReceiptUpdate) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.receipt.findFirst({ where: { id, userId } });
    if (!existing) return null;
    if (existing.status === "APPROVED") throw new ReceiptLockedError();
    await tx.lineItem.deleteMany({ where: { receiptId: id } });
    return tx.receipt.update({
      where: { id },
      data: {
        merchantName: update.merchant,
        purchasedAt: new Date(update.purchasedAt),
        totalCents: update.items.reduce((s, i) => s + i.lineTotalCents, 0),
        lineItems: {
          create: update.items.map((i) => ({
            description: i.name,
            quantityText: i.quantityText || null,
            quantityGrams: i.quantityGrams ?? null,
            totalCents: i.lineTotalCents,
            category: i.category,
            necessity: i.necessity
          }))
        }
      },
      include: withItems
    });
  });
}

/** Mark approved and create exactly one Expense for it (idempotent). */
export async function approveReceipt(userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const receipt = await tx.receipt.findFirst({ where: { id, userId }, include: withItems });
    if (!receipt) return null;
    if (receipt.status === "APPROVED") return receipt;

    const amountCents =
      receipt.totalCents ?? receipt.lineItems.reduce((s, i) => s + (i.totalCents ?? 0), 0);
    const categoryName = dominantCategory(
      receipt.lineItems.map((i) => ({ category: i.category, lineTotalCents: i.totalCents ?? 0 }))
    );
    const category = await tx.category.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName }
    });
    await tx.expense.create({
      data: {
        userId,
        receiptId: id,
        categoryId: category.id,
        merchant: receipt.merchantName ?? "Unknown merchant",
        amountCents,
        currency: receipt.currency,
        spentAt: receipt.purchasedAt ?? receipt.createdAt
      }
    });
    return tx.receipt.update({ where: { id }, data: { status: "APPROVED" }, include: withItems });
  });
}

export async function deleteReceipt(userId: string, id: string): Promise<string | null> {
  const existing = await prisma.receipt.findFirst({ where: { id, userId } });
  if (!existing) return null;
  await prisma.receipt.delete({ where: { id } });
  return existing.imageUrl;
}

export class ReceiptLockedError extends Error {
  constructor() {
    super("Approved receipts cannot be edited.");
  }
}

export function isPrismaError(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError;
}
