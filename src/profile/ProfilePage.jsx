import { useEffect, useState } from "react";
import { Activity, Calendar as CalendarIcon, HeartPulse, Loader2, Ruler, Scale } from "lucide-react";
import { C } from "../lib/theme";
import { Card, CardHeader } from "../components/ui";
import {
  buildStravaAuthUrl, extractStravaRedirectCode, connectStrava,
  getStravaConnectionStatus, syncStravaActivities, disconnectStrava, mapStravaError,
} from "../modules/strava/stravaService";

const SEX_OPTIONS = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "prefiro_nao_informar", label: "Prefiro não informar" },
];

/* Marcas de terceiros ainda não integradas — badge com a inicial no lugar do
   logo oficial até existir parceria/assets reais; o nome por extenso ao lado
   já deixa claro de qual serviço se trata. */
const CONNECTIONS = [
  { id: "strava", name: "Strava", color: "#FC4C02", description: "Importa treinos de ciclismo automaticamente." },
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

export function ProfilePage({ profile, loading, saveError, onSave, onStravaSynced }) {
  const [form, setForm] = useState({ weightKg: "", heightCm: "", birthDate: "", sex: "", restingHr: "", maxHr: "" });
  const [saved, setSaved] = useState(false);

  const [strava, setStrava] = useState({ status: "loading", athleteId: null }); // loading | connected | disconnected
  const [stravaError, setStravaError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

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

  useEffect(() => {
    (async () => {
      const redirect = extractStravaRedirectCode();
      if (redirect?.error) {
        setStravaError("Autorização com o Strava cancelada ou negada.");
      } else if (redirect?.code) {
        try {
          await connectStrava(redirect.code);
        } catch (err) {
          setStravaError(mapStravaError(err, "Não foi possível conectar sua conta do Strava."));
        }
      }

      try {
        const status = await getStravaConnectionStatus();
        setStrava(status.connected ? { status: "connected", athleteId: status.athleteId } : { status: "disconnected" });
      } catch {
        setStrava({ status: "disconnected" });
      }
    })();
  }, []);

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

  async function handleStravaSync() {
    setSyncing(true);
    setStravaError("");
    setSyncMessage("");
    try {
      const result = await syncStravaActivities();
      const total = (result.cyclingImported ?? 0) + (result.runningImported ?? 0);
      setSyncMessage(
        total > 0
          ? `${result.cyclingImported} treino(s) de ciclismo e ${result.runningImported} de corrida importados/atualizados.`
          : "Nenhum treino novo encontrado no Strava."
      );
      onStravaSynced?.();
    } catch (err) {
      setStravaError(mapStravaError(err));
    } finally {
      setSyncing(false);
    }
  }

  async function handleStravaDisconnect() {
    setStravaError("");
    try {
      await disconnectStrava();
      setStrava({ status: "disconnected" });
      setSyncMessage("");
    } catch (err) {
      setStravaError(mapStravaError(err, "Não foi possível desconectar do Strava."));
    }
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
          {CONNECTIONS.map((c) => {
            if (c.id !== "strava") {
              return (
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
              );
            }

            const isConnected = strava.status === "connected";
            let stravaAuthUrl = null;
            let stravaNotConfigured = false;
            try {
              stravaAuthUrl = buildStravaAuthUrl();
            } catch {
              stravaNotConfigured = true;
            }

            return (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 flex-wrap"
                style={{ background: C.surface2, border: `1px solid ${C.borderSoft}` }}
              >
                <div className="flex items-center gap-3">
                  <BrandBadge name={c.name} color={c.color} />
                  <div>
                    <div style={{ color: C.white, fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                    <div style={{ color: C.gray, fontSize: 12 }}>
                      {isConnected ? "Conectado — Sincronizar importa todo o histórico de ciclismo e corrida." : c.description}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {strava.status === "loading" ? (
                    <Loader2 size={16} className="animate-spin" style={{ color: C.gray }} />
                  ) : isConnected ? (
                    <>
                      <button
                        onClick={handleStravaSync}
                        disabled={syncing}
                        className="rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-60 flex items-center gap-1.5"
                        style={{ background: `${c.color}26`, color: c.color }}
                      >
                        {syncing && <Loader2 size={12} className="animate-spin" />}
                        {syncing ? "Importando histórico…" : "Sincronizar"}
                      </button>
                      <button
                        onClick={handleStravaDisconnect}
                        className="rounded-full px-4 py-2 text-xs font-semibold"
                        style={{ color: C.gray, border: `1px solid ${C.border}` }}
                      >
                        Desconectar
                      </button>
                    </>
                  ) : stravaNotConfigured ? (
                    <span className="text-xs" style={{ color: C.gray }}>Integração ainda não configurada</span>
                  ) : (
                    <a
                      href={stravaAuthUrl}
                      className="rounded-full px-4 py-2 text-xs font-semibold"
                      style={{ background: c.color, color: "#fff" }}
                    >
                      Conectar
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {syncMessage && <div className="mt-3 text-xs" style={{ color: C.positive }}>{syncMessage}</div>}
        {stravaError && <div className="mt-3 text-xs" style={{ color: C.danger }}>{stravaError}</div>}
      </Card>
    </div>
  );
}
