// src/components/SignUpForm/SignUpForm.jsx
import { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { signUp } from '../../services/authService';
import { UserContext } from '../../contexts/UserContext';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const LEFT_IMAGE_URL = '/images/training-bw-square.jpg';

const SignUpForm = () => {
  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);

  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    passwordConf: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [showPwConf, setShowPwConf] = useState(false);

  const handleChange = (e) => {
    setMessage('');
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const isFormInvalid = () => {
    const { username, password, passwordConf } = formData;
    return !(username && password && passwordConf && password === passwordConf);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { password, passwordConf } = formData;
    if (password !== passwordConf) {
      setMessage('Passwords do not match.');
      return;
    }
    try {
      const newUser = await signUp(formData);
      setUser(newUser);
      navigate('/');
    } catch (err) {
      setMessage(err?.message || 'Unable to sign up.');
    }
  };

  return (
    <main className="min-h-screen grid md:grid-cols-2 bg-slate-900">
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
            Create your account and start organizing courses, instructors, and enrollments in minutes.
          </p>

          <ul className="mt-6 space-y-3 text-slate-100">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5" size={18} />
              <span>Build your catalog and schedules quickly.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5" size={18} />
              <span>Automate payouts, attendance, and reporting.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5" size={18} />
              <span>Scale confidently with a centralized workflow.</span>
            </li>
          </ul>
        </div>
      </aside>

      {/* Right: sign-up form */}
      <section className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">TADRIB</h1>
            <p className="mt-2 text-sm text-slate-400">Create your account</p>
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
                Username <span className="text-rose-400">*</span>
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
                placeholder="Choose a username"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                Password <span className="text-rose-400">*</span>
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="passwordConf" className="block text-sm font-medium text-slate-200">
                Confirm Password <span className="text-rose-400">*</span>
              </label>
              <div className="mt-1 relative">
                <input
                  id="passwordConf"
                  name="passwordConf"
                  type={showPwConf ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.passwordConf}
                  onChange={handleChange}
                  className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 pr-10 text-slate-100 placeholder-slate-400 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwConf((v) => !v)}
                  className="absolute inset-y-0 right-2 inline-flex items-center px-2 text-slate-300 hover:text-white"
                  aria-label={showPwConf ? 'Hide password' : 'Show password'}
                >
                  {showPwConf ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {formData.passwordConf &&
                formData.password !== formData.passwordConf && (
                  <p className="mt-1 text-xs text-rose-400">Passwords must match.</p>
                )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isFormInvalid()}
              className="mt-2 w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-900 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Create account
            </button>
          </form>

          {/* Sign in prompt */}
          <p className="mt-8 text-center text-sm text-slate-300">
            Already have an account?{' '}
            <Link to="/sign-in" className="font-semibold text-white hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
};

export default SignUpForm;