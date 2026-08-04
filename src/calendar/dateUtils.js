import { addDays, mondayOf } from "../lib/format";

/* Intervalo [start, end] (ambos inclusive) exibido por cada modo de
   visualização — usado tanto para renderizar a grade quanto para filtrar a
   consulta ao Supabase (sempre busca só o que a tela realmente mostra). */
export function rangeFor(viewMode, anchorDate) {
  if (viewMode === "day") {
    return { start: anchorDate, end: anchorDate };
  }
  if (viewMode === "week") {
    const start = mondayOf(anchorDate);
    return { start, end: addDays(start, 6) };
  }
  // month: grade completa de semanas (segunda a domingo) cobrindo do
  // primeiro ao último dia do mês, incluindo os dias de borda dos meses
  // vizinhos que aparecem na mesma grade.
  const firstOfMonth = `${anchorDate.slice(0, 7)}-01`;
  const [y, m] = anchorDate.slice(0, 7).split("-").map(Number);
  const lastDayNum = new Date(y, m, 0).getDate();
  const lastOfMonth = `${anchorDate.slice(0, 7)}-${String(lastDayNum).padStart(2, "0")}`;
  return { start: mondayOf(firstOfMonth), end: addDays(mondayOf(lastOfMonth), 6) };
}

/* Lista de dias (strings "AAAA-MM-DD") entre start e end, inclusive. */
export function daysBetween(start, end) {
  const days = [];
  let cur = start;
  while (cur <= end) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}

/* Move a data-âncora pra frente/trás de acordo com o modo de visualização
   ativo — usado pelos botões de navegação (anterior/próximo). */
export function shiftAnchor(viewMode, anchorDate, direction) {
  if (viewMode === "day") return addDays(anchorDate, direction);
  if (viewMode === "week") return addDays(anchorDate, direction * 7);
  const [y, m] = anchorDate.slice(0, 7).split("-").map(Number);
  const d = new Date(y, m - 1 + direction, Math.min(15, Number(anchorDate.slice(8, 10))));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const MONTH_LABELS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/* Rótulo exibido no topo da tela pra cada modo de visualização. */
export function periodLabel(viewMode, anchorDate) {
  const [y, m, d] = anchorDate.split("-").map(Number);
  if (viewMode === "day") {
    return `${d} de ${MONTH_LABELS[m - 1]} de ${y}`;
  }
  if (viewMode === "week") {
    const { start, end } = rangeFor("week", anchorDate);
    const [, sm, sd] = start.split("-").map(Number);
    const [, em, ed] = end.split("-").map(Number);
    return sm === em
      ? `${sd} – ${ed} de ${MONTH_LABELS[sm - 1]}`
      : `${sd} de ${MONTH_LABELS[sm - 1]} – ${ed} de ${MONTH_LABELS[em - 1]}`;
  }
  return `${MONTH_LABELS[m - 1][0].toUpperCase()}${MONTH_LABELS[m - 1].slice(1)} de ${y}`;
}
