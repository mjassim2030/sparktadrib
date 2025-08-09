// src/components/InstructorForm/InstructorForm.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as instructorService from "../../services/instructorService";

const MAX_BIO = 800;

const InstructorForm = ({ onSuccess }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", bio: "" });
  const [errors, setErrors] = useState({});
  const [serverErr, setServerErr] = useState("");
  const [sending, setSending] = useState(false);

  const validate = (data) => {
    const e = {};
    if (!data.name.trim()) e.name = "Name is required.";
    if (!data.email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = "Enter a valid email.";
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
      setSending(true);
      setServerErr("");
      const created = await instructorService.create(form);
      if (onSuccess) onSuccess(created);
      // Go back or navigate to a listing page if you have one:
      navigate(-1); // or navigate("/instructors");
    } catch (err) {
      // Handle duplicate email or validation errors from API
      const msg = err?.message || "Failed to create instructor.";
      setServerErr(
        /duplicate key.*email/i.test(msg) || /E11000.*email/i.test(msg)
          ? "This email is already registered."
          : msg
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="p-6">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-2xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
        noValidate
      >
        <h1 className="text-2xl font-bold text-gray-900">New Instructor</h1>
        <p className="mt-1 text-sm text-gray-600">
          Add an instructor with name, email, and a short professional bio.
        </p>

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
            disabled={sending}
            className="rounded-xl bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            {sending ? "Saving…" : "Create Instructor"}
          </button>
        </div>
      </form>
    </main>
  );
};

export default InstructorForm;