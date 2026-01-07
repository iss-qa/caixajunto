# CURLs Lytex e Guia de Troubleshooting

## 🔑 1. Obter Token (Válido por 30 minutos)

```bash
curl --location 'https://sandbox-api-pay.lytex.com.br/v2/auth/obtain_token' \
--header 'Content-Type: application/json' \
--data '{
  "grantType": "clientCredentials",
  "clientId": "6938822ba3bcd5f5161a732b",
  "clientSecret": "mzB9m5sWmtUd1NRazppjjE0ij2HMrkyaZkXWyC092xDJdDPYKPHXnf6OY48HLffCzLrZg1WZEJqpokgtye4WvCAWxCvmp4mwZ5qwVkDyGFAZrCqLuwIRwT7e4SHDVcfqVdR86VC2UA3JAbXqwBUCXuI74tlmiL6z4gIEfsaKyFXqBxxCDUPGelFrtS3huQJrrdzXDaAs3b61jkHZAzll6otffc1wihE4AToNFdQnvrbVtywRzC8dph2R4l2yV5S4"
}'
```

**Resposta esperada**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 1800
}
```

**⚠️ Importante**: Copie o `accessToken` e use nos próximos comandos substituindo `SEU_TOKEN_AQUI`.

---

## 📋 2. Listar Clientes

```bash
curl --location 'https://sandbox-api-pay.lytex.com.br/v2/clients' \
--header 'Authorization: Bearer SEU_TOKEN_AQUI'
```

**Resposta esperada**:
```json
[
  {
    "_id": "693889710b94786c6437a658",
    "name": "Isaias",
    "cpfCnpj": "03630594582",
    "email": "isaiasilva.info@gmail.com",
    "cellphone": "7198988989"
  }
]
```

---

## ➕ 3. Criar Cliente (POST)

```bash
curl --location 'https://sandbox-api-pay.lytex.com.br/v2/clients' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer SEU_TOKEN_AQUI' \
--data-raw '{
  "type": "pf",
  "name": "João Silva",
  "cpfCnpj": "12345678901",
  "email": "joao.silva@email.com",
  "cellphone": "71988741085",
  "address": {
    "street": "Rua Exemplo",
    "zone": "Centro",
    "city": "Salvador",
    "state": "BA",
    "number": "123",
    "complement": "Apto 101",
    "zip": "40000000"
  }
}'
```

**Resposta esperada**:
```json
{
  "_id": "693889710b94786c6437a658",
  "type": "pf",
  "name": "João Silva",
  "cpfCnpj": "12345678901",
  "email": "joao.silva@email.com",
  "cellphone": "71988741085"
}
```

---

## ✏️ 4. Atualizar Cliente (PUT)

```bash
curl --location --request PUT 'https://sandbox-api-pay.lytex.com.br/v2/clients/693889710b94786c6437a658' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer SEU_TOKEN_AQUI' \
--data-raw '{
  "name": "João Silva Santos",
  "email": "joao.santos@email.com",
  "cellphone": "71999887766"
}'
```

---

## 🗑️ 5. Deletar Cliente (DELETE)

```bash
curl --location --request DELETE 'https://sandbox-api-pay.lytex.com.br/v2/clients/693889710b94786c6437a658' \
--header 'Authorization: Bearer SEU_TOKEN_AQUI'
```

---

## 🔍 Troubleshooting

### Problema: 3 usuários no app mas só 1 no Lytex

#### Passo 1: Verificar logs do backend

```bash
cd backend
npm run start:dev
```

**O que procurar nos logs**:

✅ **Sucesso**:
```
[LytexService] 🔄 [Tentativa 1/2] Criando cliente no Lytex: jose@gmail.com
[LytexService] 🔑 Token válido (expira em 28 min), enviando requisição...
[LytexService] ✅ Cliente criado no Lytex: 6938xxxxx para jose@gmail.com
[UsuariosService] ✅ Usuário salvo no MongoDB: 6937xxxxx - jose@gmail.com
```

❌ **Erro**:
```
[LytexService] ❌ Erro ao criar cliente no Lytex para jose@gmail.com
[LytexService] Status: 400
[LytexService] Mensagem: CPF já cadastrado
```

---

#### Passo 2: Verificar MongoDB

```bash
# Listar todos os usuários com lytexClientId
curl http://localhost:3000/api/usuarios | jq '.[] | {nome, email, lytexClientId}'
```

**Exemplo de resposta**:
```json
{
  "nome": "Jose",
  "email": "jose@gmail.com",
  "lytexClientId": "6938xxxxx"  ← DEVE TER
}
{
  "nome": "Lol",
  "email": "lol@gmail.com",
  "lytexClientId": null  ← NÃO TEM (não foi criado no Lytex)
}
{
  "nome": "Isaias Silva",
  "email": "isaiasilva.info@gmail.com",
  "lytexClientId": "6938yyyyy"  ← TEM
}
```

---

#### Passo 3: Identificar participantes sem lytexClientId

**Se encontrar participantes sem `lytexClientId`, eles não foram criados no Lytex.**

**Possíveis causas**:
1. ❌ **CPF duplicado** - Lytex não permite CPF repetido
2. ❌ **Email duplicado** - Lytex não permite email repetido
3. ❌ **CPF inválido** - Lytex valida o CPF
4. ❌ **Participante criado ANTES das correções** - Não teve integração
5. ❌ **Token expirado** - Não foi renovado corretamente

---

#### Passo 4: Recriar participantes problemáticos

**Para cada participante SEM `lytexClientId`**:

1. **Anote os dados** do participante
2. **Delete** o participante (isso tentará remover do Lytex, mas falhará silenciosamente)
3. **Recrie** o participante (agora com as correções)

**Ou**

**Criar manualmente no Lytex**:

```bash
# 1. Obter token
TOKEN=$(curl -s --location 'https://sandbox-api-pay.lytex.com.br/v2/auth/obtain_token' \
--header 'Content-Type: application/json' \
--data '{
  "grantType": "clientCredentials",
  "clientId": "6938822ba3bcd5f5161a732b",
  "clientSecret": "SEU_SECRET"
}' | jq -r '.accessToken')

# 2. Criar no Lytex
LYTEX_ID=$(curl -s --location 'https://sandbox-api-pay.lytex.com.br/v2/clients' \
--header 'Content-Type: application/json' \
--header "Authorization: Bearer $TOKEN" \
--data-raw '{
  "type": "pf",
  "name": "Lol",
  "cpfCnpj": "02992220000",
  "email": "lol@gmail.com",
  "cellphone": "71989892220"
}' | jq -r '._id')

# 3. Atualizar MongoDB com lytexClientId
curl --location --request PUT 'http://localhost:3000/api/usuarios/USUARIO_ID' \
--header 'Content-Type: application/json' \
--data "{
  \"lytexClientId\": \"$LYTEX_ID\"
}"
```

---

### Erro Comum 1: CPF Duplicado

**Logs**:
```
[LytexService] ❌ Erro ao criar cliente no Lytex
[LytexService] Status: 400
[LytexService] Mensagem: CPF já cadastrado
```

**Solução**:
- Verifique se o CPF já existe no Lytex
- Use CPF diferente ou remova o duplicado do Lytex primeiro

---

### Erro Comum 2: Email Duplicado

**Logs**:
```
[LytexService] ❌ Erro ao criar cliente no Lytex
[LytexService] Status: 400
[LytexService] Mensagem: Email já cadastrado
```

**Solução**:
- Verifique se o email já existe no Lytex
- Use email diferente ou remova o duplicado do Lytex primeiro

---

### Erro Comum 3: Token Expirado

**Logs**:
```
[LytexService] ❌ Erro ao criar cliente no Lytex
[LytexService] Status: 401
[LytexService] ⚠️ Token expirado (401), renovando e tentando novamente...
[LytexService] 🔄 Obtendo novo token Lytex...
[LytexService] ✅ Token Lytex obtido com sucesso
[LytexService] ✅ Cliente criado no Lytex: 6938xxxxx
```

**Solução**: Automática (retry já implementado)

---

## 🧪 Script de Teste Completo

```bash
#!/bin/bash

echo "=== Teste de Integração Lytex ==="

# 1. Obter token
echo "\n1. Obtendo token..."
TOKEN=$(curl -s --location 'https://sandbox-api-pay.lytex.com.br/v2/auth/obtain_token' \
--header 'Content-Type: application/json' \
--data '{
  "grantType": "clientCredentials",
  "clientId": "6938822ba3bcd5f5161a732b",
  "clientSecret": "mzB9m5sWmtUd1NRazppjjE0ij2HMrkyaZkXWyC092xDJdDPYKPHXnf6OY48HLffCzLrZg1WZEJqpokgtye4WvCAWxCvmp4mwZ5qwVkDyGFAZrCqLuwIRwT7e4SHDVcfqVdR86VC2UA3JAbXqwBUCXuI74tlmiL6z4gIEfsaKyFXqBxxCDUPGelFrtS3huQJrrdzXDaAs3b61jkHZAzll6otffc1wihE4AToNFdQnvrbVtywRzC8dph2R4l2yV5S4"
}' | jq -r '.accessToken')

if [ -z "$TOKEN" ]; then
  echo "❌ Erro ao obter token"
  exit 1
fi
echo "✅ Token obtido: ${TOKEN:0:20}..."

# 2. Criar usuário no CaixaJunto
echo "\n2. Criando usuário no CaixaJunto..."
USUARIO=$(curl -s --location 'http://localhost:3000/api/usuarios' \
--header 'Content-Type: application/json' \
--data '{
  "nome": "Teste Script",
  "email": "teste.script@email.com",
  "senha": "Senha@123",
  "telefone": "71999999999",
  "cpf": "98765432100",
  "tipo": "usuario"
}')

USUARIO_ID=$(echo $USUARIO | jq -r '._id')
LYTEX_CLIENT_ID=$(echo $USUARIO | jq -r '.lytexClientId')

echo "✅ Usuário criado: $USUARIO_ID"
echo "✅ Lytex Client ID: $LYTEX_CLIENT_ID"

# 3. Verificar no Lytex
echo "\n3. Verificando no Lytex..."
LYTEX_CLIENT=$(curl -s --location "https://sandbox-api-pay.lytex.com.br/v2/clients/$LYTEX_CLIENT_ID" \
--header "Authorization: Bearer $TOKEN")

if echo $LYTEX_CLIENT | jq -e '._id' > /dev/null; then
  echo "✅ Cliente encontrado no Lytex:"
  echo $LYTEX_CLIENT | jq '{_id, name, cpfCnpj, email}'
else
  echo "❌ Cliente NÃO encontrado no Lytex"
fi

# 4. Atualizar usuário
echo "\n4. Atualizando usuário..."
curl -s --location --request PUT "http://localhost:3000/api/usuarios/$USUARIO_ID" \
--header 'Content-Type: application/json' \
--data '{
  "nome": "Teste Script Atualizado"
}' > /dev/null

echo "✅ Usuário atualizado"

# 5. Verificar atualização no Lytex
echo "\n5. Verificando atualização no Lytex..."
sleep 2
LYTEX_CLIENT=$(curl -s --location "https://sandbox-api-pay.lytex.com.br/v2/clients/$LYTEX_CLIENT_ID" \
--header "Authorization: Bearer $TOKEN")

if echo $LYTEX_CLIENT | jq -e '.name' | grep -q "Teste Script Atualizado"; then
  echo "✅ Cliente atualizado no Lytex!"
else
  echo "⚠️ Cliente NÃO foi atualizado no Lytex"
fi

# 6. Deletar usuário
echo "\n6. Deletando usuário..."
curl -s --location --request DELETE "http://localhost:3000/api/usuarios/$USUARIO_ID" > /dev/null
echo "✅ Usuário deletado"

# 7. Verificar deleção no Lytex
echo "\n7. Verificando deleção no Lytex..."
sleep 2
LYTEX_CLIENT=$(curl -s --location "https://sandbox-api-pay.lytex.com.br/v2/clients/$LYTEX_CLIENT_ID" \
--header "Authorization: Bearer $TOKEN")

if echo $LYTEX_CLIENT | jq -e '._id' > /dev/null; then
  echo "⚠️ Cliente AINDA existe no Lytex"
else
  echo "✅ Cliente deletado do Lytex!"
fi

echo "\n=== Teste concluído ==="
```

**Para rodar**:
```bash
chmod +x test-lytex.sh
./test-lytex.sh
```

---

## 📝 Checklist de Verificação

### Backend
- [ ] Backend rodando (`npm run start:dev`)
- [ ] Logs mostrando `Lytex Service inicializado em modo: SANDBOX`
- [ ] Sem erros no console

### Participantes Existentes
- [ ] Verificar quantos têm `lytexClientId`
- [ ] Verificar se CPFs são únicos
- [ ] Verificar se emails são únicos

### Teste Manual
- [ ] Adicionar novo participante
- [ ] Ver logs: `✅ Cliente criado no Lytex`
- [ ] Verificar `lytexClientId` no MongoDB
- [ ] Verificar cliente no painel Lytex
- [ ] Editar participante
- [ ] Ver logs: `✅ Cliente atualizado no Lytex`
- [ ] Verificar mudança no painel Lytex

---

## 🆘 Se Ainda Não Funcionar

1. **Pare o backend** (Ctrl+C)
2. **Limpe os logs** (`clear`)
3. **Inicie novamente** (`npm run start:dev`)
4. **Copie TODOS os logs** desde o início
5. **Adicione um participante**
6. **Me envie os logs completos**

**Logs importantes**:
```
[LytexService] Lytex Service inicializado...
[LytexService] 🔄 [Tentativa 1/2] Criando cliente...
[LytexService] 🔑 Token válido...
[LytexService] ✅ Cliente criado...
[UsuariosService] ✅ Usuário salvo...
```

---

## 📊 Comparação: MongoDB vs Lytex

```bash
# Contar usuários no MongoDB
curl -s http://localhost:3000/api/usuarios | jq '. | length'

# Contar usuários com lytexClientId
curl -s http://localhost:3000/api/usuarios | jq '[.[] | select(.lytexClientId != null)] | length'

# Contar clientes no Lytex
TOKEN=$(curl -s ... | jq -r '.accessToken')
curl -s --location 'https://sandbox-api-pay.lytex.com.br/v2/clients' \
--header "Authorization: Bearer $TOKEN" | jq '. | length'
```

**Resultado esperado**: Todos os números devem ser iguais!

