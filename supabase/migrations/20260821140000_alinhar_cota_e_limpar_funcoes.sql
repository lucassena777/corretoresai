-- 1. A cota do plano gratuito estava em dois valores ao mesmo tempo.
--    O site anuncia 5 gerações (assets/data.js) e o webhook grava 5
--    (COTAS em stripe-webhook), mas a coluna nasceu com default 10 e as
--    contas gratuitas nunca passaram pelo webhook — então ficaram com 10.
--    O servidor é quem recusa, então valia o 10: o corretor via "5 de 5
--    usadas" e continuava gerando. Alinha pelo número anunciado.
alter table public.profiles alter column cota_limite set default 5;

update public.profiles
   set cota_limite = 5
 where plano = 'gratuito' and cota_limite <> 5;

-- 2. consume_ai_generation é do sistema de cota anterior, quando a conta
--    vivia na tabela ai_usage e quem somava era o navegador. Hoje quem conta
--    é a Edge Function contra profiles.cota_usada. Manter as duas era deixar
--    uma porta aberta para um contador concorrente escrever pelas costas da
--    outra.
drop function if exists public.consume_ai_generation(integer);

-- 3. handle_new_user e touch_updated_at são funções de gatilho: o Postgres as
--    chama sozinho. Não existe motivo para estarem expostas como RPC em
--    /rest/v1/rpc — e SECURITY DEFINER exposto é exatamente o que se evita.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

-- search_path fixo: sem isto, quem conseguir criar um schema na frente do
-- caminho de busca decide o que "now()" significa dentro da função.
alter function public.touch_updated_at() set search_path = public, pg_temp;

-- 4. Excluir a própria conta exige sessão — a função já recusa sem auth.uid().
--    Ainda assim, quem não entrou não tem o que fazer com ela.
revoke all on function public.excluir_minha_conta() from anon;
grant execute on function public.excluir_minha_conta() to authenticated;
