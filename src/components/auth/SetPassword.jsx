// src/components/Auth/SetPassword.jsx
import React, { useEffect, useState, useContext } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { inspectInvite, acceptInvite } from "../../services/authService";
import { UserContext } from "../../contexts/UserContext";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";

const LEFT_IMAGE_URL = "/images/training-bw-square.jpg";

const SetPassword = () => {
  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [inspectErr, setInspectErr] = useState("");
  const [inviteInfo, setInviteInfo] = useState(null);

  const [password, setPassword] = useState("");
  const [passwordConf, setPasswordConf] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPwConf, setShowPwConf] = useState(false);

  const [submitErr, setSubmitErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!token) {
          setInspectErr("Missing invite token.");
          return;
        }
        setLoading(true);
        const info = await inspectInvite(token);
        if (!active) return;
        setInviteInfo(info); // { username, expiresAt, instructorName? }
      } catch (e) {
        if (!active) return;
        setInspectErr(e?.message || "This invite link is invalid or expired.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const isInvalid = () => {
    if (!password || !passwordConf) return true;
    if (password !== passwordConf) return true;
    if (password.length < 8) return true;
    return false;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitErr("");
    if (password !== passwordConf) {
      setSubmitErr("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setSubmitErr("Use at least 8 characters.");
      return;
    }
    try {
      setBusy(true);
      const { token: jwt, user } = await acceptInvite({ token, password });
      localStorage.setItem("token", jwt);
      setUser?.(user);
      navigate("/");
    } catch (e) {
      setSubmitErr(e?.message || "Unable to set password with this invite.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen grid md:grid-cols-2 bg-slate-900">
      {/* Left: full image with gradient overlay and highlights */}
      <aside
        className="relative hidden md:block"
        style={{
          backgroundImage: `linear-gradient(rgba(2,6,23,0.55), rgba(2,6,23,0.55)), url(${LEFT_IMAGE_URL})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute inset-0 p-10 flex flex-col justify-end text-white">
          <h2 className="text-3xl font-bold">Welcome to TADRIB.</h2>
          <p className="mt-2 text-slate-200 max-w-xl">
            Set your password to access your instructor workspace and get started quickly.
          </p>

          <ul className="mt-6 space-y-3 text-slate-100">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5" size={18} />
              <span>Centralize courses, schedules, and payouts.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5" size={18} />
              <span>Track attendance and progress at a glance.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5" size={18} />
              <span>Collaborate efficiently with your team.</span>
            </li>
          </ul>
        </div>
      </aside>

      {/* Right: form */}
      <section className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">TADRIB</h1>
            <p className="mt-2 text-sm text-slate-400">Set your password</p>
          </div>

          {loading ? (
            <p className="text-center text-slate-300">Checking your invite…</p>
          ) : inspectErr ? (
            <>
              <p className="mb-4 rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {inspectErr}
              </p>
              <div className="text-center">
                <Link to="/sign-in" className="text-white hover:underline">
                  Go to Sign in
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="mb-4 text-center text-sm text-slate-300">
                Set a password for{" "}
                <span className="font-semibold text-white">{inviteInfo?.username}</span>
                {inviteInfo?.instructorName ? (
                  <> (Instructor: {inviteInfo.instructorName})</>
                ) : null}
              </p>

              {submitErr && (
                <p className="mb-4 rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {submitErr}
                </p>
              )}

              <form onSubmit={onSubmit} className="space-y-5" autoComplete="off">
                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                    New Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      name="password"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 pr-10 text-slate-100 placeholder-slate-400 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute inset-y-0 right-2 inline-flex items-center px-2 text-slate-300 hover:text-white"
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Use at least 8 characters.</p>
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
                      type={showPwConf ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={passwordConf}
                      onChange={(e) => setPasswordConf(e.target.value)}
                      className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 pr-10 text-slate-100 placeholder-slate-400 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwConf((v) => !v)}
                      className="absolute inset-y-0 right-2 inline-flex items-center px-2 text-slate-300 hover:text-white"
                      aria-label={showPwConf ? "Hide password" : "Show password"}
                    >
                      {showPwConf ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {passwordConf && password !== passwordConf && (
                    <p className="mt-1 text-xs text-rose-400">Passwords must match.</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={busy || isInvalid()}
                  className="mt-2 w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-900 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"
                >
                  {busy ? "Setting password…" : "Set password"}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-slate-300">
                Already have an account?{" "}
                <Link to="/sign-in" className="font-semibold text-white hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
};

export default SetPassword;