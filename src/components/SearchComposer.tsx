import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { Token } from "../types";

export function SearchComposer({
  tokens,
  onChange,
  onSearch,
  tagServiceKey,
}: {
  tokens: Token[];
  onChange: (t: Token[]) => void;
  onSearch: () => void;
  tagServiceKey?: string;
}) {
  const [value, setValue] = useState("");
  const [items, setItems] = useState<{ value: string; count: number | null }[]>(
    [],
  );
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (value.trim().length < 1) {
      setItems([]);
      setOpen(false);
      return;
    }
    const c = new AbortController();
    const timer = setTimeout(() => {
      setStatus("loading");
      api
        .tags(value.trim(), tagServiceKey, c.signal)
        .then((r) => {
          setItems(r.tags);
          setOpen(true);
          setStatus(r.tags.length ? "" : "empty");
        })
        .catch((e) => {
          if (e.name !== "AbortError") setStatus("error");
        });
    }, 220);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [value, tagServiceKey]);
  const commit = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    let token: Token;
    if (text.includes("|"))
      token = {
        id: crypto.randomUUID(),
        kind: "or",
        value: text,
        values: text
          .split("|")
          .map((v) => v.trim())
          .filter(Boolean),
      };
    else if (text.startsWith("-"))
      token = {
        id: crypto.randomUUID(),
        kind: "exclude",
        value: text.slice(1),
      };
    else if (text.startsWith("system:"))
      token = { id: crypto.randomUUID(), kind: "system", value: text };
    else token = { id: crypto.randomUUID(), kind: "include", value: text };
    onChange([...tokens, token]);
    setValue("");
    setOpen(false);
    setItems([]);
    ref.current?.focus();
  };
  return (
    <div className="composer" role="search">
      <div className="composer-label">
        <span>SEARCH THE ARCHIVE</span>
        <span className="composer-hint">
          Use -tag to exclude · tag | tag for any
        </span>
        {tokens.length > 0 && (
          <button className="composer-clear" onClick={() => onChange([])}>
            CLEAR ALL
          </button>
        )}
      </div>
      <div className="token-field" onClick={() => ref.current?.focus()}>
        {tokens.map((t) => (
          <button
            key={t.id}
            className={`token token-${t.kind}`}
            onClick={(e) => {
              e.stopPropagation();
              onChange(tokens.filter((x) => x.id !== t.id));
            }}
            aria-label={`Remove ${t.value}`}
          >
            {t.kind === "exclude"
              ? "−"
              : t.kind === "or"
                ? "ANY"
                : t.kind === "system"
                  ? "SYS"
                  : "+"}{" "}
            <span>
              {t.kind === "or" ? (t.values ?? []).join(" OR ") : t.value}
            </span>
            <b>×</b>
          </button>
        ))}
        <input
          ref={ref}
          role="combobox"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            tokens.length ? "Add another…" : "tag, -exclude, system:predicate"
          }
          aria-label="Search tags"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="search-tag-suggestions"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && items.length) {
              e.preventDefault();
              setActive((a) => (a + 1) % items.length);
            } else if (e.key === "ArrowUp" && items.length) {
              e.preventDefault();
              setActive((a) => (a - 1 + items.length) % items.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (open && items[active]) commit(items[active].value);
              else if (value) commit(value);
              else onSearch();
            } else if (e.key === "Backspace" && !value && tokens.length)
              onChange(tokens.slice(0, -1));
            else if (e.key === "Escape") setOpen(false);
          }}
        />
      </div>
      {open && (
        <div className="suggestions" role="listbox" id="search-tag-suggestions">
          {items.map((item, i) => {
            const [ns, ...rest] = item.value.split(":");
            return (
              <button
                key={item.value}
                role="option"
                aria-selected={i === active}
                className={i === active ? "active" : ""}
                onPointerDown={(e) => {
                  e.preventDefault();
                  commit(item.value);
                }}
              >
                {rest.length ? (
                  <>
                    <span className="namespace">{ns}:</span>
                    <span>{rest.join(":")}</span>
                  </>
                ) : (
                  <span>{item.value}</span>
                )}
                <span className="count">
                  {item.count?.toLocaleString() ?? ""}
                </span>
              </button>
            );
          })}
          {status === "loading" && (
            <div className="suggest-state">Searching tags…</div>
          )}
          {status === "empty" && (
            <button onPointerDown={() => commit(value)}>
              Use “{value}” as entered
            </button>
          )}
          {status === "error" && (
            <div className="suggest-state error">
              Autocomplete unavailable. Press Enter to use the tag.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
