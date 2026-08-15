// Sessão: para onde ir quando não há login e para onde voltar depois dele.

const auth = {
  urlEntrar(modo) {
    const q = modo ? `?modo=${modo}` : "";
    return SPA ? `#/entrar${q}` : `entrar.html${q}`;
  },

  urlApp(rota = "dashboard") {
    return SPA ? `#/${rota}` : `${rota}.html`;
  },

  // Chamado por toda tela do app: sem sessão, manda para o login.
  exigirLogin() {
    if (db.sessao()) return true;
    location.href = this.urlEntrar();
    return false;
  },

  sair() {
    db.sair();
    location.href = SPA ? "#/" : "../index.html";
  }
};
