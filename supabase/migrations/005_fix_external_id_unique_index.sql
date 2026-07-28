-- Corrige um erro real de sincronização: "there is no unique or exclusion
-- constraint matching the ON CONFLICT specification".
--
-- Causa: os índices criados nas migrations 002/003 eram PARCIAIS (só
-- cobriam linhas com external_id preenchido, via "where external_id is
-- not null"). O Postgres só consegue casar um índice parcial com um
-- ON CONFLICT se a cláusula WHERE for repetida ali também — e o upsert
-- que o Supabase client gera (.upsert(..., { onConflict: "user_id,
-- external_id" })) não inclui isso, então o conflito nunca era
-- reconhecido e toda tentativa de salvar uma atividade duplicada falhava.
--
-- Correção: troca por um índice único "cheio" (sem WHERE). Isso continua
-- funcionando normalmente para as linhas manuais (external_id nulo),
-- porque no Postgres cada NULL é considerado distinto dos demais para
-- fins de unicidade — várias linhas com external_id nulo continuam
-- permitidas.
--
-- Como aplicar: cole no SQL Editor do Supabase e clique em "Run".

drop index if exists public.cycling_workouts_user_external_id_idx;
create unique index if not exists cycling_workouts_user_external_id_idx
  on public.cycling_workouts (user_id, external_id);

drop index if exists public.running_workouts_user_external_id_idx;
create unique index if not exists running_workouts_user_external_id_idx
  on public.running_workouts (user_id, external_id);
