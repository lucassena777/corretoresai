-- 1. O corretor edita o próprio perfil, mas NÃO o próprio plano.
--    Sem isto, qualquer um faz PATCH em profiles?id=eq.<seu id> com
--    {"plano":"ilimitado"} e ganha o plano pago de graça. RLS controla linha,
--    não coluna — quem restringe coluna é o GRANT.
revoke update (plano, cota_usada, cota_limite) on public.profiles from authenticated;
revoke update (plano, cota_usada, cota_limite) on public.profiles from anon;

-- 2. Excluir a própria conta. Apagar de auth.users exige privilégio que o
--    cliente não tem, então vai por função com dono postgres.
create or replace function public.excluir_minha_conta()
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  quem uuid := auth.uid();
begin
  if quem is null then
    raise exception 'Sem sessão.';
  end if;

  delete from public.activities where user_id = quem;
  delete from public.contents where user_id = quem;
  delete from public.conteudos where user_id = quem;
  delete from public.ai_usage where user_id = quem;
  delete from public.subscriptions where user_id = quem;
  delete from public.profiles where id = quem;
  delete from auth.users where id = quem;
end;
$function$;

revoke all on function public.excluir_minha_conta() from public;
grant execute on function public.excluir_minha_conta() to authenticated;
