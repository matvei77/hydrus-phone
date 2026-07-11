import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { api } from "../api";
import { buildJustifiedRows } from "../galleryLayout";
import { classifyMedia, mediaFileUrl, needsHydrusRender } from "../media";
import {
  SESSION_MEDIA_CACHE_LIMIT,
  SESSION_MEDIA_ITEM_LIMIT,
  protectedNavigationIds,
  sessionMediaCache,
  shouldBufferVideo,
  surroundingFileIds,
} from "../sessionMediaCache";
import { scrollStorageKey } from "../storage";
import type { Media, Service } from "../types";
import { formatDuration, InfoSheet, Sheet } from "./Sheets";

function ZoomableImage({
  src,
  placeholder,
  onZoomChange,
  onReady,
}: {
  src: string;
  placeholder: string;
  onZoomChange: (zoomed: boolean) => void;
  onReady: () => void;
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
  const lastTap = useRef<{ at: number; x: number; y: number } | null>(null);
  const lastTouchZoom = useRef(0);
  const setScale = (scale: number, x = transform.x, y = transform.y) => {
    const next = Math.max(1, Math.min(5, scale));
    setTransform({ scale: next, x: next === 1 ? 0 : x, y: next === 1 ? 0 : y });
    onZoomChange(next > 1);
  };
  return (
    <div
      className="zoom-stage"
      style={{ backgroundImage: `url(${placeholder})` }}
      onDoubleClick={(event) => {
        if (Date.now() - lastTouchZoom.current < 500) return;
        event.stopPropagation();
        setScale(transform.scale > 1 ? 1 : 2.5);
      }}
      onPointerUp={(event) => {
        if (event.pointerType !== "touch" || gesture.current?.distance) return;
        const current = gesture.current;
        if (
          current &&
          Math.hypot(
            event.clientX - current.startX,
            event.clientY - current.startY,
          ) > 16
        ) {
          lastTap.current = null;
          return;
        }
        const now = Date.now();
        const previous = lastTap.current;
        if (
          previous &&
          now - previous.at < 340 &&
          Math.hypot(event.clientX - previous.x, event.clientY - previous.y) <
            48
        ) {
          event.preventDefault();
          event.stopPropagation();
          lastTouchZoom.current = now;
          setScale(transform.scale > 1 ? 1 : 2.5);
          lastTap.current = null;
        } else {
          lastTap.current = { at: now, x: event.clientX, y: event.clientY };
        }
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
        onLoad={onReady}
        onError={onReady}
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
  const targetHeight = (width - gap * (cols - 1)) / cols;
  const rows = useMemo(
    () => buildJustifiedRows(fileIds, media, width, targetHeight, gap),
    [fileIds, media, width, targetHeight],
  );
  const virtual = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parent.current,
    estimateSize: (index) => (rows[index]?.height ?? targetHeight) + gap,
    overscan: 4,
  });
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      virtual.scrollToOffset(
        Number(localStorage.getItem(storageKey) ?? 0),
      ),
    );
    return () => cancelAnimationFrame(frame);
  }, [virtual, storageKey, rows.length, width]);
  const visible = virtual.getVirtualItems();
  useEffect(() => {
    const ids = virtual
      .getVirtualItems()
      .flatMap((row) => rows[row.index]?.items.map((item) => item.fileId) ?? [])
      .filter((id) => !media.has(id));
    if (ids.length) onNeed([...new Set(ids)].slice(0, 256));
  }, [virtual, rows, media, onNeed]);
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
        {visible.map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (!row) return null;
          return (
            <div
              className="grid-row"
              key={virtualRow.key}
              style={{
                height: row.height,
                transform: `translateY(${virtualRow.start}px)`,
                gridTemplateColumns: row.items
                  .map((item) => `${item.width}px`)
                  .join(" "),
              }}
            >
              {row.items.map(({ fileId: id, index }) => {
                const m = media.get(id);
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
          );
        })}
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
  onSearchTag,
}: {
  index: number;
  fileIds: number[];
  media: Map<number, Media>;
  services: Service[];
  onNeed: (ids: number[]) => void;
  onClose: () => void;
  onChanged: (id: number) => void;
  onPositionChange: (position: number) => void;
  onSearchTag: (tag: string, mode: "add" | "new") => void;
}) {
  const [position, setPosition] = useState(index);
  const [controls, setControls] = useState(true);
  const [info, setInfo] = useState(false);
  const [edit, setEdit] = useState(false);
  const [tagAction, setTagAction] = useState<string | null>(null);
  const [stateBusy, setStateBusy] = useState(false);
  const [imageZoomed, setImageZoomed] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [touch, setTouch] = useState<{ x: number; y: number } | null>(null);
  const prefetching = useRef(new Set<number>());
  const protectedCacheIds = useRef<Set<number>>(new Set());
  const [cacheState, setCacheState] = useState(() =>
    sessionMediaCache.stats(),
  );
  const onPositionChangeRef = useRef(onPositionChange);
  useEffect(() => {
    onPositionChangeRef.current = onPositionChange;
  }, [onPositionChange]);
  useEffect(() => setPosition(index), [index]);
  const id = fileIds[position];
  const m = media.get(id);
  protectedCacheIds.current = new Set(
    protectedNavigationIds(fileIds, position),
  );
  useEffect(() => {
    setImageZoomed(false);
    setMediaReady(false);
    setTagAction(null);
  }, [id]);
  const move = useCallback(
    (delta: number) => {
      const next = Math.max(
        0,
        Math.min(fileIds.length - 1, position + delta),
      );
      if (next === position) return;
      setPosition(next);
      onPositionChangeRef.current(next);
    },
    [fileIds.length, position],
  );
  useEffect(() => {
    onNeed(
      surroundingFileIds(fileIds, position)
        .filter((x) => !media.has(x)),
    );
  }, [position, fileIds, media, onNeed]);
  useEffect(() => {
    if (
      !mediaReady ||
      (m && classifyMedia(m) === "video" && !sessionMediaCache.has(id))
    )
      return;
    const controller = new AbortController();
    let plannedBytes = 0;
    const queue = surroundingFileIds(fileIds, position)
      .map((fileId) => media.get(fileId))
      .filter(
        (item): item is Media =>
          !!item &&
          (classifyMedia(item) === "image" ||
            (classifyMedia(item) === "video" && shouldBufferVideo(item.size))),
      )
      .filter((item) => {
        const estimatedBytes =
          sessionMediaCache.get(item.fileId)?.bytes ??
          Math.ceil(item.size * (needsHydrusRender(item) ? 0.55 : 1));
        if (
          estimatedBytes > SESSION_MEDIA_ITEM_LIMIT ||
          plannedBytes + estimatedBytes > SESSION_MEDIA_CACHE_LIMIT
        )
          return false;
        plannedBytes += estimatedBytes;
        return (
          !sessionMediaCache.has(item.fileId) &&
          !prefetching.current.has(item.fileId)
        );
      });
    const worker = async () => {
      while (queue.length && !controller.signal.aborted) {
        const item = queue.shift();
        if (!item) return;
        prefetching.current.add(item.fileId);
        try {
          const response = await fetch(mediaFileUrl(item), {
            cache: "no-store",
            signal: controller.signal,
          });
          if (!response.ok) continue;
          const blob = await response.blob();
          sessionMediaCache.put(
            item.fileId,
            blob,
            protectedCacheIds.current,
          );
          setCacheState(sessionMediaCache.stats());
        } catch (error) {
          if ((error as Error).name !== "AbortError") {
            // Lookahead is opportunistic; the normal media request remains the fallback.
          }
        } finally {
          prefetching.current.delete(item.fileId);
        }
      }
    };
    void Promise.all([
      worker(),
      worker(),
      worker(),
      worker(),
      worker(),
      worker(),
    ]);
    return () => controller.abort();
  }, [position, fileIds, media, mediaReady, id, m]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
    };
    addEventListener("keydown", fn);
    return () => removeEventListener("keydown", fn);
  }, [move, onClose]);
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
  const mediaUrl = mediaFileUrl(m);
  const imageUrl = sessionMediaCache.get(id)?.url ?? mediaUrl;
  const cachedVideoUrl =
    type === "video" ? sessionMediaCache.get(id)?.url : undefined;
  const lookaheadAllowed =
    mediaReady && !(type === "video" && !cachedVideoUrl);
  const allDisplayTags = [
    ...new Set(Object.values(m.displayTags).flatMap((tags) => tags)),
  ].sort((a, b) => a.localeCompare(b));
  const displayTags = allDisplayTags.slice(0, 48);
  const warmVideoIds = fileIds
    .slice(position + 1, position + 9)
    .filter((fileId) => {
      const item = media.get(fileId);
      return item && classifyMedia(item) === "video";
    })
    .slice(0, lookaheadAllowed ? 2 : 0);
  return (
    <div
      className={`viewer ${displayTags.length ? "has-tags" : ""}`}
      onClick={() => setControls((c) => !c)}
      onTouchStart={(e) => {
        if (
          (e.target as Element).closest(
            "video, audio, .sheet, .viewer-tag-ribbon",
          )
        ) {
          setTouch(null);
          return;
        }
        setTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      }}
      onTouchEnd={(e) => {
        if (
          (e.target as Element).closest(
            "video, audio, .sheet, .viewer-tag-ribbon",
          )
        )
          return;
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
          key={id}
          src={imageUrl}
          placeholder={`/api/media/${id}/thumbnail`}
          onZoomChange={setImageZoomed}
          onReady={() => setMediaReady(true)}
        />
      )}
      {type === "video" && (
        <video
          className="viewer-video"
          src={cachedVideoUrl ?? mediaUrl}
          poster={`/api/media/${id}/thumbnail`}
          controls
          autoPlay
          preload="auto"
          playsInline
          onCanPlay={() => setMediaReady(true)}
          onWaiting={() => setMediaReady(false)}
          onError={() => setMediaReady(true)}
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
            preload="auto"
            onLoadedMetadata={() => setMediaReady(true)}
            onError={() => setMediaReady(true)}
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
      <div className="media-preloads" aria-hidden="true">
        {warmVideoIds.map((fileId) => (
          <video
            key={fileId}
            src={`/api/media/${fileId}/file`}
            poster={`/api/media/${fileId}/thumbnail`}
            preload="metadata"
            muted
          />
        ))}
      </div>
      {displayTags.length > 0 && (
        <aside
          className="viewer-tag-ribbon"
          aria-label="Tags on this file"
          onClick={(event) => event.stopPropagation()}
        >
          <span>TAGS</span>
          <div>
            {displayTags.map((tag) => {
              const colon = tag.indexOf(":");
              return (
                <button key={tag} onClick={() => setTagAction(tag)}>
                  {colon > 0 && <small>{tag.slice(0, colon)}:</small>}
                  {colon > 0 ? tag.slice(colon + 1) : tag}
                </button>
              );
            })}
          </div>
        </aside>
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
          <span className="viewer-position">
            <b>
              {position + 1} / {fileIds.length}
            </b>
            {type === "image" && (
              <small>
                {cacheState.count
                  ? `${cacheState.count} READY · ${Math.round(cacheState.bytes / 1024 / 1024)} MB`
                  : mediaReady
                    ? "BUFFERING"
                    : "LOADING"}
              </small>
            )}
          </span>
          <div className="viewer-header-actions">
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
            stateBusy={stateBusy}
            onToggleArchive={toggleArchive}
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
      {tagAction && (
        <Sheet title="Search with tag" onClose={() => setTagAction(null)}>
          <div className="sheet-body tag-search-sheet">
            <span>SELECTED TAG</span>
            <strong>{tagAction}</strong>
            <p>
              Keep your current filters, or branch into a clean collection
              view. Back returns to this file.
            </p>
          </div>
          <footer>
            <button
              className="secondary"
              onClick={() => {
                setTagAction(null);
                onSearchTag(tagAction, "new");
              }}
            >
              Explore this tag
            </button>
            <button
              className="primary"
              onClick={() => {
                setTagAction(null);
                onSearchTag(tagAction, "add");
              }}
            >
              Add to this search
            </button>
          </footer>
        </Sheet>
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
