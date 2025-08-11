// src/components/Teaching/MyCourses.jsx
import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronRight, MapPin, Printer } from "lucide-react";
import { exportSchedulePdf } from "../../utils/exportSchedulePdf";

/* ------------------------------- Config ---------------------------------- */
const API_BASE =
  import.meta.env.VITE_BACK_END_SERVER_URL?.replace(/\/+$/, "") || "";

/* ----------------------------- Utilities --------------------------------- */
const pad2 = (n) => String(n).padStart(2, "0");
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const fmtDate = (d) => {
  if (!d) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return x.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};
const fmtWeekday = (d) => {
  if (!d) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return x.toLocaleDateString(undefined, { weekday: "short" }); // Mon, Tue, ...
};
const toKey = (d) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
};
const parseTime = (hhmm) => {
  if (!hhmm || typeof hhmm !== "string") return null;
  const [h, m] = hhmm.split(":").map((v) => parseInt(v, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return { h, m };
};
const minutesBetween = (startHHMM, endHHMM) => {
  const s = parseTime(startHHMM);
  const e = parseTime(endHHMM);
  if (!s || !e) return 0;
  const sMin = s.h * 60 + s.m;
  const eMin = e.h * 60 + e.m;
  // Handle overnight just in case
  let diff = eMin - sMin;
  if (diff < 0) diff += 24 * 60;
  return diff;
};
const fmtTimeLabel = (hhmm) => {
  const t = parseTime(hhmm);
  if (!t) return hhmm || "";
  const d = new Date();
  d.setHours(t.h, t.m, 0, 0);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const isAbortError = (e) =>
  e?.name === "AbortError" ||
  /aborted/i.test(String(e?.message)) ||
  /abort/i.test(String(e?.cause));

/* --------------------------- Data Fetching ------------------------------- */
async function fetchJSON(url, token, signal) {
  const r = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal,
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

async function fetchInstructorMe(token, signal) {
  return fetchJSON(`${API_BASE}/instructors/me`, token, signal);
}

async function loadMyCourses(token, signal) {
  const data = await fetchJSON(
    `${API_BASE}/courses?instructor=me&limit=200&sort=-start_date`,
    token,
    signal
  );
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

/* ----------------------------- Normalization ----------------------------- */
function normalizeCourse(raw, instructorId) {
  const title = raw?.title || raw?.name || "Untitled course";
  const start =
    raw?.start_date || raw?.startDate || raw?.start || raw?.begin || raw?.range?.from;
  const end = raw?.end_date || raw?.endDate || raw?.end || raw?.range?.to;

  const sessions = Array.isArray(raw?.courseDatesTimes) ? raw.courseDatesTimes : [];

  const rateMap = raw?.instructorRates || {};
  // keys stored as strings on backend
  const perHour =
    Number(rateMap?.[String(instructorId)]) ||
    Number(rateMap?.[instructorId]) ||
    0;

  // total minutes over all sessions
  const totalMinutes = sessions.reduce((acc, s) => {
    const startTime = s?.start_time || s?.from || s?.start;
    const endTime = s?.end_time || s?.to || s?.end;
    return acc + minutesBetween(startTime, endTime);
  }, 0);
  const totalHours = totalMinutes / 60;
  const totalPay = perHour * totalHours;

  // sort sessions by date/time
  const sortedSessions = [...sessions].sort((a, b) => {
    const ak = toKey(a?.date || a?.day || a?.sessionDate);
    const bk = toKey(b?.date || b?.day || b?.sessionDate);
    if (ak !== bk) return ak < bk ? -1 : 1;
    const at = a?.start_time || a?.from || a?.start || "00:00";
    const bt = b?.start_time || b?.from || b?.start || "00:00";
    return at < bt ? -1 : at > bt ? 1 : 0;
  });

  return {
    id: raw?._id || raw?.id,
    title,
    start,
    end,
    startLabel: fmtDate(start),
    endLabel: fmtDate(end),
    perHour,
    totalHours,
    totalPay,
    sessions: sortedSessions,
    raw,
  };
}

/* ------------------------------ Components -------------------------------- */
const EmptyState = ({ message = "No courses assigned yet." }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
    <p className="text-gray-700 font-medium">{message}</p>
    <p className="text-gray-500 text-sm">
      Once you’re assigned as an instructor, your courses will appear here.
    </p>
  </div>
);

const SessionItem = ({ s }) => {
  const rawDate = s?.date || s?.day || s?.sessionDate;
  const key = toKey(rawDate);
  const isToday = key === todayKey();

  const dateLabel = fmtDate(key);
  const dayName = fmtWeekday(key);

  const start = s?.start_time || s?.from || s?.start || "00:00";
  const end = s?.end_time || s?.to || s?.end || "00:00";
  const durationHrs = (minutesBetween(start, end) / 60).toFixed(2);

  return (
    <div
      className={[
        "rounded-2xl border p-4 shadow-sm transition-colors",
        isToday ? "bg-green-50 border-green-300 ring-1 ring-green-200" : "bg-white border-gray-200",
      ].join(" ")}
    >
      {/* Header: date + weekday chip (+ Today chip if today) */}
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold text-gray-900">{dateLabel}</div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
            {dayName}
          </span>
          {isToday && (
            <span className="inline-flex items-center rounded-full bg-green-600 px-2.5 py-0.5 text-xs font-semibold text-white">
              Today
            </span>
          )}
        </div>
      </div>

      {/* Time range */}
      <div className="mt-2 text-gray-800 font-medium">
        {fmtTimeLabel(start)} – {fmtTimeLabel(end)}
      </div>

      {/* Optional location */}
      {s?.location && (
        <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
          <MapPin size={12} />
          <span className="truncate">{s.location}</span>
        </div>
      )}

      {/* Duration */}
      <div className="mt-2 text-sm text-gray-500">{durationHrs} h</div>
    </div>
  );
};

const Row = ({ c, instructorName, onPrint }) => {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((v) => !v);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      {/* Header row (click to expand/collapse) */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="rounded-2xl grid w-full grid-cols-1 gap-3 p-4 text-left transition hover:bg-gray-50 md:grid-cols-[1.5fr,0.9fr,0.9fr,0.9fr,auto]"
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <span className="truncate font-semibold text-gray-900">{c.title}</span>
        </div>

        <div className="text-sm text-gray-700">
          <span className="md:hidden font-medium">Dates: </span>
          {c.startLabel || "TBD"} {c.endLabel ? `– ${c.endLabel}` : ""}
        </div>

        <div className="text-sm text-gray-700">
          <span className="md:hidden font-medium">Pay / hr: </span>
          {c.perHour.toFixed(2)}
        </div>

        <div className="text-sm text-gray-700">
          <span className="md:hidden font-medium">Total hours: </span>
          {c.totalHours.toFixed(2)}
        </div>

        <div className="text-sm font-semibold text-gray-900">
          <span className="md:hidden font-medium">Total pay: </span>
          {c.totalPay.toFixed(2)}
        </div>

        <div className="justify-self-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={(e) => {
              e.stopPropagation();
              onPrint?.(c, instructorName);
            }}
            title="Print schedule as PDF"
          >
            <Printer size={16} />
            Print
          </button>
        </div>
      </button>

      {/* Slide-down sessions */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-gray-100 p-4">
            {c.sessions.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
                No sessions scheduled yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                {c.sessions.map((s, idx) => (
                  <SessionItem key={idx} s={s} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------- View ------------------------------------ */
const MyCourses = () => {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rawCourses, setRawCourses] = useState([]);
  const [instructor, setInstructor] = useState({ id: "", name: "" });

  useEffect(() => {
    const ac = new AbortController();
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");
        const token = localStorage.getItem("token") || "";
        const [me, items] = await Promise.all([
          fetchInstructorMe(token, ac.signal),
          loadMyCourses(token, ac.signal),
        ]);
        if (!active) return;
        setInstructor({ id: me?._id || me?.id || "", name: me?.name || "" });
        setRawCourses(items || []);
      } catch (e) {
        if (isAbortError(e)) return;
        if (!active) return;
        setErr(e?.message || "Failed to load courses.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      ac.abort("navigation");
    };
  }, []);

  const courses = useMemo(() => {
    if (!Array.isArray(rawCourses) || !instructor.id) return [];
    return rawCourses.map((r) => normalizeCourse(r, instructor.id));
  }, [rawCourses, instructor.id]);

  const handlePrint = (course, instructorName) => {
    // Export a month that includes the course start (fallback: today)
    const monthDate = course.start ? new Date(course.start) : new Date();
    exportSchedulePdf({
      courses: [course.raw],
      instructorName: instructorName || "",
      monthDate,
      brand: "TADRIB",
    });
  };

  return (
    <main className="p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays size={22} />
          My Courses
        </h1>
      </div>

      {/* States */}
      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-gray-600">Loading your courses…</p>
        </div>
      )}

      {!loading && err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-red-700 font-medium">Error</p>
          <p className="text-red-700/90 text-sm mt-1">{err}</p>
        </div>
      )}

      {!loading && !err && (
        <>
          {/* List header (desktop) */}
          {courses.length > 0 && (
            <div className="mb-2 hidden md:grid md:grid-cols-[1.5fr,0.9fr,0.9fr,0.9fr,auto] text-xs font-semibold text-gray-600 px-2">
              <div>Course</div>
              <div>Dates</div>
              <div>Pay / hr</div>
              <div>Total hours</div>
              <div className="justify-self-end">Actions</div>
            </div>
          )}

          {/* Rows */}
          <div className="space-y-3">
            {courses.length === 0 ? (
              <EmptyState message="You have no assigned courses yet." />
            ) : (
              courses.map((c) => (
                <Row
                  key={c.id}
                  c={c}
                  instructorName={instructor.name}
                  onPrint={handlePrint}
                />
              ))
            )}
          </div>
        </>
      )}
    </main>
  );
};

export default MyCourses;