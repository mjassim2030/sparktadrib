// src/utils/exportSchedulePdf.js
import jsPDF from "jspdf";

/** Helpers */
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
      return {
        id: `${courseId || "c"}_${idx}_${dateKey}`,
        courseId,
        dateKey,
        title,
        location,
        startLabel: formatTimeLabel(start),
        endLabel: formatTimeLabel(end),
        startAt,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.startAt?.getTime?.() || 0) - (b.startAt?.getTime?.() || 0));
}

function startOfMonth(d) { const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; }
function endOfMonth(d)   { const x = startOfMonth(d); x.setMonth(x.getMonth()+1); x.setDate(0); return x; }
function startOfGrid(d)  { const first = startOfMonth(d); const offset = first.getDay(); const x = new Date(first); x.setDate(first.getDate() - offset); return x; }
function addDays(d, n)   { const x = new Date(d); x.setDate(x.getDate()+n); return x; }

/**
 * Export a month calendar PDF (landscape A4) with header "TADRIB — Instructor Name".
 * @param {Object} options
 * @param {Array}  options.courses - raw courses array (must include .courseDatesTimes)
 * @param {String} options.instructorName - e.g., "Ali Al Qaraan"
 * @param {Date}   [options.monthDate=new Date()] - month to render
 * @param {String} [options.brand="TADRIB"]
 */
export function exportSchedulePdf({
  courses = [],
  instructorName = "",
  monthDate = new Date(),
  brand = "TADRIB",
} = {}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const margin = 32; // pt
  const gridTop = margin + 60 + 24; // after header + month title
  const gridLeft = margin;
  const gridRight = pageW - margin;
  const gridBottom = pageH - margin;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(`${brand}`, margin, margin + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const rightHeader = `Instructor: ${instructorName || "—"}`;
  const rightW = doc.getTextWidth(rightHeader);
  doc.text(rightHeader, pageW - margin - rightW, margin + 20);

  // Month title (center)
  const monthTitle = new Date(monthDate).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const titleW = doc.getTextWidth(monthTitle);
  doc.text(monthTitle, (pageW - titleW) / 2, margin + 20);

  // Build sessionsByDate
  const sessionsByDate = new Map();
  for (const c of courses) {
    const rows = normalizeSessionsFromCourse(c);
    for (const s of rows) {
      if (!s.dateKey) continue;
      if (!sessionsByDate.has(s.dateKey)) sessionsByDate.set(s.dateKey, []);
      sessionsByDate.get(s.dateKey).push(s);
    }
  }
  for (const [k, list] of sessionsByDate.entries()) {
    list.sort((a, b) => (a.startAt?.getTime?.() || 0) - (b.startAt?.getTime?.() || 0));
  }

  // Calendar grid (7 x 6)
  const first = startOfMonth(monthDate);
  const last  = endOfMonth(monthDate);
  const start = startOfGrid(monthDate);

  const cols = 7;
  const rows = 6;
  const cellW = (gridRight - gridLeft) / cols;
  const cellH = (gridBottom - gridTop) / rows;

  // Weekday header row
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const weekdays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  weekdays.forEach((w, i) => {
    const x = gridLeft + i * cellW;
    doc.text(w, x + 6, gridTop - 8);
  });

  // Cells
  for (let r = 0; r < rows; r++) {
    for (let cIdx = 0; cIdx < cols; cIdx++) {
      const cellX = gridLeft + cIdx * cellW;
      const cellY = gridTop + r * cellH;
      const d = addDays(start, r * cols + cIdx);
      const key = toKey(d);
      const inMonth = d >= first && d <= last;

      // Cell rectangle
      doc.setDrawColor(220);
      doc.rect(cellX, cellY, cellW, cellH);

      // Day number
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(inMonth ? 30 : 150);
      doc.text(String(d.getDate()), cellX + 6, cellY + 14);

      // Events
      const events = sessionsByDate.get(key) || [];
      if (!events.length) continue;

      const maxTextWidth = cellW - 12; // padding
      let cursorY = cellY + 28;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(50);

      // show up to ~5 lines per cell
      let linesLeft = Math.max(3, Math.floor((cellH - 32) / 12)); // adaptive
      let printed = 0;

      for (const ev of events) {
        if (linesLeft <= 0) break;
        const line = `${ev.startLabel}–${ev.endLabel} · ${ev.title}`;
        const wrapped = doc.splitTextToSize(line, maxTextWidth);
        for (const wline of wrapped) {
          if (linesLeft <= 0) break;
          doc.text(wline, cellX + 6, cursorY);
          cursorY += 12;
          linesLeft--;
        }
        printed++;
      }

      const more = events.length - printed;
      if (more > 0 && linesLeft > 0) {
        doc.setTextColor(100);
        doc.text(`+${more} more…`, cellX + 6, cursorY);
      }
    }
  }

  const safeName = (instructorName || "instructor").replace(/[^\w.-]+/g, "_");
  const filename = `TADRIB_${safeName}_${monthTitle.replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}