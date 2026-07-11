import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { api } from "./api";
import { mergeMetadataCache } from "./cache";
import {
  activeFilterCount,
  queryKey,
  restoreQuery,
  serializeQuery,
  toSearchPayload,
} from "./query";
import { scrollStorageKey, storage, type SavedSearch } from "./storage";
import {
  defaultFilters,
  defaultQuery,
  type Media,
  type QueryState,
} from "./types";
import { SearchComposer } from "./components/SearchComposer";
import { FilterSheet, SortSheet } from "./components/Sheets";
import { ResultsGrid, Viewer } from "./components/Media";
import { PwaUpdate } from "./components/PwaUpdate";
import "./styles.css";

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (n, e: any) => n < 2 && e?.status >= 500,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
export default function App() {
  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function Shell() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => api.health(signal),
    refetchInterval: 15_000,
  });
  const services = health.data?.services ?? [];
  return (
    <div className="app-shell">
      <Routes>
        <Route
          path="/"
          element={
            <Browse
              services={services}
              health={health.data}
              healthError={health.error as Error | null}
            />
          }
        />
        <Route path="/saved" element={<Saved />} />
        <Route path="/settings" element={<Settings health={health.data} />} />
      </Routes>
      <nav className="bottom-nav" aria-label="Main navigation">
        <NavLink to="/" end>
          <span>▦</span>Browse
        </NavLink>
        <NavLink to="/saved">
          <span>◇</span>Saved
        </NavLink>
        <NavLink to="/settings">
          <span>⚙</span>Settings
        </NavLink>
      </nav>
      <PwaUpdate />
    </div>
  );
}

function Browse({
  services,
  health,
  healthError,
}: {
  services: any[];
  health: any;
  healthError: Error | null;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [initial] = useState<QueryState>(() => {
    const v = new URLSearchParams(location.search).get("q");
    try {
      return v ? restoreQuery(v) : storage.loadQuery(defaultQuery);
    } catch {
      return defaultQuery;
    }
  });
  const [draft, setDraft] = useState<QueryState>(initial);
  const [submitted, setSubmitted] = useState<QueryState>(initial);
  const [filters, setFilters] = useState(false);
  const [sorting, setSorting] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [media, setMedia] = useState<Map<number, Media>>(new Map());
  const loadingIds = useRef(new Set<number>());
  const metadataController = useRef(new AbortController());
  const [notice, setNotice] = useState("");
  const urlQuery = new URLSearchParams(location.search).get("q");
  useEffect(() => {
    if (!urlQuery) return;
    try {
      const restored = restoreQuery(urlQuery);
      setDraft((current) =>
        serializeQuery(current) === serializeQuery(restored)
          ? current
          : restored,
      );
      setSubmitted((current) =>
        serializeQuery(current) === serializeQuery(restored)
          ? current
          : restored,
      );
    } catch {
      setNotice("This search link is invalid. Your previous search is intact.");
    }
  }, [urlQuery]);
  useEffect(() => storage.saveQuery(draft), [draft]);
  const submittedKey = queryKey(submitted);
  const search = useQuery({
    queryKey: ["search", submittedKey],
    queryFn: ({ signal }) => api.search(toSearchPayload(submitted), signal),
    enabled: health?.hydrus === "ok",
    placeholderData: (previous) => previous,
  });
  const fileIds = useMemo(() => search.data?.fileIds ?? [], [search.data]);
  const requestedView = new URLSearchParams(location.search).get("view");
  useEffect(() => {
    if (!requestedView) {
      setViewer(null);
      requestAnimationFrame(() => {
        const grid = document.getElementById("results-scroll");
        if (grid) {
          grid.scrollTop = Number(
            localStorage.getItem(scrollStorageKey(submittedKey)) ?? 0,
          );
        }
      });
      return;
    }
    const requestedIndex = fileIds.indexOf(Number(requestedView));
    if (requestedIndex >= 0) setViewer(requestedIndex);
  }, [requestedView, fileIds, submittedKey]);
  useEffect(() => {
    metadataController.current.abort();
    metadataController.current = new AbortController();
    loadingIds.current.clear();
    return () => metadataController.current.abort();
  }, [submittedKey]);
  const runQuery = (
    next: QueryState,
    options: { replace?: boolean; recent?: boolean } = {},
  ) => {
    setDraft(next);
    setSubmitted(next);
    storage.saveQuery(next);
    if (options.recent) storage.addRecent(next);
    navigate(`/?q=${encodeURIComponent(serializeQuery(next))}`, {
      replace: options.replace ?? true,
    });
    setNotice("");
  };
  const submit = () => runQuery(draft, { replace: true, recent: true });
  const refine = (next: QueryState) => runQuery(next, { replace: true });
  const need = useCallback(
    (ids: number[]) => {
      const wanted = ids.filter(
        (id) => !media.has(id) && !loadingIds.current.has(id),
      );
      if (!wanted.length) return;
      wanted.forEach((id) => loadingIds.current.add(id));
      for (let i = 0; i < wanted.length; i += 128) {
        const batch = wanted.slice(i, i + 128);
        api
          .metadata(batch, metadataController.current.signal)
          .then((r) => setMedia((old) => mergeMetadataCache(old, r.files)))
          .catch((e) => {
            if (e.name !== "AbortError") setNotice(e.message);
          })
          .finally(() => batch.forEach((id) => loadingIds.current.delete(id)));
      }
    },
    [media],
  );
  const save = () => {
    const name = prompt("Name this search");
    if (!name?.trim()) return;
    const items = storage.saved();
    storage.save([
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        query: draft,
        savedAt: new Date().toISOString(),
      },
      ...items,
    ]);
    setNotice(`Saved “${name.trim()}”`);
  };
  const openViewer = (index: number) => {
    const grid = document.getElementById("results-scroll");
    if (grid) {
      localStorage.setItem(
        scrollStorageKey(submittedKey),
        String(grid.scrollTop),
      );
    }
    const params = new URLSearchParams(location.search);
    if (!params.has("q")) params.set("q", serializeQuery(submitted));
    params.set("view", String(fileIds[index]));
    navigate(
      { pathname: "/", search: params.toString() },
      { state: { viewer: true } },
    );
  };
  const closeViewer = () => {
    if (location.state?.viewer) {
      navigate(-1);
      return;
    }
    const params = new URLSearchParams(location.search);
    params.delete("view");
    navigate({ pathname: "/", search: params.toString() }, { replace: true });
  };
  return (
    <main className="browse-page">
      <section className="search-panel">
        <SearchComposer
          tokens={draft.tokens}
          onChange={(tokens) => refine({ ...draft, tokens })}
          onSearch={submit}
          tagServiceKey={draft.tagServiceKey}
        />
        <div className="search-actions">
          <button className="primary search-button" onClick={submit}>
            Search
          </button>
          <button className="tool-button" onClick={() => setFilters(true)}>
            Filters{" "}
            {activeFilterCount(draft.filters) > 0 && (
              <b>{activeFilterCount(draft.filters)}</b>
            )}
          </button>
          <button className="tool-button" onClick={() => setSorting(true)}>
            Sort{" "}
            <span>
              {sortName(draft.sort)} {draft.ascending ? "↑" : "↓"}
            </span>
          </button>
          <button
            className="icon-button"
            onClick={save}
            aria-label="Save search"
          >
            ◇
          </button>
        </div>
      </section>
      {healthError && (
        <StatePanel
          title={
            !navigator.onLine
              ? "This device is offline"
              : window.location.hostname.endsWith(".ts.net")
                ? "Tailnet path unavailable"
                : "Gateway unavailable"
          }
          body={
            !navigator.onLine
              ? "Reconnect this device to Wi-Fi or mobile data. The cached app remains available, but archive requests need a network path."
              : window.location.hostname.endsWith(".ts.net")
                ? "Tailscale cannot currently reach the desktop. Check Tailscale on this device and confirm the desktop is awake."
                : "The desktop gateway is not reachable. Start Hydrus Pocket, then try again."
          }
          action={() => window.location.reload()}
        />
      )}{" "}
      {health?.hydrus === "error" && (
        <StatePanel
          title={
            (
              {
                HYDRUS_PERMISSION: "Hydrus access needs attention",
                HYDRUS_API_UNSUPPORTED: "Hydrus update required",
                HYDRUS_TIMEOUT: "Hydrus is not responding",
                HYDRUS_UNAVAILABLE: "Hydrus is closed or restarting",
              } as Record<string, string>
            )[health.code] ?? "Hydrus is unavailable"
          }
          body={
            health.message ??
            "Open Hydrus on the desktop. Your search will resume when it reconnects."
          }
        />
      )}{" "}
      {search.isPending && health?.hydrus === "ok" && (
        <div className="result-state" role="status" aria-live="polite">
          <span className="spinner" />
          <p>Searching the archive…</p>
        </div>
      )}
      {search.isError && (
        <StatePanel
          title="Search could not finish"
          body={(search.error as Error).message}
          action={() => search.refetch()}
        />
      )}{" "}
      {search.data && (
        <>
          <div className="results-bar" role="status" aria-live="polite">
            <div className="result-summary">
              <span
                className={`health-dot ${health?.hydrus === "ok" ? "ok" : "bad"}`}
                title={
                  health?.hydrus === "ok"
                    ? "Hydrus connected"
                    : "Hydrus unavailable"
                }
                aria-label={
                  health?.hydrus === "ok"
                    ? "Hydrus connected"
                    : "Hydrus unavailable"
                }
                role="img"
              />
              <strong>{fileIds.length.toLocaleString()}</strong>
              <span>
                {" "}
                results{" "}
                {search.data.limited &&
                  `· limited to ${submitted.limit.toLocaleString()}`}
              </span>
              {search.isFetching && !search.isPending && (
                <em className="refining">FILTERING…</em>
              )}
            </div>
            <div className="density">
              <button
                onClick={() =>
                  refine({
                    ...draft,
                    density: Math.max(2, draft.density - 1),
                  })
                }
                aria-label="Larger thumbnails"
              >
                −
              </button>
              <span>GRID</span>
              <button
                onClick={() =>
                  refine({
                    ...draft,
                    density: Math.min(5, draft.density + 1),
                  })
                }
                aria-label="Smaller thumbnails"
              >
                +
              </button>
            </div>
          </div>
          {search.data.limited && (
            <div className="limit-notice">
              The result limit can change how this sort is interpreted.{" "}
              <button
                onClick={() =>
                  refine({
                    ...draft,
                    limit: Math.min(10000, draft.limit + 500),
                  })
                }
              >
                Raise limit to{" "}
                {Math.min(10000, draft.limit + 500).toLocaleString()}
              </button>
            </div>
          )}
          {fileIds.length ? (
            <ResultsGrid
              fileIds={fileIds}
              media={media}
              density={draft.density}
              onNeed={need}
              onOpen={openViewer}
              scrollKey={submittedKey}
              selectedId={viewer === null ? undefined : fileIds[viewer]}
            />
          ) : (
            <div className="result-state">
              <strong>No matches</strong>
              <p>
                Remove a filter, check the tag spelling, or search a broader
                part of the archive.
              </p>
            </div>
          )}
        </>
      )}
      {notice && (
        <button className="toast" role="status" onClick={() => setNotice("")}>
          {notice}
        </button>
      )}
      {filters && (
        <FilterSheet
          query={draft}
          services={services}
          onApply={(value) => refine({ ...draft, ...value })}
          onClose={() => setFilters(false)}
        />
      )}{" "}
      {sorting && (
        <SortSheet
          query={draft}
          onApply={(sort, ascending) =>
            refine({ ...draft, sort, ascending })
          }
          onClose={() => setSorting(false)}
        />
      )}{" "}
      {viewer !== null && (
        <Viewer
          index={viewer}
          fileIds={fileIds}
          media={media}
          services={services}
          onNeed={need}
          onClose={closeViewer}
          onSearchTag={(tag, mode) => {
            const base =
              mode === "add"
                ? submitted
                : {
                    ...defaultQuery,
                    density: draft.density,
                    fileServiceKey: submitted.fileServiceKey,
                    tagServiceKey: submitted.tagServiceKey,
                  };
            const alreadyIncluded = base.tokens.some(
              (token) => token.kind === "include" && token.value === tag,
            );
            const next = alreadyIncluded
              ? base
              : {
                  ...base,
                  tokens: [
                    ...base.tokens,
                    {
                      id: crypto.randomUUID(),
                      kind: "include" as const,
                      value: tag,
                    },
                  ],
                };
            runQuery(next, { replace: false, recent: true });
          }}
          onPositionChange={(position) => {
            const params = new URLSearchParams(location.search);
            params.set("view", String(fileIds[position]));
            navigate(
              { pathname: "/", search: params.toString() },
              { replace: true, state: location.state },
            );
          }}
          onChanged={(id) => {
            setMedia((old) => {
              const n = new Map(old);
              n.delete(id);
              return n;
            });
            need([id]);
          }}
        />
      )}
    </main>
  );
}

function Saved() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(storage.saved());
  const recent = storage.recent();
  const [showRecent, setShowRecent] = useState(recent.length > 0);
  const open = (q: QueryState) =>
    navigate(`/?q=${encodeURIComponent(serializeQuery(q))}`);
  const remove = (id: string) => {
    const n = saved.filter((x) => x.id !== id);
    setSaved(n);
    storage.save(n);
  };
  const starters: [string, Partial<QueryState>][] = [
    ["Newest imports", {}],
    ["Inbox", { filters: { ...defaultFilters, state: "inbox" } }],
    ["Untagged", { filters: { ...defaultFilters, state: "untagged" } }],
    [
      "Recent video",
      { filters: { ...defaultFilters, media: "video", datePreset: "30d" } },
    ],
    [
      "Long video",
      { filters: { ...defaultFilters, media: "video", duration: "epic" } },
    ],
    ["Large files", { sort: 0, ascending: false }],
    ["Recently viewed", { sort: 18, ascending: false }],
  ];
  return (
    <main className="sub-page">
      <header className="page-header">
        <span>SAVED / RECENT</span>
        <h1>Return to a thought.</h1>
        <p>Searches live on this device and never leave your tailnet.</p>
      </header>
      <section>
        <h2>Saved searches</h2>
        {saved.length ? (
          <div className="saved-list">
            {saved.map((s: SavedSearch) => (
              <div key={s.id}>
                <button onClick={() => open(s.query)}>
                  <strong>{s.name}</strong>
                  <span>
                    {s.query.tokens.map((t) => t.value).join(" · ") ||
                      "All files"}{" "}
                    · {sortName(s.query.sort)}
                  </span>
                </button>
                <button
                  className="icon-button"
                  onClick={() => remove(s.id)}
                  aria-label={`Delete ${s.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-copy">
            No saved searches yet. Save one from Browse when you find a useful
            view.
          </p>
        )}
      </section>
      <section>
        <h2>Shortcuts</h2>
        <div className="shortcut-grid">
          {starters.map(([name, patch]) => (
            <button
              key={name}
              onClick={() => open({ ...defaultQuery, ...patch })}
            >
              {name}
              <span>→</span>
            </button>
          ))}
        </div>
      </section>
      {showRecent && recent.length > 0 && (
        <section>
          <div className="section-heading">
            <h2>Recent</h2>
            <button
              className="text-button"
              onClick={() => {
                storage.clearRecent();
                setShowRecent(false);
              }}
            >
              Clear recent
            </button>
          </div>
          <div className="saved-list">
            {recent.slice(0, 8).map((q, i) => (
              <div key={i}>
                <button onClick={() => open(q)}>
                  <strong>
                    {q.tokens.map((t) => t.value).join(" · ") || "All files"}
                  </strong>
                  <span>
                    {sortName(q.sort)} · limit {q.limit}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Settings({ health }: { health: any }) {
  const [cleared, setCleared] = useState(false);
  const clear = useMutation({
    mutationFn: storage.clear,
    onSuccess: () => setCleared(true),
  });
  const locals = (health?.services ?? []).filter((s: any) =>
    s.group.toLowerCase().includes("tag"),
  );
  return (
    <main className="sub-page">
      <header className="page-header">
        <span>SYSTEM / SETTINGS</span>
        <h1>Quiet machinery.</h1>
        <p>Connection, storage, and archive defaults.</p>
      </header>
      <section className="status-card">
        <div className="status-title">
          <span
            className={`health-dot ${health?.hydrus === "ok" ? "ok" : "bad"}`}
          />
          <div>
            <strong>
              {health?.hydrus === "ok"
                ? "Archive connected"
                : "Archive unavailable"}
            </strong>
            <span>{health?.latencyMs ?? "—"} ms round trip</span>
          </div>
        </div>
        <dl className="settings-facts">
          <div>
            <dt>Gateway</dt>
            <dd>v{health?.version ?? "—"}</dd>
          </div>
          <div>
            <dt>Hydrus</dt>
            <dd>v{health?.hydrusVersion ?? "—"}</dd>
          </div>
          <div>
            <dt>Client API</dt>
            <dd>v{health?.apiVersion ?? "—"}</dd>
          </div>
          <div>
            <dt>Tag services</dt>
            <dd>{locals.length}</dd>
          </div>
          <div>
            <dt>Permission scope</dt>
            <dd>
              {health?.extraPermissions?.length
                ? `${health.extraPermissions.length} unused permission(s)`
                : "Least privilege"}
            </dd>
          </div>
          <div>
            <dt>Last contact</dt>
            <dd>
              {health?.lastSuccess
                ? new Date(health.lastSuccess).toLocaleTimeString()
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Remote URL</dt>
            <dd>{health?.appUrl ?? "Not configured"}</dd>
          </div>
        </dl>
      </section>
      <section>
        <h2>On-device data</h2>
        <div className="setting-row">
          <div>
            <strong>Clear local data</strong>
            <span>
              Removes saved searches, recent searches, preferences, and cached
              thumbnails. Hydrus files are untouched.
            </span>
          </div>
          <button
            className="secondary"
            onClick={() => clear.mutate()}
            disabled={clear.isPending}
          >
            {cleared ? "Cleared" : "Clear cache"}
          </button>
        </div>
      </section>
      <section>
        <h2>Privacy boundary</h2>
        <p className="body-copy">
          The permanent Hydrus access key stays in the desktop gateway. This
          browser connects only through the same-origin app address. Original
          media is streamed and is never placed in the offline cache.
        </p>
      </section>
    </main>
  );
}

function StatePanel({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: () => void;
}) {
  return (
    <div className="state-panel">
      <span>CONNECTION STATE</span>
      <h2>{title}</h2>
      <p>{body}</p>
      {action && (
        <button className="secondary" onClick={action}>
          Try again
        </button>
      )}
    </div>
  );
}
const sortName = (id: number) =>
  (
    ({
      0: "Size",
      1: "Duration",
      2: "Imported",
      3: "Type",
      4: "Random",
      5: "Width",
      6: "Height",
      7: "Ratio",
      8: "Resolution",
      9: "Tags",
      14: "Modified",
      18: "Last viewed",
      19: "Archived",
    }) as Record<number, string>
  )[id] ?? "Imported";
