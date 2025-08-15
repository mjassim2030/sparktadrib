import React, { useEffect, useMemo, useState } from "react";
import { Palette, Languages, RotateCcw, Cog, MonitorSmartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";

/*
  Settings.jsx — outlet-friendly layout with i18n
  - Theme selector (system, ocean/ocean-dark, emerald/emerald-dark, royal/royal-dark)
  - Language selector (en, ar) with automatic dir switching via i18n/index.js
  - Persists to localStorage and applies immediately
  - Uses your tokenized classes (.card, .small-cards, .btn, .headers)
*/

const THEMES = [
  { value: "system", preview: { bg: "#fff", p: "#64748b", s: "#94a3b8" } },
  { value: "ocean", preview: { bg: "#f3f4f6", p: "#334155", s: "#e2e8f0" } },
  { value: "ocean-dark", preview: { bg: "#0f172a", p: "#e2e8f0", s: "#334155" } },
  { value: "emerald", preview: { bg: "#f7fdf9", p: "#22c55e", s: "#16a34a" } },
  { value: "emerald-dark", preview: { bg: "#0a0f0a", p: "#22c55e", s: "#16a34a" } },
  { value: "royal", preview: { bg: "#f8f7ff", p: "#6366f1", s: "#8b5cf6" } },
  { value: "royal-dark", preview: { bg: "#0f1022", p: "#818cf8", s: "#a78bfa" } },
];

const LANGUAGES = [
  { value: "en", dir: "ltr" },
  { value: "ar", dir: "rtl" },
];

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
  localStorage.setItem("app.theme", theme);
}

function Swatch({ bg, p, s }) {
  return (
    <div className="flex gap-1 items-center">
      <div className="h-8 w-10 rounded border" style={{ backgroundColor: bg }} />
      <div className="h-8 w-3 rounded border" style={{ backgroundColor: p }} />
      <div className="h-8 w-3 rounded border" style={{ backgroundColor: s }} />
    </div>
  );
}

export default function Settings() {
  const { t } = useTranslation();

  // Use saved theme; for language, prefer i18n current to stay in sync with bootstrap
  const [theme, setTheme] = useState(() => localStorage.getItem("app.theme") || "system");
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || i18n.language || "en");

  // Apply theme tokens
  useEffect(() => { applyTheme(theme); }, [theme]);

  // Apply language via i18n (updates <html lang/dir> in i18n/index.js)
  useEffect(() => {
    localStorage.setItem("lang", lang);
    i18n.changeLanguage(lang);
  }, [lang]);

  // Localized option labels
  const themeOptions = useMemo(() => ([
    { value: "system", label: t("themes.system") },
    { value: "ocean", label: t("themes.ocean") },
    { value: "ocean-dark", label: t("themes.oceanDark") },
    { value: "emerald", label: t("themes.emerald") },
    { value: "emerald-dark", label: t("themes.emeraldDark") },
    { value: "royal", label: t("themes.royal") },
    { value: "royal-dark", label: t("themes.royalDark") },
  ]), [t]);

  const languageOptions = useMemo(() => ([
    { value: "en", dir: "ltr", label: t("languages.en") },
    { value: "ar", dir: "rtl", label: t("languages.ar") },
  ]), [t]);

  const currentThemeLabel =
    themeOptions.find((o) => o.value === theme)?.label ?? t("themes.system");

  const resetDefaults = () => {
    setTheme("system");
    setLang("en");
  };

  return (
    <main className="p-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          {t("settings.title")}
        </h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {t("settings.description")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: settings sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* THEME */}
          <section className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Palette className="label h-5 w-5" />
                <h2 className="label">{t("settings.themeLabel")}</h2>
              </div>
              <div className="text-xs" style={{ color: "var(--text-primary)" }}>{currentThemeLabel}</div>
            </div>

            <p className="hint mb-4">{t("settings.selectTheme")}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {THEMES.map((tkn) => {
                const label = themeOptions.find(o => o.value === tkn.value)?.label ?? tkn.value;
                return (
                  <label
                    key={tkn.value}
                    className={`small-cards flex items-center gap-3 cursor-pointer transition border ${theme === tkn.value ? "ring-2" : ""}`}
                    style={theme === tkn.value ? { boxShadow: "0 0 0 2px var(--focus) inset" } : {}}
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={tkn.value}
                      checked={theme === tkn.value}
                      onChange={() => setTheme(tkn.value)}
                      className="sr-only"
                    />
                    <Swatch {...tkn.preview} />
                    <div className="flex-1">
                      <div className="label">{label}</div>
                      <div className="text-xs hint break-words">{tkn.value}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {/* LANGUAGE */}
          <section className="card">
            <div className="flex items-center gap-2 mb-4">
              <Languages className="label h-5 w-5" />
              <h2 className="label">{t("settings.languageLabel")}</h2>
            </div>
            <p className="label mb-4 text-sm">{t("settings.selectLanguage")}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {languageOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`small-cards label flex items-center justify-between gap-3 cursor-pointer transition border ${lang === opt.value ? "ring-2" : ""}`}
                  style={lang === opt.value ? { boxShadow: "0 0 0 2px var(--focus) inset" } : {}}
                >
                  <div className="flex items-center gap-3">
                    <MonitorSmartphone className="h-5 w-5" />
                    <div>
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-xs hint">{opt.dir.toUpperCase()}</div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="language"
                    value={opt.value}
                    checked={lang === opt.value}
                    onChange={() => setLang(opt.value)}
                    className="h-4 w-4"
                  />
                </label>
              ))}
            </div>
          </section>

          {/* ACTIONS */}
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn btn-secondary" onClick={resetDefaults}>
              <RotateCcw className="h-4 w-4 mr-2" />
              {t("buttons.save") /* You can use a dedicated key like buttons.reset if you add it */}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => { /* reserved for future explicit save */ }}
            >
              {t("buttons.save")}
            </button>
          </div>
        </div>

        {/* Right: live preview / about */}
        <aside className="space-y-6">
          <section className="card">
            <div className="flex items-center gap-2 mb-3">
              <Cog className="label h-5 w-5" />
              <h3 className="label text-base font-semibold">{/* t("settings.livePreview") */}Live preview</h3>
            </div>
            <p className="hint mb-4">{/* t("settings.previewHint") */}A quick look at how components render with your current theme.</p>

            <div className="grid gap-3">
              <div className="small-cards">
                <div className="text-sm mb-2" style={{ color: "var(--muted)" }}>{/* t("settings.buttonsLabel") */}Buttons</div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-primary">{t("buttons.save") /* sample */}</button>
                  <button className="btn btn-secondary">{/* t("buttons.change") */}Secondary</button>
                  <button className="btn btn-neutral">{/* t("buttons.cancel") */}Neutral</button>
                  <button className="btn btn-ghost">{/* t("buttons.close") */}Ghost</button>
                  <button className="btn btn-danger">Danger</button>
                </div>
              </div>

              <div className="small-cards">
                <div className="text-sm mb-2" style={{ color: "var(--muted)" }}>{/* t("settings.inputsLabel") */}Inputs</div>
                <div className="grid gap-2">
                  <input className="input" placeholder="Text input" />
                  <select className="select">
                    <option>Option A</option>
                    <option>Option B</option>
                  </select>
                  <textarea className="textarea" rows={3} placeholder="Textarea"></textarea>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}