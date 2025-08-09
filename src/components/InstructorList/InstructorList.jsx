import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import * as instructorService from '../../services/instructorService';
import { Grid as GridIcon, List as ListIcon, Mail, User } from 'lucide-react';

const avatarFromName = (name = '') => {
  const parts = name.trim().split(/\s+/);
  const initials = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  return initials.toUpperCase();
};

const InstructorCard = ({ instructor }) => (
  <Link
    to={`/instructors/${instructor._id}`}
    className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
  >
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-white font-semibold">
        {avatarFromName(instructor.name)}
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-lg font-semibold text-slate-900">{instructor.name}</h3>
        <p className="mt-0.5 flex items-center gap-2 text-sm text-slate-600">
          <Mail className="h-4 w-4" />
          <span className="truncate">{instructor.email}</span>
        </p>
        <p className="mt-2 line-clamp-3 text-sm text-slate-700">{instructor.bio}</p>
      </div>
    </div>
  </Link>
);

const InstructorRow = ({ instructor }) => (
  <Link
    to={`/instructors/${instructor._id}`}
    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition"
  >
    <div className="flex items-center gap-3 min-w-0">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-white text-sm font-semibold">
        {avatarFromName(instructor.name)}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-slate-900">
          <User className="h-4 w-4" />
          <span className="font-medium truncate">{instructor.name}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-sm text-slate-600">
          <Mail className="h-4 w-4" />
          <span className="truncate">{instructor.email}</span>
        </div>
      </div>
    </div>
    <span className="text-xs text-slate-500">View</span>
  </Link>
);

const InstructorList = () => {
  const [loading, setLoading] = useState(true);
  const [instructors, setInstructors] = useState([]);
  const [q, setQ] = useState('');
  const [view, setView] = useState('grid'); // 'grid' | 'list'

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const data = await instructorService.index();
        if (active) setInstructors(data);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!q) return instructors;
    const n = q.toLowerCase();
    return instructors.filter(
      (i) =>
        i.name?.toLowerCase().includes(n) ||
        i.email?.toLowerCase().includes(n) ||
        i.bio?.toLowerCase().includes(n)
    );
  }, [instructors, q]);

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-7xl p-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Instructors</h1>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search instructors..."
                className="w-64 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div className="ml-2 flex rounded-xl border border-slate-300 bg-white p-1 shadow-sm">
              <button
                onClick={() => setView('grid')}
                className={`rounded-lg px-3 py-2 ${view === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                title="Grid view"
                type="button"
              >
                <GridIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`rounded-lg px-3 py-2 ${view === 'list' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                title="List view"
                type="button"
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
            <Link
              to="/instructors/new"
              className="ml-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
            >
              Add Instructor
            </Link>
          </div>
        </header>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-slate-700">No instructors found.</p>
            <p className="mt-1 text-sm text-slate-500">Try adjusting your search or add a new instructor.</p>
          </div>
        )}

        {/* Data */}
        {!loading && filtered.length > 0 && view === 'grid' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((ins) => (
              <InstructorCard key={ins._id} instructor={ins} />
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && view === 'list' && (
          <div className="space-y-3">
            {filtered.map((ins) => (
              <InstructorRow key={ins._id} instructor={ins} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default InstructorList;