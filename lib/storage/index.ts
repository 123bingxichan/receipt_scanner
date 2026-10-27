import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

export interface StorageAdapter {
  save(input: { userId: string; bytes: Buffer; mimeType: string }): Promise<string>;
  read(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic"
};

export function extensionFor(mimeType: string): string {
  return EXT[mimeType] ?? "bin";
}

export function createLocalStorage(root: string): StorageAdapter {
  const resolve = (key: string) => {
    const full = path.resolve(root, key);
    if (!full.startsWith(path.resolve(root) + path.sep)) {
      throw new Error("Invalid storage key");
    }
    return full;
  };
  return {
    async save({ userId, bytes, mimeType }) {
      const key = `${userId}/${randomUUID()}.${extensionFor(mimeType)}`;
      const full = resolve(key);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, bytes);
      return key;
    },
    read: async (key) => readFile(resolve(key)),
    remove: async (key) => unlink(resolve(key)).catch(() => undefined)
  };
}

export function getStorage(): StorageAdapter {
  const provider = process.env.STORAGE_PROVIDER ?? "local";
  if (provider !== "local") {
    throw new Error(`STORAGE_PROVIDER "${provider}" is not implemented yet (only "local").`);
  }
  return createLocalStorage(process.env.LOCAL_STORAGE_DIR ?? path.join(process.cwd(), ".uploads"));
}
