-- Compartilhamento de treinos entre usuários por e-mail: Musculação e
-- HYROX compartilham a FICHA (template, reutilizável), Corrida e Ciclismo
-- compartilham o TREINO REGISTRADO em si (não têm conceito de ficha).
-- Natação fica de fora por enquanto — o módulo ainda usa armazenamento
-- local, não Supabase.
--
-- Fluxo: quem compartilha grava um snapshot (jsonb) do conteúdo no momento
-- do envio — o destinatário nunca lê a linha original (mais simples de dar
-- RLS e sobrevive a edição/exclusão do original por quem enviou). Aceitar
-- só faz um INSERT normal na tabela real daquela modalidade, usando o
-- mesmo serviço que o formulário de criação já usa.
--
-- O envio de e-mail de verdade fica para depois (precisa de um provedor
-- transacional) — por ora a notificação é só dentro do app, via a mesma
-- tabela public.notifications já usada pelos outros módulos.
--
-- Como aplicar: cole este arquivo no SQL Editor do painel do Supabase
-- (Project > SQL Editor > New query) e clique em "Run". Só precisa ser
-- rodado uma vez.

-- =====================================================================
-- Resolve um e-mail pro user_id correspondente. O client não pode
-- consultar auth.users diretamente (schema protegido) — esta função
-- expõe só o mínimo necessário (um uuid ou null), nunca outros dados do
-- usuário.
-- =====================================================================
create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

grant execute on function public.find_user_id_by_email(text) to authenticated;

-- =====================================================================
-- workout_shares
-- =====================================================================
create table if not exists public.workout_shares (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  recipient_email text not null,

  modality text not null check (modality in ('musculacao', 'hyrox', 'corrida', 'ciclismo')),
  source_type text not null check (source_type in ('template', 'workout')),
  source_id uuid,

  title text not null,
  payload jsonb not null,
  message text,

  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'revoked')),

  created_at timestamptz not null default now(),
  responded_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),

  constraint sender_recipient_different check (sender_id <> recipient_id)
);

create index if not exists workout_shares_recipient_idx on public.workout_shares (recipient_id, status);
create index if not exists workout_shares_sender_idx on public.workout_shares (sender_id);

-- Evita reenviar o mesmo treino pendente pra mesma pessoa várias vezes —
-- não impede reenviar depois que o convite anterior foi respondido/revogado.
create unique index if not exists workout_shares_pending_unique_idx
  on public.workout_shares (sender_id, recipient_id, modality, source_type, source_id)
  where status = 'pending';

alter table public.workout_shares enable row level security;

create policy "Users can view shares they sent or received"
  on public.workout_shares for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "Users can send shares as themselves"
  on public.workout_shares for insert
  with check (sender_id = auth.uid());

-- Só o destinatário pode aceitar/recusar; só quem enviou pode revogar —
-- e só enquanto ainda está pendente nos dois casos.
create policy "Recipient can accept or decline a pending share"
  on public.workout_shares for update
  using (recipient_id = auth.uid() and status = 'pending')
  with check (recipient_id = auth.uid() and status in ('accepted', 'declined'));

create policy "Sender can revoke a pending share"
  on public.workout_shares for update
  using (sender_id = auth.uid() and status = 'pending')
  with check (sender_id = auth.uid() and status = 'revoked');

-- =====================================================================
-- Notificação (dentro do app) de um novo compartilhamento recebido —
-- mesmo padrão SECURITY DEFINER de 004_notifications.sql.
-- =====================================================================
create or replace function public.notify_new_workout_share()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, body, source_table, source_id)
  values (
    new.recipient_id,
    'Treino compartilhado com você',
    new.title,
    'workout_shares',
    new.id
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_workout_share on public.workout_shares;
create trigger trg_notify_workout_share
  after insert on public.workout_shares
  for each row execute function public.notify_new_workout_share();
