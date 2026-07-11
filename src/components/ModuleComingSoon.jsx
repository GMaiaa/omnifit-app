import * as Icons from "lucide-react";
import { C } from "../lib/theme";
import { Card } from "./ui";

export function ModuleComingSoon({ modality }) {
  const Icon = Icons[modality.icon] ?? Icons.Sparkles;
  return (
    <Card className="flex flex-col items-center justify-center text-center py-16 gap-3">
      <div className="rounded-full p-4" style={{ background: `${modality.color}1A` }}>
        <Icon size={28} style={{ color: modality.color }} />
      </div>
      <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: C.white, fontSize: 17 }}>
        {modality.label} — em breve
      </h3>
      <p style={{ color: C.gray, fontSize: 14, maxWidth: 340 }}>
        Este módulo ainda está em desenvolvimento. Quando estiver pronto, seus treinos de{" "}
        {modality.label} vão aparecer aqui e entrar na análise cruzada da Home.
      </p>
    </Card>
  );
}
