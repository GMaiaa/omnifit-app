import { useEffect, useState } from "react";
import { Activity, Calendar as CalendarIcon, HeartPulse, Ruler, Scale } from "lucide-react";
import { C } from "../lib/theme";
import { Card, CardHeader } from "../components/ui";

const SEX_OPTIONS = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "prefiro_nao_informar", label: "Prefiro não informar" },
];

/* Marcas de terceiros ainda não integradas — badge com a inicial no lugar do
   logo oficial até existir parceria/assets reais; o nome por extenso ao lado
   já deixa claro de qual serviço se trata. */
const CONNECTIONS = [
  { id: "strava", name: "Strava", color: "#FC4C02", description: "Importa treinos de todas as modalidades automaticamente." },
  { id: "garmin", name: "Garmin Connect", color: "#007CC3", description: "Sincroniza dados de relógios e sensores Garmin." },
  { id: "mywhoosh", name: "MyWhoosh", color: "#00B2A9", description: "Traz treinos indoor de ciclismo da plataforma." },
];

function BrandBadge({ name, color }) {
  return (
    <div
      className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{ width: 40, height: 40, background: `color-mix(in srgb, ${color} 15%, transparent)`, color, fontWeight: 800, fontSize: 15 }}
    >
      {name[0]}
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: C.gray }}>
        <Icon size={13} /> {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const inputClass = "w-full rounded-xl px-3 py-2.5 text-sm outline-none";

export function ProfilePage({ profile, loading, saveError, onSave }) {
  const [form, setForm] = useState({ weightKg: "", heightCm: "", birthDate: "", sex: "", restingHr: "", maxHr: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading) {
      setForm({
        weightKg: profile.weightKg ?? "",
        heightCm: profile.heightCm ?? "",
        birthDate: profile.birthDate ?? "",
        sex: profile.sex ?? "",
        restingHr: profile.restingHr ?? "",
        maxHr: profile.maxHr ?? "",
      });
    }
  }, [loading, profile]);

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  function handleSubmit() {
    onSave({
      weightKg: form.weightKg ? parseFloat(String(form.weightKg).replace(",", ".")) : null,
      heightCm: form.heightCm ? parseInt(form.heightCm, 10) : null,
      birthDate: form.birthDate || null,
      sex: form.sex || null,
      restingHr: form.restingHr ? parseInt(form.restingHr, 10) : null,
      maxHr: form.maxHr ? parseInt(form.maxHr, 10) : null,
    });
    setSaved(true);
  }

  const inputStyle = { background: C.surface2, border: `1px solid ${C.border}`, color: C.white };

  if (loading) {
    return <div className="flex justify-center py-20" style={{ color: C.gray }}>Carregando…</div>;
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader
          title="Dados de saúde"
          description="Usados pra calcular zonas de esforço e estatísticas em todas as modalidades."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Peso (kg)" icon={Scale}>
            <input
              type="text" inputMode="decimal" placeholder="ex: 72,5" value={form.weightKg}
              onChange={(e) => handleChange("weightKg", e.target.value)}
              className={inputClass} style={inputStyle}
            />
          </Field>
          <Field label="Altura (cm)" icon={Ruler}>
            <input
              type="number" placeholder="ex: 175" value={form.heightCm}
              onChange={(e) => handleChange("heightCm", e.target.value)}
              className={inputClass} style={inputStyle}
            />
          </Field>
          <Field label="Data de nascimento" icon={CalendarIcon}>
            <input
              type="date" value={form.birthDate}
              onChange={(e) => handleChange("birthDate", e.target.value)}
              className={inputClass} style={inputStyle}
            />
          </Field>
          <Field label="Sexo biológico" icon={Activity}>
            <select
              value={form.sex} onChange={(e) => handleChange("sex", e.target.value)}
              className={inputClass} style={inputStyle}
            >
              <option value="">Selecione</option>
              {SEX_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="FC de repouso (bpm)" icon={HeartPulse}>
            <input
              type="number" placeholder="opcional" value={form.restingHr}
              onChange={(e) => handleChange("restingHr", e.target.value)}
              className={inputClass} style={inputStyle}
            />
          </Field>
          <Field label="FC máxima (bpm)" icon={HeartPulse}>
            <input
              type="number" placeholder="opcional" value={form.maxHr}
              onChange={(e) => handleChange("maxHr", e.target.value)}
              className={inputClass} style={inputStyle}
            />
          </Field>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={handleSubmit}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold"
            style={{ background: `linear-gradient(135deg, ${C.positive}, #00AEEF)`, color: C.bg }}
          >
            Salvar
          </button>
          {saved && !saveError && <span className="text-xs" style={{ color: C.positive }}>Salvo!</span>}
          {saveError && <span className="text-xs" style={{ color: C.danger }}>{saveError}</span>}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Conexões"
          description="Sincronize treinos automaticamente de outros apps e relógios."
        />
        <div className="flex flex-col gap-3">
          {CONNECTIONS.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 flex-wrap"
              style={{ background: C.surface2, border: `1px solid ${C.borderSoft}` }}
            >
              <div className="flex items-center gap-3">
                <BrandBadge name={c.name} color={c.color} />
                <div>
                  <div style={{ color: C.white, fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                  <div style={{ color: C.gray, fontSize: 12 }}>{c.description}</div>
                </div>
              </div>
              <button
                disabled
                className="rounded-full px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed"
                style={{ color: C.gray, border: `1px solid ${C.border}` }}
              >
                Em breve
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
