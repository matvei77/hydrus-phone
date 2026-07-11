import type { QueryState } from "./types";
const read = <T>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "");
  } catch {
    return fallback;
  }
};
export const scrollStorageKey = (queryKey: string) =>
  `hp:scroll:${[...queryKey].reduce(
    (hash, char) => (hash * 31 + char.charCodeAt(0)) | 0,
    7,
  )}`;
export type SavedSearch = {
  id: string;
  name: string;
  query: QueryState;
  savedAt: string;
};
export const storage = {
  loadQuery: (fallback: QueryState) => read("hp:lastQuery", fallback),
  saveQuery: (q: QueryState) =>
    localStorage.setItem("hp:lastQuery", JSON.stringify(q)),
  saved: () => read<SavedSearch[]>("hp:saved", []),
  save: (items: SavedSearch[]) =>
    localStorage.setItem("hp:saved", JSON.stringify(items)),
  recent: () => read<QueryState[]>("hp:recent", []),
  addRecent: (q: QueryState) =>
    localStorage.setItem(
      "hp:recent",
      JSON.stringify([q, ...read<QueryState[]>("hp:recent", []).slice(0, 19)]),
    ),
  clearRecent: () => localStorage.removeItem("hp:recent"),
  clear: async () => {
    localStorage.clear();
    for (const key of await caches.keys()) await caches.delete(key);
  },
};
