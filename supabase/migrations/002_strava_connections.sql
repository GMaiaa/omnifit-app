-- Guarda a conexão OAuth do usuário com o Strava (tokens), e adiciona
-- suporte a external_id em cycling_workouts pra evitar importar o mesmo
-- treino do Strava duas vezes numa nova sincronização.
--
-- Como aplicar: cole no SQL Editor do Supabase (Project > SQL Editor > New
-- query) e clique em "Run".

create table if not exists public.strava_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  strava_athlete_id bigint not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  connected_at timestamptz not null default now()
);

alter table public.strava_connections enable row level security;

-- Nenhuma policy de select/insert/update direta pro client: essa tabela só
-- é lida/escrita pelas Edge Functions (strava-oauth, strava-sync), que
-- rodam com a service role key e por isso ignoram RLS. Isso é
-- intencional — o access_token/refresh_token nunca deve chegar ao
-- navegador do usuário.

-- Permite identificar de qual atividade do Strava um treino de ciclismo
-- veio, pra não duplicar em sincronizações futuras.
alter table public.cycling_workouts
  add column if not exists external_id text;

create unique index if not exists cycling_workouts_user_external_id_idx
  on public.cycling_workouts (user_id, external_id)
  where external_id is not null;

-- Função SECURITY DEFINER: permite ao client (via supabase.rpc) checar se
-- o Strava está conectado sem nunca expor access_token/refresh_token. Só
-- devolve dados do próprio usuário autenticado (auth.uid()), independente
-- de quem chame — não recebe parâmetro de user_id de fora.
create or replace function public.get_strava_connection_status()
returns table (strava_athlete_id bigint, connected_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select strava_athlete_id, connected_at
  from public.strava_connections
  where user_id = auth.uid();
$$;

grant execute on function public.get_strava_connection_status() to authenticated;
