import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
/* O .env.local deste projeto define VITE_SUPABASE_ANON_KEY. Também aceitamos
   VITE_SUPABASE_PUBLISHABLE_KEY (o nome mais novo que o Supabase vem
   adotando para a mesma chave pública) para o cliente continuar funcionando
   caso a variável seja renomeada no futuro. */
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local (na raiz do projeto) e reinicie o servidor de desenvolvimento."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
