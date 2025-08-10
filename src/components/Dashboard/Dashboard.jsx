import { useEffect, useMemo, useState, useContext } from 'react';
import { Link } from 'react-router';
import { UserContext } from '../../contexts/UserContext';
import * as instructorService from '../../services/instructorService';
import * as courseService from '../../services/courseService';
import {
  Users,
  BookOpen,
  DollarSign,
  Receipt,
  TrendingUp,
  Clock,
  CalendarDays,
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(UserContext);
  const [instructors, setInstructors] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setLoading(true);
        const [insRes, courseRes] = await Promise.all([
          instructorService.index(),
          courseService.index(),
        ]);
        setInstructors(insRes || []);
        setCourses(courseRes || []);
      } catch (e) {
        setErr(e?.message || 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  /* ------------------------- Helpers & Calculations ------------------------ */

  const toMinutes = (hhmm) => {
    if (!hhmm || typeof hhmm !== 'string' || !hhmm.includes(':')) return 0;
    const [h, m] = hhmm.split(':').map(Number);
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  };

  const parseTimeOnDate = (dateStr, hhmm) => {
    if (!dateStr) return null;
    const [h, m] = (hhmm || '00:00').split(':').map(Number);
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
    return d;
  };

  const sumFromCourseDatesTimes = (course) => {
    const arr = Array.isArray(course?.courseDatesTimes) ? course.courseDatesTimes : [];
    return arr.reduce((sum, s) => {
      const durMin = Math.max(0, toMinutes(s?.end_time) - toMinutes(s?.start_time));
      return sum + durMin / 60;
    }, 0);
  };

  const sumFromSessions = (course) => {
    const sessions = Array.isArray(course?.sessions) ? course.sessions : [];
    return sessions.reduce((sum, s) => {
      const start = s?.start ? new Date(s.start) : null;
      const end = s?.end ? new Date(s.end) : null;
      if (!start || !end || isNaN(start) || isNaN(end)) return sum;
      const durHrs = Math.max(0, (end - start) / (1000 * 60 * 60));
      return sum + durHrs;
    }, 0);
  };

  const enumerateRangeHours = (course) => {
    const { start_date, end_date, daysOfWeek, range_start_time, range_end_time } = course || {};
    if (!start_date || !end_date || !Array.isArray(daysOfWeek) || daysOfWeek.length === 0) return 0;
    const start = new Date(start_date);
    const end = new Date(end_date);
    if (isNaN(start) || isNaN(end) || end < start) return 0;

    const perSessionHours = Math.max(0, (toMinutes(range_end_time) - toMinutes(range_start_time)) / 60);
    if (perSessionHours === 0) return 0;

    let hours = 0;
    const d = new Date(start);
    while (d <= end) {
      const dow = d.getDay(); // 0=Sun
      if (daysOfWeek.includes(dow)) hours += perSessionHours;
      d.setDate(d.getDate() + 1);
    }
    return hours;
  };

  const getCourseHours = (course) => {
    const h1 = sumFromCourseDatesTimes(course);
    if (h1 > 0) return h1;
    const h2 = sumFromSessions(course);
    if (h2 > 0) return h2;
    return enumerateRangeHours(course);
  };

  const num = (v, fall = 0) => (Number.isFinite(+v) ? +v : fall);

  const getEnrolled = (c) =>
    (Array.isArray(c?.enrollments) && c.enrollments.length) ||
    (Array.isArray(c?.students) && c.students.length) ||
    num(c?.enrolledCount);

  const getPricePerStudent = (c) =>
    num(
      c?.costPerStudent ?? c?.pricePerStudent ?? c?.courseCostPerStudent ?? c?.course_cost_per_student,
      0
    );

  const getMaterialsCost = (c) => num(c?.materialsCost ?? c?.material_cost ?? c?.materials_cost, 0);

  /* -------------------- Instructor normalization & lookup ------------------- */

  const s = (v) => (typeof v === 'string' ? v.trim() : '');

  const getDisplayName = (ins) => {
    const direct =
      s(ins?.name) ||
      s(ins?.fullName) ||
      [s(ins?.firstName), s(ins?.lastName)].filter(Boolean).join(' ');
    if (direct) return direct;

    const u = ins?.user || ins?.profile || null;
    const nested =
      s(u?.name) ||
      s(u?.fullName) ||
      [s(u?.firstName), s(u?.lastName)].filter(Boolean).join(' ');
    if (nested) return nested;

    const email = s(ins?.email) || s(u?.email);
    if (email && email.includes('@')) return email.split('@')[0];

    return 'Instructor';
  };

  const nameById = useMemo(() => {
    const m = new Map();
    for (const raw of instructors || []) {
      const ins = raw?.instructor || raw;
      const id = String(
        ins?._id ?? ins?.id ?? raw?.instructorId ?? ins?.user?._id ?? ''
      );
      if (!id) continue;
      m.set(id, getDisplayName(ins));
    }
    return m;
  }, [instructors]);

  const rateByInstructorId = useMemo(() => {
    const map = new Map();
    for (const raw of instructors || []) {
      const ins = raw?.instructor || raw;
      const id = String(ins?._id ?? ins?.id ?? raw?.instructorId ?? '');
      if (!id) continue;
      const rate =
        num(ins?.hourly_rate) ||
        num(ins?.ratePerHour) ||
        num(ins?.payPerHour);
      map.set(id, rate);
    }
    return map;
  }, [instructors]);

  const getCourseInstructors = (course) => {
    const src =
      course?.instructors ??
      course?.assignedInstructors ??
      course?.teachers ??
      course?.instructorIds ??
      course?.instructor ??
      [];
    const arr = Array.isArray(src) ? src : [src].filter(Boolean);

    const normalized = arr.map((it) => {
      if (typeof it === 'string') return { id: it };
      if (typeof it === 'object' && it) {
        const nested = it.instructor ?? it.teacher ?? it.user ?? it;
        const id = String(nested?._id ?? nested?.id ?? it?.instructorId ?? it?.teacherId ?? '');
        const name =
          s(nested?.name) ||
          s(nested?.fullName) ||
          [s(nested?.firstName), s(nested?.lastName)].filter(Boolean).join(' ');
        const hourly_rate = num(it?.hourly_rate ?? nested?.hourly_rate);
        const hours = num(it?.hours);
        return { id, name, hourly_rate, hours };
      }
      return {};
    });

    const seen = new Set();
    return normalized.filter((n) => {
      const key = n.id || n.name || JSON.stringify(n);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  /* --------------------- Payout calculation (corrected) -------------------- */

  const getInstructorPayoutForCourse = (course) => {
    const courseHours = getCourseHours(course);
    if (!Number.isFinite(courseHours) || courseHours <= 0) return 0;

    const resolveRate = (candidate, id) =>
      num(candidate?.hourly_rate) ||
      num(course?.instructorRates?.[String(id)]) ||
      num(candidate?.ratePerHour) ||
      num(candidate?.payPerHour) ||
      (rateByInstructorId.get(String(id)) ?? 0);

    let total = 0;

    if (Array.isArray(course?.instructorHours) && course.instructorHours.length) {
      for (const ih of course.instructorHours) {
        const id = String(ih?.instructorId ?? ih?._id ?? ih?.id ?? '');
        if (!id) continue;
        const rate = resolveRate(ih, id);
        const hrs = Number.isFinite(num(ih?.hours)) ? num(ih.hours) : courseHours;
        total += rate * Math.max(0, hrs);
      }
      return total;
    }

    const list = getCourseInstructors(course);
    if (!Array.isArray(list) || list.length === 0) return 0;

    for (const ins of list) {
      const id = String(ins?.id ?? ins?._id ?? '');
      if (!id && !ins?.hourly_rate) continue;
      const rate = resolveRate(ins, id);
      const hrs = Number.isFinite(num(ins?.hours)) ? num(ins.hours) : courseHours;
      total += rate * Math.max(0, hrs);
    }

    return total;
  };

  /* --------------------------------- Metrics -------------------------------- */

  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalPaidToInstructors = 0;
    let totalMaterials = 0;
    let totalHours = 0;

    for (const c of courses) {
      const enrolled = getEnrolled(c);
      const price = getPricePerStudent(c);
      const courseRevenue = price * enrolled;

      const courseHours = getCourseHours(c);
      const coursePayout = getInstructorPayoutForCourse(c);
      const materials = getMaterialsCost(c);

      totalRevenue += courseRevenue;
      totalPaidToInstructors += coursePayout;
      totalMaterials += materials;
      totalHours += courseHours;
    }

    const totalProfit = totalRevenue - totalPaidToInstructors - totalMaterials;

    return {
      instructorsCount: instructors.length,
      coursesCount: courses.length,
      totalRevenue,
      totalProfit,
      totalPaidToInstructors,
      totalHours,
    };
  }, [courses, instructors, rateByInstructorId]);

  /* --------------------- Upcoming Courses (next 10 sessions) -------------------- */

  const enumerateOccurrences = (course) => {
    const occurrences = [];

    if (Array.isArray(course?.courseDatesTimes) && course.courseDatesTimes.length) {
      for (const s of course.courseDatesTimes) {
        const start = parseTimeOnDate(s?.date, s?.start_time);
        const end = parseTimeOnDate(s?.date, s?.end_time);
        if (!start || !end) continue;
        occurrences.push({
          start,
          end,
          courseId: course?._id || course?.id,
          title: course?.title || course?.name || 'Untitled Course',
          location: course?.location || s?.location || '',
          instructors: getCourseInstructors(course),
        });
      }
    }

    if (Array.isArray(course?.sessions) && course.sessions.length) {
      for (const s of course.sessions) {
        const start = s?.start ? new Date(s.start) : null;
        const end = s?.end ? new Date(s.end) : null;
        if (!start || !end || isNaN(start) || isNaN(end)) continue;
        occurrences.push({
          start,
          end,
          courseId: course?._id || course?.id,
          title: course?.title || course?.name || 'Untitled Course',
          location: course?.location || s?.location || '',
          instructors: getCourseInstructors(course),
        });
      }
    }

    const { start_date, end_date, daysOfWeek, range_start_time, range_end_time } = course || {};
    if (
      (!occurrences.length) &&
      start_date &&
      end_date &&
      Array.isArray(daysOfWeek) &&
      daysOfWeek.length
    ) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        const d = new Date(start);
        while (d <= end) {
          const dow = d.getDay();
          if (daysOfWeek.includes(dow)) {
            const s = parseTimeOnDate(d.toISOString().slice(0, 10), range_start_time);
            const e = parseTimeOnDate(d.toISOString().slice(0, 10), range_end_time);
            if (s && e) {
              occurrences.push({
                start: s,
                end: e,
                courseId: course?._id || course?.id,
                title: course?.title || course?.name || 'Untitled Course',
                location: course?.location || '',
                instructors: getCourseInstructors(course),
              });
            }
          }
          d.setDate(d.getDate() + 1);
        }
      }
    }

    return occurrences;
  };

  const renderInstructorNames = (list) => {
    if (!Array.isArray(list) || !list.length) return '—';
    const names = list
      .map(({ id, name }) => name || (id ? nameById.get(String(id)) : null))
      .filter(Boolean);
    return names.length ? names.join(', ') : '—';
  };

  const fmtDate = (d) =>
    new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);

  const fmtTime = (d) =>
    new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(d);

  const upcoming = useMemo(() => {
    const now = Date.now();
    const all = [];
    for (const c of courses) {
      const occ = enumerateOccurrences(c);
      for (const o of occ) {
        if (o.start && o.start.getTime() >= now) all.push(o);
      }
    }
    all.sort((a, b) => a.start - b.start);
    return all.slice(0, 10);
  }, [courses]);

  /* --------------------------------- UI ----------------------------------- */

  if (!user) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold text-slate-800">Please sign in</h1>
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-600">Welcome, {user.username}</p>
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700">
          {err}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card title="Instructors" value={metrics.instructorsCount} Icon={Users} />
        <Card title="Courses" value={metrics.coursesCount} Icon={BookOpen} />
        <MoneyCard title="Total Revenue" value={metrics.totalRevenue} Icon={DollarSign} />
        <MoneyCard title="Total Paid to Instructors" value={metrics.totalPaidToInstructors} Icon={Receipt} />
        <MoneyCard title="Total Profit" value={metrics.totalProfit} Icon={TrendingUp} positiveColor />
        <Card title="Total Hours Taught" value={metrics.totalHours.toFixed(1)} Icon={Clock} />
      </div>

      {/* Upcoming Courses */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <CalendarDays className="h-5 w-5 text-slate-500" />
            Upcoming Courses
          </h2>
          <span className="text-sm text-slate-500">{upcoming.length} upcoming</span>
        </div>

        {upcoming.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No upcoming sessions.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Instructors</th>
                  <th className="px-4 py-3">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {upcoming.map((u, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap">{fmtDate(u.start)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {fmtTime(u.start)} – {fmtTime(u.end)}
                    </td>
                    <td className="px-4 py-3">
                      {u.courseId ? (
                        <Link
                          to={`/hoots/${u.courseId}`}
                          className="font-medium text-blue-700 hover:text-blue-900"
                        >
                          {u.title}
                        </Link>
                      ) : (
                        <span className="font-medium text-slate-800">{u.title}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{renderInstructorNames(u.instructors)}</td>
                    <td className="px-4 py-3">{u.location || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {loading && (
        <p className="mt-6 text-sm text-slate-500">Loading latest figures…</p>
      )}
    </main>
  );
};

/* ------------------------------- UI Pieces ------------------------------- */

const Card = ({ title, value, Icon }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {Icon ? <Icon className="h-5 w-5 text-slate-400" /> : null}
    </div>
    <p className="mt-2 text-3xl font-extrabold text-slate-900">{formatNumber(value)}</p>
  </div>
);

const MoneyCard = ({ title, value, Icon, positiveColor = false }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {Icon ? <Icon className="h-5 w-5 text-slate-400" /> : null}
    </div>
    <p className={`mt-2 text-3xl font-extrabold ${positiveColor ? 'text-emerald-700' : 'text-slate-900'}`}>
      {formatCurrency(value)}
    </p>
  </div>
);

/* ------------------------------- Formatters ------------------------------ */

const formatCurrency = (n) => {
  const v = Number.isFinite(+n) ? +n : 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'BHD',
      minimumFractionDigits: 2,
    }).format(v);
  } catch {
    return `${v.toFixed(2)} BHD`;
  }
};

const formatNumber = (n) => {
  const v = Number.isFinite(+n) ? +n : 0;
  return new Intl.NumberFormat().format(v);
};

export default Dashboard;