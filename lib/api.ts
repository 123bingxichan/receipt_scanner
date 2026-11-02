import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

function logError(error: unknown) {
  // Prisma errors can embed the query arguments (OCR text), so only log names in production.
  if (process.env.NODE_ENV === "production") {
    console.error("API error:", error instanceof Error ? error.name : "unknown");
  } else {
    console.error(error);
  }
}

/** Map an unexpected error to a JSON response so clients never get an empty 500 body. */
export function apiError(error: unknown): NextResponse {
  logError(error);
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return NextResponse.json(
      { error: "Database is unavailable. Check DATABASE_URL and that Postgres is running." },
      { status: 503 }
    );
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export function withApiErrors<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return apiError(error);
    }
  };
}
