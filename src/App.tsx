import { useCallback, useEffect, useState } from "react";
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
import {
  activeFilterCount,
  queryKey,
  restoreQuery,
  serializeQuery,
  toSearchPayload,
} from "./query";
import { storage, type SavedSearch } from "./storage";
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
  const location: any = useLocation();
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
  const [loadingIds, setLoadingIds] = useState(new Set<number>());
  const [notice, setNotice] = useState("");
  const submittedKey = queryKey(submitted);
  const search = useQuery({
    queryKey: ["search", submittedKey],
    queryFn: ({ signal }) => api.search(toSearchPayload(submitted), signal),
    enabled: health?.hydrus === "ok",
  });
  useEffect(() => {
    setMedia(new Map());
    setLoadingIds(new Set());
  }, [submittedKey]);
  const submit = () => {
    setSubmitted(draft);
    storage.saveQuery(draft);
    storage.addRecent(draft);
    navigate(`/?q=${encodeURIComponent(serializeQuery(draft))}`, {
      replace: true,
    });
    setNotice("");
  };
  const need = useCallback(
    (ids: number[]) => {
      const wanted = ids.filter((id) => !media.has(id) && !loadingIds.has(id));
      if (!wanted.length) return;
      setLoadingIds((s) => new Set([...s, ...wanted]));
      for (let i = 0; i < wanted.length; i += 128) {
        const batch = wanted.slice(i, i + 128);
        api
          .metadata(batch)
          .then((r) =>
            setMedia((old) => {
              const next = new Map(old);
              r.files.forEach((m) => next.set(m.fileId, m));
              return next;
            }),
          )
          .catch((e) => setNotice(e.message))
          .finally(() =>
            setLoadingIds((s) => {
              const n = new Set(s);
              batch.forEach((id) => n.delete(id));
              return n;
            }),
          );
      }
    },
    [media, loadingIds],
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
  const fileIds = search.data?.fileIds ?? [];
  return (
    <main className="browse-page">
      <header className="masthead">
        <div>
          <span className="brand-mark">
            H<span>●</span>P
          </span>
          <div>
            <h1>Hydrus Pocket</h1>
            <p>Your private archive, within reach.</p>
          </div>
        </div>
        <span
          className={`health-dot ${health?.hydrus === "ok" ? "ok" : "bad"}`}
          title={
            health?.hydrus === "ok" ? "Hydrus connected" : "Hydrus unavailable"
          }
        />
      </header>
      <section className="search-panel">
        <SearchComposer
          tokens={draft.tokens}
          onChange={(tokens) => setDraft({ ...draft, tokens })}
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
          title="Gateway unavailable"
          body="The desktop gateway is not reachable. Start Hydrus Pocket, then try again."
          action={() => location.reload()}
        />
      )}{" "}
      {health?.hydrus === "error" && (
        <StatePanel
          title={
            health.code === "HYDRUS_PERMISSION"
              ? "Hydrus access needs attention"
              : "Hydrus is unavailable"
          }
          body={
            health.message ??
            "Open Hydrus on the desktop. Your search will resume when it reconnects."
          }
        />
      )}{" "}
      {search.isPending && health?.hydrus === "ok" && (
        <div className="result-state">
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
          <div className="results-bar">
            <div>
              <strong>{fileIds.length.toLocaleString()}</strong>
              <span>
                {" "}
                results{" "}
                {search.data.limited &&
                  `· limited to ${submitted.limit.toLocaleString()}`}
              </span>
            </div>
            <div className="density">
              <button
                onClick={() =>
                  setDraft({
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
                  setDraft({
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
                  setDraft({
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
              onOpen={setViewer}
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
        <button className="toast" onClick={() => setNotice("")}>
          {notice}
        </button>
      )}
      {filters && (
        <FilterSheet
          value={draft.filters}
          onApply={(value) => setDraft({ ...draft, filters: value })}
          onClose={() => setFilters(false)}
        />
      )}{" "}
      {sorting && (
        <SortSheet
          query={draft}
          onApply={(sort, ascending) => setDraft({ ...draft, sort, ascending })}
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
          onClose={() => setViewer(null)}
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
      {recent.length > 0 && (
        <section>
          <h2>Recent</h2>
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
