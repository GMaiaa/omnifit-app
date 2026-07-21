import { useState } from "react";
import App from "./App.jsx";
import { LoginScreen } from "./auth/LoginScreen";
import { SignupScreen } from "./auth/SignupScreen";
import { ForgotPasswordScreen } from "./auth/ForgotPasswordScreen";

/* Fluxo de telas fictício na frente do app: login é sempre a porta de
   entrada por enquanto (não há sessão persistida — isso entra junto da
   autenticação real). "Entrar"/"Criar conta" navegam para a "Home"
   simulada, que é o próprio App já existente. */
export default function AuthGate() {
  const [screen, setScreen] = useState("login"); // "login" | "signup" | "forgot" | "app"

  if (screen === "app") return <App />;

  if (screen === "signup") {
    return <SignupScreen onBack={() => setScreen("login")} onCreated={() => setScreen("app")} />;
  }

  if (screen === "forgot") {
    return <ForgotPasswordScreen onBack={() => setScreen("login")} />;
  }

  return (
    <LoginScreen
      onLogin={() => setScreen("app")}
      onSignup={() => setScreen("signup")}
      onForgot={() => setScreen("forgot")}
    />
  );
}
