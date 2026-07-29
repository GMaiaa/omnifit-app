-- Sistema de notificações: uma tabela + triggers que disparam sozinhos
-- sempre que um treino novo é inserido em qualquer uma das tabelas de
-- modalidade que já persistem de verdade no Supabase (cycling_workouts,
-- running_workouts, strength_sessions) — cobre cadastro manual, upload de
-- .fit e sincronização do Strava ao mesmo tempo, sem precisar duplicar
-- lógica em cada lugar do frontend que cria um treino.
--
-- IMPORTANTE: swimming e hyrox ainda não têm tabela real no Supabase (esses
-- dois módulos ainda usam um armazenamento local temporário, um problema
-- puxado desde antes desta mudança) — por isso não geram notificação ainda.
-- Quando forem migrados pra Supabase, os triggers correspondentes podem ser
-- adicionados seguindo o mesmo padrão abaixo.
--
-- Como aplicar: cole no SQL Editor do Supabase e clique em "Run".

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'workout_new',
  source_table text,
  source_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read, created_at desc);

alter table public.notifications enable row level security;

-- O client só pode ler/marcar como lida/apagar as próprias notificações.
-- Não existe policy de insert pro client: notificações só nascem via
-- trigger SECURITY DEFINER (abaixo), nunca escritas diretamente pelo app.
create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Users can delete own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Ciclismo
-- ---------------------------------------------------------------------
create or replace function public.notify_new_cycling_workout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, body, source_table, source_id)
  values (
    new.user_id,
    coalesce(new.title, 'Novo treino de ciclismo'),
    new.distance_km || ' km em ' || to_char(new.date, 'DD/MM/YYYY'),
    'cycling_workouts',
    new.id
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_cycling_workout on public.cycling_workouts;
create trigger trg_notify_cycling_workout
  after insert on public.cycling_workouts
  for each row execute function public.notify_new_cycling_workout();

-- ---------------------------------------------------------------------
-- Corrida
-- ---------------------------------------------------------------------
create or replace function public.notify_new_running_workout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, body, source_table, source_id)
  values (
    new.user_id,
    'Novo treino de corrida',
    new.distance_km || ' km em ' || to_char(new.date, 'DD/MM/YYYY'),
    'running_workouts',
    new.id
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_running_workout on public.running_workouts;
create trigger trg_notify_running_workout
  after insert on public.running_workouts
  for each row execute function public.notify_new_running_workout();

-- ---------------------------------------------------------------------
-- Musculação
-- ---------------------------------------------------------------------
create or replace function public.notify_new_strength_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, body, source_table, source_id)
  values (
    new.user_id,
    'Nova sessão de musculação',
    coalesce(new.template_name, 'Sessão') || ' — ' || to_char(new.date, 'DD/MM/YYYY'),
    'strength_sessions',
    new.id
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_strength_session on public.strength_sessions;
create trigger trg_notify_strength_session
  after insert on public.strength_sessions
  for each row execute function public.notify_new_strength_session();

-- Função SECURITY DEFINER pro client marcar tudo como lido de uma vez
-- (evita mandar um UPDATE por notificação).
create or replace function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications set read = true where user_id = auth.uid() and read = false;
$$;

grant execute on function public.mark_all_notifications_read() to authenticated;
