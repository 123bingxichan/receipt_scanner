import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLocalStorage, extensionFor, getStorage } from "@/lib/storage";

let root: string;
const saved = { provider: process.env.STORAGE_PROVIDER, dir: process.env.LOCAL_STORAGE_DIR };

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "rs-storage-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
  for (const [name, value] of [
    ["STORAGE_PROVIDER", saved.provider],
    ["LOCAL_STORAGE_DIR", saved.dir]
  ] as const) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("extensionFor", () => {
  it("maps known image types and falls back to bin", () => {
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("image/png")).toBe("png");
    expect(extensionFor("image/webp")).toBe("webp");
    expect(extensionFor("image/heic")).toBe("heic");
    expect(extensionFor("application/pdf")).toBe("bin");
  });
});

describe("createLocalStorage", () => {
  it("namespaces keys by user and uses the mime type's extension", async () => {
    const s = createLocalStorage(root);
    const key = await s.save({ userId: "u1", bytes: Buffer.from("x"), mimeType: "image/webp" });
    expect(key).toMatch(/^u1\/[0-9a-f-]{36}\.webp$/);
  });

  it("removes files, and removing a missing file is not an error", async () => {
    const s = createLocalStorage(root);
    const key = await s.save({ userId: "u1", bytes: Buffer.from("x"), mimeType: "image/png" });
    await s.remove(key);
    await expect(s.read(key)).rejects.toThrow();
    await expect(s.remove(key)).resolves.toBeUndefined();
  });

  it("blocks path traversal on read and remove", async () => {
    const s = createLocalStorage(root);
    await expect(s.read("../outside.png")).rejects.toThrow("Invalid storage key");
    await expect(s.remove("../outside.png")).rejects.toThrow("Invalid storage key");
    await expect(s.read("")).rejects.toThrow("Invalid storage key");
  });
});

describe("getStorage", () => {
  it("uses LOCAL_STORAGE_DIR for the local provider", async () => {
    process.env.STORAGE_PROVIDER = "local";
    process.env.LOCAL_STORAGE_DIR = root;
    const s = getStorage();
    const key = await s.save({ userId: "u1", bytes: Buffer.from("abc"), mimeType: "image/png" });
    expect((await createLocalStorage(root).read(key)).toString()).toBe("abc");
  });

  it("rejects providers that are not implemented yet", () => {
    process.env.STORAGE_PROVIDER = "s3";
    expect(() => getStorage()).toThrow(/not implemented/);
  });
});
