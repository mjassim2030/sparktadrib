import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en/common.json";
import ar from "./locales/ar/common.json";

/* Determine initial language */
const saved = typeof localStorage !== "undefined" ? localStorage.getItem("lang") : null;
const fallbackLng = "en";
const initialLng = saved || (navigator.language?.startsWith("ar") ? "ar" : fallbackLng);

/* Helpers to keep <html> in sync (lang/dir) */
const RTL_LANGS = ["ar", "fa", "ur", "he"];
const applyDirLang = (lng) => {
  const html = document.documentElement;
  html.setAttribute("lang", lng);
  html.setAttribute("dir", RTL_LANGS.includes(lng) ? "rtl" : "ltr");
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: en },
      ar: { common: ar },
    },
    lng: initialLng,
    fallbackLng,
    supportedLngs: ["en", "ar"],
    ns: ["common"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    returnNull: false,
  });

applyDirLang(initialLng);
i18n.on("languageChanged", (lng) => applyDirLang(lng));

export default i18n;