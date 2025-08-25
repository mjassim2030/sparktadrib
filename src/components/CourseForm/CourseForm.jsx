import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router"; // keep as in your project; switch to 'react-router-dom' if needed
import * as courseService from "../../services/courseService";
import * as instructorService from "../../services/instructorService";
import { List, Grid } from "lucide-react";
import LocationInput from "../Location/LocationInput";

/* PDF export */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* --------------------------------- Config --------------------------------- */
// ---- Arabic support helpers (jsPDF + AutoTable) ----

// Put the TTF file in: public/fonts/NotoNaskhArabic-Regular.ttf
async function ensureArabicFont(doc, lang = "en") {
  if (lang !== "ar") return;
  try {
    const res = await fetch("/fonts/NotoNaskhArabic-Regular.ttf");
    if (!res.ok) throw new Error("Font fetch failed");
    const blob = await res.blob();
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const fontName = "NotoNaskhArabic";
    const fontFile = "NotoNaskhArabic-Regular.ttf";
    doc.addFileToVFS(fontFile, base64);
    doc.addFont(fontFile, fontName, "normal");
    doc.setFont(fontName, "normal");
  } catch (e) {
    // Fallback silently; Arabic text may not render if font missing
    console.warn("Arabic font not loaded:", e);
  }
}

const L = (lang = "en") => {
  const ar = {
    quotation: "عرض سعر",
    detailedTitle: "تفاصيل العرض",
    course: "الدورة",
    location: "الموقع",
    dates: "التواريخ",
    sessionsAndHours: (s, h) => `الجلسات: ${s} | إجمالي الساعات: ${h}`,
    headItem: "البند",
    headDetails: "التفاصيل",
    headAmount: "المبلغ",
    feePerStudent: "رسوم الدورة (للطالب)",
    students: "الطلاب",
    revenueGross: "الإيراد (الإجمالي)",
    discountPercent: "الخصم ٪ (من الإيراد)",
    discountFixed: "الخصم (مبلغ ثابت)",
    discountAmount: "قيمة الخصم",
    revenueNet: "الإيراد (الصافي)",
    instructorExpense: "تكلفة المدربين",
    materialsCost: "تكلفة المواد",
    estimatedProfit: "الربح التقديري",
    courseLabel: "الدورة:",
    quotationAmount: "قيمة العرض",
  };
  const en = {
    quotation: "Quotation",
    detailedTitle: "Course Quotation",
    course: "Course",
    location: "Location",
    dates: "Dates",
    sessionsAndHours: (s, h) => `Sessions: ${s} | Total Hours: ${h}`,
    headItem: "Item",
    headDetails: "Details",
    headAmount: "Amount",
    feePerStudent: "Course Fee (/Student)",
    students: "Students",
    revenueGross: "Revenue (Gross)",
    discountPercent: "Discount % (of Revenue)",
    discountFixed: "Discount (Fixed Amount)",
    discountAmount: "Discount Amount",
    revenueNet: "Revenue (Net)",
    instructorExpense: "Instructor Expense",
    materialsCost: "Materials Cost",
    estimatedProfit: "Estimated Profit",
    courseLabel: "Course:",
    quotationAmount: "Quotation Amount",
  };
  return lang === "ar" ? ar : en;
};

const numFmt = (lang = "en", opts = {}) =>
  new Intl.NumberFormat(lang === "ar" ? "ar" : undefined, opts);

// x helpers for LTR/RTL text anchoring
const xPos = (doc, lang, margin = 14) =>
  lang === "ar" ? doc.internal.pageSize.getWidth() - margin : margin;
const align = (lang) => (lang === "ar" ? "right" : "left");

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const initialFormData = {
  title: "",
  description: "",
  location: "",
  location_lat: null,
  location_lon: null,
  location_place_id: "",
  start_date: "",
  end_date: "",
  courseDatesTimes: [],
  range_start_time: "16:00",
  range_end_time: "18:00",
  daysOfWeek: [],
  instructors: [],
  cost: "",
  students: "",
  materialsCost: "",
  instructorRates: {},

  // Discount (floats for both % and amount)
  discountType: "percent", // "percent" | "amount"
  discountValue: "",       // string for controlled input; parsed to float
};

/* ------------------------------- Utilities -------------------------------- */
const toDateOnly = (v) => {
  if (!v) return "";
  const s = String(v);
  if (v instanceof Date) return isNaN(v) ? "" : v.toISOString().slice(0, 10);
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") return s.slice(0, 10);
  try {
    const d = new Date(s);
    return isNaN(d) ? "" : d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

const toHHMM = (v, fallback = "00:00") => {
  if (!v && v !== 0) return fallback;
  const s = String(v);
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m) {
    const hh = m[1].padStart(2, "0");
    const mm = m[2];
    return `${hh}:${mm}`;
  }
  const asNum = Number(s);
  if (Number.isFinite(asNum)) {
    const hh = Math.floor(asNum / 60).toString().padStart(2, "0");
    const mm = Math.floor(asNum % 60).toString().padStart(2, "0");
    return `${hh}:${mm}`;
  }
  return fallback;
};

const diffHours = (startHHMM, endHHMM) => {
  if (!startHHMM || !endHHMM) return 0;
  const [sh, sm] = startHHMM.split(":").map((x) => parseInt(x, 10));
  const [eh, em] = endHHMM.split(":").map((x) => parseInt(x, 10));
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  let start = sh * 60 + sm;
  let end = eh * 60 + em;
  if (end < start) end += 24 * 60;
  return (end - start) / 60;
};

const toNumber = (v) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ------------------------------- CourseForm ------------------------------- */
const CourseForm = (props) => {
  const { hootId, courseId, id } = useParams();
  const recordId = hootId || courseId || id;

  // UI state
  const [view, setView] = useState("list");
  const [daysOpen, setDaysOpen] = useState(false);
  const [instructorsOpen, setInstructorsOpen] = useState(false);

  // Data state
  const [formData, setFormData] = useState(initialFormData);

  // Flags
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseErr, setCourseErr] = useState("");
  const [skipNextGen, setSkipNextGen] = useState(false);

  // Instructors from DB
  const [instructors, setInstructors] = useState([]); // [{id, name, email}]
  const [insLoading, setInsLoading] = useState(true);
  const [insErr, setInsErr] = useState("");

  // Refs
  const daysRef = useRef(null);
  const instructorsRef = useRef(null);

  /* ----------------------------- Fetch (Edit) ----------------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!recordId) return;
      try {
        setCourseLoading(true);
        setCourseErr("");
        const raw = await courseService.show(recordId);
        if (!alive) return;

        const normalized = {
          ...initialFormData,
          ...raw,
          title: raw?.title ?? "",
          description: raw?.description ?? "",
          location: raw?.location ?? "",
          start_date: toDateOnly(raw?.start_date),
          end_date: toDateOnly(raw?.end_date),
          range_start_time: toHHMM(raw?.range_start_time ?? "16:00", "16:00"),
          range_end_time: toHHMM(raw?.range_end_time ?? "18:00", "18:00"),
          daysOfWeek: Array.isArray(raw?.daysOfWeek) ? [...raw.daysOfWeek].sort((a, b) => a - b) : [],
          courseDatesTimes: Array.isArray(raw?.courseDatesTimes)
            ? raw.courseDatesTimes
              .map((x) => ({
                date: toDateOnly(x?.date),
                start_time: toHHMM(x?.start_time, "16:00"),
                end_time: toHHMM(x?.end_time, "18:00"),
              }))
              .filter((x) => x.date)
              .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
            : [],
          instructors: (raw?.instructors || []).map((x) =>
            typeof x === "string" ? x : String(x?._id || x?.id)
          ),
          cost: raw?.cost ?? "",
          students: raw?.students ?? "",
          materialsCost: raw?.materialsCost ?? "",
          instructorRates: raw?.instructorRates || {},

          discountType: raw?.discountType === "amount" ? "amount" : "percent",
          discountValue:
            raw?.discountValue != null && raw.discountValue !== ""
              ? String(raw.discountValue)
              : "",
        };

        setSkipNextGen(true);
        setFormData(normalized);
      } catch (e) {
        if (alive) setCourseErr(e?.message || "Failed to load course");
      } finally {
        if (alive) setCourseLoading(false);
      }
    })();
    return () => {
      alive = false;
      setFormData(initialFormData);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  /* -------------------------- Fetch Instructors DB ------------------------ */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setInsLoading(true);
        setInsErr("");
        const list = await instructorService.index();
        const normalized = (list || []).map((i) => ({
          id: String(i.id ?? i._id),
          name: i.name || i.email || String(i.id ?? i._id),
          email: i.email || "",
        }));

        if (!alive) return;

        const selectedIds = new Set((formData.instructors || []).map(String));
        const knownIds = new Set(normalized.map((i) => i.id));
        const missing = [...selectedIds].filter((id) => !knownIds.has(id));

        setInstructors([
          ...normalized,
          ...missing.map((id) => ({ id, name: `(archived) ${id}`, email: "" })),
        ]);
      } catch (e) {
        if (alive) setInsErr(e?.message || "Failed to load instructors");
      } finally {
        if (alive) setInsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId, formData.instructors.length]);

  /* ------------------------ Close popovers on click ----------------------- */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (daysRef.current && !daysRef.current.contains(e.target)) setDaysOpen(false);
      if (instructorsRef.current && !instructorsRef.current.contains(e.target))
        setInstructorsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* -------------------------------- Handlers ------------------------------ */
  const handleChange = (evt) => {
    const { name, value } = evt.target;
    setFormData((s) => ({ ...s, [name]: value }));
  };

  const handleCheckboxChangeDay = (idx, checked) => {
    setFormData((s) => {
      const updated = new Set(s.daysOfWeek || []);
      checked ? updated.add(idx) : updated.delete(idx);
      return { ...s, daysOfWeek: [...updated].sort((a, b) => a - b) };
    });
  };

  const toggleInstructor = (id) => {
    const key = String(id);
    setFormData((s) => {
      const set = new Set((s.instructors || []).map(String));
      if (set.has(key)) {
        set.delete(key);
        const { [key]: _omit, ...restRates } = s.instructorRates || {};
        return { ...s, instructors: [...set], instructorRates: restRates };
      } else {
        set.add(key);
        return {
          ...s,
          instructors: [...set],
          instructorRates: { ...(s.instructorRates || {}), [key]: s.instructorRates?.[key] ?? "" },
        };
      }
    });
  };

  const setInstructorRate = (id, value) => {
    const key = String(id);
    setFormData((s) => ({
      ...s,
      instructorRates: { ...(s.instructorRates || {}), [key]: value },
    }));
  };

  const removeItem = (idx) => {
    setFormData((s) => {
      const updated = [...(s.courseDatesTimes || [])];
      updated.splice(idx, 1);
      return { ...s, courseDatesTimes: updated };
    });
  };

  /* ------------------------- Generate Dates & Times ----------------------- */
  const regenerateCourseDatesTimes = () => {
    const { start_date, end_date, daysOfWeek, range_start_time, range_end_time } = formData;
    if (!start_date || !end_date || !Array.isArray(daysOfWeek) || daysOfWeek.length === 0) return;

    const start = new Date(start_date);
    const end = new Date(end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return;

    const dates = [];
    const d = new Date(start);
    while (d <= end) {
      if (daysOfWeek.includes(d.getDay())) {
        dates.push({
          date: d.toISOString().slice(0, 10),
          start_time: toHHMM(range_start_time || "16:00", "16:00"),
          end_time: toHHMM(range_end_time || "18:00", "18:00"),
        });
      }
      d.setDate(d.getDate() + 1);
    }
    setFormData((s) => ({ ...s, courseDatesTimes: dates }));
  };

  useEffect(() => {
    if (skipNextGen) {
      setSkipNextGen(false);
      return;
    }
    regenerateCourseDatesTimes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.start_date,
    formData.end_date,
    formData.daysOfWeek,
    formData.range_start_time,
    formData.range_end_time,
  ]);

  /* ------------------------------ Calculations ---------------------------- */
  const totalSessions = useMemo(
    () => (formData.courseDatesTimes || []).length,
    [formData.courseDatesTimes]
  );

  const totalHours = useMemo(
    () =>
      (formData.courseDatesTimes || []).reduce(
        (sum, dt) => sum + diffHours(dt.start_time, dt.end_time),
        0
      ),
    [formData.courseDatesTimes]
  );

  const grossRevenue = useMemo(
    () => toNumber(formData.cost) * toNumber(formData.students),
    [formData.cost, formData.students]
  );

  const discountValNum = useMemo(
    () => toNumber(formData.discountValue),
    [formData.discountValue]
  );

  const discountAmount = useMemo(() => {
    if (formData.discountType === "percent") {
      const pct = clamp(discountValNum, 0, 100);
      return (grossRevenue * pct) / 100;
    }
    return clamp(discountValNum, 0, grossRevenue);
  }, [formData.discountType, discountValNum, grossRevenue]);

  const netRevenue = useMemo(
    () => Math.max(0, grossRevenue - discountAmount),
    [grossRevenue, discountAmount]
  );

  const instructorExpense = useMemo(() => {
    const perHourSum = (formData.instructors || []).reduce(
      (sum, id) => sum + toNumber(formData.instructorRates?.[id]),
      0
    );
    return perHourSum * totalHours;
  }, [formData.instructors, formData.instructorRates, totalHours]);

  const profit = useMemo(
    () => netRevenue - instructorExpense - toNumber(formData.materialsCost),
    [netRevenue, instructorExpense, formData.materialsCost]
  );

  const fmtNum = (n) =>
    new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n || 0);

  /* ------------------------- Export (Detailed) ----------------------------- */
  const handleExportQuote = async (lang = "en") => {
    const doc = new jsPDF();
    await ensureArabicFont(doc, lang);

    const labels = L(lang);
    const nf = numFmt(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const cf = numFmt(lang, { style: "currency", currency: "BHD", minimumFractionDigits: 2 });
    const x = xPos(doc, lang);

    const title = (formData.title || labels.detailedTitle).trim();

    doc.setFontSize(16);
    doc.text(title, x, 16, { align: align(lang) });

    doc.setFontSize(11);
    doc.text(
      `${labels.location}: ${formData.location || "-"}`,
      x,
      24,
      { align: align(lang) }
    );
    doc.text(
      `${labels.dates}: ${formData.start_date || "-"} - ${formData.end_date || "-"}`,
      x,
      30,
      { align: align(lang) }
    );
    doc.text(
      labels.sessionsAndHours(
        (formData.courseDatesTimes || []).length,
        nf.format(
          (formData.courseDatesTimes || []).reduce(
            (sum, dt) => sum + diffHours(dt.start_time, dt.end_time),
            0
          )
        )
      ),
      x,
      36,
      { align: align(lang) }
    );

    const discountLabel =
      formData.discountType === "percent" ? labels.discountPercent : labels.discountFixed;

    const discountValueDisplay =
      formData.discountType === "percent"
        ? `${nf.format(Math.min(100, Math.max(0, parseFloat(formData.discountValue || "0"))))} %`
        : `${cf.format(parseFloat(formData.discountValue || "0"))}`;

    autoTable(doc, {
      startY: 44,
      head: [[labels.headItem, labels.headDetails]],
      body: [
        [labels.feePerStudent, nf.format(parseFloat(formData.cost || 0))],
        [labels.students, String(parseInt(formData.students || 0, 10))],
        [labels.revenueGross, cf.format((parseFloat(formData.cost || 0) || 0) * (parseFloat(formData.students || 0) || 0))],
        [discountLabel, discountValueDisplay],
        [labels.discountAmount, cf.format((() => {
          const gross = (parseFloat(formData.cost || 0) || 0) * (parseFloat(formData.students || 0) || 0);
          const v = parseFloat(formData.discountValue || 0) || 0;
          return formData.discountType === "percent"
            ? gross * Math.min(100, Math.max(0, v)) / 100
            : Math.min(gross, Math.max(0, v));
        })())],
        [labels.revenueNet, cf.format((() => {
          const gross = (parseFloat(formData.cost || 0) || 0) * (parseFloat(formData.students || 0) || 0);
          const v = parseFloat(formData.discountValue || 0) || 0;
          const disc = formData.discountType === "percent"
            ? gross * Math.min(100, Math.max(0, v)) / 100
            : Math.min(gross, Math.max(0, v));
          return Math.max(0, gross - disc);
        })())],
        [labels.instructorExpense, cf.format((() => {
          const hours = (formData.courseDatesTimes || []).reduce(
            (sum, dt) => sum + diffHours(dt.start_time, dt.end_time),
            0
          );
          const perHour = (formData.instructors || []).reduce(
            (sum, id) => sum + (parseFloat(formData.instructorRates?.[id]) || 0),
            0
          );
          return perHour * hours;
        })())],
        [labels.materialsCost, cf.format(parseFloat(formData.materialsCost || 0) || 0)],
        [labels.estimatedProfit, cf.format((() => {
          const gross = (parseFloat(formData.cost || 0) || 0) * (parseFloat(formData.students || 0) || 0);
          const v = parseFloat(formData.discountValue || 0) || 0;
          const disc = formData.discountType === "percent"
            ? gross * Math.min(100, Math.max(0, v)) / 100
            : Math.min(gross, Math.max(0, v));
          const net = Math.max(0, gross - disc);
          const hours = (formData.courseDatesTimes || []).reduce(
            (sum, dt) => sum + diffHours(dt.start_time, dt.end_time),
            0
          );
          const perHour = (formData.instructors || []).reduce(
            (sum, id) => sum + (parseFloat(formData.instructorRates?.[id]) || 0),
            0
          );
          const instructorExpense = perHour * hours;
          const materials = parseFloat(formData.materialsCost || 0) || 0;
          return net - instructorExpense - materials;
        })())],
      ],
      styles: {
        font: lang === "ar" ? "NotoNaskhArabic" : undefined,
        fontSize: 10,
        halign: lang === "ar" ? "right" : "left",
      },
      headStyles: { fillColor: [34, 197, 94] },
      columnStyles: {
        0: { halign: lang === "ar" ? "right" : "left" },
        1: { halign: "right" },
      },
      margin: { left: 14, right: 14 },
      theme: "grid",
    });

    const safeName = (title || "quotation").replace(/[^\w\d-_]+/g, "_");
    doc.save(`quotation_detailed_${safeName}${lang === "ar" ? "_ar" : ""}.pdf`);
  };

  /* ----------------------- Export (Simple Quotation) ----------------------- */
  const handleExportSimpleQuote = async (lang = "en") => {
    const doc = new jsPDF();
    await ensureArabicFont(doc, lang);

    const labels = L(lang);
    const nf = numFmt(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const cf = numFmt(lang, { style: "currency", currency: "BHD", minimumFractionDigits: 2 });
    const x = xPos(doc, lang);

    const title = (formData.title?.trim() || labels.quotation).trim();

    const gross = (parseFloat(formData.cost || 0) || 0) * (parseFloat(formData.students || 0) || 0);
    const v = parseFloat(formData.discountValue || 0) || 0;
    const disc = formData.discountType === "percent"
      ? gross * Math.min(100, Math.max(0, v)) / 100
      : Math.min(gross, Math.max(0, v));
    const net = Math.max(0, gross - disc);

    const discountLabel = formData.discountType === "percent"
      ? L(lang).discountPercent
      : L(lang).discountFixed;

    const discountValueDisplay =
      formData.discountType === "percent"
        ? `${nf.format(Math.min(100, Math.max(0, v)))} %`
        : `${cf.format(Math.max(0, v))}`;

    doc.setFontSize(16);
    doc.text(labels.quotation, x, 16, { align: align(lang) });

    doc.setFontSize(12);
    doc.text(`${labels.courseLabel} ${title}`, x, 28, { align: align(lang) });

    autoTable(doc, {
      startY: 40,
      styles: {
        font: lang === "ar" ? "NotoNaskhArabic" : undefined,
        fontSize: 11,
        cellPadding: 6,
        halign: lang === "ar" ? "right" : "left",
      },
      head: [[labels.headItem, labels.headAmount]],
      body: [
        [labels.revenueGross, cf.format(gross)],
        [discountLabel, discountValueDisplay],
        [labels.quotationAmount, cf.format(net)],
      ],
      headStyles: { fillColor: [34, 197, 94] },
      columnStyles: {
        0: { halign: lang === "ar" ? "right" : "left", cellWidth: 150 },
        1: { halign: "right" },
      },
      margin: { left: 14, right: 14 },
      theme: "grid",
    });

    const safeName = (title || "quotation").replace(/[^\w\d-_]+/g, "_");
    doc.save(`quotation_${safeName}${lang === "ar" ? "_ar" : ""}.pdf`);
  };

  /* --------------------------------- Submit -------------------------------- */
  const handleSubmit = (evt) => {
    evt.preventDefault();

    const payload = {
      title: formData.title?.trim() || "",
      description: formData.description?.trim() || "",
      location: formData.location?.trim() || "",
      location_lat: formData.location_lat ?? null,
      location_lon: formData.location_lon ?? null,
      location_place_id: formData.location_place_id || "",

      start_date: toDateOnly(formData.start_date),
      end_date: toDateOnly(formData.end_date),
      range_start_time: toHHMM(formData.range_start_time || "16:00", "16:00"),
      range_end_time: toHHMM(formData.range_end_time || "18:00", "18:00"),
      daysOfWeek: [...(formData.daysOfWeek || [])].sort((a, b) => a - b),

      instructors: [...(formData.instructors || [])].map(String),
      instructorRates: Object.fromEntries(
        Object.entries(formData.instructorRates || {}).map(([k, v]) => [String(k), toNumber(v)])
      ),

      cost: Math.max(0, toNumber(formData.cost)),
      students: Math.max(0, Math.floor(toNumber(formData.students))),
      materialsCost: Math.max(0, toNumber(formData.materialsCost)),

      discountType: formData.discountType === "amount" ? "amount" : "percent",
      discountValue:
        formData.discountType === "percent"
          ? clamp(toNumber(formData.discountValue), 0, 100)
          : Math.max(0, toNumber(formData.discountValue)),

      courseDatesTimes: (formData.courseDatesTimes || [])
        .map((x) => ({
          date: toDateOnly(x.date),
          start_time: toHHMM(x.start_time, "16:00"),
          end_time: toHHMM(x.end_time, "18:00"),
        }))
        .filter((x) => x.date)
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    };

    if (recordId) props?.handleUpdateHoot?.(recordId, payload);
    else props?.handleAddHoot?.(payload);
  };

  /* --------------------------------- Render -------------------------------- */
  return (
    <main className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {recordId ? "Edit Course" : "New Course"}
        </h1>

        {courseErr && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {courseErr}
          </div>
        )}

        {/* Core Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Title */}
          <div className="md:col-span-4">
            <label htmlFor="title-input" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              required
              type="text"
              name="title"
              id="title-input"
              value={formData.title}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-600"
              placeholder="Enter a clear, concise title"
              disabled={courseLoading}
            />
          </div>

          {/* Dates */}
          <div>
            <label htmlFor="start-date-input" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              required
              type="date"
              name="start_date"
              id="start-date-input"
              value={formData.start_date || ""}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-600"
              disabled={courseLoading}
            />
          </div>
          <div>
            <label htmlFor="end-date-input" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              required
              type="date"
              name="end_date"
              id="end-date-input"
              value={formData.end_date || ""}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-600"
              disabled={courseLoading}
            />
          </div>

          {/* Time Range */}
          <div>
            <label htmlFor="range-start-time" className="block text-sm font-medium text-gray-700 mb-1">
              Range Start
            </label>
            <input
              required
              type="time"
              name="range_start_time"
              id="range-start-time"
              value={formData.range_start_time || "16:00"}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-600"
              disabled={courseLoading}
            />
          </div>
          <div>
            <label htmlFor="range-end-time" className="block text-sm font-medium text-gray-700 mb-1">
              Range End
            </label>
            <input
              required
              type="time"
              name="range_end_time"
              id="range-end-time"
              value={formData.range_end_time || "18:00"}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-600"
              disabled={courseLoading}
            />
          </div>

          {/* Days */}
          <div className="relative" ref={daysRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Frequency (Days)</label>
            <button
              type="button"
              onClick={() => setDaysOpen((o) => !o)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-left hover:border-gray-400 focus:ring-2 focus:ring-green-600 disabled:opacity-60"
              disabled={courseLoading}
            >
              <span className="text-gray-800">
                {formData.daysOfWeek?.length ? formData.daysOfWeek.map((i) => days[i]).join(", ") : "Select days"}
              </span>
            </button>
            {daysOpen && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                {days.map((day, idx) => (
                  <label key={day} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-gray-900 focus:ring-green-600"
                      checked={formData.daysOfWeek?.includes(idx) || false}
                      onChange={(e) => handleCheckboxChangeDay(idx, e.target.checked)}
                    />
                    <span className="text-gray-800">{day}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Financials */}
          <div>
            <label htmlFor="cost-input" className="block text-sm font-medium text-gray-700 mb-1">
              Course Fees (/ Student / Course)
            </label>
            <input
              required
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              name="cost"
              id="cost-input"
              value={formData.cost}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-600"
              placeholder="e.g., 150.00"
              disabled={courseLoading}
            />
          </div>

          <div>
            <label htmlFor="students-input" className="block text-sm font-medium text-gray-700 mb-1">
              Students (Count)
            </label>
            <input
              required
              type="number"
              inputMode="numeric"
              step="1"
              min="0"
              name="students"
              id="students-input"
              value={formData.students}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-600"
              placeholder="e.g., 20"
              disabled={courseLoading}
            />
          </div>

          <div>
            <label htmlFor="materialsCost-input" className="block text-sm font-medium text-gray-700 mb-1">
              Materials Cost
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              name="materialsCost"
              id="materialsCost-input"
              value={formData.materialsCost}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-600"
              placeholder="e.g., 50.00"
              disabled={courseLoading}
            />
          </div>

          {/* Discount */}
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount on Revenue</label>
            <div className="grid grid-cols-[1fr,1fr] gap-2">
              <select
                name="discountType"
                value={formData.discountType}
                onChange={(e) => setFormData((s) => ({ ...s, discountType: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-600"
                disabled={courseLoading}
              >
                <option value="percent">Percent (%)</option>
                <option value="amount">Fixed Amount</option>
              </select>

              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max={formData.discountType === "percent" ? "100" : undefined}
                name="discountValue"
                value={formData.discountValue}
                onChange={(e) => setFormData((s) => ({ ...s, discountValue: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-600"
                placeholder={formData.discountType === "percent" ? "e.g., 12.5" : "e.g., 150.75"}
                disabled={courseLoading}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Applied to gross revenue. All totals use net revenue after discount.
            </p>
          </div>

          {/* Location */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <LocationInput
              value={formData.location}
              disabled={courseLoading}
              onChange={(loc) => {
                setFormData((s) => ({
                  ...s,
                  location: loc?.label || "",
                  location_lat: Number.isFinite(loc?.lat) ? loc.lat : null,
                  location_lon: Number.isFinite(loc?.lon) ? loc.lon : null,
                  location_place_id: loc?.id || "",
                }));
              }}
            />
            <p className="mt-1 text-xs text-gray-500">
              Search any country, city, venue, institute, or POI worldwide.
            </p>
          </div>

          {/* Instructors */}
          <div className="relative md:col-span-2" ref={instructorsRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instructors</label>
            <button
              type="button"
              onClick={() => setInstructorsOpen((o) => !o)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-left hover:border-gray-400 focus:ring-2 focus:ring-green-600 disabled:opacity-60"
              disabled={insLoading || courseLoading}
              title={insErr || ""}
            >
              <span className="text-gray-800">
                {insLoading
                  ? "Loading…"
                  : formData.instructors?.length
                    ? formData.instructors
                      .map((id) => instructors.find((i) => String(i.id) === String(id))?.name || id)
                      .join(", ")
                    : "Select instructors"}
              </span>
            </button>

            {instructorsOpen && !insLoading && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white p-3 shadow-lg max-h-60 overflow-auto">
                {insErr && (
                  <div className="mb-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                    {insErr}
                  </div>
                )}

                {instructors.length === 0 && !insErr ? (
                  <div className="p-2 text-sm text-gray-600">No instructors found.</div>
                ) : (
                  instructors.map((ins, index) => {
                    const insId = String(ins.id);
                    const isChecked = (formData.instructors || []).map(String).includes(insId);

                    return (
                      <label key={`${insId}-${index}`} className="flex items-center justify-between gap-3 py-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-gray-900 focus:ring-green-600"
                            checked={isChecked}
                            onChange={() => toggleInstructor(insId)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-gray-800">{ins.name}</span>
                        </div>

                        {isChecked && (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            inputMode="decimal"
                            placeholder="Pay/hr"
                            className="w-28 h-9 rounded-md border border-gray-300 px-2 text-sm focus:ring-2 focus:ring-green-600"
                            value={formData.instructorRates?.[insId] ?? ""}
                            onChange={(e) => setInstructorRate(insId, e.target.value)}
                            title="Hourly pay"
                          />
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description-input" className="block text-sm font-medium text-gray-700 mb-1">
            Course Description
          </label>
          <textarea
            required
            name="description"
            id="description-input"
            value={formData.description}
            onChange={handleChange}
            rows={5}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-600"
            placeholder="Add description…"
            disabled={courseLoading}
          />
        </div>

        {/* Selected Instructors & Rates Table */}
        {formData.instructors?.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Instructor Rates (per hour)</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-2 text-left">Instructor</th>
                    <th className="px-4 py-2 text-left">Pay / hr</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.instructors.map((id) => {
                    const ins = instructors.find((i) => String(i.id) === String(id));
                    return (
                      <tr key={id} className="border-t">
                        <td className="px-4 py-2">{ins?.name || id}</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            inputMode="decimal"
                            className="w-40 h-10 rounded-md border border-gray-300 px-3 focus:ring-2 focus:ring-green-600"
                            placeholder="e.g., 12.50"
                            value={formData.instructorRates?.[id] ?? ""}
                            onChange={(e) => setInstructorRate(id, e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Course Dates & Times */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-700">Course Dates & Times</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setView("list")}
                className={`btn btn-primary ${view === "list" ? "btn-toggle-on" : "btn-toggle-off"}`}
                title="List view"
              >
                <List size={18} />
              </button>
              <button
                type="button"
                onClick={() => setView("grid")}
                className={`btn btn-primary ${view === "grid" ? "btn-toggle-on" : "btn-toggle-off"}`}
                title="Grid view"
              >
                <Grid size={18} />
              </button>
            </div>
          </div>

          {/* List View */}
          {view === "list" && (
            <div className="space-y-4">
              {(formData.courseDatesTimes || []).map((dt, idx) => (
                <div key={idx} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:bg-gray-50 transition">
                  <div className="grid grid-cols-1 md:grid-cols-[1.2fr,1fr,1fr,auto] items-end gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                      <input
                        required
                        disabled
                        type="date"
                        value={dt.date || ""}
                        onChange={(e) => {
                          const updated = [...formData.courseDatesTimes];
                          updated[idx] = { ...updated[idx], date: e.target.value };
                          setFormData((s) => ({ ...s, courseDatesTimes: updated }));
                        }}
                        className="w-full h-11 rounded-lg border border-gray-300 bg-gray-100 text-gray-700 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
                      <input
                        required
                        type="time"
                        value={dt.start_time || ""}
                        onChange={(e) => {
                          const updated = [...formData.courseDatesTimes];
                          updated[idx] = { ...updated[idx], start_time: e.target.value };
                          setFormData((s) => ({ ...s, courseDatesTimes: updated }));
                        }}
                        className="w-full h-11 rounded-lg border border-gray-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
                      <input
                        required
                        type="time"
                        value={dt.end_time || ""}
                        onChange={(e) => {
                          const updated = [...formData.courseDatesTimes];
                          updated[idx] = { ...updated[idx], end_time: e.target.value };
                          setFormData((s) => ({ ...s, courseDatesTimes: updated }));
                        }}
                        className="w-full h-11 rounded-lg border border-gray-300 bg-white"
                      />
                    </div>
                    <div className="flex md:justify-end">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="inline-flex h-11 items-center justify-center rounded-lg px-4 font-medium bg-red-600 text-white hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grid View */}
          {view === "grid" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-4">
              {(formData.courseDatesTimes || []).map((dt, idx) => (
                <div key={idx} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md hover:bg-gray-50 transition flex flex-col gap-2">
                  <input
                    required
                    disabled
                    type="date"
                    value={dt.date || ""}
                    onChange={(e) => {
                      const updated = [...formData.courseDatesTimes];
                      updated[idx] = { ...updated[idx], date: e.target.value };
                      setFormData((s) => ({ ...s, courseDatesTimes: updated }));
                    }}
                    className="w-full h-10 rounded-lg border border-gray-300 bg-gray-100 text-gray-700 disabled:cursor-not-allowed text-sm"
                  />
                  <input
                    required
                    type="time"
                    value={dt.start_time || ""}
                    onChange={(e) => {
                      const updated = [...formData.courseDatesTimes];
                      updated[idx] = { ...updated[idx], start_time: e.target.value };
                      setFormData((s) => ({ ...s, courseDatesTimes: updated }));
                    }}
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white text-sm"
                  />
                  <input
                    required
                    type="time"
                    value={dt.end_time || ""}
                    onChange={(e) => {
                      const updated = [...formData.courseDatesTimes];
                      updated[idx] = { ...updated[idx], end_time: e.target.value };
                      setFormData((s) => ({ ...s, courseDatesTimes: updated }));
                    }}
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="mt-1 inline-flex items-center justify-center rounded-lg py-1 text-xs font-medium bg-red-600 text-white hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Financial Summary */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Financial Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">Sessions</div>
              <div className="mt-1 text-xl font-semibold">{totalSessions}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">Total Hours</div>
              <div className="mt-1 text-xl font-semibold">{fmtNum(totalHours)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">Revenue (Gross)</div>
              <div className="mt-1 text-xl font-semibold">BHD {fmtNum(grossRevenue)}</div>
              <div className="text-xs text-gray-500 mt-1">
                {fmtNum(toNumber(formData.cost))} × {toNumber(formData.students)}
              </div>
            </div>

            {/* Discount card */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">Discount from Revenue</div>
              <div className="mt-1 text-xl font-semibold">BHD {fmtNum(discountAmount)}</div>
              <div className="text-xs text-gray-500 mt-1">
                {formData.discountType === "percent"
                  ? `${fmtNum(clamp(toNumber(formData.discountValue), 0, 100))}%`
                  : `Fixed amount`}
              </div>
            </div>

            {/* Net Revenue card */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">Revenue (Net)</div>
              <div className="mt-1 text-xl font-semibold">BHD {fmtNum(netRevenue)}</div>
              <div className="text-xs text-gray-500 mt-1">Gross − Discount</div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">Instructor Expense</div>
              <div className="mt-1 text-xl font-semibold">BHD {fmtNum(instructorExpense)}</div>
              <div className="text-xs text-gray-500 mt-1">Rates × total hours</div>
            </div>
          </div>

          {/* Profit row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
            <div className="md:col-span-5 rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">Profit</div>
              <div className={`mt-1 text-2xl font-semibold ${profit < 0 ? "text-red-600" : "text-green-700"}`}>
                BHD {fmtNum(profit)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Net Revenue − Instructor − Materials ({fmtNum(toNumber(formData.materialsCost))})
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3">
          {/* NEW: Simple quotation (minimal) */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleExportSimpleQuote("ar")}
            disabled={courseLoading}
            title="تصدير عرض سعر مبسط"
          >
            تصدير عرض مبسط (PDF)
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleExportQuote("ar")}
            disabled={courseLoading}
            title="تصدير عرض سعر تفصيلي"
          >
            تصدير عرض تفصيلي (PDF)
          </button>

          <button type="button" className="btn btn-secondary" onClick={() => window.history.back()}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={courseLoading}>
            Submit
          </button>
        </div>
      </form>
    </main>
  );
};

export default CourseForm;