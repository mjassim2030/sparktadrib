// src/components/InstructorDetails/InstructorDetails.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import * as instructorService from "../../services/instructorService";
import { Mail, Link as LinkIcon, Copy, UserCheck } from "lucide-react";

const InstructorDetails = () => {
  const { id } = useParams();
  const [ins, setIns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");

  // Invite state
  const [inviting, setInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteErr, setInviteErr] = useState("");
  const [copied, setCopied] = useState(false);

  // Link-by-email state
  const [linkEmail, setLinkEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkErr, setLinkErr] = useState("");
  const [linkOk, setLinkOk] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setLoadErr("");
        const data = await instructorService.show(id);
        if (!active) return;
        setIns(data);
        setLinkEmail(data?.email || "");
      } catch (e) {
        if (!active) return;
        setLoadErr(e?.message || "Failed to load instructor.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  const handleInvite = async () => {
    if (!ins?._id) return;
    try {
      setInviting(true);
      setInviteErr("");
      setCopied(false);
      const res = await instructorService.invite(ins._id); // { url, expiresAt }
      const url = res?.url || "";
      if (!url) throw new Error("Invite URL not returned by server.");
      setInviteUrl(url);
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch (e) {
      setInviteErr(e?.message || "Failed to create invite link.");
    } finally {
      setInviting(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  const handleLinkUser = async () => {
    if (!ins?._id || !linkEmail.trim()) return;
    try {
      setLinking(true);
      setLinkErr("");
      setLinkOk(false);
      const updated = await instructorService.linkUser(ins._id, { email: linkEmail.trim() });
      setIns(updated);
      setLinkOk(true);
      setTimeout(() => setLinkOk(false), 1500);
    } catch (e) {
      setLinkErr(e?.message || "Failed to link user.");
    } finally {
      setLinking(false);
    }
  };

  if (loading) return <main className="p-6">Loading…</main>;
  if (loadErr) {
    return (
      <main className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {loadErr}
        </div>
      </main>
    );
  }
  if (!ins) return <main className="p-6">Not found.</main>;

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-4xl p-6">
        <Link to="/instructors" className="text-sm text-slate-600 hover:text-slate-900">
          ← Back
        </Link>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{ins.name}</h1>
              <p className="mt-1 text-slate-700">{ins.email}</p>
              {ins.user ? (
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-sm text-green-700 border border-green-200">
                  <UserCheck size={14} />
                  Linked to user
                </div>
              ) : (
                <div className="mt-2 text-sm text-slate-600">
                  Not linked to a user yet.
                </div>
              )}
            </div>

            {/* Invite button (always visible to admin on this page) */}
            <button
              type="button"
              onClick={handleInvite}
              disabled={inviting}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-60"
              title="Create invitation link and copy it"
            >
              <Mail size={16} />
              {inviting ? "Generating…" : "Invite & Copy Link"}
            </button>
          </div>

          <p className="mt-4 text-slate-800 whitespace-pre-line">{ins.bio}</p>

          {/* Invitation panel */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <LinkIcon size={16} />
              Invitation
            </h2>

            {inviteErr && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {inviteErr}
              </div>
            )}

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm text-gray-700">
                  Generate an invitation link and share it so the instructor can set a password.
                </div>
                {inviteUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="truncate text-sm text-gray-700">{inviteUrl}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleInvite}
                  disabled={inviting}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                >
                  <Mail size={16} />
                  {inviting ? "Generating…" : "Invite"}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!inviteUrl}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  title="Copy invite link"
                >
                  <Copy size={16} />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </section>

          {/* Link existing user */}
          <section className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h2 className="text-sm font-semibold text-gray-900">Link Existing User</h2>

            {linkErr && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {linkErr}
              </div>
            )}

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-gray-700">
                  User email to link
                </span>
                <input
                  type="email"
                  value={linkEmail}
                  onChange={(e) => setLinkEmail(e.target.value)}
                  placeholder="existing.user@example.com"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:ring-gray-900"
                />
              </label>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleLinkUser}
                  disabled={linking || !linkEmail}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {linking ? "Linking…" : "Link User"}
                </button>
              </div>
            </div>

            {linkOk && (
              <p className="mt-2 text-sm text-green-700">User linked successfully.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default InstructorDetails;