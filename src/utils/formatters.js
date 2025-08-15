import i18n from "../i18n";

export const formatCurrency = (n, currency = "BHD") => {
  const v = Number.isFinite(+n) ? +n : 0;
  try {
    return new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency,
      minimumFractionDigits: 2
    }).format(v);
  } catch {
    return `${v.toFixed(2)} ${currency}`;
  }
};

export const formatNumber = (n) => {
  const v = Number.isFinite(+n) ? +n : 0;
  return new Intl.NumberFormat(i18n.language).format(v);
};

export const formatDate = (d, opts = { year: "numeric", month: "short", day: "numeric" }) => {
  const x = d instanceof Date ? d : new Date(d);
  return new Intl.DateTimeFormat(i18n.language, opts).format(x);
};

export const formatTime = (d, opts = { hour: "2-digit", minute: "2-digit" }) => {
  const x = d instanceof Date ? d : new Date(d);
  return new Intl.DateTimeFormat(i18n.language, opts).format(x);
};