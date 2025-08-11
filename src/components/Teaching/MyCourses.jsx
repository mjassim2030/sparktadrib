// src/components/Teaching/MyCourses.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { List, Grid, CalendarDays, MapPin } from "lucide-react";

/* ------------------------------- Config ---------------------------------- */
const API_BASE =
  import.meta.env.VITE_BACK_END_SERVER_URL?.replace(/\/+$/, "") || "";

/* ----------------------------- Utilities --------------------------------- */
const formatDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
};

const normalizeCourse = (raw) => {
  const title = raw?.title || raw?.name || "Untitled course";
  const students =
    typeof raw?.students === "number"
      ? raw.students
      : Array.isArray(raw?.enrolled)
      ? raw.enrolled.length
      : raw?.studentsCount || 0;

  const start =
    raw?.start_date || raw?.startDate || raw?.start || raw?.begin || raw?.range?.from;
  const end = raw?.end_date || raw?.endDate || raw?.end || raw?.range?.to;

  return {
    id: raw?._id || raw?.id,
    title,
    students,
    start,
    end,
    startLabel: formatDate(start),
    endLabel: formatDate(end),
    imageUrl: raw?.imageUrl,
    location: raw?.location,
    description: raw?.shortDescription || raw?.description,
    raw,
  };
};

const EmptyState = ({ message = "No courses assigned yet." }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
    <p className="text-gray-700 font-medium">{message}</p>
    <p className="text-gray-500 text-sm">
      Once you’re assigned as an instructor, your courses will appear here.
    </p>
    <div className="mt-4">
      <Link
        to="/courses"
        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
      >
        Browse All Courses
      </Link>
    </div>
  </div>
);

const CourseCard = ({ c }) => (
  <Link
    to={`/courses/${c.id}`}
    className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-shadow"
  >
    <div className="aspect-[16/9] w-full bg-gray-100 overflow-hidden">
      {c.imageUrl ? (
        <img
          src={c.imageUrl}
          alt={c.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="text-gray-400 text-sm">No image</span>
        </div>
      )}
    </div>

    <div className="p-4">
      <h3 className="line-clamp-2 text-base font-semibold text-gray-900">
        {c.title}
      </h3>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-700">
        <span className="rounded-full bg-gray-100 px-2.5 py-1">
          Students: {c.students}
        </span>
        <span className="rounded-full bg-gray-100 px-2.5 py-1">
          {c.startLabel || "TBD"} {c.endLabel ? `– ${c.endLabel}` : ""}
        </span>
        {c.location && (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 inline-flex items-center gap-1">
            <MapPin size={12} />
            {c.location}
          </span>
        )}
      </div>

      {c.description && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{c.description}</p>
      )}
    </div>

    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
      <span className="text-sm font-medium text-blue-700 group-hover:underline">
        View details
      </span>
    </div>
  </Link>
);

const CourseRow = ({ c }) => (
  <Link
    to={`/courses/${c.id}`}
    className="group grid grid-cols-1 md:grid-cols-[1.5fr,0.8fr,0.8fr,0.8fr,auto] gap-3 items-center rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-50 transition"
  >
    <div className="min-w-0">
      <div className="text-sm font-semibold text-gray-900 truncate">{c.title}</div>
      {c.location && (
        <div className="text-xs text-gray-500 truncate mt-0.5">{c.location}</div>
      )}
    </div>
    <div className="text-sm text-gray-700">
      <span className="md:hidden font-medium">Students: </span>
      {c.students}
    </div>
    <div className="text-sm text-gray-700">
      <span className="md:hidden font-medium">Start: </span>
      {c.startLabel || "TBD"}
    </div>
    <div className="text-sm text-gray-700">
      <span className="md:hidden font-medium">End: </span>
      {c.endLabel || "—"}
    </div>
    <div className="justify-self-end">
      <span className="text-sm font-medium text-blue-700 group-hover:underline">
        View
      </span>
    </div>
  </Link>
);

/* --------------------------- Data Fetching ------------------------------- */
const isAbortError = (e) =>
  e?.name === "AbortError" ||
  /aborted/i.test(String(e?.message)) ||
  /abort/i.test(String(e?.cause));

async function loadMyCourses(token, signal) {
  const url = `${API_BASE}/courses?instructor=me&limit=100&sort=-start_date`;

  // If already aborted, bail early
  if (signal?.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal,
  });

  if (!res.ok) {
    // If the fetch was aborted during request, surface as AbortError
    if (signal?.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
    throw new Error(`${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

/* ------------------------------- View ------------------------------------ */
const MyCourses = () => {
  const [view, setView] = useState("grid"); // "grid" | "list"
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rawCourses, setRawCourses] = useState([]);

  useEffect(() => {
    const ac = new AbortController();
    let active = true; // guard against state updates after unmount

    (async () => {
      try {
        setLoading(true);
        setErr("");
        const token = localStorage.getItem("token") || "";
        const items = await loadMyCourses(token, ac.signal);
        if (!active) return;
        setRawCourses(items || []);
      } catch (e) {
        if (isAbortError(e)) return; // ignore expected aborts (route change, strict mode)
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
    if (!Array.isArray(rawCourses)) return [];
    return rawCourses.map(normalizeCourse);
  }, [rawCourses]);

  return (
    <main className="p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays size={22} />
          My Courses
        </h1>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView("list")}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              view === "list"
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
            }`}
            title="List view"
          >
            <List size={16} />
            List
          </button>
          <button
            type="button"
            onClick={() => setView("grid")}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              view === "grid"
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
            }`}
            title="Grid view"
          >
            <Grid size={16} />
            Grid
          </button>
        </div>
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

      {!loading && !err && (courses.length === 0 ? (
        <EmptyState message="You have no assigned courses yet." />
      ) : view === "grid" ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {courses.map((c) => (
            <CourseCard key={c.id} c={c} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="hidden md:grid md:grid-cols-[1.5fr,0.8fr,0.8fr,0.8fr,auto] text-xs font-semibold text-gray-600 px-2">
            <div>Title</div>
            <div>Students</div>
            <div>Start</div>
            <div>End</div>
            <div className="justify-self-end">Action</div>
          </div>
          {courses.map((c) => (
            <CourseRow key={c.id} c={c} />
          ))}
        </div>
      ))}
    </main>
  );
};

export default MyCourses;