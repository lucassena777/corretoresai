// Endereços públicos do back-end.
//
// A chave abaixo é a "anon key" do Supabase — publicável por definição: ela só
// identifica o projeto e não dá acesso a nada. A chave da IA fica como secret
// dentro da Edge Function e nunca chega ao navegador.

const CONFIG = {
  // Projeto Supabase: contas, perfis e planos. A "publishable key" é pública
  // por definição — só identifica o projeto, e o RLS é quem protege os dados.
  supabaseUrl: "https://cksboexpaegtdprkksix.supabase.co",
  supabaseChave: "sb_publishable_O9vUtVfAvyVmC51gKk34pw_nVnHmhyY",

  assistenteUrl: "https://cksboexpaegtdprkksix.supabase.co/functions/v1/assistente",
  checkoutUrl: "https://cksboexpaegtdprkksix.supabase.co/functions/v1/checkout",
  assistenteChave: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrc2JvZXhwYWVndGRwcmtrc2l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NDMzNjEsImV4cCI6MjEwMDUxOTM2MX0.iOlA5LN5J3Og_XhVxbNXPT36voYQY194uH_MW5nGDRo",

  // Cabeçalhos de toda chamada ao back-end.
  //
  // O `authorization` leva o token do corretor logado, não a chave anônima: é
  // assim que a função sabe de quem é a cota que está gastando. Sem sessão,
  // cai na chave anônima e a função recusa — que é o certo.
  cabecalhos() {
    const token = (typeof db !== "undefined" && db.tokenAtual()) || this.supabaseChave;
    return {
      "content-type": "application/json",
      "authorization": `Bearer ${token}`,
      "apikey": this.supabaseChave
    };
  },

  // A prévia de arquivo único roda dentro de um iframe isolado que bloqueia
  // qualquer conexão externa. Lá a IA nunca vai responder — e é bom dizer isso
  // com todas as letras em vez de deixar o navegador soltar "Failed to fetch".
  emPreviaIsolada() {
    try { return window.top !== window.self; } catch { return true; }
  },

  // Traduz a falha para algo que se possa agir. `fetch` só rejeita quando a
  // requisição não chegou ao servidor: CSP, DNS, offline ou CORS. Resposta com
  // status de erro é outro caminho — essa vem com mensagem nossa no corpo.
  diagnosticar(e) {
    console.error("[CorretoresAI] falha ao falar com o back-end:", e);

    if (e?.name === "AbortError") return "A resposta demorou demais e foi interrompida.";

    if (e instanceof TypeError) {
      if (this.emPreviaIsolada()) {
        return "esta prévia não faz chamadas externas — abra o site publicado para usar a IA";
      }
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return "sem conexão com a internet";
      }
      return "não foi possível alcançar o servidor da IA";
    }

    return e?.message || "erro inesperado";
  },

  // Erro que veio COM resposta HTTP: o corpo traz a mensagem em português que
  // a Edge Function escreveu.
  async erroDaResposta(resposta) {
    let detalhe = `o servidor respondeu ${resposta.status}`;
    try {
      const corpo = await resposta.json();
      if (corpo?.erro) detalhe = corpo.erro;
    } catch { /* corpo não era JSON */ }

    console.error(`[CorretoresAI] HTTP ${resposta.status} em ${resposta.url}:`, detalhe);
    return new Error(detalhe);
  }
};
