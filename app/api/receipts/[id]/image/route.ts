import { NextRequest, NextResponse } from "next/server";
import { getReceipt } from "@/lib/db/receipts";
import { getCurrentUserId } from "@/lib/db/user";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getReceipt(await getCurrentUserId(), id);
  if (!row) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  const bytes = await getStorage().read(row.imageUrl);
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "Content-Type": row.mimeType ?? "application/octet-stream", "Cache-Control": "private, max-age=3600" }
  });
}
