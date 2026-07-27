import { useState } from "react";
import { Laptop, Smartphone, UploadCloud, PenLine } from "lucide-react";
import { C } from "../lib/theme";
import { Card } from "../components/ui";

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

export function UploadPage() {
  const [sideTab, setSideTab] = useState("arquivo");
  const [fileNames, setFileNames] = useState([]);

  function handleFilesChosen(e) {
    setFileNames(Array.from(e.target.files ?? []).map((f) => f.name));
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
                {fileNames.length > 0 ? fileNames.join(", ") : "Nenhum arquivo selecionado"}
              </span>
            </div>

            <p className="mt-4 text-xs" style={{ color: C.gray }}>
              Funciona com arquivos .fit, no máximo 25 MB cada. Escolha até 25 arquivos de uma vez.
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
