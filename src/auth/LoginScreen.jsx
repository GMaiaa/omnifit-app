import { useState } from "react";
import { AlertCircle, Apple, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { C } from "../lib/theme";
import { useAuth } from "./AuthContext";
import { mapAuthError } from "./authErrors";
import { AuthShell } from "./components/AuthShell";
import { AuthTextField } from "./components/AuthTextField";
import { AuthButton, AuthDivider } from "./components/AuthButton";
import { GoogleGlyph } from "./components/GoogleGlyph";

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

/* Tela de login, conectada ao Supabase Auth via AuthContext. Não navega
   explicitamente após o sucesso: assim que o signIn atualiza a sessão, o
   AuthGate reage sozinho e troca de tela — aqui só cuidamos de validação,
   loading e erro. */
export function LoginScreen({ onSignup, onForgot }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (emailError || passwordError || submitting) return;

    setFormError("");
    setSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
      // sucesso: o AuthGate detecta a sessão e troca de tela sozinho
    } catch (err) {
      setFormError(mapAuthError(err, "Não foi possível entrar. Tente novamente."));
      setSubmitting(false);
    }
  }

  const anyLoading = submitting;

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

      <div className="w-full mt-5">
        <AuthDivider label="Ou continue com" />
      </div>

      {/* Login social ainda não está implementado (o escopo atual é
          e-mail/senha) — os botões ficam visíveis para preservar o layout,
          mas desabilitados até a integração OAuth ser feita. */}
      <div className="w-full grid grid-cols-2 gap-3 mt-1">
        <AuthButton variant="secondary" disabled>
          <GoogleGlyph /> Google
        </AuthButton>
        <AuthButton variant="secondary" disabled>
          <Apple size={16} /> Apple
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
