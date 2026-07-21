import { useState } from "react";
import { ArrowLeft, Lock, Mail, User } from "lucide-react";
import { C } from "../lib/theme";
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

/* Tela de cadastro — destino simulado do link "Criar conta" da tela de
   login. Só interface: o "Criar conta" abaixo apenas simula um cadastro
   bem-sucedido e segue para a Home. */
export function SignupScreen({ onBack, onCreated }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState({ name: false, email: false, password: false, confirm: false });
  const [submitting, setSubmitting] = useState(false);

  const nameError = validateName(name);
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  const confirmError = validateConfirm(confirm, password);

  function handleSubmit(e) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (nameError || emailError || passwordError || confirmError) return;

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onCreated?.();
    }, 1100);
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
