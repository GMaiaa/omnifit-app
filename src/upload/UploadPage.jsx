import { useState } from "react";
import { Laptop, Smartphone, UploadCloud, PenLine, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { C } from "../lib/theme";
import { Card } from "../components/ui";
import { parseFitFile, mapFitParseError } from "../lib/fitParser";
import { createCyclingWorkout, mapCyclingWorkoutError } from "../modules/ciclismo/cyclingService";

/* Hoje só ciclismo tem CRUD real via Supabase (ver useCyclingWorkouts) —
   por isso o upload de .fit só cria treino de ciclismo por enquanto.
   Um .fit de outro esporte é rejeitado com uma mensagem clara em vez de
   ser salvo incorretamente. */
async function processFitFile(file, onWorkoutCreated) {
  const parsed = await parseFitFile(file); // pode lançar FIT_PARSE_FAILED / NOT_A_CYCLING_ACTIVITY
  const saved = await createCyclingWorkout(parsed);
  onWorkoutCreated?.(saved);
  return saved;
}

const SIDE_NAV = [
  { id: "dispositivo", label: "Dispositivo", icon: Laptop },
  { id: "arquivo", label: "Arquivo", icon: UploadCloud },
  { id: "manual", label: "Manual", icon: PenLine },
  { id: "movel", label: "Móvel", icon: Smartphone },
];

function ComingSoonPanel({ icon: Icon, title, description }) {
  return (
    <Card className="flex flex-col items-center justify-center text-center py-16 gap-3">
      <div className="rounded-full p-4" style={{ background: `color-mix(in srgb, ${C.gray} 10%, transparent)` }}>
        <Icon size={26} style={{ color: C.gray }} />
      </div>
      <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: C.white, fontSize: 17 }}>{title}</h3>
      <p style={{ color: C.gray, fontSize: 14, maxWidth: 320 }}>{description}</p>
    </Card>
  );
}

export function UploadPage({ onCyclingWorkoutCreated }) {
  const [sideTab, setSideTab] = useState("arquivo");
  // items: [{ name, status: 'pending' | 'done' | 'error', message? }]
  const [items, setItems] = useState([]);

  async function handleFilesChosen(e) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // permite selecionar o mesmo arquivo de novo depois de um erro

    setItems(files.map((f) => ({ name: f.name, status: "pending" })));

    for (const file of files) {
      try {
        await processFitFile(file, onCyclingWorkoutCreated);
        setItems((prev) => prev.map((it) => (it.name === file.name ? { ...it, status: "done" } : it)));
      } catch (err) {
        const message = err?.message === "NOT_A_CYCLING_ACTIVITY" || err?.message === "FIT_PARSE_FAILED"
          ? mapFitParseError(err)
          : mapCyclingWorkoutError(err);
        setItems((prev) => prev.map((it) => (it.name === file.name ? { ...it, status: "error", message } : it)));
      }
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-5">
      <nav className="flex sm:flex-col gap-1 sm:w-52 flex-shrink-0 overflow-x-auto">
        {SIDE_NAV.map((n) => {
          const active = sideTab === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setSideTab(n.id)}
              className="flex items-center gap-2.5 px-4 py-3 text-sm font-semibold rounded-xl whitespace-nowrap text-left"
              style={{
                color: active ? C.positive : C.white,
                background: active ? `color-mix(in srgb, ${C.positive} 10%, transparent)` : "transparent",
                borderLeft: active ? `3px solid ${C.positive}` : "3px solid transparent",
              }}
            >
              <n.icon size={16} /> {n.label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1">
        {sideTab === "arquivo" ? (
          <Card>
            <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 20, color: C.white }}>
              Carregar e sincronizar seus treinos
            </h2>
            <p className="mt-1 text-sm" style={{ color: C.gray }}>
              Importe atividades gravadas em outro app ou dispositivo direto pro Omnifit.
            </p>

            <div
              className="flex flex-wrap items-center gap-3 rounded-xl px-4 py-4 mt-5"
              style={{ background: C.surface2, border: `1px solid ${C.borderSoft}` }}
            >
              <label
                className="rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer flex-shrink-0"
                style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.white }}
              >
                Escolher arquivos
                <input type="file" accept=".fit" multiple onChange={handleFilesChosen} className="hidden" />
              </label>
              <span className="text-sm" style={{ color: C.gray }}>
                {items.length === 0 && "Nenhum arquivo selecionado"}
              </span>
            </div>

            {items.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {items.map((it) => (
                  <div
                    key={it.name}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm"
                    style={{ background: C.surface2, border: `1px solid ${C.borderSoft}` }}
                  >
                    {it.status === "pending" && <Loader2 size={16} className="animate-spin flex-shrink-0" style={{ color: C.gray }} />}
                    {it.status === "done" && <CheckCircle2 size={16} className="flex-shrink-0" style={{ color: C.positive }} />}
                    {it.status === "error" && <XCircle size={16} className="flex-shrink-0" style={{ color: C.danger }} />}
                    <div className="min-w-0">
                      <div className="truncate" style={{ color: C.white }}>{it.name}</div>
                      {it.status === "error" && <div className="text-xs mt-0.5" style={{ color: C.danger }}>{it.message}</div>}
                      {it.status === "done" && <div className="text-xs mt-0.5" style={{ color: C.positive }}>Importado com sucesso</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-4 text-xs" style={{ color: C.gray }}>
              Funciona com arquivos .fit de ciclismo (ex: MyWhoosh, Zwift, Garmin), no máximo 25 MB cada. Escolha até 25 arquivos de uma vez.
            </p>
            <p className="mt-1 text-xs" style={{ color: C.gray }}>
              Precisa de ajuda? <span style={{ color: C.positive, fontWeight: 600 }}>Fale com o suporte</span> (em breve).
            </p>
          </Card>
        ) : sideTab === "dispositivo" ? (
          <ComingSoonPanel
            icon={Laptop}
            title="Sincronização por dispositivo — em breve"
            description="Conecte relógios e sensores compatíveis direto pelo navegador ou pelo app."
          />
        ) : sideTab === "manual" ? (
          <ComingSoonPanel
            icon={PenLine}
            title="Registro manual — em breve"
            description="Preencha os dados de um treino que você não gravou automaticamente."
          />
        ) : (
          <ComingSoonPanel
            icon={Smartphone}
            title="Envio pelo celular — em breve"
            description="Envie arquivos direto do app Omnifit no seu celular."
          />
        )}
      </div>
    </div>
  );
}
