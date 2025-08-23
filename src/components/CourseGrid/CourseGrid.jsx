// src/components/CourseGrid/CourseGrid.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { List, Grid, Plus } from "lucide-react";

/* ---------- Helpers (mirrors CourseDetails) ---------- */
const fmtDate = (d) => {
  if (!d) return "";
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? "" : x.toLocaleDateString();
};

const fmtBHD = (n) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "BHD",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

const hhmmToMinutes = (s) => {
  if (!s) return 0;
  const [h, m] = String(s).split(":").map((v) => parseInt(v, 10));
  if ([h, m].some((v) => Number.isNaN(v))) return 0;
  return h * 60 + m;
};
const diffHours = (start, end) => {
  let a = hhmmToMinutes(start);
  let b = hhmmToMinutes(end);
  if (b < a) b += 24 * 60;
  return (b - a) / 60;
};

/* ---------- Normalizer with identical finance logic ---------- */
const normalizeCourse = (raw) => {
  const title = raw.title || raw.name || "Untitled course";
  const students =
    typeof raw.students === "number"
      ? raw.students
      : Array.isArray(raw.enrolled)
      ? raw.enrolled.length
      : raw.studentsCount || 0;

  const start =
    raw.start_date || raw.startDate || raw.start || raw.begin || raw.range?.from;
  const end = raw.end_date || raw.endDate || raw.end || raw.range?.to;

  // Sessions & hours
  const sessions = Array.isArray(raw.courseDatesTimes) ? raw.courseDatesTimes : [];
  const totalSessions =
    typeof raw.totalSessions === "number" ? raw.totalSessions : sessions.length;

  const totalHoursBackend = Number.isFinite(raw?.totalHours) ? raw.totalHours : null;
  const totalHours =
    totalHoursBackend ??
    sessions.reduce((sum, s) => sum + diffHours(s.start_time, s.end_time), 0);

  // Revenue (exactly like CourseDetails): prefer explicit revenue; else (cost * students)
  const revenue = Number.isFinite(raw?.revenue)
    ? Number(raw.revenue)
    : (Number(raw.cost) || 0) * (Number(students) || 0);

  // Sum of hourly rates (object or Map), like CourseDetails
  const perHourSum = (() => {
    const ir = raw?.instructorRates;
    if (ir && typeof ir === "object") {
      const vals = ir instanceof Map ? Array.from(ir.values()) : Object.values(ir);
      return vals.reduce((acc, v) => acc + (Number.isFinite(+v) ? +v : 0), 0);
    }
    return 0;
  })();

  // Instructor expense (used for “Instructor Paid”): prefer explicit; else sum(rates) * totalHours
  const instructorExpense = Number.isFinite(raw?.instructorExpense)
    ? Number(raw.instructorExpense)
    : perHourSum * totalHours;

  // Materials (optional) and Profit (prefer explicit; else revenue - instructorExpense - materials)
  const materials = Number.isFinite(raw?.materialsCost) ? Number(raw.materialsCost) : 0;
  const profit = Number.isFinite(raw?.profit)
    ? Number(raw.profit)
    : revenue - instructorExpense - materials;

  return {
    id: raw._id || raw.id,
    title,
    students,
    start,
    end,
    startLabel: fmtDate(start),
    endLabel: fmtDate(end),
    imageUrl: raw.imageUrl,
    location: raw.location,

    // Finance (aligned with CourseDetails)
    revenue,
    instructorPaid: instructorExpense, // naming for the grid
    materials,
    profit,

    // Optionally useful if you show them later
    totalSessions,
    totalHours,
  };
};

const EmptyState = () => (
  <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
    <p className="text-gray-700 font-medium">No courses available yet.</p>
    <p className="text-gray-500 text-sm">Please add a course to get started.</p>
  </div>
);

const FinanceBadges = ({ c }) => (
  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-700">
    <span className="rounded-full bg-gray-100 px-2.5 py-1">
      Students: {c.students}
    </span>
    <span className="rounded-full bg-gray-100 px-2.5 py-1">
      {c.startLabel || "TBD"} {c.endLabel ? `– ${c.endLabel}` : ""}
    </span>
    {c.location && (
      <span className="rounded-full bg-gray-100 px-2.5 py-1">{c.location}</span>
    )}

    <span className="rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1">
      Revenue: {fmtBHD(c.revenue)}
    </span>
    <span
      className={`rounded-full px-2.5 py-1 ${
        c.profit >= 0 ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-700"
      }`}
    >
      Profit: {fmtBHD(c.profit)}
    </span>
    <span className="rounded-full bg-amber-50 text-amber-700 px-2.5 py-1">
      Instructor Paid: {fmtBHD(c.instructorPaid)}
    </span>
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

      <FinanceBadges c={c} />

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
    className="group grid grid-cols-1 md:grid-cols-[1.4fr,0.7fr,0.9fr,0.9fr,0.9fr,auto] gap-3 items-center rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-50 transition"
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
      <span className="md:hidden font-medium">Revenue: </span>
      {fmtBHD(c.revenue)}
    </div>
    <div className="text-sm text-gray-700">
      <span className="md:hidden font-medium">Profit: </span>
      {fmtBHD(c.profit)}
    </div>
    <div className="text-sm text-gray-700">
      <span className="md:hidden font-medium">Instructor Paid: </span>
      {fmtBHD(c.instructorPaid)}
    </div>
    <div className="text-sm text-gray-700">
      <span className="md:hidden font-medium">Start: </span>
      {c.startLabel || "TBD"}
    </div>
    {/* <div className="justify-self-end">
      <span className="text-sm font-medium text-blue-700 group-hover:underline">
        View
      </span>
    </div> */}
  </Link>
);

const CourseGrid = ({ hoots = [] }) => {
  const [view, setView] = useState("list"); // "grid" | "list"

  const courses = useMemo(() => {
    if (!Array.isArray(hoots)) return [];
    return hoots.map(normalizeCourse);
  }, [hoots]);

  const totals = useMemo(() => {
    return courses.reduce(
      (acc, c) => {
        acc.revenue += c.revenue || 0;
        acc.profit += c.profit || 0;
        return acc;
      },
      { revenue: 0, profit: 0 }
    );
  }, [courses]);

  return (
    <main className="p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Courses</h1>

        <div className="flex items-center gap-2">
          <Link to="/courses/new" className="inline-flex btn btn-primary" aria-label="Create new course">
            <Plus size={16} />
            New Course
          </Link>

          <button
            type="button"
            onClick={() => setView("list")}
            className={`inline-flex items-center btn btn-primary ${view === "grid" ? "btn-toggle-off" : "btn-toggle-on"}`}
            title="List view"
          >
            <List size={16} />
            List
          </button>
          <button
            type="button"
            onClick={() => setView("grid")}
            className={`inline-flex items-center btn btn-primary ${view === "grid" ? "btn-toggle-on" : "btn-toggle-off"}`}
            title="Grid view"
          >
            <Grid size={16} />
            Grid
          </button>
        </div>
      </div>

      {/* Summary bar (totals across all courses) */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-500">Total Revenue (All Courses)</div>
          <div className="mt-1 text-xl font-semibold text-gray-900">
            {fmtBHD(totals.revenue)}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-500">Total Profit (All Courses)</div>
          <div
            className={`mt-1 text-xl font-semibold ${
              totals.profit >= 0 ? "text-gray-900" : "text-rose-700"
            }`}
          >
            {fmtBHD(totals.profit)}
          </div>
        </div>
      </div>

      {/* Content */}
      {courses.length === 0 ? (
        <EmptyState />
      ) : view === "grid" ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {courses.map((c) => (
            <CourseCard key={c.id} c={c} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="hidden md:grid md:grid-cols-[1.4fr,0.7fr,0.9fr,0.9fr,0.9fr,auto] text-xs font-semibold text-gray-600 px-2">
            <div>Title</div>
            <div>Students</div>
            <div>Revenue</div>
            <div>Profit</div>
            <div>Instructor Paid</div>
            <div className="justify-self-end">Action</div>
          </div>
          {courses.map((c) => (
            <CourseRow key={c.id} c={c} />
          ))}
        </div>
      )}
    </main>
  );
};

export default CourseGrid;
