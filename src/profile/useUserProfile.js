import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "omnifit:perfil:v1";

/* Dados de saúde do atleta (peso, altura, FC etc.) — hoje usados só pra
   exibição/edição; a ideia é que as análises de cada modalidade passem a
   consumir isso (zonas de FC, IMC, etc.) conforme forem precisando. */
export function useUserProfile() {
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        setProfile(res ? JSON.parse(res.value) : {});
      } catch {
        setProfile({});
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateProfile = useCallback(async (next) => {
    setProfile(next);
    try {
      const res = await window.storage.set(STORAGE_KEY, JSON.stringify(next), false);
      if (!res) setSaveError("Não foi possível salvar. Tente novamente.");
      else setSaveError("");
    } catch {
      setSaveError("Não foi possível salvar. Tente novamente.");
    }
  }, []);

  return { profile, loading, saveError, updateProfile };
}
