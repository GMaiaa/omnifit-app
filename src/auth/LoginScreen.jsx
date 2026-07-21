import { useState } from "react";
import { AlertCircle, Apple, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { C } from "../lib/theme";
import { AuthShell } from "./components/AuthShell";
import { AuthTextField } from "./components/AuthTextField";
import { AuthButton, AuthDivider } from "./components/AuthButton";
import { GoogleGlyph } from "./components/GoogleGlyph";

const DEMO_EMAIL = "demo@omnifit.app";
const DEMO_PASSWORD = "omnifit123";

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

/* Tela de login — apenas interface: nenhuma chamada de rede acontece aqui.
   "Autenticação" é simulada com um setTimeout e um par de credenciais fixo
   (ver DEMO_EMAIL/DEMO_PASSWORD) só para demonstrar os estados de sucesso
   e erro; a lógica real entra numa etapa futura. */
export function LoginScreen({ onLogin, onSignup, onForgot }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [socialLoading, setSocialLoading] = useState(null); // null | "google" | "apple"

  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);

  function handleSubmit(e) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (emailError || passwordError) return;

    setFormError("");
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      const ok = email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;
      if (ok) onLogin?.();
      else setFormError("Credenciais incorretas (simulação).");
    }, 1100);
  }

  function handleSocial(provider) {
    setFormError("");
    setSocialLoading(provider);
    setTimeout(() => {
      setSocialLoading(null);
      onLogin?.();
    }, 900);
  }

  const anyLoading = submitting || !!socialLoading;

  return (
    <AuthShell>
      <div className="w-full flex flex-col gap-1 mb-6 text-center">
        <h1 style={{ fontWeight: 700, fontSize: 21, color: C.white }}>Bem-vindo de volta</h1>
        <p style={{ color: C.gray, fontSize: 13 }}>Entre para continuar sua evolução.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="w-full flex flex-col gap-4">
        <AuthTextField
          label="E-mail"
          type="email"
          name="email"
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          placeholder="voce@email.com"
          autoComplete="email"
          error={emailError}
          touched={touched.email}
          disabled={anyLoading}
        />

        <AuthTextField
          label="Senha"
          type={showPassword ? "text" : "password"}
          name="password"
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          placeholder="Sua senha"
          autoComplete="current-password"
          error={passwordError}
          touched={touched.password}
          disabled={anyLoading}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              disabled={anyLoading}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              className="p-1.5 -mr-1.5 flex-shrink-0 rounded-lg disabled:cursor-not-allowed"
              style={{ color: C.gray }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />

        <div className="flex justify-end -mt-2.5">
          <button
            type="button"
            onClick={onForgot}
            disabled={anyLoading}
            className="text-xs font-semibold py-1 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ color: C.positive }}
          >
            Esqueci minha senha
          </button>
        </div>

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

        <AuthButton type="submit" loading={submitting} disabled={anyLoading}>
          {submitting ? "Carregando…" : "Entrar"}
        </AuthButton>
      </form>

      <p className="text-[11px] text-center mt-4 leading-relaxed" style={{ color: C.gray }}>
        Demonstração: <span style={{ color: C.white, fontWeight: 600 }}>{DEMO_EMAIL}</span> / <span style={{ color: C.white, fontWeight: 600 }}>{DEMO_PASSWORD}</span>
      </p>

      <div className="w-full mt-5">
        <AuthDivider label="Ou continue com" />
      </div>

      <div className="w-full grid grid-cols-2 gap-3 mt-1">
        <AuthButton variant="secondary" onClick={() => handleSocial("google")} loading={socialLoading === "google"} disabled={anyLoading}>
          {socialLoading === "google" ? "Conectando…" : (<><GoogleGlyph /> Google</>)}
        </AuthButton>
        {/* Em produção este botão só aparece em plataformas Apple; mantido
            sempre visível aqui por ainda não haver detecção de plataforma. */}
        <AuthButton variant="secondary" onClick={() => handleSocial("apple")} loading={socialLoading === "apple"} disabled={anyLoading}>
          {socialLoading === "apple" ? "Conectando…" : (<><Apple size={16} /> Apple</>)}
        </AuthButton>
      </div>

      <p className="text-sm text-center mt-6" style={{ color: C.gray }}>
        Não tem uma conta?{" "}
        <button type="button" onClick={onSignup} disabled={anyLoading} className="font-semibold disabled:cursor-not-allowed" style={{ color: C.white }}>
          Criar conta
        </button>
      </p>
    </AuthShell>
  );
}
