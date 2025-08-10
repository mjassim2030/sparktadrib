import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router"; // keep as in your project; switch to 'react-router-dom' if needed
import * as courseService from "../../services/courseService";
import * as instructorService from "../../services/instructorService";
import { List, Grid } from "lucide-react";

/* --------------------------------- Config --------------------------------- */
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const initialFormData = {
  title: "",
  description: "",
  location: "News",
  start_date: "",
  end_date: "",
  courseDatesTimes: [], // [{date:'YYYY-MM-DD', start_time:'HH:MM', end_time:'HH:MM'}]
  range_start_time: "16:00",
  range_end_time: "18:00",
  daysOfWeek: [], // [0..6]
  instructors: [], // [instructorId]
  cost: "", // per student / course
  students: "",
  materialsCost: "",
  instructorRates: {}, // { [instructorId]: hourlyRate }
};

/* ------------------------------- Utilities -------------------------------- */
const toDateOnly = (v) => {
  if (!v) return "";
  const s = String(v);
  // Handles Date, ISO, or 'YYYY-MM-DD'
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
  // Accept 'HH:MM[:SS]'
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m) {
    const hh = m[1].padStart(2, "0");
    const mm = m[2];
    return `${hh}:${mm}`;
  }
  // Accept minutes since midnight
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
  if (end < start) end += 24 * 60; // crosses midnight
  return (end - start) / 60;
};

const toNumber = (v) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/* ------------------------------- CourseForm ------------------------------- */
const CourseForm = (props) => {
  // Accept multiple param names to be safe with existing routes
  const { hootId, courseId, id } = useParams();
  const recordId = hootId || courseId || id; // editing when truthy

  // UI state
  const [view, setView] = useState("list"); // "list" | "grid"
  const [daysOpen, setDaysOpen] = useState(false);
  const [instructorsOpen, setInstructorsOpen] = useState(false);

  // Data state
  const [formData, setFormData] = useState(initialFormData);

  // Flags
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseErr, setCourseErr] = useState("");
  const [skipNextGen, setSkipNextGen] = useState(false); // prevent schedule overwrite on first hydration

  // Instructors from DB
  const [instructors, setInstructors] = useState([]); // [{id, name, email}]
  const [insLoading, setInsLoading] = useState(true);
  const [insErr, setInsErr] = useState("");

  // Refs (close popovers on outside click)
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

        // Normalize incoming data to the form shape
        const normalized = {
          ...initialFormData,
          ...raw,
          title: raw?.title ?? "",
          description: raw?.description ?? "",
          location: raw?.location ?? "News",
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
        };

        // Prevent the auto-regenerate effect from overwriting existing schedule once
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
        const list = await instructorService.index(); // [{id, name, email}]
        if (!alive) return;

        // Preserve previously selected IDs that might not be in the current list (archived)
        const selectedIds = new Set((formData.instructors || []).map(String));
        const knownIds = new Set(list.map((i) => String(i.id)));
        const missing = [...selectedIds].filter((id) => !knownIds.has(id));
        const merged = [
          ...list,
          ...missing.map((id) => ({ id, name: `(archived) ${id}`, email: "" })),
        ];

        setInstructors(merged);
      } catch (e) {
        if (alive) setInsErr(e?.message || "Failed to load instructors");
      } finally {
        if (alive) setInsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // re-run when edit target or selection changes materially
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId, formData.instructors.length]);

  /* ------------------------ Close popovers on click ----------------------- */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (daysRef.current && !daysRef.current.contains(e.target)) setDaysOpen(false);
      if (instructorsRef.current && !instructorsRef.current.contains(e.target)) setInstructorsOpen(false);
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
    // Skip the very first run after hydration to preserve saved per-session times
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
    () => (formData.courseDatesTimes || []).reduce((sum, dt) => sum + diffHours(dt.start_time, dt.end_time), 0),
    [formData.courseDatesTimes]
  );

  const revenue = useMemo(
    () => toNumber(formData.cost) * toNumber(formData.students),
    [formData.cost, formData.students]
  );

  const instructorExpense = useMemo(() => {
    const perHourSum = (formData.instructors || []).reduce(
      (sum, id) => sum + toNumber(formData.instructorRates?.[id]),
      0
    );
    return perHourSum * totalHours;
  }, [formData.instructors, formData.instructorRates, totalHours]);

  const profit = useMemo(
    () => revenue - instructorExpense - toNumber(formData.materialsCost),
    [revenue, instructorExpense, formData.materialsCost]
  );

  const fmtNum = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

  /* --------------------------------- Submit -------------------------------- */
  const handleSubmit = (evt) => {
    evt.preventDefault();

    // Clean + coerce values before submit
    const payload = {
      ...formData,
      start_date: toDateOnly(formData.start_date),
      end_date: toDateOnly(formData.end_date),
      range_start_time: toHHMM(formData.range_start_time || "16:00", "16:00"),
      range_end_time: toHHMM(formData.range_end_time || "18:00", "18:00"),
      daysOfWeek: [...(formData.daysOfWeek || [])].sort((a, b) => a - b),
      instructors: [...(formData.instructors || [])].map(String),
      instructorRates: Object.fromEntries(
        Object.entries(formData.instructorRates || {}).map(([k, v]) => [String(k), toNumber(v)])
      ),
      cost: toNumber(formData.cost),
      students: Math.max(0, Math.floor(toNumber(formData.students))),
      materialsCost: toNumber(formData.materialsCost),
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
        <h1 className="text-2xl font-bold text-gray-900">{recordId ? "Edit Course" : "New Course"}</h1>

        {courseErr && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{courseErr}</div>
        )}

        {/* Core Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Title */}
          <div className="md:col-span-4">
            <label htmlFor="title-input" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
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
            <label htmlFor="start-date-input" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
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
            <label htmlFor="end-date-input" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
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
            <label htmlFor="range-start-time" className="block text-sm font-medium text-gray-700 mb-1">Range Start</label>
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
            <label htmlFor="range-end-time" className="block text-sm font-medium text-gray-700 mb-1">Range End</label>
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

          {/* Days (dropdown with checkboxes) */}
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
              step="1"
              name="cost"
              id="cost-input"
              value={formData.cost}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-600"
              placeholder="e.g., 150"
              disabled={courseLoading}
            />
          </div>

          <div>
            <label htmlFor="students-input" className="block text-sm font-medium text-gray-700 mb-1">Students (Count)</label>
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
            <label htmlFor="materialsCost-input" className="block text-sm font-medium text-gray-700 mb-1">Materials Cost</label>
            <input
              type="number"
              inputMode="decimal"
              step="1"
              name="materialsCost"
              id="materialsCost-input"
              value={formData.materialsCost}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-600"
              placeholder="e.g., 50"
              disabled={courseLoading}
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location-input" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select
              required
              name="location"
              id="location-input"
              value={formData.location}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-green-600"
              disabled={courseLoading}
            >
              <option value="News">Location 1</option>
              <option value="Games">Location 2</option>
              <option value="Music">Location 3</option>
              <option value="Movies">Location 4</option>
              <option value="Sports">Location 5</option>
              <option value="Television">Location 6</option>
            </select>
          </div>

          {/* Instructors (DB) */}
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
                  instructors.map((ins) => (
                    <label key={ins.id} className="flex items-center justify-between gap-3 py-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-gray-900 focus:ring-green-600"
                          checked={formData.instructors?.includes(ins.id) || false}
                          onChange={() => toggleInstructor(ins.id)}
                        />
                        <span className="text-gray-800">{ins.name}</span>
                      </div>
                      {formData.instructors?.includes(ins.id) && (
                        <input
                          type="number"
                          step="1"
                          inputMode="decimal"
                          placeholder="Pay/hr"
                          className="w-28 h-9 rounded-md border border-gray-300 px-2 text-sm focus:ring-2 focus:ring-green-600"
                          value={formData.instructorRates?.[ins.id] ?? ""}
                          onChange={(e) => setInstructorRate(ins.id, e.target.value)}
                          title="Hourly pay"
                        />
                      )}
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description-input" className="block text-sm font-medium text-gray-700 mb-1">Course Description</label>
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
                            step="1"
                            inputMode="decimal"
                            className="w-40 h-10 rounded-md border border-gray-300 px-3 focus:ring-2 focus:ring-green-600"
                            placeholder="e.g., 12"
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
                className={`p-2 rounded-lg border ${view === "list" ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-700 border-gray-300"}`}
                title="List view"
              >
                <List size={18} />
              </button>
              <button
                type="button"
                onClick={() => setView("grid")}
                className={`p-2 rounded-lg border ${view === "grid" ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-700 border-gray-300"}`}
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

          {/* Grid View (7 columns) */}
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">Sessions</div>
              <div className="mt-1 text-xl font-semibold">{totalSessions}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">Total Hours</div>
              <div className="mt-1 text-xl font-semibold">{fmtNum(totalHours)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">Revenue</div>
              <div className="mt-1 text-xl font-semibold">BHD {fmtNum(revenue)}</div>
              <div className="text-xs text-gray-500 mt-1">
                {fmtNum(toNumber(formData.cost))} × {toNumber(formData.students)}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">Instructor Expense</div>
              <div className="mt-1 text-xl font-semibold">BHD {fmtNum(instructorExpense)}</div>
              <div className="text-xs text-gray-500 mt-1">Rates × total hours</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">Profit</div>
              <div className={`mt-1 text-xl font-semibold ${profit < 0 ? "text-red-600" : "text-green-700"}`}>
                BHD {fmtNum(profit)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Revenue − Instructor − Materials ({fmtNum(toNumber(formData.materialsCost))})
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-xl border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            onClick={() => window.history.back()}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-60"
            disabled={courseLoading}
          >
            Submit
          </button>
        </div>
      </form>
    </main>
  );
};

export default CourseForm;