-- Cria as tabelas do módulo de HYROX (fichas + histórico de execuções),
-- substituindo o armazenamento local temporário (window.storage) por
-- persistência real no Supabase — mesmo padrão de strength_templates /
-- strength_sessions (fichas com estrutura em jsonb, sessões com o registro
-- completo do que foi executado). Fecha o aviso deixado em
-- 004_notifications.sql sobre hyrox ainda não ter tabela real.
--
-- Como aplicar: cole este arquivo no SQL Editor do painel do Supabase
-- (Project > SQL Editor > New query) e clique em "Run". Só precisa ser
-- rodado uma vez.

-- ---------------------------------------------------------------------
-- Fichas ("templates") — blocks guarda a lista de exercícios/blocos da
-- ficha (id, catalogId, name, category, metricType, notes, rounds, order),
-- igual ao formato já usado por TemplateForm.jsx/HyroxRunner.jsx.
-- ---------------------------------------------------------------------
create table if not exists public.hyrox_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  focus text not null default 'resistencia',
  blocks jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hyrox_templates_user_id_idx on public.hyrox_templates (user_id);

alter table public.hyrox_templates enable row level security;

create policy "Users can view own hyrox templates"
  on public.hyrox_templates for select
  using (auth.uid() = user_id);

create policy "Users can insert own hyrox templates"
  on public.hyrox_templates for insert
  with check (auth.uid() = user_id);

create policy "Users can update own hyrox templates"
  on public.hyrox_templates for update
  using (auth.uid() = user_id);

create policy "Users can delete own hyrox templates"
  on public.hyrox_templates for delete
  using (auth.uid() = user_id);

create or replace function public.set_hyrox_templates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_hyrox_templates_updated_at on public.hyrox_templates;
create trigger trg_hyrox_templates_updated_at
  before update on public.hyrox_templates
  for each row execute function public.set_hyrox_templates_updated_at();

-- ---------------------------------------------------------------------
-- Sessões (histórico de execuções) — template_id aceita null porque o
-- HyroxRunner também suporta "Treino Livre" (sessão sem ficha nenhuma por
-- trás). blocks guarda o registro completo de cada bloco executado
-- (startedAt/finishedAt/durationSec/transitionSec + sets com
-- reps/weight/distanceM/durationSec/restSec/status), igual ao formato
-- produzido por HyroxRunner.jsx.
-- ---------------------------------------------------------------------
create table if not exists public.hyrox_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  template_id uuid references public.hyrox_templates(id) on delete set null,
  template_name text not null,
  focus text not null,

  date date not null,
  started_at timestamptz,
  finished_at timestamptz,
  duration_sec integer not null default 0 check (duration_sec >= 0),
  notes text,

  blocks jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists hyrox_sessions_user_id_idx on public.hyrox_sessions (user_id);
create index if not exists hyrox_sessions_date_idx on public.hyrox_sessions (date desc);
create index if not exists hyrox_sessions_template_id_idx on public.hyrox_sessions (template_id);

alter table public.hyrox_sessions enable row level security;

create policy "Users can view own hyrox sessions"
  on public.hyrox_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own hyrox sessions"
  on public.hyrox_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own hyrox sessions"
  on public.hyrox_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete own hyrox sessions"
  on public.hyrox_sessions for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Notificação de nova sessão — mesmo padrão de 004_notifications.sql
-- (trigger SECURITY DEFINER, único jeito de uma notificação nascer).
-- ---------------------------------------------------------------------
create or replace function public.notify_new_hyrox_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, body, source_table, source_id)
  values (
    new.user_id,
    'Nova sessão de HYROX',
    coalesce(new.template_name, 'Sessão') || ' — ' || to_char(new.date, 'DD/MM/YYYY'),
    'hyrox_sessions',
    new.id
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_hyrox_session on public.hyrox_sessions;
create trigger trg_notify_hyrox_session
  after insert on public.hyrox_sessions
  for each row execute function public.notify_new_hyrox_session();
