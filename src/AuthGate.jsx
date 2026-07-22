import { useState } from "react";
import { Loader2 } from "lucide-react";
import App from "./App.jsx";
import { C } from "./lib/theme";
import { useAuth } from "./auth/AuthContext";
import { AuthShell } from "./auth/components/AuthShell";
import { LoginScreen } from "./auth/LoginScreen";
import { SignupScreen } from "./auth/SignupScreen";
import { ForgotPasswordScreen } from "./auth/ForgotPasswordScreen";

/* Guarda de rota única do app — não há react-router aqui, então "rota
   protegida" é só este condicional: sem sessão, a única coisa renderizável
   são as telas de auth; com sessão, é sempre o App. Não existe caminho para
   um usuário autenticado ver login/cadastro (nem vice-versa), então não há
   como entrar em loop de redirecionamento. */
export default function AuthGate() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState("login"); // "login" | "signup" | "forgot" — só importa sem sessão

  if (loading) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 size={22} className="animate-spin" style={{ color: C.positive }} />
          <p className="text-sm" style={{ color: C.gray }}>Carregando…</p>
        </div>
      </AuthShell>
    );
  }

  if (user) return <App />;

  if (screen === "signup") {
    return <SignupScreen onBack={() => setScreen("login")} />;
  }
  if (screen === "forgot") {
    return <ForgotPasswordScreen onBack={() => setScreen("login")} />;
  }
  return <LoginScreen onSignup={() => setScreen("signup")} onForgot={() => setScreen("forgot")} />;
}
