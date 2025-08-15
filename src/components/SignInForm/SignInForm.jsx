// src/components/SignInForm/SignInForm.jsx
import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router';
import { signIn } from '../../services/authService';
import { UserContext } from '../../contexts/UserContext';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const LEFT_IMAGE_URL = '/images/training-bw-square.jpg';

const SignInForm = () => {
  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);

  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);

  const handleChange = (e) => {
    setMessage('');
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const signedInUser = await signIn(formData);
      setUser(signedInUser);
      navigate('/');
    } catch (err) {
      setMessage(err.message || 'Unable to sign in.');
    }
  };

  return (
    <main className="min-h-screen grid md:grid-cols-2 bg-slate-700">
      {/* Left: full image with overlay content */}
      <aside
        className="relative hidden md:block"
        style={{
          backgroundImage: `linear-gradient(rgba(2,6,23,0.55), rgba(2,6,23,0.55)), url(${LEFT_IMAGE_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 p-10 flex flex-col justify-end text-white">
          <h2 className="text-3xl font-bold">Training Management, Simplified.</h2>
          <p className="mt-2 text-slate-200 max-w-xl">
            Plan schedules, assign instructors, manage enrollments and payments—all in one place.
          </p>

          <ul className="mt-6 space-y-3 text-slate-100">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5" size={18} />
              <span>Set up your course catalog in minutes.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5" size={18} />
              <span>Track attendance, payouts, and performance.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5" size={18} />
              <span>Centralize communication with students and staff.</span>
            </li>
          </ul>
        </div>
      </aside>

      {/* Right: sign-in form */}
      <section className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">TADRIB</h1>
            <p className="mt-2 text-sm text-slate-400">
              Sign in to continue
            </p>
          </div>

          {message && (
            <p className="mb-4 rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {message}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-200">
                Email / Username <span className="text-rose-400">*</span>
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={formData.username}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-400 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                  Password <span className="text-rose-400">*</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-slate-300 hover:text-white"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 pr-10 text-slate-100 placeholder-slate-400 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-2 inline-flex items-center px-2 text-slate-300 hover:text-white"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="mt-2 w-full rounded-lg px-4 py-2.5 font-semibold focus:outline-none focus:ring-2 btn-secondary"
            >
              Sign in
            </button>
          </form>

          {/* Sign up prompt */}
          <p className="mt-8 text-center text-sm text-slate-300">
            Don’t have an account?{' '}
            <Link to="/sign-up" className="font-semibold text-white hover:underline">
              Sign up here
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
};

export default SignInForm;