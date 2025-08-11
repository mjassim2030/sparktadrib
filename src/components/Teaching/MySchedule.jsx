// src/components/Teaching/MySchedule.jsx
import React, { useEffect, useMemo, useState } from "react";
import { exportSchedulePdf } from "../../utils/exportSchedulePdf";

import { Link } from "react-router-dom";
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock,
    MapPin,
} from "lucide-react";

/* ------------------------------- Config ---------------------------------- */
const API_BASE =
    import.meta.env.VITE_BACK_END_SERVER_URL?.replace(/\/+$/, "") || "";

/* ----------------------------- Utilities --------------------------------- */
const pad2 = (n) => String(n).padStart(2, "0");
const toKey = (d) => {
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return "";
    return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
};
const parseTime = (hhmm) => {
    if (!hhmm || typeof hhmm !== "string") return null;
    const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return { h, m };
};
const combineDateTime = (dateStr, hhmm) => {
    const t = parseTime(hhmm);
    const d = new Date(dateStr);
    if (!t || Number.isNaN(d.getTime())) return null;
    const out = new Date(d);
    out.setHours(t.h, t.m, 0, 0);
    return out;
};
const formatTimeLabel = (hhmm) => {
    const dt = combineDateTime(new Date(), hhmm);
    return dt
        ? dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : hhmm || "";
};
const monthLabel = (d) =>
    new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" });

async function fetchInstructorMe(token, signal) {
    const API_BASE = import.meta.env.VITE_BACK_END_SERVER_URL?.replace(/\/+$/, "") || "";
    const r = await fetch(`${API_BASE}/instructors/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal,
    });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json(); // { name, ... }
}


function normalizeSessionsFromCourse(raw) {
    const title = raw?.title || raw?.name || "Untitled course";
    const location = raw?.location || "";
    const courseId = raw?._id || raw?.id;
    const sessions = Array.isArray(raw?.courseDatesTimes) ? raw.courseDatesTimes : [];

    return sessions
        .map((s, idx) => {
            const dateKey = toKey(s?.date || s?.day || s?.sessionDate);
            if (!dateKey) return null;
            const start = s?.start_time || s?.from || s?.start || "00:00";
            const end = s?.end_time || s?.to || s?.end || "00:00";
            const startAt = combineDateTime(dateKey, start);
            const endAt = combineDateTime(dateKey, end);

            return {
                id: `${courseId || "c"}_${idx}_${dateKey}`,
                courseId,
                dateKey,
                title,
                location,
                startLabel: formatTimeLabel(start),
                endLabel: formatTimeLabel(end),
                startAt,
                endAt,
            };
        })
        .filter(Boolean)
        .sort((a, b) => (a.startAt?.getTime?.() || 0) - (b.startAt?.getTime?.() || 0));
}

/* --------------------------- Data Fetching ------------------------------- */
async function fetchCoursesForMe(token, signal) {
    const url = `${API_BASE}/courses?instructor=me&limit=1000&sort=-start_date`;
    const r = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal,
    });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    const data = await r.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.results)) return data.results;
    return [];
}

/* --------------------------- Calendar Helpers ---------------------------- */
function startOfMonth(d) {
    const x = new Date(d);
    x.setDate(1); x.setHours(0, 0, 0, 0);
    return x;
}
function endOfMonth(d) {
    const x = startOfMonth(d);
    x.setMonth(x.getMonth() + 1);
    x.setDate(0);
    return x;
}
function startOfGrid(d) {
    // Grid starts on Sunday (0). Adjust here if you prefer Monday.
    const first = startOfMonth(d);
    const offset = first.getDay(); // 0..6 where 0=Sun
    const x = new Date(first);
    x.setDate(first.getDate() - offset);
    return x;
}
function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
}

/* -------------------------------- Cells ---------------------------------- */
const EventPill = ({ s }) => (
    <Link
        to={`/courses/${s.courseId}`}
        className="block truncate rounded-md bg-green-50 px-2 py-1 text-[11px] font-medium text-green-800 hover:bg-green-100"
        title={`${s.title} • ${s.startLabel}–${s.endLabel}`}
    >
        {s.startLabel}–{s.endLabel} · {s.title}
    </Link>
);

const CalendarCell = ({
    date,
    inMonth,
    isToday,
    events = [],
    onSelect,
}) => {
    const dateNum = date.getDate();
    const moreCount = Math.max(0, events.length - 2);
    return (
        <div
            className={[
                "min-h-[92px] rounded-lg border p-2 flex flex-col gap-1",
                inMonth ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50",
            ].join(" ")}
            onClick={() => onSelect(date)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(date)}
        >
            <div className="flex items-center justify-between">
                <div
                    className={[
                        "h-6 w-6 text-xs grid place-items-center rounded-full",
                        isToday ? "bg-green-600 text-white" : "text-gray-700",
                        inMonth ? "" : "opacity-60",
                    ].join(" ")}
                >
                    {dateNum}
                </div>
            </div>

            <div className="mt-1 space-y-1">
                {events.slice(0, 2).map((s) => (
                    <EventPill key={s.id} s={s} />
                ))}
                {moreCount > 0 && (
                    <div className="text-[11px] text-gray-600">+{moreCount} more…</div>
                )}
            </div>
        </div>
    );
};

/* -------------------------------- Page ----------------------------------- */
const MySchedule = () => {
    // calendar state
    const [cursor, setCursor] = useState(() => {
        const d = new Date(); d.setHours(0, 0, 0, 0); return d;
    });
    const [selected, setSelected] = useState(() => {
        const d = new Date(); d.setHours(0, 0, 0, 0); return d;
    });

    // data state
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [courses, setCourses] = useState([]);

    const [instructorName, setInstructorName] = useState("");

    useEffect(() => {
        const ac = new AbortController();
        (async () => {
            try {
                setLoading(true); setErr("");
                const token = localStorage.getItem("token") || "";
                const [coursesData, me] = await Promise.all([
                    fetchCoursesForMe(token, ac.signal),
                    fetchInstructorMe(token, ac.signal).catch(() => null),
                ]);
                setCourses(Array.isArray(coursesData) ? coursesData : []);
                setInstructorName(me?.name || "");
            } catch (e) {
                if (e?.name === "AbortError") return;
                setErr(e?.message || "Failed to load schedule.");
            } finally {
                setLoading(false);
            }
        })();
        return () => ac.abort();
    }, []);

    // sessions indexed by date
    const sessionsByDate = useMemo(() => {
        const index = new Map();
        for (const c of courses) {
            const rows = normalizeSessionsFromCourse(c);
            for (const s of rows) {
                if (!s.dateKey) continue;
                if (!index.has(s.dateKey)) index.set(s.dateKey, []);
                index.get(s.dateKey).push(s);
            }
        }
        // sort each day's sessions
        for (const [k, list] of index.entries()) {
            list.sort((a, b) => (a.startAt?.getTime?.() || 0) - (b.startAt?.getTime?.() || 0));
            index.set(k, list);
        }
        return index;
    }, [courses]);

    // calendar grid (6 weeks)
    const gridDays = useMemo(() => {
        const start = startOfGrid(cursor);
        return Array.from({ length: 42 }, (_, i) => addDays(start, i));
    }, [cursor]);

    const firstOfMonth = startOfMonth(cursor);
    const lastOfMonth = endOfMonth(cursor);
    const todayKey = toKey(new Date());
    const selectedKey = toKey(selected);

    const selectedSessions = sessionsByDate.get(selectedKey) || [];

    const goPrevMonth = () => setCursor((d) => {
        const x = new Date(d); x.setMonth(x.getMonth() - 1); return x;
    });
    const goNextMonth = () => setCursor((d) => {
        const x = new Date(d); x.setMonth(x.getMonth() + 1); return x;
    });
    const goThisMonth = () => setCursor(new Date());

    return (
        <main className="p-6">
            {/* Header */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <CalendarDays size={22} />
                    My Schedule
                </h1>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={goPrevMonth}
                        className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:border-gray-400"
                        title="Previous month"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <div className="min-w-[10rem] text-center text-sm font-semibold">
                        {monthLabel(cursor)}
                    </div>
                    <button
                        type="button"
                        onClick={goNextMonth}
                        className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:border-gray-400"
                        title="Next month"
                    >
                        <ChevronRight size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={goThisMonth}
                        className="inline-flex items-center rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                        title="Jump to current month"
                    >
                        Today
                    </button>

                    <button
                        type="button"
                        onClick={() => exportSchedulePdf({ courses, instructorName, monthDate: cursor, brand: "TADRIB" })}
                        className="inline-flex items-center rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                        Export Calendar
                    </button>
                </div>
            </div>

            {/* States */}
            {loading && (
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <p className="text-gray-600">Loading your calendar…</p>
                </div>
            )}
            {!loading && err && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                    <p className="text-red-700 font-medium">Error</p>
                    <p className="text-red-700/90 text-sm mt-1">{err}</p>
                </div>
            )}

            {/* Calendar Grid */}
            {!loading && !err && (
                <>
                    <div className="grid grid-cols-7 gap-2 text-xs text-gray-600 mb-2">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                            <div key={d} className="px-2">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                        {gridDays.map((d) => {
                            const key = toKey(d);
                            const inMonth = d >= firstOfMonth && d <= lastOfMonth;
                            const isToday = key === todayKey;
                            const events = sessionsByDate.get(key) || [];
                            return (
                                <CalendarCell
                                    key={key}
                                    date={d}
                                    inMonth={inMonth}
                                    isToday={isToday}
                                    events={events}
                                    onSelect={(day) => setSelected(day)}
                                />
                            );
                        })}
                    </div>

                    {/* Day details */}
                    <section className="mt-6">
                        <h2 className="mb-3 text-sm font-semibold text-gray-700">
                            {new Date(selected).toLocaleDateString(undefined, {
                                weekday: "long", month: "short", day: "numeric", year: "numeric",
                            })}
                        </h2>

                        {selectedSessions.length === 0 ? (
                            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-700">
                                No sessions on this day.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedSessions.map((s) => (
                                    <Link
                                        key={s.id}
                                        to={`/courses/${s.courseId}`}
                                        className="group grid grid-cols-[auto,1fr,auto] items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-50 transition"
                                    >
                                        <div className="flex items-center gap-2 text-gray-700">
                                            <Clock size={16} />
                                            <span className="font-medium">
                                                {s.startLabel} – {s.endLabel}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate font-semibold text-gray-900">
                                                {s.title}
                                            </div>
                                            {s.location && (
                                                <div className="mt-0.5 flex items-center gap-1 text-sm text-gray-600">
                                                    <MapPin size={14} />
                                                    <span className="truncate">{s.location}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="justify-self-end text-sm font-medium text-blue-700 group-hover:underline">
                                            View
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </main>
    );
};

export default MySchedule;