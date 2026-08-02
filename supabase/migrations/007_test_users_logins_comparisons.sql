-- Adiciona: (1) marcação de "usuário teste" (auto-serviço, qualquer
-- usuário pode marcar a própria conta), pra excluir essas contas das
-- métricas do Admin; (2) rastreamento de login diário; (3) comparativos
-- dia-a-dia / semana-a-semana nas métricas do Admin.
--
-- Como aplicar: cole no SQL Editor do Supabase e clique em "Run".

-- ---------------------------------------------------------------------
-- Usuários teste
-- ---------------------------------------------------------------------
create table if not exists public.test_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  marked_at timestamptz not null default now()
);

alter table public.test_users enable row level security;
-- Sem policy direta pro client — só via as funções abaixo, que só deixam
-- cada usuário mexer na própria marcação (não na de terceiros).

create or replace function public.is_current_user_test()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(select 1 from public.test_users where user_id = auth.uid());
$$;

grant execute on function public.is_current_user_test() to authenticated;

-- Alterna a própria conta como teste/não-teste. Cada usuário só marca a
-- si mesmo — auth.uid() nunca vem de fora.
create or replace function public.set_my_test_status(mark_as_test boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if mark_as_test then
    insert into public.test_users (user_id) values (auth.uid())
    on conflict (user_id) do nothing;
  else
    delete from public.test_users where user_id = auth.uid();
  end if;
end;
$$;

grant execute on function public.set_my_test_status(boolean) to authenticated;

-- ---------------------------------------------------------------------
-- Rastreamento de login
-- ---------------------------------------------------------------------
create table if not exists public.login_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_in_at timestamptz not null default now()
);

create index if not exists login_events_logged_in_at_idx on public.login_events (logged_in_at desc);
create index if not exists login_events_user_id_idx on public.login_events (user_id);

alter table public.login_events enable row level security;

-- Cada usuário só pode registrar o PRÓPRIO login — nunca em nome de
-- outra pessoa. Não existe policy de select (só admins leem, via as
-- funções agregadas abaixo).
create policy "Users can log their own logins"
  on public.login_events for insert
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Atualiza as funções de métricas do Admin pra aceitar exclusão de
-- usuários teste (padrão: exclui) e adiciona comparativos.
-- ---------------------------------------------------------------------
create or replace function public.admin_get_overview(exclude_test boolean default true)
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
    'totalUsers', (
      select count(*) from auth.users u
      where not exclude_test or u.id not in (select user_id from public.test_users)
    ),
    'newUsers7d', (
      select count(*) from auth.users u
      where u.created_at >= now() - interval '7 days'
        and (not exclude_test or u.id not in (select user_id from public.test_users))
    ),
    'newUsers30d', (
      select count(*) from auth.users u
      where u.created_at >= now() - interval '30 days'
        and (not exclude_test or u.id not in (select user_id from public.test_users))
    ),
    'activeUsers7d', (
      select count(distinct w.user_id) from (
        select user_id, created_at from public.cycling_workouts
        union all select user_id, created_at from public.running_workouts
        union all select user_id, created_at from public.strength_sessions
      ) w where w.created_at >= now() - interval '7 days'
        and (not exclude_test or w.user_id not in (select user_id from public.test_users))
    ),
    'activeUsers30d', (
      select count(distinct w.user_id) from (
        select user_id, created_at from public.cycling_workouts
        union all select user_id, created_at from public.running_workouts
        union all select user_id, created_at from public.strength_sessions
      ) w where w.created_at >= now() - interval '30 days'
        and (not exclude_test or w.user_id not in (select user_id from public.test_users))
    ),
    'totalWorkouts', (
      select count(*) from (
        select user_id from public.cycling_workouts
        union all select user_id from public.running_workouts
        union all select user_id from public.strength_sessions
      ) w where not exclude_test or w.user_id not in (select user_id from public.test_users)
    ),
    'workoutsByModality', json_build_object(
      'ciclismo', (select count(*) from public.cycling_workouts w where not exclude_test or w.user_id not in (select user_id from public.test_users)),
      'corrida', (select count(*) from public.running_workouts w where not exclude_test or w.user_id not in (select user_id from public.test_users)),
      'musculacao', (select count(*) from public.strength_sessions w where not exclude_test or w.user_id not in (select user_id from public.test_users))
    ),
    'stravaConnections', (select count(*) from public.strava_connections c where not exclude_test or c.user_id not in (select user_id from public.test_users)),
    'workoutsFromStrava', (
      (select count(*) from public.cycling_workouts w where w.source = 'strava' and (not exclude_test or w.user_id not in (select user_id from public.test_users))) +
      (select count(*) from public.running_workouts w where w.source = 'strava' and (not exclude_test or w.user_id not in (select user_id from public.test_users)))
    ),
    'workoutsFromFitUpload', (
      select count(*) from public.cycling_workouts w where w.source = 'fit_upload' and (not exclude_test or w.user_id not in (select user_id from public.test_users))
    ),
    'testUsersCount', (select count(*) from public.test_users)
  ) into result;

  return result;
end;
$$;

grant execute on function public.admin_get_overview(boolean) to authenticated;

create or replace function public.admin_get_daily_activity(days integer default 30, exclude_test boolean default true)
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
      select created_at, user_id from public.cycling_workouts
      union all select created_at, user_id from public.running_workouts
      union all select created_at, user_id from public.strength_sessions
    ) w on w.created_at::date = d::date
      and (not exclude_test or w.user_id not in (select user_id from public.test_users))
    group by d
    order by d;
end;
$$;

grant execute on function public.admin_get_daily_activity(integer, boolean) to authenticated;

-- Logins por dia, últimos `days` dias.
create or replace function public.admin_get_daily_logins(days integer default 30, exclude_test boolean default true)
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
    select d::date, count(l.logged_in_at)
    from generate_series(current_date - (days - 1), current_date, interval '1 day') d
    left join public.login_events l
      on l.logged_in_at::date = d::date
      and (not exclude_test or l.user_id not in (select user_id from public.test_users))
    group by d
    order by d;
end;
$$;

grant execute on function public.admin_get_daily_logins(integer, boolean) to authenticated;

-- Comparativos: hoje vs ontem, essa semana vs semana passada — pra
-- logins, treinos criados, novos usuários e chamadas à API do Strava.
create or replace function public.admin_get_comparisons(exclude_test boolean default true)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
  workouts_today bigint;
  workouts_yesterday bigint;
  workouts_this_week bigint;
  workouts_last_week bigint;
  logins_today bigint;
  logins_yesterday bigint;
  logins_this_week bigint;
  logins_last_week bigint;
  new_users_today bigint;
  new_users_yesterday bigint;
  strava_calls_today bigint;
  strava_calls_yesterday bigint;
begin
  if not public.is_current_user_admin() then
    raise exception 'NOT_ADMIN';
  end if;

  select count(*) into workouts_today from (
    select created_at, user_id from public.cycling_workouts
    union all select created_at, user_id from public.running_workouts
    union all select created_at, user_id from public.strength_sessions
  ) w where w.created_at::date = current_date
    and (not exclude_test or w.user_id not in (select user_id from public.test_users));

  select count(*) into workouts_yesterday from (
    select created_at, user_id from public.cycling_workouts
    union all select created_at, user_id from public.running_workouts
    union all select created_at, user_id from public.strength_sessions
  ) w where w.created_at::date = current_date - 1
    and (not exclude_test or w.user_id not in (select user_id from public.test_users));

  select count(*) into workouts_this_week from (
    select created_at, user_id from public.cycling_workouts
    union all select created_at, user_id from public.running_workouts
    union all select created_at, user_id from public.strength_sessions
  ) w where w.created_at >= date_trunc('week', now())
    and (not exclude_test or w.user_id not in (select user_id from public.test_users));

  select count(*) into workouts_last_week from (
    select created_at, user_id from public.cycling_workouts
    union all select created_at, user_id from public.running_workouts
    union all select created_at, user_id from public.strength_sessions
  ) w where w.created_at >= date_trunc('week', now()) - interval '7 days'
    and w.created_at < date_trunc('week', now())
    and (not exclude_test or w.user_id not in (select user_id from public.test_users));

  select count(*) into logins_today from public.login_events l
    where l.logged_in_at::date = current_date
      and (not exclude_test or l.user_id not in (select user_id from public.test_users));

  select count(*) into logins_yesterday from public.login_events l
    where l.logged_in_at::date = current_date - 1
      and (not exclude_test or l.user_id not in (select user_id from public.test_users));

  select count(*) into logins_this_week from public.login_events l
    where l.logged_in_at >= date_trunc('week', now())
      and (not exclude_test or l.user_id not in (select user_id from public.test_users));

  select count(*) into logins_last_week from public.login_events l
    where l.logged_in_at >= date_trunc('week', now()) - interval '7 days'
      and l.logged_in_at < date_trunc('week', now())
      and (not exclude_test or l.user_id not in (select user_id from public.test_users));

  select count(*) into new_users_today from auth.users u
    where u.created_at::date = current_date
      and (not exclude_test or u.id not in (select user_id from public.test_users));

  select count(*) into new_users_yesterday from auth.users u
    where u.created_at::date = current_date - 1
      and (not exclude_test or u.id not in (select user_id from public.test_users));

  select count(*) into strava_calls_today from public.api_call_logs
    where provider = 'strava' and called_at::date = current_date;

  select count(*) into strava_calls_yesterday from public.api_call_logs
    where provider = 'strava' and called_at::date = current_date - 1;

  select json_build_object(
    'workoutsToday', workouts_today,
    'workoutsYesterday', workouts_yesterday,
    'workoutsThisWeek', workouts_this_week,
    'workoutsLastWeek', workouts_last_week,
    'loginsToday', logins_today,
    'loginsYesterday', logins_yesterday,
    'loginsThisWeek', logins_this_week,
    'loginsLastWeek', logins_last_week,
    'newUsersToday', new_users_today,
    'newUsersYesterday', new_users_yesterday,
    'stravaCallsToday', strava_calls_today,
    'stravaCallsYesterday', strava_calls_yesterday
  ) into result;

  return result;
end;
$$;

grant execute on function public.admin_get_comparisons(boolean) to authenticated;
