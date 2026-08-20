-- Revogar coluna a coluna não funciona quando existe GRANT no nível da tabela:
-- o grant da tabela cobre toda coluna nova ou revogada. O jeito certo é tirar
-- o UPDATE da tabela e devolver só as colunas que o corretor pode mexer.
revoke update on public.profiles from authenticated, anon;

grant update (name, email, phone, creci, city, agency, bio, preferences, updated_at)
  on public.profiles to authenticated;

-- plano, cota_usada e cota_limite ficam de fora de propósito: quem os altera é
-- o webhook do pagamento, que roda com a service role.
