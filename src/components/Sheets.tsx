/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import {
  defaultFilters,
  type Filters,
  type Media,
  type QueryState,
  type Service,
} from "../types";
import { sortOptions } from "../sorts";

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
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  </label>
);
export function FilterSheet({
  query,
  services,
  onApply,
  onClose,
}: {
  query: QueryState;
  services: Service[];
  onApply: (
    v: Pick<
      QueryState,
      "filters" | "fileServiceKey" | "tagServiceKey" | "limit"
    >,
  ) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState(query.filters);
  const [fileServiceKey, setFileServiceKey] = useState(
    query.fileServiceKey ?? "",
  );
  const [tagServiceKey, setTagServiceKey] = useState(query.tagServiceKey ?? "");
  const [limit, setLimit] = useState(query.limit);
  const set = (k: keyof Filters, v: string) => setF({ ...f, [k]: v });
  return (
    <Sheet title="Filter results" onClose={onClose}>
      <div className="sheet-body filter-grid">
        <h3 className="filter-section-title">Search domain</h3>
        <Select
          label="Files"
          value={fileServiceKey}
          onChange={setFileServiceKey}
        >
          <option value="">Combined local media</option>
          {services
            .filter((service) => service.group === "local_files")
            .map((service) => (
              <option value={service.key} key={service.key}>
                {service.name}
              </option>
            ))}
        </Select>
        <Select label="Tags" value={tagServiceKey} onChange={setTagServiceKey}>
          <option value="">All known tags</option>
          {services
            .filter((service) => service.group === "local_tags")
            .map((service) => (
              <option value={service.key} key={service.key}>
                {service.name}
              </option>
            ))}
        </Select>
        <label className="field">
          <span>Result limit</span>
          <select
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
          >
            {[100, 250, 500, 1000, 2500, 5000, 10000].map((value) => (
              <option value={value} key={value}>
                {value.toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <h3 className="filter-section-title">File filters</h3>
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
          <option value="custom">Custom range</option>
        </Select>
        {f.duration === "custom" && (
          <div className="field-row">
            <label className="field">
              <span>Minimum seconds</span>
              <input
                inputMode="decimal"
                value={f.durationMin}
                onChange={(e) => set("durationMin", e.target.value)}
              />
            </label>
            <label className="field">
              <span>Maximum seconds</span>
              <input
                inputMode="decimal"
                value={f.durationMax}
                onChange={(e) => set("durationMax", e.target.value)}
              />
            </label>
          </div>
        )}
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
          {(["aspectMin", "aspectMax"] as const).map((k, i) => (
            <label className="field" key={k}>
              <span>{["Min aspect X:1", "Max aspect X:1"][i]}</span>
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
          onClick={() => {
            setF(defaultFilters);
            setFileServiceKey("");
            setTagServiceKey("");
            setLimit(500);
          }}
        >
          Reset
        </button>
        <button
          className="primary"
          onClick={() => {
            onApply({
              filters: f,
              fileServiceKey: fileServiceKey || undefined,
              tagServiceKey: tagServiceKey || undefined,
              limit,
            });
            onClose();
          }}
        >
          Apply filters
        </button>
      </footer>
    </Sheet>
  );
}
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
        {sortOptions.map(([id, label]) => (
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
