import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import * as instructorService from '../../services/instructorService';

const InstructorDetails = () => {
  const { id } = useParams();
  const [ins, setIns] = useState(null);

  useEffect(() => { (async () => setIns(await instructorService.show(id)))(); }, [id]);

  if (!ins) return <main className="p-6">Loading...</main>;

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-4xl p-6">
        <Link to="/instructors" className="text-sm text-slate-600 hover:text-slate-900">← Back</Link>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">{ins.name}</h1>
          <p className="mt-1 text-slate-700">{ins.email}</p>
          <p className="mt-4 text-slate-800">{ins.bio}</p>
        </div>
      </div>
    </main>
  );
};

export default InstructorDetails;