-- Adiciona a running_workouts o mesmo suporte que cycling_workouts já tem:
-- de onde veio o treino, e um identificador externo pra evitar duplicar o
-- mesmo treino do Strava numa sincronização futura.
--
-- Como aplicar: cole no SQL Editor do Supabase e clique em "Run".

alter table public.running_workouts
  add column if not exists source text not null default 'manual';

alter table public.running_workouts
  add column if not exists external_id text;

create unique index if not exists running_workouts_user_external_id_idx
  on public.running_workouts (user_id, external_id)
  where external_id is not null;
