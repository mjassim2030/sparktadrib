import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import * as courseService from "../../services/courseService"; // expects show(id)
import * as instructorService from "../../services/instructorService";

// NEW: PDF libs
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PLATFORM_NAME = "MyApp"; // <— change to your platform/brand

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

const Stat = ({ label, value, hint }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-4">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="mt-1 text-xl font-semibold text-gray-900">{value}</div>
    {hint ? <div className="text-xs text-gray-500 mt-1">{hint}</div> : null}
  </div>
);

const CourseDetails = () => {
  const { id } = useParams();
  const [view, setView] = useState("list"); // "list" | "grid"
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [insLookup, setInsLookup] = useState({});
  // NEW: selected instructor for invoice
  const [selectedInstructorId, setSelectedInstructorId] = useState("");

  // get a stable instructor id whether item is string or object
  const insIdOf = (ins) =>
    typeof ins === "string" ? ins : String(ins?._id || ins?.id || "");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await courseService.show(id); // must return the course object
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

  // load instructor names for any ID-only items
  useEffect(() => {
    let alive = true;
    (async () => {
      const arr = Array.isArray(data?.instructors) ? data.instructors : [];
      if (!arr.length) { if (alive) setInsLookup({}); return; }
      try {
        const list = await instructorService.index(); // [{id,name,email}]
        // setInsLookup(Object.fromEntries(list.map(i => [String(i.id), i.name || i.email || i.id])));
        const map = Object.fromEntries(
          list.map((i) => [String(i.id), i.name || i.email || String(i.id)])
        );
        if (alive) setInsLookup(map);
      } catch (_) {
        // ignore; fallback will show IDs
      }
    })();
    return () => { alive = false; };
  }, [data?.instructors]);

  const computed = useMemo(() => {
    if (!data) return {};
    const sessions = Array.isArray(data.courseDatesTimes) ? data.courseDatesTimes : [];
    const totalSessions =
      typeof data.totalSessions === "number" ? data.totalSessions : sessions.length;

    const totalHoursBackend = Number.isFinite(data?.totalHours) ? data.totalHours : null;
    const totalHours =
      totalHoursBackend ??
      sessions.reduce((sum, s) => sum + diffHours(s.start_time, s.end_time), 0);

    const revenue =
      Number.isFinite(data?.revenue) ? data.revenue : (data.cost || 0) * (data.students || 0);

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
      Number.isFinite(data?.instructorExpense) ? data.instructorExpense : perHourSum * totalHours;

    const materials = Number.isFinite(data?.materialsCost) ? data.materialsCost : 0;
    const profit = Number.isFinite(data?.profit) ? data.profit : revenue - instructorExpense - materials;

    return { sessions, totalSessions, totalHours, revenue, instructorExpense, materials, profit };
  }, [data]);

  const instructors = useMemo(
    () => (Array.isArray(data?.instructors) ? data.instructors : []),
    [data]
  );

  const getRateFor = (instructorId) => {
    const ir = data?.instructorRates;
    if (!ir) return 0;
    if (ir instanceof Map) return Number(ir.get(instructorId)) || 0;
    if (typeof ir === "object") return Number(ir[instructorId]) || 0;
    return 0;
  };

  // NEW: Generate and open a printable invoice for the selected instructor
  const handlePrintInvoice = async () => {
    if (!selectedInstructorId) return;
    const id = String(selectedInstructorId);
    const ins = instructors.find((i) => insIdOf(i) === id);
    let instructorLabel = (ins && (ins.name || ins.email)) || insLookup[id] || "";

    if (!instructorLabel) {
      try {
        const one = await instructorService.show(id);
        instructorLabel = one?.name || one?.email || id;
      } catch { instructorLabel = id; }
    }

    const rate = getRateFor(selectedInstructorId) || 0;
    const hours = Number(computed.totalHours || 0);
    const amount = rate * hours;

    // Build rows per session (for transparency)
    const rows = (computed.sessions || []).map((s) => {
      const hrs = diffHours(s.start_time, s.end_time);
      const lineAmt = hrs * rate;
      return [fmtDate(s.date), s.start_time, s.end_time, hrs.toFixed(2), fmtBHD(lineAmt)];
    });

    const invoiceNo = `INV-${String(id).slice(-6).toUpperCase()}-${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "")}`;

    const doc = new jsPDF({ unit: "pt", format: "a4" });

    // Header (top-left)
    doc.setFontSize(16);
    doc.text(PLATFORM_NAME, 40, 40);

    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoiceNo}`, 40, 60);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 40, 75);

    // Instructor name
    doc.setFontSize(12);
    doc.text(`Instructor: ${instructorLabel}`, 40, 110);

    // Payment details table
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

    // Totals block (Rate, Hours, Total)
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

    // Open & trigger print
    doc.autoPrint();
    const blob = doc.output("blob");
    const url = doc.output("bloburl");
    const w = window.open(url, "_blank");
    if (!w) doc.save(`${invoiceNo}.pdf`);
  };

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
  const students =
    typeof data.students === "number"
      ? data.students
      : Array.isArray(data.enrolled)
        ? data.enrolled.length
        : 0;

  return (
    <main className="p-6 space-y-6">
      {/* Header / hero */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-700">
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
                <Users size={16} />
                {students} students
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

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${view === "list"
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              title="List view"
            >
              <ListIcon size={16} />
              List
            </button>
            <button
              type="button"
              onClick={() => setView("grid")}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${view === "grid"
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              title="Grid view"
            >
              <GridIcon size={16} />
              Grid
            </button>
          </div>
        </div>

        {data.description && (
          <div className="mt-4 flex items-start gap-2 text-gray-700">
            <FileText size={18} className="mt-0.5 text-gray-500" />
            <p className="max-w-3xl leading-relaxed">{data.description}</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Stat label="Sessions" value={computed.totalSessions ?? 0} />
        <Stat label="Total Hours" value={(computed.totalHours ?? 0).toFixed(2)} />
        <Stat
          label="Revenue"
          value={fmtBHD(computed.revenue ?? 0)}
          hint={`${fmtBHD(data.cost || 0)} × ${students}`}
        />
        <Stat
          label="Instructor Expense"
          value={fmtBHD(computed.instructorExpense ?? 0)}
          hint={
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> × total hours
            </span>
          }
        />
        <Stat
          label="Profit"
          value={fmtBHD(computed.profit ?? 0)}
          hint={
            <span className="inline-flex items-center gap-1">
              <DollarSign size={12} />
              Revenue − Expenses
            </span>
          }
        />
      </section>

      {/* Instructors */}
      {Array.isArray(data.instructors) && data.instructors.length > 0 && (
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Instructors & Rates</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-2 text-left">Instructor</th>
                  <th className="px-4 py-2 text-left">Hourly Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.instructors.map((ins, idx) => {
                  const id = insIdOf(ins);
                  const displayName = ins?.name || insLookup[id] || ins?.email || id || "—";
                  const rate =
                    (data.instructorRates &&
                      (data.instructorRates[id] ?? data.instructorRates?.get?.(id))) ?? "";
                  return (
                    <tr key={id || idx} className="border-t">
                      <td className="px-4 py-2">{displayName}</td>
                      <td className="px-4 py-2">{rate !== "" ? fmtBHD(Number(rate)) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Schedule */}
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Schedule</h2>
          <div className="text-sm text-gray-600">
            {computed.totalSessions ?? 0} session
            {(computed.totalSessions ?? 0) === 1 ? "" : "s"}
          </div>
        </div>

        {view === "list" ? (
          <div className="space-y-3">
            {(computed.sessions || []).map((s, idx) => (
              <div
                key={`${s.date}-${idx}`}
                className="grid grid-cols-1 md:grid-cols-[1.2fr,1fr,1fr] items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3"
              >
                <div className="text-gray-900 text-sm">
                  <span className="font-medium">Date: </span>
                  {fmtDate(s.date)}
                </div>
                <div className="text-gray-700 text-sm">
                  <span className="font-medium">Start: </span>
                  {s.start_time}
                </div>
                <div className="text-gray-700 text-sm">
                  <span className="font-medium">End: </span>
                  {s.end_time}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3">
            {(computed.sessions || []).map((s, idx) => (
              <div
                key={`${s.date}-${idx}`}
                className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm"
              >
                <div className="text-gray-900">{fmtDate(s.date)}</div>
                <div className="mt-1 text-gray-700">
                  {s.start_time} – {s.end_time}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Actions */}
      <section className="flex flex-col md:flex-row items-stretch md:items-center justify-end gap-3">
        {/* NEW: Instructor selector + Print Invoice */}
        {instructors.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={selectedInstructorId}
              onChange={(e) => setSelectedInstructorId(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-600"
              title="Choose instructor to print invoice"
            >

              <option value="">Select instructor…</option>
              {(Array.isArray(instructors) ? instructors : []).map((ins, i) => {
                const id =
                  typeof ins === "string" ? ins : String(ins?._id || ins?.id || "");
                const label =
                  ins?.name || insLookup[id] || ins?.email || id || `Instructor ${i + 1}`;
                return (
                  <option key={id} value={id}>
                    {label}
                  </option>
                );
              })}

            </select>

            <button
              type="button"
              disabled={!selectedInstructorId}
              onClick={handlePrintInvoice}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm ${selectedInstructorId
                ? "bg-white text-gray-800 border border-gray-300 hover:border-gray-400"
                : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                }`}
            >
              <Printer size={16} />
              Print Invoice (PDF)
            </button>
          </div>
        )}

        <Link
          to={`/courses/${id}/edit`}
          className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          <BadgeDollarSign size={16} />
          Edit Course
        </Link>
      </section>
    </main>
  );
};

export default CourseDetails;
