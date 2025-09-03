// src/components/CourseDetails/CourseDetails.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  CalendarDays,
  MapPin,
  Users,
  BadgeDollarSign,
  Clock,
  DollarSign,
  FileText,
  ArrowLeft,
  Grid as GridIcon,
  List as ListIcon,
  Printer,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import * as courseService from "../../services/courseService";
import * as instructorService from "../../services/instructorService";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PLATFORM_NAME = "MyApp";

/* ---------------- API base (attendance endpoints) ---------------- */
const API_BASE =
  import.meta.env.VITE_BACK_END_SERVER_URL?.replace(/\/+$/, "") || "";

/* -------------------- Formatting helpers -------------------- */

const isSameDay = (d) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return false;
  const now = new Date();
  return (
    x.getFullYear() === now.getFullYear() &&
    x.getMonth() === now.getMonth() &&
    x.getDate() === now.getDate()
  );
};

const fmtBHD = (n) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "BHD",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

const fmtDate = (d) => {
  if (!d) return "";
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? "" : x.toLocaleDateString();
};

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

const pad2 = (n) => String(n).padStart(2, "0");
const keyOf = (d) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
};
const fmtTime = (hhmm) => {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map((v) => parseInt(v, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ---------------- Attendance I/O with LS fallback ---------------- */
const lsKey = (courseId) => `att:${courseId}`;

async function loadAttendance(courseId, token, signal) {
  try {
    const r = await fetch(`${API_BASE}/courses/${courseId}/attendance`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal,
    });
    if (r.ok) return r.json(); // { [instructorId]: string[] }
  } catch { }
  try {
    const raw = localStorage.getItem(lsKey(courseId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveAttendance(courseId, map, token) {
  try {
    const r = await fetch(`${API_BASE}/courses/${courseId}/attendance`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(map),
    });
    if (r.ok) return true;
  } catch { }
  try {
    localStorage.setItem(lsKey(courseId), JSON.stringify(map || {}));
    return true;
  } catch {
    return false;
  }
}

/* ---------------- Small stat card ---------------- */
const Stat = ({ label, value, hint, className = "" }) => (
  <div className={`small-cards ${className}`}>
    <div className="text-xs text-gray-500">{label}</div>
    <div className="mt-1 text-xl font-semibold text-gray-900">{value}</div>
    {hint ? <div className="text-xs text-gray-500 mt-1">{hint}</div> : null}
  </div>
);

const CourseDetails = () => {
  const { id } = useParams();
  const [view, setView] = useState("list");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [insLookup, setInsLookup] = useState({});

  // Attendance state: { [instructorId]: Set(sessionKey) }
  const [attendance, setAttendance] = useState({});
  const [expanded, setExpanded] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const skipNextSaveRef = useRef(true); // prevents saving right after initial hydration

  const insIdOf = (ins) =>
    typeof ins === "string" ? ins : String(ins?._id || ins?.id || "");

  /* ---------------- Load course ---------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await courseService.show(id);
        if (alive) setData(res);
      } catch (e) {
        if (alive) setErr(e?.message || "Failed to load course");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  /* ---------------- Load instructor names ---------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      const arr = Array.isArray(data?.instructors) ? data.instructors : [];
      if (!arr.length) {
        if (alive) setInsLookup({});
        return;
      }
      try {
        const list = await instructorService.index();
        const map = Object.fromEntries(
          list.map((i) => [String(i.id), i.name || i.email || String(i.id)])
        );
        if (alive) setInsLookup(map);
      } catch { }
    })();
    return () => {
      alive = false;
    };
  }, [data?.instructors]);

  /* ---------------- Computed metrics (with discount) ---------------- */
  const getRateFor = (instructorId) => {
    const ir = data?.instructorRates;
    if (!ir) return 0;
    if (ir instanceof Map) return Number(ir.get(instructorId)) || 0;
    if (typeof ir === "object") return Number(ir[instructorId]) || 0;
    return 0;
  };

  const computed = useMemo(() => {
    if (!data) return {};

    // Sessions / hours
    const sessions = Array.isArray(data.courseDatesTimes) ? data.courseDatesTimes : [];
    const totalSessions =
      typeof data.totalSessions === "number" ? data.totalSessions : sessions.length;

    const totalHoursBackend = Number.isFinite(data?.totalHours) ? data.totalHours : null;
    const totalHours =
      totalHoursBackend ??
      sessions.reduce((sum, s) => sum + diffHours(s.start_time, s.end_time), 0);

    // Students (prefer numeric field; fallback to enrolled length)
    const studentsCount = Number.isFinite(data?.students)
      ? data.students
      : Array.isArray(data?.enrolled)
        ? data.enrolled.length
        : 0;

    // Gross revenue
    const grossRevenue =
      Number.isFinite(data?.revenue) && data.revenue >= 0
        ? data.revenue
        : (Number(data?.cost) || 0) * studentsCount;

    // Discount normalization (supports legacy discountPct)
    const type = data?.discountType === "amount" ? "amount" : "percent";
    const legacyPct = Number.isFinite(Number(data?.discountPct))
      ? Number(data.discountPct)
      : null;

    let rawValue =
      data?.discountValue != null && data.discountValue !== ""
        ? Number(data.discountValue)
        : legacyPct; // if legacy present, treat as percent

    rawValue = Number.isFinite(rawValue) ? rawValue : 0;

    const discountAmount =
      type === "amount"
        ? clamp(rawValue, 0, grossRevenue)
        : (grossRevenue * clamp(rawValue, 0, 100)) / 100;

    const netRevenue = Math.max(0, grossRevenue - discountAmount);

    // Instructor expense (prefer backend virtual; else compute)
    const perHourSum = (() => {
      if (data?.instructorRates && typeof data.instructorRates === "object") {
        const vals =
          data.instructorRates instanceof Map
            ? Array.from(data.instructorRates.values())
            : Object.values(data.instructorRates);
        return vals.reduce((sum, v) => sum + (Number.isFinite(+v) ? +v : 0), 0);
      }
      return 0;
    })();

    const instructorExpense =
      Number.isFinite(data?.instructorExpense) && data.instructorExpense >= 0
        ? data.instructorExpense
        : perHourSum * totalHours;

    const materials = Number.isFinite(data?.materialsCost) ? data.materialsCost : 0;

    const totalExpense = instructorExpense + materials

    // Profit should be based on NET revenue after discount
    const profit = netRevenue - instructorExpense - materials;

    return {
      sessions,
      totalSessions,
      totalHours,
      studentsCount,
      grossRevenue,
      discountAmount,
      netRevenue,
      instructorExpense,
      materials,
      totalExpense,
      profit,
      discountType: type,
      discountValue: rawValue,
      cost: Number(data?.cost) || 0,
    };
  }, [data]);

  const instructors = useMemo(
    () => (Array.isArray(data?.instructors) ? data.instructors : []),
    [data]
  );

  const weekday = (d) => {
    const x = new Date(d);
    return Number.isNaN(x.getTime())
      ? ""
      : x.toLocaleDateString(undefined, { weekday: "short" });
  };

  /* ---------------- Session keys for attendance ---------------- */
  const sessionKeys = useMemo(() => {
    const list = Array.isArray(computed.sessions) ? computed.sessions : [];
    return list.map((s, idx) => {
      const key = keyOf(s?.date) || `idx-${idx}`;
      return {
        key,
        idx,
        dateLabel: `${weekday(s?.date)}, ${fmtDate(s?.date)}`,
        timeLabel: `${fmtTime(s?.start_time)} – ${fmtTime(s?.end_time)}`,
      };
    });
  }, [computed.sessions]);

  // Hours per session, keyed by stable session key
  const sessionHoursByKey = useMemo(() => {
    const out = {};
    const list = Array.isArray(computed.sessions) ? computed.sessions : [];
    list.forEach((s, idx) => {
      const key = keyOf(s?.date) || `idx-${idx}`;
      out[key] = diffHours(s?.start_time, s?.end_time);
    });
    return out;
  }, [computed.sessions]);

  const attendedHoursFor = (insId) => {
    const set = attendance[insId];
    if (!set) return 0;
    let sum = 0;
    set.forEach((k) => {
      sum += Number(sessionHoursByKey[k] || 0);
    });
    return sum;
  };

  const payFor = (insId) => {
    const rate = getRateFor(insId) || 0;
    const hours = attendedHoursFor(insId);
    return { rate, hours, amount: rate * hours };
  };

  /* ---------------- Hydrate attendance ---------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!data?._id) return;
      const token = localStorage.getItem("token") || "";
      const map = await loadAttendance(data._id, token).catch(() => ({}));
      if (!alive) return;
      const sets = Object.fromEntries(
        Object.entries(map || {}).map(([insId, arr]) => [insId, new Set(arr || [])])
      );
      // Skip saving right after initial load
      skipNextSaveRef.current = true;
      setAttendance(sets);
    })();
    return () => {
      alive = false;
    };
  }, [data?._id]);

  /* ---------------- Auto-save on any change ---------------- */
  useEffect(() => {
    if (!data?._id) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    let cancelled = false;

    (async () => {
      setSaving(true);
      setSaveMsg("");
      const token = localStorage.getItem("token") || "";
      const payload = Object.fromEntries(
        Object.entries(attendance).map(([k, v]) => [k, Array.from(v || [])])
      );
      const ok = await saveAttendance(data._id, payload, token);
      if (cancelled) return;
      setSaving(false);
      setSaveMsg(ok ? "Saved" : "Failed to save");
      setTimeout(() => {
        if (!cancelled) setSaveMsg("");
      }, 1500);
    })();

    return () => {
      cancelled = true;
    };
  }, [attendance, data?._id]);

  /* ---------------- Print invoice (per instructor) ---------------- */
  const handlePrintInvoice = async (instructorId) => {
    const idd = String(instructorId);
    const ins = instructors.find((i) => insIdOf(i) === idd);
    let instructorLabel = (ins && (ins.name || ins.email)) || insLookup[idd] || idd;

    const rate = getRateFor(idd) || 0;
    // Only attended sessions:
    const presentKeys = attendance[idd] ? Array.from(attendance[idd]) : [];

    const rows = (computed.sessions || [])
      .map((s, idx) => {
        const k = keyOf(s?.date) || `idx-${idx}`;
        if (!presentKeys.includes(k)) return null;
        const hrs = diffHours(s.start_time, s.end_time);
        const amt = hrs * rate;
        return [fmtDate(s.date), s.start_time, s.end_time, hrs.toFixed(2), fmtBHD(amt)];
      })
      .filter(Boolean);

    const hours = presentKeys.reduce((sum, k) => sum + (sessionHoursByKey[k] || 0), 0);
    const amount = rate * hours;

    const invoiceNo = `INV-${String(idd).slice(-6).toUpperCase()}-${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "")}`;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(16);
    doc.text(PLATFORM_NAME, 40, 40);
    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoiceNo}`, 40, 60);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 40, 75);
    doc.setFontSize(12);
    doc.text(`Instructor: ${instructorLabel}`, 40, 110);
    const startY = 130;
    autoTable(doc, {
      head: [["Date", "Start", "End", "Hours", "Line Amount"]],
      body: rows,
      startY,
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [245, 245, 245] },
      theme: "grid",
    });
    const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || startY;
    autoTable(doc, {
      body: [
        ["Rate (per hour)", fmtBHD(rate)],
        ["Total Hours", hours.toFixed(2)],
        ["Total to Pay", fmtBHD(amount)],
      ],
      startY: finalY + 18,
      styles: { fontSize: 11, cellPadding: 4 },
      columnStyles: { 0: { cellWidth: 200 }, 1: { halign: "right" } },
      theme: "plain",
    });
    doc.autoPrint();
    const url = doc.output("bloburl");
    const w = window.open(url, "_blank");
    if (!w) doc.save(`${invoiceNo}.pdf`);
  };

  /* ---------------- Attendance interactions ---------------- */
  const toggleExpand = (insId) =>
    setExpanded((s) => ({ ...s, [insId]: !s[insId] }));

  const markAll = (insId) => {
    const keys = sessionKeys.map((k) => k.key);
    setAttendance((prev) => ({ ...prev, [insId]: new Set(keys) }));
  };

  const clearAll = (insId) => {
    setAttendance((prev) => ({ ...prev, [insId]: new Set() }));
  };

  const toggleOne = (insId, key) => {
    setAttendance((prev) => {
      const curr = new Set(prev[insId] || []);
      if (curr.has(key)) curr.delete(key);
      else curr.add(key);
      return { ...prev, [insId]: curr };
    });
  };

  const presentCount = (insId) => attendance[insId]?.size || 0;

  /* ---------------- Render ---------------- */
  if (loading) {
    return (
      <main className="p-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          Loading course…
        </div>
      </main>
    );
  }
  if (err || !data) {
    return (
      <main className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {err || "Course not found."}
        </div>
      </main>
    );
  }

  const title = data.title || "Untitled Course";
  const start = fmtDate(data.start_date || data.startDate);
  const end = fmtDate(data.end_date || data.endDate);

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl p-6 headers">
        {/* Top bar: Back (left) — Edit (right) */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/courses"
            className="inline-flex items-center border btn btn-primary"
          >
            <ArrowLeft size={16} />
            Back
          </Link>

          <Link
            to={`/courses/${id}/edit`}
            className="inline-flex items-center btn btn-primary"
          >
            <BadgeDollarSign size={16} />
            Edit Course
          </Link>
        </div>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="drop-shadow text-2xl md:text-3xl font-bold text-gray-700">{title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-700">
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
                <Users size={16} />
                {computed.studentsCount} students
              </span>
              {(data.start_date || data.end_date) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
                  <CalendarDays size={16} />
                  {start || "TBD"} {end ? `– ${end}` : ""}
                </span>
              )}
              {data.location && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
                  <MapPin size={16} />
                  {data.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {data.description && (
          <div className="mt-4 flex items-start gap-2 text-gray-700">
            <FileText size={18} className="mt-0.5 text-gray-500" />
            <p className="max-w-3xl leading-relaxed">{data.description}</p>
          </div>
        )}
      </div>

      {/* Stats (now includes discount + net revenue) */}
      <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Stat label="Sessions" value={computed.totalSessions ?? 0} />
        <Stat label="Total Hours" value={(computed.totalHours ?? 0).toFixed(2)} />
        {/* <Stat
          label="Revenue (Gross)"
          value={fmtBHD(computed.grossRevenue ?? 0)}
          hint={`${fmtBHD(computed.cost)} × ${computed.studentsCount}`}
        /> */}
        {/* <Stat
          label="Discount from Revenue"
          value={fmtBHD(computed.discountAmount ?? 0)}
          hint={
            computed.discountType === "percent"
              ? `${clamp(Number(computed.discountValue) || 0, 0, 100).toFixed(2)}%`
              : "Fixed amount"
          }
        /> */}
        <Stat
          label="Revenue (Net)"
          value={fmtBHD(computed.netRevenue ?? 0)}
          hint="Gross − Discount"
        />
        <Stat
          label="Expense"
          value={fmtBHD(computed.totalExpense ?? 0)}
          hint={
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> × total hours + Materials Cost
            </span>
          }
        />
        <Stat
          label="Profit"
          value={fmtBHD(computed.profit ?? 0)}
          hint="Net Revenue − Expenses"
          className={`mt-1 text-2xl font-semibold px-3 py-2 rounded-lg ${(computed.profit ?? 0) < 0
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
            }`}
        />

      </section>

      {/* Schedule (card layout) */}
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg border border-green-700/30">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Schedule</h2>

          <div className="grid grid-cols-1 md:grid-cols-[1.5fr,auto,auto] gap-3 items-center p-4">
            <div className="text-sm text-gray-600">
              {computed.totalSessions ?? 0} session{(computed.totalSessions ?? 0) === 1 ? "" : "s"}
            </div>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`inline-flex items-center btn btn-primary ${view === "list" ? "btn-toggle-on" : "btn-toggle-off"
                }`}
              title="List view"
            >
              <ListIcon size={16} />
              List
            </button>
            <button
              type="button"
              onClick={() => setView("grid")}
              className={`inline-flex items-center btn btn-primary ${view === "list" ? "btn-toggle-off" : "btn-toggle-on"
                }`}
              title="Grid view"
            >
              <GridIcon size={16} />
              Grid
            </button>
          </div>
        </div>

        {/* List = tall cards stacked; Grid = compact cards in columns */}
        {view === "list" ? (
          <div className="space-y-3">
            {(computed.sessions || []).map((s, idx) => {
              const today = isSameDay(s.date);
              const hrs = diffHours(s.start_time, s.end_time);
              return (
                <div
                  key={`${s.date}-${idx}`}
                  className={`rounded-2xl border p-4 shadow-sm transition ${today
                    ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200"
                    : "border-gray-200 bg-white hover:shadow-md"
                    }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {today ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/10 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          ● Today
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {new Date(s.date).toLocaleDateString(undefined, { weekday: "short" })}
                        </span>
                      )}
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900">{fmtDate(s.date)}</div>
                        <div className="text-gray-600">
                          {s.start_time} – {s.end_time}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700">
                      <span className="rounded-lg bg-gray-100 px-2.5 py-1">
                        {hrs.toFixed(2)} h
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {(computed.sessions || []).map((s, idx) => {
              const today = isSameDay(s.date);
              const hrs = diffHours(s.start_time, s.end_time);
              return (
                <div
                  key={`${s.date}-${idx}`}
                  className={`rounded-2xl border p-3 text-sm transition ${today
                    ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200"
                    : "border-gray-200 bg-white hover:shadow-md"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900">{fmtDate(s.date)}</div>
                    {today ? (
                      <span className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Today
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        {new Date(s.date).toLocaleDateString(undefined, { weekday: "short" })}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-gray-700">
                    {s.start_time} – {s.end_time}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">{hrs.toFixed(2)} h</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ============ Instructor Attendance (auto-save) ============ */}
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg border border-green-700/30">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Instructor Attendance</h2>
          <div className="text-sm">
            {saving ? (
              <span className="text-gray-500">Saving…</span>
            ) : saveMsg ? (
              <span className="inline-flex items-center gap-1 text-green-700">
                <CheckCircle2 size={16} /> {saveMsg}
              </span>
            ) : null}
          </div>
        </div>

        {instructors.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-700 text-sm">
            No instructors assigned to this course.
          </div>
        ) : (computed.sessions || []).length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-700 text-sm">
            No scheduled days yet.
          </div>
        ) : (
          <div className="space-y-3">
            {instructors.map((ins, idx) => {
              const insId = insIdOf(ins);
              const name = ins?.name || insLookup[insId] || ins?.email || `Instructor ${idx + 1}`;
              const present = presentCount(insId);
              const total = sessionKeys.length;
              const open = !!expanded[insId];

              const { amount, hours, rate } = payFor(insId);

              return (
                <div key={insId} className="rounded-2xl border border-gray-200">
                  {/* Row header */}
                  <div className="grid grid-cols-1 md:grid-cols-[1.5fr,auto,auto] gap-3 items-center p-4">
                    <button
                      type="button"
                      onClick={() => toggleExpand(insId)}
                      className="inline-flex items-center gap-2 text-left"
                      title="Expand/collapse"
                    >
                      {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <span className="font-semibold text-gray-900">{name}</span>
                      {/* Live pay chip (attended hours × rate) */}
                      <span
                        className="ml-2 inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700"
                        title={`${hours.toFixed(2)}h @ ${fmtBHD(rate)}/h`}
                      >
                        {fmtBHD(amount)}
                      </span>
                    </button>

                    <div className="text-sm text-gray-700">
                      {present} / {total} days attended
                    </div>

                    <div className="justify-self-end flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => markAll(insId)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 hover:border-gray-400"
                        title="Mark all days as attended"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={() => clearAll(insId)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 hover:border-gray-400"
                        title="Clear all"
                      >
                        Clear
                      </button>
                      {/* Print invoice per instructor */}
                      <button
                        type="button"
                        onClick={() => handlePrintInvoice(insId)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 hover:border-gray-400 inline-flex items-center gap-2"
                        title="Print invoice for attended hours"
                      >
                        <Printer size={16} />
                        <span className="hidden sm:inline">Invoice</span>
                      </button>
                    </div>
                  </div>

                  {/* Slide-down list of days */}
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                  >
                    <div className="overflow-hidden">
                      <div className="border-t border-gray-100 p-4">
                        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                          {sessionKeys.map(({ key, dateLabel, timeLabel }) => {
                            const checked = attendance[insId]?.has(key) || false;
                            return (
                              <label
                                key={`${insId}-${key}`}
                                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:bg-gray-50"
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4"
                                  checked={checked}
                                  onChange={() => toggleOne(insId, key)}
                                />
                                <div className="text-sm">
                                  <div className="font-medium text-gray-900">{dateLabel}</div>
                                  <div className="text-gray-600">{timeLabel}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      {/* ================== End Attendance ================== */}
    </main>
  );
};

export default CourseDetails;