import { useState } from "react";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import { C } from "../lib/theme";
import { AuthShell } from "./components/AuthShell";
import { AuthTextField } from "./components/AuthTextField";
import { AuthButton } from "./components/AuthButton";

function validateEmail(value) {
  if (!value.trim()) return "E-mail obrigatório.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "E-mail inválido.";
  return "";
}

/* Tela de recuperação de senha — destino simulado de "Esqueci minha senha".
   Apenas interface: o envio é simulado e resolve sempre em sucesso. */
export function ForgotPasswordScreen({ onBack }) {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const emailError = validateEmail(email);

  function handleSubmit(e) {
    e.preventDefault();
    setTouched(true);
    if (emailError) return;

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSent(true);
    }, 1100);
  }

  return (
    <AuthShell>
      <button
        type="button"
        onClick={onBack}
        className="self-start flex items-center gap-1.5 text-xs font-semibold mb-4"
        style={{ color: C.gray }}
      >
        <ArrowLeft size={14} /> Voltar para o login
      </button>

      {sent ? (
        <div className="w-full flex flex-col items-center text-center gap-3 py-2">
          <div className="rounded-full p-3.5" style={{ background: `${C.positive}14` }}>
            <MailCheck size={26} style={{ color: C.positive }} />
          </div>
          <h1 style={{ fontWeight: 700, fontSize: 19, color: C.white }}>Verifique seu e-mail</h1>
          <p style={{ color: C.gray, fontSize: 13, lineHeight: 1.5 }}>
            Se houver uma conta associada a <span style={{ color: C.white, fontWeight: 600 }}>{email}</span>, enviamos um
            link de recuperação (simulação).
          </p>
          <div className="w-full mt-2">
            <AuthButton onClick={onBack}>Voltar para o login</AuthButton>
          </div>
        </div>
      ) : (
        <>
          <div className="w-full flex flex-col gap-1 mb-6 text-center">
            <h1 style={{ fontWeight: 700, fontSize: 21, color: C.white }}>Recuperar senha</h1>
            <p style={{ color: C.gray, fontSize: 13 }}>Enviaremos um link para redefinir sua senha.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="w-full flex flex-col gap-4">
            <AuthTextField
              label="E-mail" type="email" name="email" icon={Mail}
              value={email} onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="voce@email.com" autoComplete="email"
              error={emailError} touched={touched} disabled={submitting}
            />

            <AuthButton type="submit" loading={submitting} disabled={submitting}>
              {submitting ? "Carregando…" : "Enviar link de recuperação"}
            </AuthButton>
          </form>
        </>
      )}
    </AuthShell>
  );
}
