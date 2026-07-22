/* Traduz erros técnicos do Supabase Auth para mensagens amigáveis em
   português. O erro original (com stack/status) só vai para o console, e
   apenas em desenvolvimento — a UI nunca mostra o texto técnico do Supabase. */
export function mapAuthError(error, fallback = "Não foi possível concluir a operação. Tente novamente.") {
  if (!error) return fallback;

  if (import.meta.env.DEV) {
    console.error("[Supabase Auth]", error);
  }

  const message = String(error.message || "").toLowerCase();
  const code = String(error.code || "").toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "E-mail ou senha inválidos.";
  }
  if (message.includes("already registered") || message.includes("already exists")) {
    return "Este e-mail já está cadastrado. Tente entrar.";
  }
  if (message.includes("password should be at least") || message.includes("password is too short")) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  if (message.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar.";
  }
  if (code === "email_address_invalid" || message.includes("invalid email") || message.includes("unable to validate email") || (message.includes("email") && message.includes("invalid"))) {
    return "Informe um e-mail válido.";
  }
  if (message.includes("refresh token") || (message.includes("session") && message.includes("expired"))) {
    return "Sua sessão expirou. Faça login novamente.";
  }
  if (message.includes("failed to fetch") || message.includes("network") || message.includes("connection")) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }
  if (message.includes("rate limit") || message.includes("too many requests")) {
    return "Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.";
  }

  return fallback;
}
