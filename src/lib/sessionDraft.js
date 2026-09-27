/* Autosave de sessão em andamento (localStorage), pra não perder um treino
   quando o app fecha, recarrega, ou o SO mata o processo em segundo plano.
   Cada módulo (musculação, HYROX, ...) usa seu próprio namespace — só existe
   uma sessão ativa por módulo de cada vez, então um slot por namespace basta. */
const PREFIX = "omnifit:draft:";
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // rascunho mais velho que isso não faz mais sentido retomar

export function saveDraft(namespace, data) {
  try {
    localStorage.setItem(PREFIX + namespace, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {
    // localStorage indisponível (modo privado, quota cheia) — autosave vira no-op
  }
}

export function loadDraft(namespace) {
  try {
    const raw = localStorage.getItem(PREFIX + namespace);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft?.savedAt || Date.now() - draft.savedAt > MAX_AGE_MS) {
      clearDraft(namespace);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function clearDraft(namespace) {
  try {
    localStorage.removeItem(PREFIX + namespace);
  } catch {
    // ignora
  }
}
