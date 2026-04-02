export const fmtAmt = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:0}).format(Math.abs(n||0));

export const fmtDate = d => { try { return new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}); } catch { return d||""; }};

const pad2 = n => String(n).padStart(2, "0");
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

export const toISO = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const p = n => String(n).padStart(2, "0");

/** Get Monday of the week containing `d` */
export function startOfWeek(d) {
  const s = new Date(d);
  const day = s.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  s.setDate(s.getDate() + diff);
  s.setHours(0, 0, 0, 0);
  return s;
}

export function dateRange(scope, anchor) {
  const y = anchor.getFullYear(), m = anchor.getMonth();
  if (scope === "week") {
    const mon = startOfWeek(anchor);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return [toISO(mon), toISO(sun)];
  }
  if (scope === "month") {
    return [
      `${y}-${p(m + 1)}-01`,
      `${y}-${p(m + 1)}-${p(new Date(y, m + 1, 0).getDate())}`
    ];
  }
  return [`${y}-01-01`, `${y}-12-31`];
}

export function stepDate(scope, anchor, dir) {
  const d = new Date(anchor);
  if (scope === "week") d.setDate(d.getDate() + dir * 7);
  else if (scope === "month") d.setMonth(d.getMonth() + dir);
  else d.setFullYear(d.getFullYear() + dir);
  return d;
}

export function periodLabel(scope, anchor) {
  if (scope === "week") {
    const mon = startOfWeek(anchor);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const fmt = d => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    return `${fmt(mon)} — ${fmt(sun)}`;
  }
  if (scope === "month") return anchor.toLocaleString("en", { month: "long", year: "numeric" });
  return `Year ${anchor.getFullYear()}`;
}
