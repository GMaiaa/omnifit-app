/* Formatação de duração específica da lista de Treinos de Corrida (mostra
   segundos: MM:SS abaixo de 1h, HH:MM:SS a partir de 1h). Deliberadamente
   separado do fmtDuration compartilhado em lib/format.js — aquele é usado
   por todos os outros módulos com um formato mais compacto ("1h02m"), e
   mudar seu formato mudaria a Musculação/Natação/HYROX também. */
export function formatDurationHMS(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "—";
  const totalSec = Math.round(sec);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
