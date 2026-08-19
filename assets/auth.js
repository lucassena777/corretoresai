window.SUPABASE_URL = window.SUPABASE_URL || "https://cksboexpaegtdprkksix.supabase.co";
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "sb_publishable_O9vUtVfAvyVmC51gKk34pw_nVnHmhyY";
window.supabaseClient = window.supabaseClient || window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
// Login Real
async function entrarComSupabase(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    alert("Erro ao entrar: " + error.message);
    return;
  }
  window.location.href = "dashboard.html";
}

// Cadastro Real
async function cadastrarComSupabase(email, password, nome) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { nome } }
  });
  if (error) {
    alert("Erro no cadastro: " + error.message);
    return;
  }
  alert("Conta criada com sucesso! Faça login para continuar.");
}
