export type Token = {
  id: string;
  kind: "include" | "exclude" | "or" | "system";
  value: string;
  values?: string[];
};
export type Filters = {
  media: string;
  state: string;
  dateField: string;
  datePreset: string;
  dateFrom: string;
  dateTo: string;
  duration: string;
  durationMin: string;
  durationMax: string;
  minWidth: string;
  minHeight: string;
  minMegapixels: string;
  minSizeMb: string;
  maxSizeMb: string;
  orientation: string;
  aspectMin: string;
  aspectMax: string;
  audio: string;
};
export type QueryState = {
  tokens: Token[];
  filters: Filters;
  sort: number;
  ascending: boolean;
  limit: number;
  fileServiceKey?: string;
  tagServiceKey?: string;
  density: number;
};
export type Media = {
  fileId: number;
  hash: string;
  size: number;
  mime: number | string;
  ext: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  numFrames: number | null;
  hasAudio: boolean;
  inbox: boolean;
  archived: boolean;
  filetypeHuman: string;
  timeImported: number | null;
  modified: number | null;
  displayTags: Record<string, string[]>;
  storageTags: Record<string, string[]>;
};
export type Service = {
  key: string;
  name: string;
  type: number;
  group: string;
};
export type Health = {
  gateway: string;
  hydrus: string;
  version: string;
  hydrusVersion?: number;
  apiVersion?: number;
  permissions?: number[];
  missingPermissions?: number[];
  extraPermissions?: number[];
  services?: Service[];
  appUrl?: string;
  lastSuccess?: string;
  latencyMs?: number;
  code?: string;
  message?: string;
};

export const defaultFilters: Filters = {
  media: "all",
  state: "all",
  dateField: "import",
  datePreset: "any",
  dateFrom: "",
  dateTo: "",
  duration: "any",
  durationMin: "",
  durationMax: "",
  minWidth: "",
  minHeight: "",
  minMegapixels: "",
  minSizeMb: "",
  maxSizeMb: "",
  orientation: "any",
  aspectMin: "",
  aspectMax: "",
  audio: "any",
};
export const defaultQuery: QueryState = {
  tokens: [],
  filters: defaultFilters,
  sort: 2,
  ascending: false,
  limit: 500,
  density: 3,
};
