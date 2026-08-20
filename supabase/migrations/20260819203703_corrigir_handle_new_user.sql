-- O gatilho inseria em profiles(nome), mas a coluna se chama name: todo
-- cadastro falhava com "Database error saving new user". Aproveita também os
-- outros campos que o formulário de cadastro já coleta.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  insert into public.profiles (id, email, name, creci, city, phone)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'nome', ''), split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'creci', ''),
    coalesce(new.raw_user_meta_data->>'cidade', ''),
    coalesce(new.raw_user_meta_data->>'telefone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;
