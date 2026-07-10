import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { api } from "../api";
import type { Media, Service } from "../types";
import { formatDuration, InfoSheet, Sheet } from "./Sheets";

const kind = (m: Media) => {
  const e = m.ext.toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif", "bmp", "avif"].includes(e))
    return "image";
  if (["mp4", "webm", "m4v"].includes(e)) return "video";
  if (["mp3", "ogg", "wav", "m4a", "flac"].includes(e)) return "audio";
  return "other";
};

export function ResultsGrid({
  fileIds,
  media,
  density,
  onNeed,
  onOpen,
}: {
  fileIds: number[];
  media: Map<number, Media>;
  density: number;
  onNeed: (ids: number[]) => void;
  onOpen: (index: number) => void;
}) {
  const parent = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(390);
  useEffect(() => {
    const ob = new ResizeObserver((e) => setWidth(e[0].contentRect.width));
    if (parent.current) ob.observe(parent.current);
    return () => ob.disconnect();
  }, []);
  const cols = Math.max(
    2,
    Math.min(5, width > 850 ? Math.max(density, 5) : density),
  );
  const gap = 8;
  const cell = (width - gap * (cols - 1)) / cols;
  const rows = Math.ceil(fileIds.length / cols);
  const virtual = useVirtualizer({
    count: rows,
    getScrollElement: () => parent.current,
    estimateSize: () => cell + gap,
    overscan: 4,
  });
  const visible = virtual.getVirtualItems();
  useEffect(() => {
    const ids = virtual
      .getVirtualItems()
      .flatMap((row) =>
        fileIds.slice(row.index * cols, row.index * cols + cols),
      )
      .filter((id) => !media.has(id));
    if (ids.length) onNeed([...new Set(ids)].slice(0, 256));
  }, [virtual, cols, fileIds, media, onNeed]);
  return (
    <div className="grid-scroll" ref={parent} id="results-scroll">
      <div className="virtual-grid" style={{ height: virtual.getTotalSize() }}>
        {visible.map((row) => (
          <div
            className="grid-row"
            key={row.key}
            style={{
              height: cell,
              transform: `translateY(${row.start}px)`,
              gridTemplateColumns: `repeat(${cols},1fr)`,
            }}
          >
            {fileIds
              .slice(row.index * cols, row.index * cols + cols)
              .map((id, col) => {
                const m = media.get(id);
                const index = row.index * cols + col;
                return (
                  <button
                    className="media-card"
                    key={id}
                    onClick={() => onOpen(index)}
                    aria-label={m ? `Open ${m.filetypeHuman}` : "Loading media"}
                  >
                    {m ? (
                      <>
                        <img
                          src={`/api/media/${id}/thumbnail`}
                          alt=""
                          loading="lazy"
                        />
                        <span className="media-flags">
                          {m.inbox && <i title="Inbox">IN</i>}
                          {m.duration && <i>{formatDuration(m.duration)}</i>}
                          {kind(m) === "other" && <i>FILE</i>}
                        </span>
                        <span className="ext">{m.ext}</span>
                      </>
                    ) : (
                      <span className="skeleton" />
                    )}
                  </button>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Viewer({
  index,
  fileIds,
  media,
  services,
  onNeed,
  onClose,
  onChanged,
}: {
  index: number;
  fileIds: number[];
  media: Map<number, Media>;
  services: Service[];
  onNeed: (ids: number[]) => void;
  onClose: () => void;
  onChanged: (id: number) => void;
}) {
  const [position, setPosition] = useState(index);
  const [controls, setControls] = useState(true);
  const [info, setInfo] = useState(false);
  const [edit, setEdit] = useState(false);
  const [stateBusy, setStateBusy] = useState(false);
  const [touch, setTouch] = useState<{ x: number; y: number } | null>(null);
  const id = fileIds[position];
  const m = media.get(id);
  useEffect(() => {
    onNeed(
      fileIds
        .slice(Math.max(0, position - 2), position + 3)
        .filter((x) => !media.has(x)),
    );
  }, [position, fileIds, media, onNeed]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 1));
      if (e.key === "ArrowRight")
        setPosition((p) => Math.min(fileIds.length - 1, p + 1));
    };
    addEventListener("keydown", fn);
    return () => removeEventListener("keydown", fn);
  }, [fileIds.length, onClose]);
  const move = (d: number) =>
    setPosition((p) => Math.max(0, Math.min(fileIds.length - 1, p + d)));
  const toggleArchive = async () => {
    setStateBusy(true);
    try {
      await api.setState([id], m?.inbox ? "archive" : "unarchive");
      onChanged(id);
    } finally {
      setStateBusy(false);
    }
  };
  if (!m)
    return (
      <div className="viewer">
        <div className="viewer-loader">Loading file…</div>
        <button className="viewer-close" onClick={onClose}>
          Close
        </button>
      </div>
    );
  const type = kind(m);
  const mediaUrl = `/api/media/${id}/file`;
  return (
    <div
      className="viewer"
      onClick={() => setControls((c) => !c)}
      onTouchStart={(e) =>
        setTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY })
      }
      onTouchEnd={(e) => {
        if (!touch) return;
        const dx = e.changedTouches[0].clientX - touch.x,
          dy = e.changedTouches[0].clientY - touch.y;
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy))
          move(dx < 0 ? 1 : -1);
        else if (dy > 100 && Math.abs(dy) > Math.abs(dx) && type !== "video")
          onClose();
        setTouch(null);
      }}
    >
      {type === "image" && (
        <img className="viewer-image" src={mediaUrl} alt="" />
      )}
      {type === "video" && (
        <video
          className="viewer-video"
          src={mediaUrl}
          poster={`/api/media/${id}/thumbnail`}
          controls
          autoPlay
          playsInline
          onClick={(e) => e.stopPropagation()}
        />
      )}{" "}
      {type === "audio" && (
        <div className="audio-stage">
          <img src={`/api/media/${id}/thumbnail`} alt="" />
          <span>AUDIO / {m.ext.toUpperCase()}</span>
          <audio
            src={mediaUrl}
            controls
            autoPlay
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {type === "other" && (
        <div className="unsupported">
          <strong>{m.ext.toUpperCase()}</strong>
          <h2>Preview unavailable</h2>
          <p>
            This format is not supported by the browser. You can inspect its
            metadata or open the original file.
          </p>
          <a
            className="primary"
            href={mediaUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open original
          </a>
        </div>
      )}
      <div
        className={`viewer-chrome ${controls ? "visible" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <button
            className="viewer-button"
            onClick={onClose}
            aria-label="Close viewer"
          >
            ←
          </button>
          <span>
            {position + 1} / {fileIds.length}
          </span>
          <div className="viewer-header-actions">
            <button
              className="viewer-button viewer-state-button"
              onClick={toggleArchive}
              disabled={stateBusy}
              aria-label={m.inbox ? "Archive file" : "Return file to inbox"}
            >
              {stateBusy ? "…" : m.inbox ? "ARC" : "IN"}
            </button>
            <button
              className="viewer-button"
              onClick={() => setInfo(true)}
              aria-label="File information"
            >
              ⓘ
            </button>
          </div>
        </header>
        <button
          className="viewer-arrow left"
          disabled={!position}
          onClick={() => move(-1)}
          aria-label="Previous file"
        >
          ‹
        </button>
        <button
          className="viewer-arrow right"
          disabled={position === fileIds.length - 1}
          onClick={() => move(1)}
          aria-label="Next file"
        >
          ›
        </button>
      </div>
      {info && (
        <InfoSheet
          media={m}
          services={services}
          onClose={() => setInfo(false)}
          onEdit={() => {
            setInfo(false);
            setEdit(true);
          }}
        />
      )}
      {edit && (
        <TagEditor
          media={m}
          services={services}
          onClose={() => setEdit(false)}
          onSaved={() => {
            setEdit(false);
            onChanged(id);
          }}
        />
      )}
    </div>
  );
}

function TagEditor({
  media,
  services,
  onClose,
  onSaved,
}: {
  media: Media;
  services: Service[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const tagServices = useMemo(
    () =>
      services
        .filter((s) => s.group === "local_tags")
        .sort((a, b) =>
          a.name === "my tags" ? -1 : b.name === "my tags" ? 1 : 0,
        ),
    [services],
  );
  const [service, setService] = useState(tagServices[0]?.key ?? "");
  const existing = media.storageTags[service] ?? [];
  const [add, setAdd] = useState("");
  const [remove, setRemove] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await api.mutateTags({
        fileId: media.fileId,
        serviceKey: service,
        add: add
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        remove,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tag update failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet title="Edit local tags" onClose={onClose}>
      <div className="sheet-body">
        <label className="field">
          <span>Tag service</span>
          <select
            value={service}
            onChange={(e) => {
              setService(e.target.value);
              setRemove([]);
            }}
          >
            {tagServices.map((s) => (
              <option value={s.key} key={s.key}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Add tags (comma separated)</span>
          <input
            value={add}
            onChange={(e) => setAdd(e.target.value)}
            placeholder="creator:name, series:title"
          />
        </label>
        <h3>Current local tags</h3>
        <div className="removable-tags">
          {existing.map((tag) => (
            <label key={tag}>
              <input
                type="checkbox"
                checked={remove.includes(tag)}
                onChange={() =>
                  setRemove(
                    remove.includes(tag)
                      ? remove.filter((x) => x !== tag)
                      : [...remove, tag],
                  )
                }
              />
              <span>{tag}</span>
            </label>
          ))}
        </div>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <footer>
        <button className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="primary"
          disabled={busy || (!add.trim() && !remove.length) || !service}
          onClick={save}
        >
          {busy ? "Saving…" : "Save tag changes"}
        </button>
      </footer>
    </Sheet>
  );
}
