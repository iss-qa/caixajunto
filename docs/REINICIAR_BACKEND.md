# 🔄 Como Reiniciar o Backend Corretamente

## ⚠️ PROBLEMA

Você tem 3 participantes no frontend mas apenas 1 no Lytex Sandbox porque **o backend não está rodando com a última versão do código**.

---

## ✅ SOLUÇÃO: Reiniciar Backend

### Passo 1: Parar o Backend Atual

Se o backend estiver rodando em algum terminal, **pare ele**:
```bash
# Pressione Ctrl+C no terminal onde o backend está rodando
```

### Passo 2: Recompilar e Reiniciar

```bash
cd /Users/isaiassilva/development/projects/caixaJunto/backend

# Recompilar
npm run build

# Reiniciar em modo desenvolvimento
npm run start:dev
```

### Passo 3: Aguardar Logs de Inicialização

Você DEVE ver:
```
[LytexService] Lytex Service inicializado em modo: SANDBOX
[LytexService] ⏳ Token será obtido na primeira requisição...
[UsuariosModule] UsuariosModule inicializado
```

---

## 🧪 Teste Rápido

Depois de reiniciar, teste adicionando um novo participante:

### No Terminal:
```bash
curl --location 'http://localhost:3000/api/usuarios' \
--header 'Content-Type: application/json' \
--data-raw '{
  "nome": "Teste Novo",
  "email": "testenovo@email.com",
  "senha": "Senha@123",
  "telefone": "71999999999",
  "cpf": "12345678901",
  "tipo": "usuario"
}'
```

### Logs Esperados no Backend:
```
[UsuariosService] Criando usuário: testenovo@email.com, tipo: usuario, CPF: Sim
[UsuariosService] Tentando criar cliente no Lytex para testenovo@email.com...
[LytexService] 🔄 [Tentativa 1/2] Criando cliente no Lytex: testenovo@email.com
[LytexService] 🔑 Token expirado ou inexistente, renovando...
[LytexService] 🔄 Obtendo novo token Lytex...
[LytexService] ✅ Token Lytex obtido com sucesso (expira em ~28 min)
[LytexService] 🔑 Token válido (expira em 28 min), enviando requisição...
[LytexService] ✅ Cliente criado no Lytex: 6938xxxxx para testenovo@email.com
[UsuariosService] ✅ Cliente criado no Lytex: 6938xxxxx para usuário testenovo@email.com
[UsuariosService] ✅ Usuário salvo no MongoDB: 6937xxxxx - testenovo@email.com
```

**Se você NÃO ver esses logs**, o backend ainda está com código antigo!

---

## 🔍 Verificar Integração

### Script de Teste Automático

Execute:
```bash
cd /Users/isaiassilva/development/projects/caixaJunto
./test_integration.sh
```

Isso mostra:
- ✅ Se backend está rodando
- 📋 Lista de usuários com lytexClientId
- 💡 O que procurar nos logs

---

## 🚨 Se Ainda Não Funcionar

### Opção 1: Limpar Tudo e Reinstalar

```bash
cd backend

# Parar backend (Ctrl+C)

# Limpar
rm -rf node_modules
rm -rf dist

# Reinstalar
npm install

# Recompilar
npm run build

# Rodar
npm run start:dev
```

### Opção 2: Verificar Arquivo Correto

Confirme que o arquivo `backend/src/common/lytex/lytex.service.ts` contém:

```typescript
// Deve ter:
private tokenRefreshPromise: Promise<void> | null = null;

// E no método refreshToken():
if (this.tokenRefreshPromise) {
  this.logger.log('⏳ Aguardando renovação de token em andamento...');
  await this.tokenRefreshPromise;
  return;
}
```

---

## 📊 Checklist

Antes de adicionar participantes:
- [ ] Backend reiniciado com `npm run start:dev`
- [ ] Ver log: `[LytexService] Lytex Service inicializado em modo: SANDBOX`
- [ ] Ver log: `[LytexService] ⏳ Token será obtido na primeira requisição...`
- [ ] Adicionar 1 participante (via frontend ou CURL)
- [ ] Ver logs detalhados da integração no backend
- [ ] Verificar MongoDB: `curl http://localhost:3000/api/usuarios | jq`
- [ ] Verificar Lytex Sandbox (via painel ou CURL)

---

## 💡 Dica

Mantenha o terminal do backend sempre visível enquanto testa. Assim você vê os logs em tempo real e identifica problemas imediatamente!

---

**REINICIE O BACKEND AGORA E TESTE!** 🚀

