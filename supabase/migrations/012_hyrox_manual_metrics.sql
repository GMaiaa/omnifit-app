-- Adiciona métricas gerais de sessão usadas pelo registro pós-treino do
-- HYROX (cadastro manual de um treino que não deu pra registrar durante a
-- execução): calorias gastas e frequência cardíaca média. Ambas opcionais e
-- também disponíveis pra sessões feitas pelo HyroxRunner (Treino Livre ou
-- ficha), caso o usuário tenha esses dados de um relógio/monitor.
--
-- Como aplicar: cole este arquivo no SQL Editor do painel do Supabase
-- (Project > SQL Editor > New query) e clique em "Run". Só precisa ser
-- rodado uma vez.

alter table public.hyrox_sessions
  add column if not exists calories integer,
  add column if not exists avg_heart_rate integer;

alter table public.hyrox_sessions
  drop constraint if exists hyrox_sessions_calories_check,
  add constraint hyrox_sessions_calories_check check (calories is null or calories >= 0);

alter table public.hyrox_sessions
  drop constraint if exists hyrox_sessions_avg_heart_rate_check,
  add constraint hyrox_sessions_avg_heart_rate_check check (avg_heart_rate is null or avg_heart_rate between 30 and 250);
