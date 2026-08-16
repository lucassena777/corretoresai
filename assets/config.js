// Endereços públicos do back-end.
//
// A chave abaixo é a "anon key" do Supabase — publicável por definição: ela só
// identifica o projeto e não dá acesso a nada. A chave da IA fica como secret
// dentro da Edge Function e nunca chega ao navegador.

const CONFIG = {
  assistenteUrl: "https://cksboexpaegtdprkksix.supabase.co/functions/v1/assistente",
  assistenteChave: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrc2JvZXhwYWVndGRwcmtrc2l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NDMzNjEsImV4cCI6MjEwMDUxOTM2MX0.iOlA5LN5J3Og_XhVxbNXPT36voYQY194uH_MW5nGDRo"
};
