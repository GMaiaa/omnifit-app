import { useState } from "react";
import { AlertCircle, ArrowLeft, Lock, Mail, MailCheck, User } from "lucide-react";
import { C } from "../lib/theme";
import { useAuth } from "./AuthContext";
import { mapAuthError } from "./authErrors";
import { AuthShell } from "./components/AuthShell";
import { AuthTextField } from "./components/AuthTextField";
import { AuthButton } from "./components/AuthButton";

function validateName(value) {
  if (!value.trim()) return "Nome obrigatório.";
  return "";
}
function validateEmail(value) {
  if (!value.trim()) return "E-mail obrigatório.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "E-mail inválido.";
  return "";
}
function validatePassword(value) {
  if (!value) return "Senha obrigatória.";
  if (value.length < 6) return "A senha precisa ter pelo menos 6 caracteres.";
  return "";
}
function validateConfirm(value, password) {
  if (!value) return "Confirme sua senha.";
  if (value !== password) return "As senhas não coincidem.";
  return "";
}

/* Tela de cadastro, conectada ao Supabase Auth via AuthContext. Se a conta
   já vier com sessão (confirmação de e-mail desativada, como está hoje no
   projeto), não navegamos explicitamente: o AuthGate detecta a sessão e
   troca de tela sozinho. Se não vier sessão (confirmação de e-mail ligada
   no futuro), mostramos um estado pedindo para verificar o e-mail. */
export function SignupScreen({ onBack }) {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState({ name: false, email: false, password: false, confirm: false });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  const nameError = validateName(name);
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  const confirmError = validateConfirm(confirm, password);

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (nameError || emailError || passwordError || confirmError || submitting) return;

    setFormError("");
    setSubmitting(true);
    try {
      const data = await signUp({ name: name.trim(), email: email.trim(), password });
      if (!data?.session) {
        // Conta criada, mas sem sessão: confirmação de e-mail está exigida.
        setNeedsEmailConfirmation(true);
        setSubmitting(false);
      }
      // com sessão: o AuthGate detecta o usuário autenticado e troca de tela sozinho
    } catch (err) {
      setFormError(mapAuthError(err, "Não foi possível criar sua conta. Tente novamente."));
      setSubmitting(false);
    }
  }

  if (needsEmailConfirmation) {
    return (
      <AuthShell>
        <div className="w-full flex flex-col items-center text-center gap-3 py-2">
          <div className="rounded-full p-3.5" style={{ background: `${C.positive}14` }}>
            <MailCheck size={26} style={{ color: C.positive }} />
          </div>
          <h1 style={{ fontWeight: 700, fontSize: 19, color: C.white }}>Verifique seu e-mail</h1>
          <p style={{ color: C.gray, fontSize: 13, lineHeight: 1.5 }}>
            Enviamos um link de confirmação para <span style={{ color: C.white, fontWeight: 600 }}>{email}</span>.
            Confirme para poder entrar.
          </p>
          <div className="w-full mt-2">
            <AuthButton onClick={onBack}>Voltar para o login</AuthButton>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <button
        type="button"
        onClick={onBack}
        disabled={submitting}
        className="self-start flex items-center gap-1.5 text-xs font-semibold mb-4 disabled:cursor-not-allowed"
        style={{ color: C.gray }}
      >
        <ArrowLeft size={14} /> Voltar
      </button>

      <div className="w-full flex flex-col gap-1 mb-6 text-center">
        <h1 style={{ fontWeight: 700, fontSize: 21, color: C.white }}>Criar conta</h1>
        <p style={{ color: C.gray, fontSize: 13 }}>Comece a acompanhar sua evolução hoje.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="w-full flex flex-col gap-4">
        <AuthTextField
          label="Nome" type="text" name="name" icon={User}
          value={name} onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          placeholder="Seu nome" autoComplete="name"
          error={nameError} touched={touched.name} disabled={submitting}
        />
        <AuthTextField
          label="E-mail" type="email" name="email" icon={Mail}
          value={email} onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          placeholder="voce@email.com" autoComplete="email"
          error={emailError} touched={touched.email} disabled={submitting}
        />
        <AuthTextField
          label="Senha" type="password" name="password" icon={Lock}
          value={password} onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          placeholder="Crie uma senha" autoComplete="new-password"
          error={passwordError} touched={touched.password} disabled={submitting}
        />
        <AuthTextField
          label="Confirmar senha" type="password" name="confirm" icon={Lock}
          value={confirm} onChange={(e) => setConfirm(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
          placeholder="Repita a senha" autoComplete="new-password"
          error={confirmError} touched={touched.confirm} disabled={submitting}
        />

        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl px-3.5 py-3"
            style={{ background: `${C.danger}18`, border: `1px solid ${C.danger}44` }}
          >
            <AlertCircle size={15} style={{ color: C.danger, marginTop: 1, flexShrink: 0 }} />
            <span className="text-xs" style={{ color: C.danger, lineHeight: 1.4 }}>{formError}</span>
          </div>
        )}

        <AuthButton type="submit" loading={submitting} disabled={submitting}>
          {submitting ? "Carregando…" : "Criar conta"}
        </AuthButton>
      </form>

      <p className="text-sm text-center mt-6" style={{ color: C.gray }}>
        Já tem uma conta?{" "}
        <button type="button" onClick={onBack} disabled={submitting} className="font-semibold disabled:cursor-not-allowed" style={{ color: C.white }}>
          Entrar
        </button>
      </p>
    </AuthShell>
  );
}
