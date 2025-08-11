// src/components/Auth/SetPassword.jsx
import React, { useEffect, useState, useContext } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { inspectInvite, acceptInvite } from "../../services/authService";
import { UserContext } from "../../contexts/UserContext";

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
    return () => { active = false; };
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
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-14">
        <div className="grid gap-10 md:grid-cols-2 items-stretch">
          {/* Left visual panel */}
          <section
            style={{
              backgroundImage: `linear-gradient(rgba(15,23,42,0.55), rgba(15,23,42,0.55)), url(${LEFT_IMAGE_URL})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            className="relative hidden md:flex overflow-hidden rounded-2xl"
          >
            <div className="flex w-full flex-col justify-between p-10">
              <div>
                <p className="text-3xl font-semibold text-white">Welcome to TADRIB.</p>
                <p className="mt-2 text-slate-200 text-sm">
                  Set your password to access your instructor workspace.
                </p>
              </div>
            </div>
          </section>

          {/* Right form panel */}
          <section className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
              <div className="mb-6 flex items-center justify-center">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">TADRIB</h1>
              </div>

              {loading ? (
                <p className="text-center text-slate-600">Checking your invite…</p>
              ) : inspectErr ? (
                <>
                  <p className="mb-4 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                    {inspectErr}
                  </p>
                  <div className="text-center">
                    <Link to="/sign-in" className="text-blue-700 hover:underline">
                      Go to Sign In
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-4 text-center text-sm text-slate-600">
                    Set a password for{" "}
                    <span className="font-semibold">{inviteInfo?.username}</span>
                    {inviteInfo?.instructorName ? (
                      <> (Instructor: {inviteInfo.instructorName})</>
                    ) : null}
                  </p>

                  {submitErr && (
                    <p className="mb-4 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                      {submitErr}
                    </p>
                  )}

                  <form onSubmit={onSubmit} className="space-y-5" autoComplete="off">
                    {/* Password */}
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                        New Password <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        placeholder="••••••••"
                      />
                      <p className="mt-1 text-xs text-slate-500">Use at least 8 characters.</p>
                    </div>

                    {/* Confirm */}
                    <div>
                      <label htmlFor="passwordConf" className="block text-sm font-medium text-slate-700">
                        Confirm Password <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="passwordConf"
                        name="passwordConf"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={passwordConf}
                        onChange={(e) => setPasswordConf(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        placeholder="••••••••"
                      />
                      {passwordConf && password !== passwordConf && (
                        <p className="mt-1 text-xs text-rose-600">Passwords must match.</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={busy || isInvalid()}
                      className="mt-2 w-full rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-700 disabled:opacity-60"
                    >
                      {busy ? "Setting Password…" : "Set Password"}
                    </button>
                  </form>

                  <p className="mt-6 text-center text-sm text-slate-600">
                    Already have an account?{" "}
                    <Link to="/sign-in" className="font-semibold text-green-600 hover:text-green-800">
                      Sign In
                    </Link>
                  </p>
                </>
              )}
            </div>
          </section>
        </div>

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
  );
};

export default SetPassword;