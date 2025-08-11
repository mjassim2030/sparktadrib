// src/components/InstructorForm/InstructorForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as instructorService from "../../services/instructorService";
import { Link } from "react-router-dom";
import { Mail, Link as LinkIcon, UserPlus, Copy } from "lucide-react";

const MAX_BIO = 800;

const InstructorForm = ({ instructor = null, onSuccess }) => {
  const navigate = useNavigate();

  // form state
  const [form, setForm] = useState({ name: "", email: "", bio: "" });
  const [errors, setErrors] = useState({});
  const [serverErr, setServerErr] = useState("");
  const [saving, setSaving] = useState(false);

  // invite/link state
  const [doc, setDoc] = useState(instructor || null);
  const [inviting, setInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteErr, setInviteErr] = useState("");
  const [copied, setCopied] = useState(false);

  const [linkEmail, setLinkEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkErr, setLinkErr] = useState("");
  const [linkOk, setLinkOk] = useState(false);

  useEffect(() => {
    if (instructor) {
      setForm({
        name: instructor.name || "",
        email: instructor.email || "",
        bio: instructor.bio || "",
      });
      setDoc(instructor);
    }
  }, [instructor?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const mode = useMemo(() => (doc?._id ? "edit" : "create"), [doc?._id]);

  const validate = (data) => {
    const e = {};
    if (!data.name.trim()) e.name = "Name is required.";
    if (!data.email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      e.email = "Enter a valid email.";
    if (!data.bio.trim()) e.bio = "Bio is required.";
    else if (data.bio.length > MAX_BIO) e.bio = `Bio must be ≤ ${MAX_BIO} characters.`;
    return e;
  };

  const handleChange = (evt) => {
    const { name, value } = evt.target;
    setForm((s) => ({ ...s, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
    setServerErr("");
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    const e = validate(form);
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    try {
      setSaving(true);
      setServerErr("");
      let saved;
      if (mode === "edit") {
        saved = await instructorService.update(doc._id, form);
      } else {
        saved = await instructorService.create(form);
      }
      setDoc(saved);
      if (onSuccess) onSuccess(saved);
      // After create/update, keep user here to invite/link right away.
    } catch (err) {
      const msg = err?.message || "Failed to save instructor.";
      setServerErr(
        /duplicate key.*email/i.test(msg) || /E11000.*email/i.test(msg)
          ? "This email is already registered."
          : msg
      );
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!doc?._id) return;
    try {
      setInviting(true);
      setInviteErr("");
      setCopied(false);
      const res = await instructorService.invite(doc._id);
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
    try {
      if (!inviteUrl) return;
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const handleLinkUser = async () => {
    if (!doc?._id || !linkEmail.trim()) return;
    try {
      setLinking(true);
      setLinkErr("");
      setLinkOk(false);
      const updated = await instructorService.linkUser(doc._id, { email: linkEmail.trim() });
      setDoc(updated);
      setLinkOk(true);
      setTimeout(() => setLinkOk(false), 2000);
    } catch (e) {
      setLinkErr(e?.message || "Failed to link user.");
    } finally {
      setLinking(false);
    }
  };

  return (
    <main className="p-6">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-2xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
        noValidate
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === "edit" ? "Edit Instructor" : "New Instructor"}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {mode === "edit"
                ? "Update details or invite/link the instructor."
                : "Add an instructor with name, email, and a short professional bio."}
            </p>
          </div>

          {/* Invite button appears when a persisted doc exists */}
          {doc?._id && (
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
          )}
        </div>

        {serverErr && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverErr}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-5">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name <span className="text-red-600">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-lg border ${
                errors.name ? "border-red-300" : "border-gray-300"
              } px-3 py-2 shadow-sm focus:border-gray-900 focus:ring-gray-900`}
              placeholder="e.g., Ali Al Qaraan"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email <span className="text-red-600">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-lg border ${
                errors.email ? "border-red-300" : "border-gray-300"
              } px-3 py-2 shadow-sm focus:border-gray-900 focus:ring-gray-900`}
              placeholder="name@example.com"
              autoComplete="off"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
              Bio <span className="text-red-600">*</span>
            </label>
            <textarea
              id="bio"
              name="bio"
              required
              rows={6}
              value={form.bio}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-lg border ${
                errors.bio ? "border-red-300" : "border-gray-300"
              } px-3 py-2 shadow-sm focus:border-gray-900 focus:ring-gray-900`}
              placeholder="Short professional bio, expertise, certifications…"
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              {errors.bio ? (
                <p className="text-red-600">{errors.bio}</p>
              ) : (
                <span className="text-gray-500">Tell us about their expertise.</span>
              )}
              <span className="text-gray-500">
                {form.bio.length}/{MAX_BIO}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Instructor"}
          </button>
        </div>

        {/* Invitation + Linking panel (visible once an instructor record exists) */}
        {doc?._id && (
          <section className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <UserPlus size={16} />
              Access & Invitation
            </h2>

            {/* Invite row */}
            <div className="mt-3 rounded-xl bg-white border border-gray-200 p-4">
              {inviteErr && (
                <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {inviteErr}
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-sm text-gray-700">
                    Generate an invitation link, copy it, and share with the instructor to set their password.
                  </div>
                  {inviteUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      <LinkIcon size={16} className="text-gray-500" />
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
                    {inviting ? "Generating…" : "Invite & Copy"}
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
            </div>

            {/* Link existing user by email */}
            <div className="mt-3 rounded-xl bg-white border border-gray-200 p-4">
              {linkErr && (
                <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {linkErr}
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-gray-700">
                    Link existing user by email
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
                <p className="mt-2 text-sm text-green-700">
                  User linked successfully.
                </p>
              )}
            </div>

            {/* Helpful hint */}
            <p className="mt-3 text-xs text-gray-500">
              After the instructor sets their password and signs in, “My Courses” will reflect their assigned courses automatically.
            </p>
          </section>
        )}

        {/* Footer hint */}
        <div className="mt-6 text-xs text-gray-500">
          <Link to="/instructors" className="text-blue-700 hover:underline">
            Back to Instructors
          </Link>
        </div>
      </form>
    </main>
  );
};

export default InstructorForm;