import { useState, useContext } from 'react'
import { useNavigate, Link } from 'react-router'
import { signIn } from '../../services/authService'
import { UserContext } from '../../contexts/UserContext'
const LEFT_IMAGE_URL = "../../src/assets/training-bw-square.jpg"; // square B&W photo

const SignInForm = () => {
  const navigate = useNavigate()
  const { setUser } = useContext(UserContext)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({ username: '', password: '' })

  const handleChange = (e) => {
    setMessage('')
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const signedInUser = await signIn(formData)
      setUser(signedInUser)
      navigate('/')
    } catch (err) {
      setMessage(err.message || 'Unable to sign in.')
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-14">
        <div className="grid gap-10 md:grid-cols-2 items-stretch">
          {/* --- Left visual panel --- */}

          <section
            style={{
              backgroundImage: `linear-gradient(rgba(15,23,42,0.55), rgba(15,23,42,0.55)), url(${LEFT_IMAGE_URL})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
            className="relative hidden md:flex overflow-hidden rounded-2xl"
          >


            <div className="flex w-full flex-col justify-between p-10">
              {/* Text block */}
              <div>
                <p className="text-3xl font-semibold text-white">
                  Training Management, Simplified.
                </p>
                <p className="mt-2 text-slate-200 text-sm">
                  Plan schedules, assign instructors, manage enrollment and payments, and track outcomes—all in one place.
                </p>
              </div>
            </div>
          </section>

          {/* Right form panel */}
          <section className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
              {/* Brand */}
              <div className="mb-6 flex items-center justify-center">
                {/* Swap with your logo as needed */}
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">TADRIB</h1>
              </div>

              <p className="mb-8 text-center text-sm text-slate-500">
                Course management services for institutes and trainers.
              </p>

              {message && (
                <p className="mb-4 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                  {message}
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
                {/* Username */}
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-slate-700">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <div className="mt-2 text-right">
                    <Link
                      to="/forgot-password"
                      className="text-sm font-medium text-slate-700 hover:text-slate-900"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="mt-2 w-full rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-700"
                >
                  Sign In
                </button>
              </form>

              {/* Sign up prompt */}
              <p className="mt-6 text-center text-sm text-slate-600">
                Don&apos;t have an account?{' '}
                <Link to="/sign-up" className="font-semibold text-green-600 hover:text-green-800">
                  Register Now
                </Link>
              </p>
            </div>
          </section>
        </div>

        {/* Footer (optional) */}
        <footer className="mx-auto mt-10 max-w-7xl text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 text-sm">
            <p>© {new Date().getFullYear()} Tadrib. All rights reserved.</p>
            <nav className="flex flex-wrap gap-6">
              <Link to="/about" className="hover:text-slate-800">About Us</Link>
              <Link to="/contact" className="hover:text-slate-800">Contact Us</Link>
              <Link to="/terms" className="hover:text-slate-800">Terms &amp; Conditions</Link>
              <Link to="/privacy" className="hover:text-slate-800">Privacy Policy</Link>
            </nav>
          </div>
        </footer>
      </div>
    </main>
  )
}

export default SignInForm