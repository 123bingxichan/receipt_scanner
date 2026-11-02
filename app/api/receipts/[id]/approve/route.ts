import { NextRequest, NextResponse } from "next/server";
import { withApiErrors } from "@/lib/api";
import { approveReceipt } from "@/lib/db/receipts";
import { getCurrentUserId } from "@/lib/db/user";
import { toReceiptRecord } from "@/lib/receipts/mapper";

export const runtime = "nodejs";

export const POST = withApiErrors(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const row = await approveReceipt(await getCurrentUserId(), id);
    if (!row) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    return NextResponse.json({ receipt: toReceiptRecord(row) });
  }
);
