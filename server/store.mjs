import { getStore } from "@netlify/blobs";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

export function createMemoryStore() {
  const items = new Map();
  return {
    async read(key) {
      return structuredClone(items.get(key) || null);
    },
    async write(key, data, etag) {
      if ((items.get(key)?.etag ?? null) !== etag) return false;
      items.set(key, { data: structuredClone(data), etag: randomUUID() });
      return true;
    },
    async keys(prefix) {
      return [...items.keys()].filter((k) => k.startsWith(prefix));
    },
  };
}

export function createLocalStore(directory = ".local-data") {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = (key) =>
    resolve(directory, `${Buffer.from(key).toString("base64url")}.json`);
  const read = (key) => {
    try {
      return JSON.parse(readFileSync(file(key), "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  };
  return {
    async read(key) {
      return read(key);
    },
    async write(key, data, etag) {
      // Synchronous compare-and-rename is atomic within the single local dev process.
      if ((read(key)?.etag ?? null) !== etag) return false;
      const temp = `${file(key)}.${randomUUID()}.tmp`;
      writeFileSync(temp, JSON.stringify({ data, etag: randomUUID() }), {
        mode: 0o600,
      });
      renameSync(temp, file(key));
      return true;
    },
    async keys(prefix) {
      return readdirSync(directory)
        .filter((f) => f.endsWith(".json"))
        .map((f) => Buffer.from(f.slice(0, -5), "base64url").toString())
        .filter((k) => k.startsWith(prefix));
    },
  };
}

export function createNetlifyStore() {
  const store = getStore({ name: "witchsearch-v1", consistency: "strong" });
  return {
    async read(key) {
      const item = await store.getWithMetadata(key, { type: "json" });
      return item ? { data: item.data, etag: item.etag } : null;
    },
    async write(key, data, etag) {
      const result = await store.setJSON(
        key,
        data,
        etag ? { onlyIfMatch: etag } : { onlyIfNew: true },
      );
      return result.modified;
    },
    async keys(prefix) {
      const keys = [];
      for await (const page of store.list({ prefix, paginate: true }))
        keys.push(...page.blobs.map((b) => b.key));
      return keys;
    },
  };
}

export async function update(store, key, transform) {
  for (let attempt = 0; attempt < 16; attempt++) {
    const current = await store.read(key);
    const next = transform(structuredClone(current?.data ?? null));
    if (await store.write(key, next, current?.etag ?? null)) return next;
  }
  const error = new Error("This account is busy. Please try again.");
  error.status = 409;
  throw error;
}
