import { Target } from "lucide-react";
import { C, modalityInfo } from "../../../lib/theme";
import { GOAL_TYPES } from "../constants";

const hyrox = modalityInfo("hyrox");

/* Seletor de meta/target — compartilhado por TemplateForm (ficha), HyroxRunner
   (Treino Livre) e ManualSessionForm (registro pós-treino), pra manter as
   mesmas opções de meta em qualquer lugar que o usuário planeje um treino.
   Tipos "carga + X" (ex: Farmer's Carry 24kg por 100m) mostram um segundo
   campo pra carga (goalLoadValue) além do valor principal (goalValue). */
export function GoalPicker({ goalType, goalValue, goalLoadValue, onChange, disabled }) {
  const info = GOAL_TYPES.find((g) => g.id === goalType);

  function selectType(g) {
    if (goalType === g.id) {
      onChange({ goalType: null, goalValue: null, goalLoadValue: null });
    } else {
      onChange({
        goalType: g.id,
        goalValue: goalType ? goalValue : null,
        goalLoadValue: g.hasLoad ? (goalType ? goalLoadValue : null) : null,
      });
    }
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Target size={12} style={{ color: C.gray, flexShrink: 0 }} />
      {GOAL_TYPES.map((g) => (
        <button
          key={g.id}
          type="button"
          onClick={() => selectType(g)}
          disabled={disabled}
          className="rounded-md px-2 py-1 text-[11px] font-semibold disabled:opacity-60"
          style={{
            background: goalType === g.id ? `${hyrox.color}26` : C.surface,
            color: goalType === g.id ? hyrox.color : C.gray,
            border: `1px solid ${goalType === g.id ? hyrox.color : C.border}`,
          }}
        >
          {g.label}
        </button>
      ))}
      {info?.hasLoad && (
        <input
          type="number" min="0" inputMode="decimal"
          placeholder="kg"
          value={goalLoadValue ?? ""}
          onChange={(e) => onChange({ goalLoadValue: e.target.value === "" ? null : Math.max(0, parseFloat(e.target.value) || 0) })}
          disabled={disabled}
          className="w-16 rounded-md px-2 py-1 text-[11px] text-center outline-none disabled:opacity-60"
          style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.white }}
        />
      )}
      {goalType && (
        <input
          type="number" min="0" inputMode="decimal"
          placeholder={info?.placeholder}
          value={goalValue ?? ""}
          onChange={(e) => onChange({ goalValue: e.target.value === "" ? null : Math.max(0, parseFloat(e.target.value) || 0) })}
          disabled={disabled}
          className="w-20 rounded-md px-2 py-1 text-[11px] text-center outline-none disabled:opacity-60"
          style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.white }}
        />
      )}
    </div>
  );
}
