import type { Filters, QueryState, Token } from "./types";

const daysAgo = (days: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};
const dateName: Record<string, string> = {
  import: "import time",
  modified: "modified time",
  archive: "archived time",
  viewed: "last viewed time",
};
const decimalToRatio = (value: string) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  const denominator = 1000;
  const numerator = Math.round(number * denominator);
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const divisor = gcd(numerator, denominator);
  return `${numerator / divisor}:${denominator / divisor}`;
};

export function filtersToPredicates(f: Filters, now = new Date()): string[] {
  const p: string[] = [];
  const mime: Record<string, string> = {
    images: "image",
    animated: "image/gif, image/apng, image/webp",
    video: "video",
    audio: "audio",
    documents: "application",
  };
  if (mime[f.media]) p.push(`system:filetype is ${mime[f.media]}`);
  if (f.state === "inbox") p.push("system:inbox");
  if (f.state === "archive") p.push("system:archive");
  if (f.state === "untagged") p.push("system:number of tags = 0");
  if (f.state === "tagged") p.push("system:number of tags > 0");
  if (f.audio === "yes") p.push("system:has audio");
  if (f.audio === "no") p.push("system:no audio");
  const field = dateName[f.dateField] ?? dateName.import;
  const ymd = (d: Date) => d.toISOString().slice(0, 10).replaceAll("-", "/");
  if (f.datePreset !== "any") {
    if (f.datePreset === "today")
      p.push(
        `system:${field} > ${ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate()))}`,
      );
    if (f.datePreset === "7d")
      p.push(`system:${field} > ${daysAgo(7).replaceAll("-", "/")}`);
    if (f.datePreset === "30d")
      p.push(`system:${field} > ${daysAgo(30).replaceAll("-", "/")}`);
    if (f.datePreset === "year")
      p.push(`system:${field} > ${now.getFullYear()}/01/01`);
    if (f.datePreset === "before" && f.dateTo)
      p.push(`system:${field} < ${f.dateTo.replaceAll("-", "/")}`);
    if (f.datePreset === "after" && f.dateFrom)
      p.push(`system:${field} > ${f.dateFrom.replaceAll("-", "/")}`);
    if (f.datePreset === "between" && f.dateFrom && f.dateTo)
      p.push(
        `system:${field} > ${f.dateFrom.replaceAll("-", "/")}`,
        `system:${field} < ${f.dateTo.replaceAll("-", "/")}`,
      );
  }
  const durations: Record<string, string[]> = {
    short: ["system:duration < 30 seconds"],
    medium: ["system:duration > 30 seconds", "system:duration < 5 minutes"],
    long: ["system:duration > 5 minutes", "system:duration < 30 minutes"],
    epic: ["system:duration > 30 minutes"],
  };
  if (durations[f.duration]) p.push(...durations[f.duration]);
  if (f.duration === "custom") {
    if (f.durationMin) p.push(`system:duration > ${f.durationMin} seconds`);
    if (f.durationMax) p.push(`system:duration < ${f.durationMax} seconds`);
  }
  if (f.minWidth) p.push(`system:width > ${Number(f.minWidth) - 1}`);
  if (f.minHeight) p.push(`system:height > ${Number(f.minHeight) - 1}`);
  if (f.minMegapixels)
    p.push(`system:num_pixels > ${f.minMegapixels} megapixels`);
  if (f.minSizeMb) p.push(`system:filesize > ${f.minSizeMb}MB`);
  if (f.maxSizeMb) p.push(`system:filesize < ${f.maxSizeMb}MB`);
  if (f.orientation === "portrait") p.push("system:ratio taller than 1:1");
  if (f.orientation === "landscape") p.push("system:ratio wider than 1:1");
  if (f.orientation === "square") p.push("system:ratio is 1:1");
  const aspectMin = decimalToRatio(f.aspectMin);
  const aspectMax = decimalToRatio(f.aspectMax);
  if (aspectMin) p.push(`system:ratio wider than ${aspectMin}`);
  if (aspectMax) p.push(`system:ratio taller than ${aspectMax}`);
  return p;
}

export function tokensToPredicates(tokens: Token[]): (string | string[])[] {
  return tokens.map((t) =>
    t.kind === "or"
      ? (t.values ?? t.value.split("|")).map((v) => v.trim()).filter(Boolean)
      : t.kind === "exclude"
        ? `-${t.value}`
        : t.value,
  );
}
export const toSearchPayload = (q: QueryState) => ({
  predicates: [
    ...tokensToPredicates(q.tokens),
    ...filtersToPredicates(q.filters),
  ],
  sort: q.sort,
  ascending: q.ascending,
  limit: q.limit,
  fileServiceKey: q.fileServiceKey,
  tagServiceKey: q.tagServiceKey,
});
export const serializeQuery = (q: QueryState) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(q))))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
export const restoreQuery = (value: string): QueryState =>
  JSON.parse(
    decodeURIComponent(
      escape(atob(value.replaceAll("-", "+").replaceAll("_", "/"))),
    ),
  );
export const queryKey = (q: QueryState) => JSON.stringify(toSearchPayload(q));
export const activeFilterCount = (f: Filters) =>
  Object.entries(f).filter(
    ([k, v]) => !["dateField"].includes(k) && v && !["all", "any"].includes(v),
  ).length;
