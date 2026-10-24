import { prisma } from "@/lib/db/client";

// Placeholder until auth lands (roadmap phase 6): every request acts as one
// local user. All queries still filter by userId so adding auth only means
// replacing this function with a session lookup.
export async function getCurrentUserId(): Promise<string> {
  const email = process.env.DEFAULT_USER_EMAIL ?? "local@receipt-scan.dev";
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Local User" }
  });
  return user.id;
}
