-- Cria a tabela de treinos de ciclismo, seguindo o mesmo padrão de
-- public.running_workouts: RLS por auth.uid(), snake_case, timestamps.
--
-- Como aplicar: cole este arquivo no SQL Editor do painel do Supabase
-- (Project > SQL Editor > New query) e clique em "Run". Só precisa ser
-- rodado uma vez.

create table if not exists public.cycling_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  date date not null,
  type text not null default 'endurance',
  title text,

  -- 'manual' = cadastrado pelo formulário, 'fit_upload' = importado de .fit
  source text not null default 'manual',

  distance_km numeric not null check (distance_km > 0),
  duration_sec integer not null check (duration_sec > 0),
  elevation_gain_m integer,

  avg_hr integer,
  max_hr integer,
  avg_power integer,
  max_power integer,
  avg_cadence integer,
  max_cadence integer,
  calories integer,
  rpe integer,
  notes text,

  -- Série temporal do treino (potência, FC, cadência, velocidade, altitude,
  -- distância acumulada por segundo), guardada como JSON numa única coluna
  -- em vez de uma tabela separada — evita milhares de inserts por upload e
  -- é pequena o bastante (poucas centenas de KB) pra não pesar a consulta.
  stream_data jsonb,

  created_at timestamptz not null default now()
);

create index if not exists cycling_workouts_user_id_idx on public.cycling_workouts (user_id);
create index if not exists cycling_workouts_date_idx on public.cycling_workouts (date desc);

alter table public.cycling_workouts enable row level security;

create policy "Users can view own cycling workouts"
  on public.cycling_workouts for select
  using (auth.uid() = user_id);

create policy "Users can insert own cycling workouts"
  on public.cycling_workouts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own cycling workouts"
  on public.cycling_workouts for update
  using (auth.uid() = user_id);

create policy "Users can delete own cycling workouts"
  on public.cycling_workouts for delete
  using (auth.uid() = user_id);
