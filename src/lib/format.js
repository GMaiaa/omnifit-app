/* ---------------------------------------------------------
   HELPERS
--------------------------------------------------------- */
export const uid = () => Math.random().toString(36).slice(2, 10);

export function mondayOf(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
export function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
export function fmtPace(secPerKm) {
  if (!secPerKm || !isFinite(secPerKm)) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
export function fmtDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}m`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
export function fmtDateShort(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
export function fmtWeight(kg) {
  if (kg === null || kg === undefined || !isFinite(kg)) return "—";
  return `${kg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
}
export function fmtVolume(kg) {
  if (kg === null || kg === undefined || !isFinite(kg)) return "—";
  return `${Math.round(kg).toLocaleString("pt-BR")} kg`;
}
export function fmtDistanceM(m) {
  if (m === null || m === undefined || !isFinite(m)) return "—";
  if (m >= 1000) return `${(m / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km`;
  return `${Math.round(m).toLocaleString("pt-BR")} m`;
}
export function fmtSpeed(kmh) {
  if (kmh === null || kmh === undefined || !isFinite(kmh)) return "—";
  return kmh.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}
export function fmtElevation(m) {
  if (m === null || m === undefined || !isFinite(m)) return "—";
  return `${Math.round(m).toLocaleString("pt-BR")} m`;
}
