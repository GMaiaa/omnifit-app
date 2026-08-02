-- Sistema de administração: quem é admin, métricas agregadas do produto, e
-- um log de chamadas à API do Strava (pra acompanhar uso contra os limites
-- de taxa deles: 200 chamadas/15min, 2000/dia).
--
-- Como aplicar: cole no SQL Editor do Supabase e clique em "Run".

-- ---------------------------------------------------------------------
-- Quem é admin
-- ---------------------------------------------------------------------
-- Tabela separada de qualquer dado de perfil comum, de propósito: é um
-- controle de acesso sensível, não deve ficar misturado com dados comuns
-- do usuário. Sem NENHUMA policy de select/insert pro client — só é lida
-- por dentro das funções SECURITY DEFINER abaixo.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Função que o client usa pra saber se deve mostrar a aba Admin.
create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid());
$$;

grant execute on function public.is_current_user_admin() to authenticated;

-- ---------------------------------------------------------------------
-- Log de chamadas à API do Strava (escrito pela Edge Function strava-sync)
-- ---------------------------------------------------------------------
create table if not exists public.api_call_logs (
  id bigint generated always as identity primary key,
  provider text not null,
  endpoint text not null,
  status_code integer,
  user_id uuid references auth.users(id) on delete set null,
  called_at timestamptz not null default now()
);

create index if not exists api_call_logs_provider_called_at_idx
  on public.api_call_logs (provider, called_at desc);

alter table public.api_call_logs enable row level security;
-- Sem policy pro client — só a service role (Edge Functions) escreve aqui,
-- e só admins leem, via as funções abaixo.

-- ---------------------------------------------------------------------
-- Métricas agregadas — todas exigem admin, verificado por dentro da
-- própria função (SECURITY DEFINER ignora RLS, então essa checagem é a
-- única coisa que impede qualquer usuário comum de ver dados de todo
-- mundo).
-- ---------------------------------------------------------------------
create or replace function public.admin_get_overview()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not public.is_current_user_admin() then
    raise exception 'NOT_ADMIN';
  end if;

  select json_build_object(
    'totalUsers', (select count(*) from auth.users),
    'newUsers7d', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'newUsers30d', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
    'activeUsers7d', (
      select count(distinct user_id) from (
        select user_id, created_at from public.cycling_workouts
        union all select user_id, created_at from public.running_workouts
        union all select user_id, created_at from public.strength_sessions
      ) w where created_at >= now() - interval '7 days'
    ),
    'activeUsers30d', (
      select count(distinct user_id) from (
        select user_id, created_at from public.cycling_workouts
        union all select user_id, created_at from public.running_workouts
        union all select user_id, created_at from public.strength_sessions
      ) w where created_at >= now() - interval '30 days'
    ),
    'totalWorkouts', (
      (select count(*) from public.cycling_workouts) +
      (select count(*) from public.running_workouts) +
      (select count(*) from public.strength_sessions)
    ),
    'workoutsByModality', json_build_object(
      'ciclismo', (select count(*) from public.cycling_workouts),
      'corrida', (select count(*) from public.running_workouts),
      'musculacao', (select count(*) from public.strength_sessions)
    ),
    'stravaConnections', (select count(*) from public.strava_connections),
    'workoutsFromStrava', (
      (select count(*) from public.cycling_workouts where source = 'strava') +
      (select count(*) from public.running_workouts where source = 'strava')
    ),
    'workoutsFromFitUpload', (
      select count(*) from public.cycling_workouts where source = 'fit_upload'
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.admin_get_overview() to authenticated;

-- Série temporal de treinos criados por dia (todas as modalidades juntas),
-- pros últimos `days` dias — usada pro gráfico de atividade do produto.
create or replace function public.admin_get_daily_activity(days integer default 30)
returns table (day date, count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'NOT_ADMIN';
  end if;

  return query
    select d::date, count(w.created_at)
    from generate_series(current_date - (days - 1), current_date, interval '1 day') d
    left join (
      select created_at from public.cycling_workouts
      union all select created_at from public.running_workouts
      union all select created_at from public.strength_sessions
    ) w on w.created_at::date = d::date
    group by d
    order by d;
end;
$$;

grant execute on function public.admin_get_daily_activity(integer) to authenticated;

-- Uso da API do Strava contra os limites de taxa deles (200/15min, 2000/dia).
create or replace function public.admin_get_strava_api_usage()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not public.is_current_user_admin() then
    raise exception 'NOT_ADMIN';
  end if;

  select json_build_object(
    'callsLast15Min', (select count(*) from public.api_call_logs where provider = 'strava' and called_at >= now() - interval '15 minutes'),
    'callsToday', (select count(*) from public.api_call_logs where provider = 'strava' and called_at >= date_trunc('day', now())),
    'errorsLast24h', (select count(*) from public.api_call_logs where provider = 'strava' and status_code >= 400 and called_at >= now() - interval '24 hours')
  ) into result;

  return result;
end;
$$;

grant execute on function public.admin_get_strava_api_usage() to authenticated;
