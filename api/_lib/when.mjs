export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MONTHLY_FROM = 1648, FIRST_YEAR = -3400, MID_DAY = 15, START = "1815-07";
const DAY0 = Date.UTC(1886, 0, 1), DAY_MS = 86400000;

const utc = (y, m, d) => { const x = new Date(0); x.setUTCFullYear(y, m - 1, d); x.setUTCHours(0, 0, 0, 0); return x.getTime(); };
export const dayFromDate = (y, m, d) => Math.round((utc(y, m, d) - DAY0) / DAY_MS);
export const dateOfDay = (day) => { const d = new Date(DAY0 + day * DAY_MS); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]; };
export function timeOfDay(day) {
  const y = dateOfDay(day)[0], start = utc(y, 1, 1), len = (utc(y + 1, 1, 1) - start) / DAY_MS;
  return y + ((DAY0 + day * DAY_MS - start) / DAY_MS + 0.5) / len;
}
export const fmtYear = (y) => (y < 0 ? -y + " BC" : y < 1000 ? "AD " + y : String(y));

export const WHEN_RE = /^(-?\d{1,4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/;

export function readWhen(s, lastDay) {
  const m = WHEN_RE.exec(String(s || "").trim()) || WHEN_RE.exec(START);
  let y = +m[1], mo = m[2] ? +m[2] : 0, d = m[3] ? +m[3] : 0;
  if (y === 0) y = 1;
  if (y < FIRST_YEAR) y = FIRST_YEAR;
  if (y < MONTHLY_FROM) return { monthly: false, year: y, t: y, label: fmtYear(y) };
  if (mo < 1 || mo > 12) { mo = 7; d = 0; }
  if (d > new Date(Date.UTC(y, mo, 0)).getUTCDate()) d = 0;
  let day = dayFromDate(y, mo, d || MID_DAY);
  if (lastDay !== undefined && day > lastDay) { day = lastDay; const x = dateOfDay(day); y = x[0]; mo = x[1]; d = 0; }
  return { monthly: true, year: y, day, t: timeOfDay(day), label: (d ? d + " " : "") + MONTHS[mo - 1] + " " + y };
}
