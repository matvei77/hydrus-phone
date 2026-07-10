import type { Health, Media } from "./types";
const call = async <T>(
  path: string,
  init?: RequestInit,
  signal?: AbortSignal,
): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    signal,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw Object.assign(
      new Error(data?.message ?? `Request failed (${response.status})`),
      { code: data?.code, status: response.status },
    );
  return data as T;
};
export const api = {
  health: (signal?: AbortSignal) =>
    call<Health>("/api/health", undefined, signal),
  tags: (
    q: string,
    tagServiceKey?: string,
    signal?: AbortSignal,
    mode: "display" | "storage" = "display",
  ) =>
    call<{ tags: { value: string; count: number | null }[] }>(
      `/api/tags?q=${encodeURIComponent(q)}&mode=${mode}${tagServiceKey ? `&tagServiceKey=${tagServiceKey}` : ""}`,
      undefined,
      signal,
    ),
  search: (payload: unknown, signal?: AbortSignal) =>
    call<{ fileIds: number[]; limit: number; limited: boolean }>(
      "/api/search",
      { method: "POST", body: JSON.stringify(payload) },
      signal,
    ),
  metadata: (fileIds: number[], signal?: AbortSignal) =>
    call<{ files: Media[] }>(
      "/api/metadata",
      { method: "POST", body: JSON.stringify({ fileIds }) },
      signal,
    ),
  mutateTags: (body: unknown) =>
    call<{ ok: boolean }>("/api/tags/mutate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  setState: (hashes: string[], action: "archive" | "unarchive") =>
    call<{ ok: boolean }>("/api/files/state", {
      method: "POST",
      body: JSON.stringify({ hashes, action }),
    }),
};
