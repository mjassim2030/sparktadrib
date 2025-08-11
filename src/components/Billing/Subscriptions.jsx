// src/components/Billing/Subscriptions.jsx
import React, { useMemo, useState } from "react";
import { Check, Star, Crown } from "lucide-react";

const API_BASE =
  import.meta.env.VITE_BACK_END_SERVER_URL?.replace(/\/+$/, "") || "";

const currency = (n) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "BHD",
    minimumFractionDigits: 2,
  }).format(n);

const PLANS = [
  {
    id: "free",
    name: "Starter (Free)",
    tagline: "Launch quickly with essentials.",
    monthly: 0,
    annual: 0,
    cta: "Start Free",
    badge: null,
    features: [
      "Up to 2 active courses",
      "1 admin + 2 instructors",
      "Basic schedule & attendance",
      "Enrollment list (read-only)",
      "PDF exports (courses & calendar)",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Scale delivery and operations.",
    monthly: 8.0,
    annual: 80.0, // ~2 months free
    cta: "Upgrade to Pro",
    badge: "Most popular",
    icon: <Star className="h-5 w-5 text-yellow-500" />,
    features: [
      "Up to 25 active courses",
      "Unlimited instructors",
      "Full enrollment management",
      "Instructor attendance & payouts",
      "Course templates & cloning",
      "Reports dashboard",
      "Calendar sync (ICS) & reminders",
      "Priority support (24–48h)",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "Operate at scale with control.",
    monthly: 18.0,
    annual: 180.0, // ~2 months free
    cta: "Upgrade to Business",
    badge: "Best value",
    icon: <Crown className="h-5 w-5 text-indigo-500" />,
    features: [
      "Unlimited courses",
      "Teams & role-based permissions",
      "Advanced analytics & CSV exports",
      "Custom fields & workflows",
      "Instructor rate cards by course",
      "Audit log & approvals",
      "SSO (Google/Microsoft)*",
      "Priority support (same business day)",
    ],
    footnote: "* SSO can be enabled on request.",
  },
];

async function handleSubscribe(planId, cycle = "monthly") {
  // Expect backend to return { url } for hosted checkout (e.g., Stripe)
  try {
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${API_BASE}/billing/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ planId, cycle }), // cycle: 'monthly' | 'annual'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || data?.err || res.statusText);

    if (data?.url) {
      window.location.href = data.url;
    } else {
      alert("Checkout link is not available. Please try again or contact support.");
    }
  } catch (e) {
    alert(e?.message || "Unable to start checkout.");
  }
}

const Subscriptions = () => {
  const [cycle, setCycle] = useState("monthly"); // 'monthly' | 'annual'
  const annualSavingsNote = "≈ 2 months free on annual plans";

  const pricedPlans = useMemo(
    () =>
      PLANS.map((p) => ({
        ...p,
        displayPrice: p[cycle],
        per: p.id === "free" ? "" : `/${cycle === "monthly" ? "month" : "year"}`,
      })),
    [cycle]
  );

  return (
    <main className="mx-auto max-w-6xl">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Subscriptions</h1>
        <p className="mt-1 text-slate-600">
          Choose the plan that fits your training operations. Upgrade anytime.
        </p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`px-4 py-1.5 text-sm rounded-lg ${
              cycle === "monthly"
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle("annual")}
            className={`px-4 py-1.5 text-sm rounded-lg ${
              cycle === "annual"
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Annual
          </button>
          <span className="ml-2 pr-2 text-xs text-slate-500 hidden md:inline">
            {annualSavingsNote}
          </span>
        </div>
      </header>

      {/* Plans */}
      <section className="grid gap-6 md:grid-cols-3">
        {pricedPlans.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex h-full flex-col rounded-2xl border bg-white shadow-sm ${
              plan.id === "pro"
                ? "border-green-600 ring-2 ring-green-600/20"
                : "border-slate-200"
            }`}
          >
            {/* Badge */}
            {plan.badge && (
              <div className="absolute -top-3 left-4 rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white shadow">
                {plan.badge}
              </div>
            )}

            <div className="p-6">
              <div className="flex items-center gap-2">
                {plan.icon}
                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
              </div>
              <p className="mt-1 text-sm text-slate-600">{plan.tagline}</p>

              <div className="mt-5">
                {plan.id === "free" ? (
                  <div className="text-3xl font-extrabold text-slate-900">Free</div>
                ) : (
                  <div className="flex items-end gap-1">
                    <div className="text-3xl font-extrabold text-slate-900">
                      {currency(plan.displayPrice)}
                    </div>
                    <div className="pb-1 text-sm text-slate-600">{plan.per}</div>
                  </div>
                )}
              </div>

              <ul className="mt-5 space-y-2">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 flex-none text-green-600" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {plan.footnote && (
                <p className="mt-3 text-xs text-slate-500">{plan.footnote}</p>
              )}
            </div>

            <div className="mt-auto p-6 pt-0">
              <button
                type="button"
                onClick={() => handleSubscribe(plan.id, cycle)}
                className={`w-full rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  plan.id === "free"
                    ? "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                    : plan.id === "pro"
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-slate-900 text-white hover:bg-black"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Included for all plans */}
      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
        <h4 className="text-lg font-semibold text-slate-900">Included in all plans</h4>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {[
            "Secure authentication and role-based access",
            "Course scheduling with calendar export (ICS)",
            "Instructor “My Courses” & “My Schedule” views",
            "Attendance tracking & PDF printing",
            "CSV/PDF exports (courses, schedules, enrollments)",
            "Email support and regular updates",
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <Check className="mt-0.5 h-4 w-4 flex-none text-green-600" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance / Note */}
      <p className="mt-6 text-xs text-slate-500">
        Prices shown in BHD. Taxes may apply based on your region. You can change or cancel
        your plan at any time.
      </p>
    </main>
  );
};

export default Subscriptions;