import { NextRequest, NextResponse } from "next/server";
import { deleteReceipt, getReceipt, ReceiptLockedError, updateReceipt } from "@/lib/db/receipts";
import { getCurrentUserId } from "@/lib/db/user";
import { toReceiptRecord } from "@/lib/receipts/mapper";
import { receiptUpdateSchema } from "@/lib/receipts/validation";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: "Receipt not found" }, { status: 404 });

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const row = await getReceipt(await getCurrentUserId(), id);
  return row ? NextResponse.json({ receipt: toReceiptRecord(row) }) : notFound();
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const parsed = receiptUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid receipt", details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const row = await updateReceipt(await getCurrentUserId(), id, parsed.data);
    return row ? NextResponse.json({ receipt: toReceiptRecord(row) }) : notFound();
  } catch (error) {
    if (error instanceof ReceiptLockedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const imageKey = await deleteReceipt(await getCurrentUserId(), id);
  if (!imageKey) return notFound();
  await getStorage().remove(imageKey);
  return new NextResponse(null, { status: 204 });
}
