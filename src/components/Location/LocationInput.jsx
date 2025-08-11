// src/components/Location/LocationInput.jsx
import React, { useEffect, useRef, useState } from "react";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

function classNames(...xs) { return xs.filter(Boolean).join(" "); }

async function searchNominatim(q, signal) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "8");
  url.searchParams.set("q", q);
  const res = await fetch(url, { signal, headers: { "Accept-Language": navigator.language || "en" } });
  if (!res.ok) return [];
  const arr = await res.json();
  return (arr || []).map((r) => ({
    id: r.place_id,
    label: r.display_name,
    lat: Number(r.lat),
    lon: Number(r.lon),
    raw: r,
    source: "nominatim",
  }));
}

async function searchMapbox(q, signal) {
  if (!MAPBOX_TOKEN) return [];
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`);
  url.searchParams.set("access_token", MAPBOX_TOKEN);
  url.searchParams.set("limit", "8");
  url.searchParams.set("types", "country,region,place,locality,neighborhood,poi");
  url.searchParams.set("language", (navigator.language || "en").split(",")[0]);
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.features || []).map((f) => ({
    id: f.id,
    label: f.place_name,
    lat: f.center?.[1],
    lon: f.center?.[0],
    raw: f,
    source: "mapbox",
  }));
}

/**
 * Props:
 *  - value: string (the current label)
 *  - onChange: (locOrNull) => void   // when user selects OR commits free text
 *      locOrNull = {
 *        id: string|null, label: string, lat: number|null, lon: number|null,
 *        raw?: any, source: "mapbox"|"nominatim"|"custom"
 *      } | null
 *  - disabled?: boolean
 *  - placeholder?: string
 *  - allowFreeText?: boolean (default: true)
 */
export default function LocationInput({
  value,
  onChange,
  placeholder = "Search country, city, place, institute…",
  disabled = false,
  allowFreeText = true,
}) {
  const [q, setQ] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [idx, setIdx] = useState(-1);
  const acRef = useRef(null);
  const boxRef = useRef(null);

  // sync controlled value -> input
  useEffect(() => { setQ(value || ""); }, [value]);

  // close on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // debounced search
  useEffect(() => {
    if (!q || q.trim().length < 2) { setItems([]); return; }
    setLoading(true);
    if (acRef.current) acRef.current.abort();
    const ac = new AbortController();
    acRef.current = ac;

    const t = setTimeout(async () => {
      try {
        const [mb, nm] = await Promise.allSettled([searchMapbox(q, ac.signal), searchNominatim(q, ac.signal)]);
        const a = mb.status === "fulfilled" ? mb.value : [];
        const b = nm.status === "fulfilled" ? nm.value : [];
        const seen = new Set();
        const merged = [...a, ...b].filter((it) => {
          const key = `${it.label}-${it.lat}-${it.lon}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setItems(merged);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 250);

    return () => { clearTimeout(t); ac.abort(); };
  }, [q]);

  const choose = (loc) => {
    onChange?.(loc);
    setQ(loc?.label || "");
    setOpen(false);
    setIdx(-1);
  };

  const commitTyped = () => {
    if (!allowFreeText) return;
    const label = (q || "").trim();
    if (!label) { onChange?.(null); return; }
    choose({ id: null, label, lat: null, lon: null, raw: null, source: "custom" });
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      if (e.key === "Enter" && allowFreeText) { commitTyped(); return; }
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, items.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter")     {
      e.preventDefault();
      if (idx >= 0 && items[idx]) choose(items[idx]);
      else if (allowFreeText) commitTyped();
    }
    if (e.key === "Escape")    { setOpen(false); }
  };

  // Commit free text on blur if user typed something different
  const onBlur = () => {
    // Delay so clicks on menu items still register
    setTimeout(() => {
      if (!open && allowFreeText && (q || "") !== (value || "")) commitTyped();
    }, 100);
  };

  const showCustomRow = allowFreeText && (q || "").trim().length > 0;

  return (
    <div className="relative" ref={boxRef}>
      <input
        type="text"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-600"
        placeholder={placeholder}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        disabled={disabled}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="location-listbox"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          {loading ? (
            <div className="p-3 text-sm text-gray-500">Searching…</div>
          ) : (
            <ul id="location-listbox" role="listbox" className="max-h-64 overflow-auto py-1">
              {showCustomRow && (
                <li
                  role="option"
                  aria-selected={idx === -1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={commitTyped}
                  className={classNames(
                    "cursor-pointer px-3 py-2 text-sm font-medium",
                    "text-green-700 hover:bg-green-50"
                  )}
                >
                  Use “{q.trim()}”
                </li>
              )}
              {items.length === 0 ? (
                !showCustomRow && <li className="px-3 py-2 text-sm text-gray-500">No places found.</li>
              ) : (
                items.map((it, i) => (
                  <li
                    key={`${it.source}:${it.id}`}
                    role="option"
                    aria-selected={i === idx}
                    onMouseEnter={() => setIdx(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(it)}
                    className={classNames(
                      "cursor-pointer px-3 py-2 text-sm",
                      i === idx ? "bg-green-600/10 text-gray-900" : "hover:bg-gray-50"
                    )}
                  >
                    <div className="font-medium text-gray-900">{it.label}</div>
                    {Number.isFinite(it.lat) && Number.isFinite(it.lon) && (
                      <div className="text-xs text-gray-500">Lat {it.lat}, Lon {it.lon}</div>
                    )}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}