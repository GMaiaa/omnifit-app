import { useState } from "react";
import { CheckCircle2, Send, X } from "lucide-react";
import { C } from "../lib/theme";
import { useLockBodyScroll } from "../lib/useLockBodyScroll";
import { shareWorkout, mapSharingError } from "../lib/sharingService";

/* ---------------------------------------------------------
   SHARE MODAL — genérico, usado por qualquer modalidade (Musculação,
   HYROX, Corrida, Ciclismo). Quem chama já monta o payload certo pro que
   está sendo compartilhado (ficha ou treino registrado) — este componente
   só cuida do formulário de envio (e-mail + recado) e do estado de
   carregando/sucesso/erro.
--------------------------------------------------------- */
export function ShareModal({ modality, sourceType, sourceId, title, payload, accentColor = C.positive, onClose }) {
  useLockBodyScroll();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const busy = submitting || success;

  async function handleSubmit() {
    if (busy) return;
    if (!email.trim()) return setError("Informe o e-mail de quem vai receber o treino.");
    setError("");

    setSubmitting(true);
    try {
      await shareWorkout({
        modality, sourceType, sourceId, title, payload,
        recipientEmail: email.trim(),
        message: message.trim() || null,
      });
      setSubmitting(false);
      setSuccess(true);
      setTimeout(onClose, 1400);
    } catch (err) {
      setSubmitting(false);
      setError(mapSharingError(err));
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" style={{ background: "rgba(3,7,18,0.7)" }}>
      <div
        className="w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-6"
        style={{ background: C.bgSoft, border: `1px solid ${C.border}` }}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 18, color: C.white }}>
            Compartilhar treino
          </h2>
          <button onClick={onClose} disabled={busy} className="rounded-full p-1.5 disabled:opacity-40" style={{ color: C.gray }}>
            <X size={20} />
          </button>
        </div>
        <p className="text-xs mb-4 truncate" style={{ color: C.gray }}>{title}</p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>E-mail de quem vai receber</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@exemplo.com"
              disabled={busy}
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none disabled:opacity-60"
              style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
            />
            <p className="mt-1 text-xs" style={{ color: C.gray }}>
              A pessoa precisa já ter uma conta no Omnifit com esse e-mail.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Recado (opcional)</label>
            <textarea
              value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
              placeholder="ex: Bora treinar isso amanhã?"
              disabled={busy}
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none disabled:opacity-60"
              style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
            />
          </div>

          {error && <div className="text-sm" style={{ color: C.danger }}>{error}</div>}

          {success && (
            <div className="flex items-center gap-2 text-sm" style={{ color: C.positive }}>
              <CheckCircle2 size={16} /> Treino compartilhado! A pessoa vai ver um aviso ao abrir o app.
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={busy}
            className="mt-1 w-full flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${accentColor}, #00AEEF)`, color: C.bg }}
          >
            {submitting ? "Enviando…" : success ? "Enviado!" : (<><Send size={15} /> Enviar</>)}
          </button>
        </div>
      </div>
    </div>
  );
}
