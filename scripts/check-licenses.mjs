import { readFileSync } from "node:fs";

const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url)));
const missing = [];
const denied = [];

for (const [path, metadata] of Object.entries(lock.packages ?? {})) {
  const license = metadata.license;
  if (!license) missing.push(path || "root package");
  if (license && /(^|\s|\()A?GPL-(?:1|2|3)(?:\.0)?(?:\s|$|\))/i.test(license))
    denied.push(`${path || "root package"}: ${license}`);
}

if (missing.length || denied.length) {
  if (missing.length) console.error(`Missing license metadata: ${missing.join(", ")}`);
  if (denied.length) console.error(`Denied license metadata: ${denied.join(", ")}`);
  process.exit(1);
}

console.log(`License metadata present for ${Object.keys(lock.packages).length} packages; no GPL/AGPL-only package detected.`);
