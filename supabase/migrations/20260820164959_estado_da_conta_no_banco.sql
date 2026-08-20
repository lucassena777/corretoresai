-- O acervo do corretor (conteúdos, compromissos, histórico e configurações)
-- passa a morar aqui, para acompanhar a conta de um aparelho para outro.
--
-- Um documento por usuário, e não uma tabela por tipo, de propósito: o
-- aplicativo sempre lê o acervo inteiro ao entrar e grava o inteiro ao mudar
-- algo — nunca consulta conteúdo de outra pessoa nem filtra no servidor.
-- Guardar como documento espelha esse uso, torna a gravação atômica e evita
-- reconciliar dezenas de linhas a cada clique. Quando houver necessidade de
-- consulta no servidor (relatório, publicação agendada), aí se normaliza.
create table if not exists public.estado_conta (
  user_id uuid primary key references auth.users(id) on delete cascade,
  estado jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

comment on table public.estado_conta is
  'Acervo do corretor: conteúdos, compromissos, histórico e configurações. Um documento por usuário.';

alter table public.estado_conta enable row level security;

-- Cada um enxerga e mexe só no próprio acervo.
create policy "acervo próprio: ler" on public.estado_conta
  for select using (auth.uid() = user_id);

create policy "acervo próprio: criar" on public.estado_conta
  for insert with check (auth.uid() = user_id);

create policy "acervo próprio: alterar" on public.estado_conta
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "acervo próprio: apagar" on public.estado_conta
  for delete using (auth.uid() = user_id);
