import { C } from "../../../lib/theme";

const inputStyle = { background: C.surface2, border: `1px solid ${C.border}`, color: C.white };

/* Campos de registro de uma volta/round, de acordo com o metricType do
   bloco/estação — compartilhado por HyroxRunner (execução ao vivo) e
   ManualSessionForm (registro pós-treino), pra manter os mesmos campos em
   qualquer lugar que resultados reais sejam digitados. */
export function RoundFields({ metricType, round, onChange }) {
  if (metricType === "reps") {
    return (
      <>
        <input
          type="number" inputMode="numeric" placeholder="reps" value={round.reps ?? ""}
          onChange={(e) => onChange({ reps: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
          className="w-16 rounded-lg px-2 py-2 text-sm text-center outline-none" style={inputStyle}
        />
        <input
          type="number" inputMode="numeric" placeholder="desc. s" value={round.restSec ?? ""}
          onChange={(e) => onChange({ restSec: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
          className="w-20 rounded-lg px-2 py-2 text-sm text-center outline-none" style={inputStyle}
        />
      </>
    );
  }
  if (metricType === "load") {
    return (
      <>
        <input
          type="number" inputMode="decimal" placeholder="kg" value={round.weight ?? ""}
          onChange={(e) => onChange({ weight: e.target.value === "" ? null : parseFloat(e.target.value) })}
          className="w-16 rounded-lg px-2 py-2 text-sm text-center outline-none" style={inputStyle}
        />
        <input
          type="number" inputMode="numeric" placeholder="reps" value={round.reps ?? ""}
          onChange={(e) => onChange({ reps: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
          className="w-16 rounded-lg px-2 py-2 text-sm text-center outline-none" style={inputStyle}
        />
        <input
          type="number" inputMode="decimal" placeholder="m" value={round.distanceM ?? ""}
          onChange={(e) => onChange({ distanceM: e.target.value === "" ? null : parseFloat(e.target.value) })}
          className="w-16 rounded-lg px-2 py-2 text-sm text-center outline-none" style={inputStyle}
        />
      </>
    );
  }
  if (metricType === "time") {
    return (
      <>
        <input
          type="number" inputMode="numeric" placeholder="duração s" value={round.durationSec ?? ""}
          onChange={(e) => onChange({ durationSec: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
          className="w-24 rounded-lg px-2 py-2 text-sm text-center outline-none" style={inputStyle}
        />
        <input
          type="number" inputMode="numeric" placeholder="desc. s" value={round.restSec ?? ""}
          onChange={(e) => onChange({ restSec: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
          className="w-20 rounded-lg px-2 py-2 text-sm text-center outline-none" style={inputStyle}
        />
      </>
    );
  }
  // distance
  return (
    <>
      <input
        type="number" inputMode="decimal" placeholder="m" value={round.distanceM ?? ""}
        onChange={(e) => onChange({ distanceM: e.target.value === "" ? null : parseFloat(e.target.value) })}
        className="w-20 rounded-lg px-2 py-2 text-sm text-center outline-none" style={inputStyle}
      />
      <input
        type="number" inputMode="numeric" placeholder="tempo s" value={round.durationSec ?? ""}
        onChange={(e) => onChange({ durationSec: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
        className="w-24 rounded-lg px-2 py-2 text-sm text-center outline-none" style={inputStyle}
      />
    </>
  );
}
