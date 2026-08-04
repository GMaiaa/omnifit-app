-- Permite ao admin ver a lista de usuários (com e-mail, quando criou,
-- quantos treinos/logins tem, e se já está marcado como teste) e marcar
-- QUALQUER conta como teste — diferente de set_my_test_status, que só
-- deixa cada usuário mexer na própria marcação.
--
-- Como aplicar: cole no SQL Editor do Supabase e clique em "Run".

create or replace function public.admin_list_users(result_limit integer default 200)
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  is_test boolean,
  workout_count bigint,
  login_count bigint,
  last_login_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'NOT_ADMIN';
  end if;

  return query
    select
      u.id,
      u.email,
      u.created_at,
      exists(select 1 from public.test_users t where t.user_id = u.id),
      coalesce((
        select count(*) from (
          select user_id from public.cycling_workouts where user_id = u.id
          union all select user_id from public.running_workouts where user_id = u.id
          union all select user_id from public.strength_sessions where user_id = u.id
        ) w
      ), 0),
      coalesce((select count(*) from public.login_events l where l.user_id = u.id), 0),
      (select max(l.logged_in_at) from public.login_events l where l.user_id = u.id)
    from auth.users u
    order by u.created_at desc
    limit result_limit;
end;
$$;

grant execute on function public.admin_list_users(integer) to authenticated;

-- Diferente de set_my_test_status: admin pode marcar QUALQUER usuário
-- (não só a própria conta).
create or replace function public.admin_set_user_test_status(target_user_id uuid, mark_as_test boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'NOT_ADMIN';
  end if;

  if mark_as_test then
    insert into public.test_users (user_id) values (target_user_id)
    on conflict (user_id) do nothing;
  else
    delete from public.test_users where user_id = target_user_id;
  end if;
end;
$$;

grant execute on function public.admin_set_user_test_status(uuid, boolean) to authenticated;
