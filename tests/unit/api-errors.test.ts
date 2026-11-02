import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiError, withApiErrors } from "@/lib/api";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiError", () => {
  it("maps an unreachable database to 503 with a helpful message", async () => {
    const res = apiError(new Prisma.PrismaClientInitializationError("can't reach", "5.22.0", "P1001"));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/Database is unavailable.*DATABASE_URL/);
  });

  it("maps anything else to a generic 500 without leaking details", async () => {
    const res = apiError(new Error("secret internals"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });
});

describe("withApiErrors", () => {
  it("passes successful responses through", async () => {
    const handler = withApiErrors(async (n: number) => Response.json({ n }));
    expect(await (await handler(2)).json()).toEqual({ n: 2 });
  });

  it("turns thrown errors into JSON responses", async () => {
    const handler = withApiErrors(async () => {
      throw new Error("boom");
    });
    const res = await handler();
    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toMatch(/json/);
  });
});
