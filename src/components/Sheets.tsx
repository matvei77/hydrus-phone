/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import type { Filters, Media, QueryState, Service } from "../types";

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="scrim"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <span className="grab" />
          <h2>{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label={`Close ${title}`}
          >
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
const Select = ({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) => (
  <label className="field">
    <span>{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {children}
    </select>
  </label>
);
export function FilterSheet({
  value,
  onApply,
  onClose,
}: {
  value: Filters;
  onApply: (v: Filters) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState(value);
  const set = (k: keyof Filters, v: string) => setF({ ...f, [k]: v });
  return (
    <Sheet title="Filter results" onClose={onClose}>
      <div className="sheet-body filter-grid">
        <Select
          label="Media type"
          value={f.media}
          onChange={(v) => set("media", v)}
        >
          <option value="all">All media</option>
          <option value="images">Images</option>
          <option value="animated">Animated images</option>
          <option value="video">Video</option>
          <option value="audio">Audio</option>
          <option value="documents">Documents / other</option>
        </Select>
        <Select
          label="File state"
          value={f.state}
          onChange={(v) => set("state", v)}
        >
          <option value="all">Inbox and archive</option>
          <option value="inbox">Inbox</option>
          <option value="archive">Archive</option>
          <option value="untagged">Untagged</option>
          <option value="tagged">Has tags</option>
        </Select>
        <Select
          label="Audio track"
          value={f.audio}
          onChange={(v) => set("audio", v)}
        >
          <option value="any">Any</option>
          <option value="yes">Has audio</option>
          <option value="no">No audio</option>
        </Select>
        <Select
          label="Orientation"
          value={f.orientation}
          onChange={(v) => set("orientation", v)}
        >
          <option value="any">Any</option>
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
          <option value="square">Square</option>
        </Select>
        <Select
          label="Date field"
          value={f.dateField}
          onChange={(v) => set("dateField", v)}
        >
          <option value="import">Import date</option>
          <option value="modified">Modified date</option>
          <option value="archive">Archive date</option>
          <option value="viewed">Last viewed</option>
        </Select>
        <Select
          label="Date range"
          value={f.datePreset}
          onChange={(v) => set("datePreset", v)}
        >
          <option value="any">Any date</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="year">This year</option>
          <option value="before">Before</option>
          <option value="after">After</option>
          <option value="between">Between</option>
        </Select>
        {["after", "between"].includes(f.datePreset) && (
          <label className="field">
            <span>After</span>
            <input
              type="date"
              value={f.dateFrom}
              onChange={(e) => set("dateFrom", e.target.value)}
            />
          </label>
        )}
        {["before", "between"].includes(f.datePreset) && (
          <label className="field">
            <span>Before</span>
            <input
              type="date"
              value={f.dateTo}
              onChange={(e) => set("dateTo", e.target.value)}
            />
          </label>
        )}
        <Select
          label="Duration"
          value={f.duration}
          onChange={(v) => set("duration", v)}
        >
          <option value="any">Any</option>
          <option value="short">Under 30 seconds</option>
          <option value="medium">30 sec – 5 min</option>
          <option value="long">5 – 30 min</option>
          <option value="epic">Over 30 min</option>
        </Select>
        <div className="field-row">
          {(["minWidth", "minHeight", "minMegapixels"] as const).map((k, i) => (
            <label className="field" key={k}>
              <span>{["Min width", "Min height", "Min MP"][i]}</span>
              <input
                inputMode="decimal"
                value={f[k]}
                onChange={(e) => set(k, e.target.value)}
              />
            </label>
          ))}
        </div>
        <div className="field-row">
          {(["minSizeMb", "maxSizeMb"] as const).map((k, i) => (
            <label className="field" key={k}>
              <span>{["Min size MB", "Max size MB"][i]}</span>
              <input
                inputMode="decimal"
                value={f[k]}
                onChange={(e) => set(k, e.target.value)}
              />
            </label>
          ))}
        </div>
      </div>
      <footer>
        <button
          className="secondary"
          onClick={() =>
            setF({
              media: "all",
              state: "all",
              dateField: "import",
              datePreset: "any",
              dateFrom: "",
              dateTo: "",
              duration: "any",
              minWidth: "",
              minHeight: "",
              minMegapixels: "",
              minSizeMb: "",
              maxSizeMb: "",
              orientation: "any",
              audio: "any",
            })
          }
        >
          Reset
        </button>
        <button
          className="primary"
          onClick={() => {
            onApply(f);
            onClose();
          }}
        >
          Apply filters
        </button>
      </footer>
    </Sheet>
  );
}
const sorts = [
  [2, "Import date"],
  [14, "Modified date"],
  [19, "Archive date"],
  [18, "Last viewed"],
  [0, "File size"],
  [1, "Duration"],
  [5, "Width"],
  [6, "Height"],
  [8, "Resolution"],
  [7, "Aspect ratio"],
  [9, "Number of tags"],
  [3, "File type"],
  [4, "Random"],
] as const;
export function SortSheet({
  query,
  onApply,
  onClose,
}: {
  query: QueryState;
  onApply: (s: number, a: boolean) => void;
  onClose: () => void;
}) {
  const [sort, setSort] = useState(query.sort);
  const [asc, setAsc] = useState(query.ascending);
  return (
    <Sheet title="Sort results" onClose={onClose}>
      <div className="sheet-body sort-list">
        {sorts.map(([id, label]) => (
          <label key={id}>
            <input
              type="radio"
              name="sort"
              checked={sort === id}
              onChange={() => setSort(id)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <footer>
        <button className="secondary" onClick={() => setAsc(!asc)}>
          {asc ? "Ascending ↑" : "Descending ↓"}
        </button>
        <button
          className="primary"
          onClick={() => {
            onApply(sort, asc);
            onClose();
          }}
        >
          Apply sort
        </button>
      </footer>
    </Sheet>
  );
}
export function InfoSheet({
  media,
  services,
  onClose,
  onEdit,
}: {
  media: Media;
  services: Service[];
  onClose: () => void;
  onEdit: () => void;
}) {
  const grouped = new Map<string, string[]>();
  Object.values(media.displayTags)
    .flatMap((tags) => tags)
    .forEach((tag) => {
      const ns = tag.includes(":") ? tag.split(":")[0] : "unnamespaced";
      grouped.set(ns, [...new Set([...(grouped.get(ns) ?? []), tag])]);
    });
  return (
    <Sheet title="File information" onClose={onClose}>
      <div className="sheet-body">
        <dl className="facts">
          <div>
            <dt>Type</dt>
            <dd>{media.filetypeHuman}</dd>
          </div>
          <div>
            <dt>Dimensions</dt>
            <dd>
              {media.width && media.height
                ? `${media.width} × ${media.height}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Size</dt>
            <dd>{formatBytes(media.size)}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{media.duration ? formatDuration(media.duration) : "—"}</dd>
          </div>
          <div>
            <dt>State</dt>
            <dd>{media.inbox ? "Inbox" : "Archive"}</dd>
          </div>
        </dl>
        <div className="tag-heading">
          <h3>Tags</h3>
          <button className="text-button" onClick={onEdit}>
            Edit tags
          </button>
        </div>
        {[...grouped].map(([ns, tags]) => (
          <div className="tag-group" key={ns}>
            <span>{ns}</span>
            <div>
              {tags.map((t) => (
                <code key={t}>
                  {t.includes(":") ? t.slice(t.indexOf(":") + 1) : t}
                </code>
              ))}
            </div>
          </div>
        ))}
        {!grouped.size && (
          <p className="empty-copy">This file has no current display tags.</p>
        )}
        <p className="muted">
          {services.filter((s) => s.group === "local_tags").length} tag services
          detected
        </p>
      </div>
    </Sheet>
  );
}
export const formatDuration = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
export const formatBytes = (n: number) => {
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
};
