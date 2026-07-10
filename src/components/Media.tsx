import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { api } from "../api";
import { classifyMedia } from "../media";
import { scrollStorageKey } from "../storage";
import type { Media, Service } from "../types";
import { formatDuration, InfoSheet, Sheet } from "./Sheets";

function ZoomableImage({
  src,
  onZoomChange,
}: {
  src: string;
  onZoomChange: (zoomed: boolean) => void;
}) {
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const gesture = useRef<{
    distance?: number;
    scale: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);
  const lastTap = useRef(0);
  const setScale = (scale: number, x = transform.x, y = transform.y) => {
    const next = Math.max(1, Math.min(5, scale));
    setTransform({ scale: next, x: next === 1 ? 0 : x, y: next === 1 ? 0 : y });
    onZoomChange(next > 1);
  };
  return (
    <div
      className="zoom-stage"
      onDoubleClick={(event) => {
        event.stopPropagation();
        setScale(transform.scale > 1 ? 1 : 2.5);
      }}
      onTouchStart={(event) => {
        if (event.touches.length === 2) {
          const dx = event.touches[0].clientX - event.touches[1].clientX;
          const dy = event.touches[0].clientY - event.touches[1].clientY;
          gesture.current = {
            distance: Math.hypot(dx, dy),
            scale: transform.scale,
            startX: 0,
            startY: 0,
            x: transform.x,
            y: transform.y,
          };
        } else if (event.touches.length === 1) {
          const now = Date.now();
          if (now - lastTap.current < 280) {
            setScale(transform.scale > 1 ? 1 : 2.5);
            lastTap.current = 0;
          } else {
            lastTap.current = now;
          }
          gesture.current = {
            scale: transform.scale,
            startX: event.touches[0].clientX,
            startY: event.touches[0].clientY,
            x: transform.x,
            y: transform.y,
          };
        }
      }}
      onTouchMove={(event) => {
        const start = gesture.current;
        if (!start) return;
        if (event.touches.length === 2 && start.distance) {
          event.preventDefault();
          const dx = event.touches[0].clientX - event.touches[1].clientX;
          const dy = event.touches[0].clientY - event.touches[1].clientY;
          setScale(start.scale * (Math.hypot(dx, dy) / start.distance));
        } else if (event.touches.length === 1 && transform.scale > 1) {
          event.preventDefault();
          setTransform((current) => ({
            ...current,
            x: start.x + event.touches[0].clientX - start.startX,
            y: start.y + event.touches[0].clientY - start.startY,
          }));
        }
      }}
      onTouchEnd={() => {
        gesture.current = null;
      }}
    >
      <img
        className="viewer-image"
        src={src}
        alt=""
        draggable={false}
        style={{
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
        }}
      />
    </div>
  );
}

export function ResultsGrid({
  fileIds,
  media,
  density,
  onNeed,
  onOpen,
  scrollKey,
  selectedId,
}: {
  fileIds: number[];
  media: Map<number, Media>;
  density: number;
  onNeed: (ids: number[]) => void;
  onOpen: (index: number) => void;
  scrollKey: string;
  selectedId?: number;
}) {
  const parent = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(390);
  const storageKey = scrollStorageKey(scrollKey);
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
  useEffect(() => {
    const saved = Number(localStorage.getItem(storageKey) ?? 0);
    const frame = requestAnimationFrame(() => virtual.scrollToOffset(saved));
    return () => cancelAnimationFrame(frame);
  }, [virtual, storageKey, rows, width]);
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
    <div
      className="grid-scroll"
      ref={parent}
      id="results-scroll"
      onScroll={(event) => {
        if (selectedId === undefined) {
          localStorage.setItem(
            storageKey,
            String(event.currentTarget.scrollTop),
          );
        }
      }}
    >
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
                    className={`media-card ${selectedId === id ? "selected" : ""}`}
                    key={id}
                    onClick={() => onOpen(index)}
                    aria-current={selectedId === id ? "true" : undefined}
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
                          {classifyMedia(m) === "image" &&
                            (m.numFrames ?? 1) > 1 && <i>ANIM</i>}
                          {classifyMedia(m) === "other" && <i>FILE</i>}
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
  onPositionChange,
}: {
  index: number;
  fileIds: number[];
  media: Map<number, Media>;
  services: Service[];
  onNeed: (ids: number[]) => void;
  onClose: () => void;
  onChanged: (id: number) => void;
  onPositionChange: (position: number) => void;
}) {
  const [position, setPosition] = useState(index);
  const [controls, setControls] = useState(true);
  const [info, setInfo] = useState(false);
  const [edit, setEdit] = useState(false);
  const [stateBusy, setStateBusy] = useState(false);
  const [imageZoomed, setImageZoomed] = useState(false);
  const [originalQuality, setOriginalQuality] = useState(false);
  const [touch, setTouch] = useState<{ x: number; y: number } | null>(null);
  const onPositionChangeRef = useRef(onPositionChange);
  useEffect(() => {
    onPositionChangeRef.current = onPositionChange;
  }, [onPositionChange]);
  const id = fileIds[position];
  const m = media.get(id);
  useEffect(() => {
    setOriginalQuality(false);
    setImageZoomed(false);
  }, [id]);
  useEffect(() => onPositionChangeRef.current(position), [position]);
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
    if (!m) return;
    setStateBusy(true);
    try {
      await api.setState([m.hash], m.inbox ? "archive" : "unarchive");
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
  const type = classifyMedia(m);
  const mediaUrl = `/api/media/${id}/file`;
  return (
    <div
      className="viewer"
      onClick={() => setControls((c) => !c)}
      onTouchStart={(e) => {
        if ((e.target as Element).closest("video, audio, .sheet")) {
          setTouch(null);
          return;
        }
        setTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      }}
      onTouchEnd={(e) => {
        if ((e.target as Element).closest("video, audio, .sheet")) return;
        if (!touch) return;
        if (type === "image" && imageZoomed) {
          setTouch(null);
          return;
        }
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
        <ZoomableImage
          key={`${id}:${originalQuality}`}
          src={originalQuality ? mediaUrl : `/api/media/${id}/thumbnail`}
          onZoomChange={setImageZoomed}
        />
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
          <div className="audio-art">
            <strong>AUDIO</strong>
            <img
              src={`/api/media/${id}/thumbnail`}
              alt=""
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
            />
          </div>
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
            {type === "image" && (
              <button
                className="viewer-button viewer-state-button"
                onClick={() => setOriginalQuality(true)}
                disabled={originalQuality}
                aria-label={
                  originalQuality
                    ? "Original quality loaded"
                    : "Load original quality"
                }
              >
                {originalQuality ? "HQ ✓" : "HQ"}
              </button>
            )}
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
  const [suggestions, setSuggestions] = useState<
    { value: string; count: number | null }[]
  >([]);
  const [remove, setRemove] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const activeAdd = add.split(",").at(-1)?.trim() ?? "";
  useEffect(() => {
    if (!activeAdd) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .tags(activeAdd, service, controller.signal, "storage")
        .then((result) => setSuggestions(result.tags.slice(0, 8)))
        .catch((reason) => {
          if (reason.name !== "AbortError") setSuggestions([]);
        });
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [activeAdd, service]);
  const acceptSuggestion = (tag: string) => {
    const parts = add.split(",");
    parts[parts.length - 1] = tag;
    setAdd(`${parts.map((part) => part.trim()).join(", ")}, `);
    setSuggestions([]);
  };
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await api.mutateTags({
        hash: media.hash,
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
        {suggestions.length > 0 && (
          <div
            className="tag-suggestions"
            role="listbox"
            aria-label="Tag suggestions"
          >
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.value}
                role="option"
                onClick={() => acceptSuggestion(suggestion.value)}
              >
                <span>{suggestion.value}</span>
                <small>{suggestion.count?.toLocaleString() ?? ""}</small>
              </button>
            ))}
          </div>
        )}
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
