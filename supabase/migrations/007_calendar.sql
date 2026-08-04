-- Calendário Fitness: calendários, membros, treinos planejados, blocos/
-- etapas do treino, links de compartilhamento, convites e histórico de
-- alterações. Modelagem completa proposta em conversa com o time — este
-- arquivo documenta no repo o que já foi rodado manualmente no SQL Editor
-- do Supabase.
--
-- Camada de PLANEJAMENTO, não substitui as tabelas de execução por
-- modalidade (strength_sessions, running_workouts, hyrox_sessions etc.):
-- o calendário guarda o que está previsto, cada módulo continua sendo a
-- fonte de verdade de série/repetição/carga já executada.
--
-- Como aplicar: cole este arquivo no SQL Editor do painel do Supabase
-- (Project > SQL Editor > New query) e clique em "Run". Só precisa ser
-- rodado uma vez.

-- =====================================================================
-- calendars
-- =====================================================================
create table if not exists public.calendars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  description text,
  timezone text not null default 'America/Sao_Paulo',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendars_owner_id_idx on public.calendars (owner_id);

create or replace function public.set_calendars_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_calendars_updated_at on public.calendars;
create trigger trg_calendars_updated_at
  before update on public.calendars
  for each row execute function public.set_calendars_updated_at();

-- =====================================================================
-- calendar_roles (tabela de referência — dados semeados abaixo)
-- =====================================================================
create table if not exists public.calendar_roles (
  id text primary key,
  label text not null,
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  can_manage_members boolean not null default false,
  can_share boolean not null default false
);

insert into public.calendar_roles (id, label, can_view, can_create, can_edit, can_delete, can_manage_members, can_share)
values
  ('owner',  'Dono',        true, true, true, true, true, true),
  ('coach',  'Treinador',   true, true, true, true, false, true),
  ('editor', 'Colaborador', true, true, true, false, false, false),
  ('viewer', 'Visualizador', true, false, false, false, false, false)
on conflict (id) do nothing;

-- =====================================================================
-- calendar_share_links
-- =====================================================================
create table if not exists public.calendar_share_links (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,

  token_hash text not null unique,
  role_id text not null references public.calendar_roles(id),
  requires_login boolean not null default true,

  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz,
  revoked_at timestamptz,
  max_uses integer,
  use_count integer not null default 0,
  last_used_at timestamptz,

  created_at timestamptz not null default now(),

  constraint anonymous_link_must_be_viewer check (requires_login or role_id = 'viewer'),
  constraint max_uses_positive check (max_uses is null or max_uses > 0)
);

create index if not exists calendar_share_links_calendar_id_idx on public.calendar_share_links (calendar_id);

-- =====================================================================
-- calendar_invites
-- =====================================================================
create table if not exists public.calendar_invites (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,

  invited_email text,
  invited_user_id uuid references auth.users(id) on delete cascade,
  role_id text not null references public.calendar_roles(id),
  token_hash text unique,

  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','revoked','expired')),
  expires_at timestamptz,
  responded_at timestamptz,

  created_at timestamptz not null default now(),

  constraint invite_needs_a_target check (invited_email is not null or invited_user_id is not null)
);

create index if not exists calendar_invites_calendar_id_idx on public.calendar_invites (calendar_id);
create index if not exists calendar_invites_invited_email_idx on public.calendar_invites (invited_email);
create index if not exists calendar_invites_invited_user_id_idx on public.calendar_invites (invited_user_id);
create unique index if not exists calendar_invites_pending_unique_idx
  on public.calendar_invites (calendar_id, invited_email)
  where status = 'pending';

-- =====================================================================
-- calendar_members
-- =====================================================================
create table if not exists public.calendar_members (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id text not null references public.calendar_roles(id),

  granted_via text not null default 'direct' check (granted_via in ('direct','invite','link')),
  invite_id uuid references public.calendar_invites(id) on delete set null,
  share_link_id uuid references public.calendar_share_links(id) on delete set null,
  invited_by uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),

  unique (calendar_id, user_id)
);

create index if not exists calendar_members_calendar_id_idx on public.calendar_members (calendar_id);
create index if not exists calendar_members_user_id_idx on public.calendar_members (user_id);

-- =====================================================================
-- workouts
-- =====================================================================
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,

  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,

  title text not null,
  description text,
  modality text check (modality in ('corrida','musculacao','natacao','ciclismo','hyrox','multiesporte','outro')),

  scheduled_date date not null,
  scheduled_time time,
  duration_sec integer check (duration_sec is null or duration_sec >= 0),

  status text not null default 'planned' check (status in ('planned','completed','skipped','canceled')),
  original_scheduled_date date,
  completed_at timestamptz,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workouts_calendar_date_idx on public.workouts (calendar_id, scheduled_date);
create index if not exists workouts_assigned_to_idx on public.workouts (assigned_to);
create index if not exists workouts_created_by_idx on public.workouts (created_by);

create or replace function public.set_workouts_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_workouts_updated_at on public.workouts;
create trigger trg_workouts_updated_at
  before update on public.workouts
  for each row execute function public.set_workouts_updated_at();

-- =====================================================================
-- workout_blocks
-- =====================================================================
create table if not exists public.workout_blocks (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,

  order_index integer not null default 0,
  modality text,
  title text not null,
  description text,
  duration_sec integer,
  distance_m numeric,
  sets integer,
  reps integer,
  load_kg numeric,
  notes text,

  created_at timestamptz not null default now()
);

create index if not exists workout_blocks_workout_id_idx on public.workout_blocks (workout_id, order_index);

-- =====================================================================
-- workout_audit_log
-- workout_id É DE PROPÓSITO sem foreign key: um DELETE em `workouts`
-- precisa gravar um registro de auditoria referenciando um id que, na
-- mesma transação, já deixou de existir na tabela pai — uma FK aqui
-- quebraria exatamente a exclusão que a auditoria deveria registrar.
-- =====================================================================
create table if not exists public.workout_audit_log (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null,
  calendar_id uuid not null references public.calendars(id) on delete cascade,

  action text not null check (action in ('created','updated','rescheduled','status_changed','deleted')),
  changed_by uuid references auth.users(id) on delete set null,

  before_data jsonb,
  after_data jsonb,

  changed_at timestamptz not null default now()
);

create index if not exists workout_audit_log_workout_idx on public.workout_audit_log (workout_id, changed_at desc);
create index if not exists workout_audit_log_calendar_idx on public.workout_audit_log (calendar_id, changed_at desc);

-- =====================================================================
-- Função central de permissão — reutilizada nas policies de
-- calendar_members / workouts / workout_blocks / workout_audit_log /
-- calendar_share_links / calendar_invites.
--
-- IMPORTANTE: a policy de SELECT da própria tabela "calendars" NÃO usa
-- esta função (ver mais abaixo) — se usasse, criaria uma referência
-- circular (a policy chama a função, a função consulta calendars, o que
-- aciona a mesma policy de novo), que o Postgres resolve sempre como
-- "sem permissão", mesmo para o dono do calendário. Todo lugar que
-- precisa checar propriedade/participação em um calendário a partir de
-- QUALQUER outra tabela pode usar a função normalmente — só a tabela
-- calendars, checando a si mesma, precisa da versão inline.
-- =====================================================================
create or replace function public.has_calendar_permission(p_calendar_id uuid, p_capability text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_is_owner boolean;
  v_allowed boolean;
begin
  select (owner_id = auth.uid()) into v_is_owner
  from public.calendars where id = p_calendar_id;

  if coalesce(v_is_owner, false) then
    return true;
  end if;

  select case p_capability
    when 'view' then r.can_view
    when 'create' then r.can_create
    when 'edit' then r.can_edit
    when 'delete' then r.can_delete
    when 'manage_members' then r.can_manage_members
    when 'share' then r.can_share
    else false
  end
  into v_allowed
  from public.calendar_members m
  join public.calendar_roles r on r.id = m.role_id
  where m.calendar_id = p_calendar_id and m.user_id = auth.uid();

  return coalesce(v_allowed, false);
end;
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.calendars enable row level security;
alter table public.calendar_members enable row level security;
alter table public.calendar_share_links enable row level security;
alter table public.calendar_invites enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_blocks enable row level security;
alter table public.workout_audit_log enable row level security;
alter table public.calendar_roles enable row level security;

create policy "Any authenticated user can read roles"
  on public.calendar_roles for select
  to authenticated
  using (true);

-- calendars: checagem inline (não usa has_calendar_permission) — ver o
-- comentário acima da definição da função para o motivo.
create policy "View if has view permission"
  on public.calendars for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.calendar_members m
      join public.calendar_roles r on r.id = m.role_id
      where m.calendar_id = calendars.id
        and m.user_id = auth.uid()
        and r.can_view
    )
  );
create policy "Only owner can create"
  on public.calendars for insert
  with check (owner_id = auth.uid());
create policy "Only owner can update"
  on public.calendars for update
  using (owner_id = auth.uid());
create policy "Only owner can delete"
  on public.calendars for delete
  using (owner_id = auth.uid());

-- calendar_members
create policy "View members if has view permission"
  on public.calendar_members for select
  using (public.has_calendar_permission(calendar_id, 'view'));
create policy "Manage members if has manage_members permission"
  on public.calendar_members for insert
  with check (public.has_calendar_permission(calendar_id, 'manage_members'));
create policy "Update members if has manage_members permission"
  on public.calendar_members for update
  using (public.has_calendar_permission(calendar_id, 'manage_members'));
create policy "Remove members if has manage_members permission"
  on public.calendar_members for delete
  using (public.has_calendar_permission(calendar_id, 'manage_members'));

-- calendar_share_links
create policy "Manage links if has share permission"
  on public.calendar_share_links for all
  using (public.has_calendar_permission(calendar_id, 'share'))
  with check (public.has_calendar_permission(calendar_id, 'share'));

-- calendar_invites
create policy "Manage invites if has manage_members permission"
  on public.calendar_invites for all
  using (public.has_calendar_permission(calendar_id, 'manage_members'))
  with check (public.has_calendar_permission(calendar_id, 'manage_members'));
create policy "Invitee can view own invite"
  on public.calendar_invites for select
  using (invited_user_id = auth.uid());
create policy "Invitee can respond to own invite"
  on public.calendar_invites for update
  using (invited_user_id = auth.uid())
  with check (invited_user_id = auth.uid());

-- workouts
create policy "View workouts if has view permission"
  on public.workouts for select
  using (public.has_calendar_permission(calendar_id, 'view'));
create policy "Create workouts if has create permission"
  on public.workouts for insert
  with check (public.has_calendar_permission(calendar_id, 'create'));
create policy "Edit workouts if has edit permission"
  on public.workouts for update
  using (public.has_calendar_permission(calendar_id, 'edit'));
create policy "Delete workouts if has delete permission"
  on public.workouts for delete
  using (public.has_calendar_permission(calendar_id, 'delete'));

-- workout_blocks (permissão herdada do workout pai)
create policy "View blocks if has view permission"
  on public.workout_blocks for select
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_blocks.workout_id
      and public.has_calendar_permission(w.calendar_id, 'view')
  ));
create policy "Create blocks if has create permission"
  on public.workout_blocks for insert
  with check (exists (
    select 1 from public.workouts w
    where w.id = workout_blocks.workout_id
      and public.has_calendar_permission(w.calendar_id, 'create')
  ));
create policy "Edit blocks if has edit permission"
  on public.workout_blocks for update
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_blocks.workout_id
      and public.has_calendar_permission(w.calendar_id, 'edit')
  ));
create policy "Delete blocks if has delete permission"
  on public.workout_blocks for delete
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_blocks.workout_id
      and public.has_calendar_permission(w.calendar_id, 'delete')
  ));

-- workout_audit_log: só leitura pelo client — escrita é exclusiva da trigger
create policy "View audit log if has view permission"
  on public.workout_audit_log for select
  using (public.has_calendar_permission(calendar_id, 'view'));

-- =====================================================================
-- Trigger de auditoria — só ela grava em workout_audit_log
-- =====================================================================
create or replace function public.log_workout_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
begin
  if tg_op = 'INSERT' then
    insert into public.workout_audit_log (workout_id, calendar_id, action, changed_by, before_data, after_data)
    values (new.id, new.calendar_id, 'created', coalesce(new.updated_by, new.created_by), null, to_jsonb(new));
    return new;

  elsif tg_op = 'UPDATE' then
    v_action := case
      when old.scheduled_date is distinct from new.scheduled_date then 'rescheduled'
      when old.status is distinct from new.status then 'status_changed'
      else 'updated'
    end;
    insert into public.workout_audit_log (workout_id, calendar_id, action, changed_by, before_data, after_data)
    values (new.id, new.calendar_id, v_action, coalesce(new.updated_by, new.created_by), to_jsonb(old), to_jsonb(new));
    return new;

  elsif tg_op = 'DELETE' then
    insert into public.workout_audit_log (workout_id, calendar_id, action, changed_by, before_data, after_data)
    values (old.id, old.calendar_id, 'deleted', auth.uid(), to_jsonb(old), null);
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_log_workout_change on public.workouts;
create trigger trg_log_workout_change
  after insert or update or delete on public.workouts
  for each row execute function public.log_workout_change();
