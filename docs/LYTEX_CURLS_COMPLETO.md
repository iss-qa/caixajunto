# CURLs Completos - Lytex Pagamentos Sandbox

## 🔑 1. Obter Token de Autenticação

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
  "accessToken": "eyJhbGci...",
  "expiresIn": 1800,
  "tokenType": "Bearer"
}
```

---

## ➕ 2. Criar Cliente (POST)

```bash
curl --location 'https://sandbox-api-pay.lytex.com.br/v2/clients' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer SEU_TOKEN_AQUI' \
--data-raw '{
  "type": "pf",
  "name": "Jose Silva",
  "cpfCnpj": "03637867722",
  "email": "jose@gmail.com",
  "cellphone": "71989883333",
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
  "name": "Jose Silva",
  "cpfCnpj": "03637867722",
  "email": "jose@gmail.com",
  "cellphone": "71989883333"
}
```

---

## ✏️ 3. Atualizar Cliente (PUT)

```bash
curl --location --request PUT 'https://sandbox-api-pay.lytex.com.br/v2/clients/693889710b94786c6437a658' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer SEU_TOKEN_AQUI' \
--data-raw '{
  "name": "Jose Silva Santos",
  "email": "jose.santos@gmail.com",
  "cellphone": "71988888888"
}'
```

**Resposta esperada**:
```json
{
  "_id": "693889710b94786c6437a658",
  "type": "pf",
  "name": "Jose Silva Santos",
  "cpfCnpj": "03637867722",
  "email": "jose.santos@gmail.com",
  "cellphone": "71988888888"
}
```

---

## 🗑️ 4. Deletar Cliente (DELETE)

```bash
curl --location --request DELETE 'https://sandbox-api-pay.lytex.com.br/v2/clients/69388aa40b94786c6437a6e2' \
--header 'Authorization: Bearer SEU_TOKEN_AQUI'
```

**Resposta esperada**:
```json
{
  "message": "Client deleted successfully"
}
```

---

## 📋 5. Listar Clientes (GET)

```bash
curl --location 'https://sandbox-api-pay.lytex.com.br/v2/clients' \
--header 'Authorization: Bearer SEU_TOKEN_AQUI'
```

**Resposta esperada**:
```json
{
  "data": [
    {
      "_id": "693889710b94786c6437a658",
      "type": "pf",
      "name": "Jose Silva",
      "cpfCnpj": "03637867722",
      "email": "jose@gmail.com"
    }
  ],
  "total": 1,
  "page": 1,
  "pages": 1
}
```

---

## 🔍 6. Buscar Cliente por ID (GET)

```bash
curl --location 'https://sandbox-api-pay.lytex.com.br/v2/clients/693889710b94786c6437a658' \
--header 'Authorization: Bearer SEU_TOKEN_AQUI'
```

---

## 🤖 CURLs da API CaixaJunto (Backend Local)

### Adicionar Participante (Integra automaticamente com Lytex)

```bash
curl --location 'http://localhost:3000/api/usuarios' \
--header 'Content-Type: application/json' \
--data-raw '{
  "nome": "Jose Silva",
  "email": "jose@gmail.com",
  "senha": "Senha@123",
  "telefone": "71989883333",
  "cpf": "03637867722",
  "chavePix": "jose@gmail.com",
  "tipo": "usuario"
}'
```

**Resposta esperada**:
```json
{
  "_id": "6937xxxxx",
  "nome": "Jose Silva",
  "email": "jose@gmail.com",
  "cpf": "03637867722",
  "lytexClientId": "693889710b94786c6437a658",  ← ID do Lytex
  "tipo": "usuario"
}
```

### Listar Usuários

```bash
curl --location 'http://localhost:3000/api/usuarios'
```

### Editar Participante (Sincroniza com Lytex)

```bash
curl --location --request PUT 'http://localhost:3000/api/usuarios/6937xxxxx' \
--header 'Content-Type: application/json' \
--data-raw '{
  "nome": "Jose Silva Santos"
}'
```

### Deletar Participante (Remove do Lytex também)

```bash
curl --location --request DELETE 'http://localhost:3000/api/usuarios/6937xxxxx'
```

---

## 🧪 Script de Teste - Adicionar 3 Participantes

```bash
#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Adicionando 3 participantes...${NC}\n"

# Participante 1: Jose
echo -e "${BLUE}➕ 1/3: Adicionando Jose...${NC}"
RESPONSE1=$(curl -s --location 'http://localhost:3000/api/usuarios' \
--header 'Content-Type: application/json' \
--data-raw '{
  "nome": "Jose",
  "email": "jose@gmail.com",
  "senha": "Senha@123",
  "telefone": "71989883333",
  "cpf": "03637867722",
  "chavePix": "jose@gmail.com",
  "tipo": "usuario"
}')

LYTEX_ID1=$(echo $RESPONSE1 | jq -r '.lytexClientId')
if [ "$LYTEX_ID1" != "null" ] && [ "$LYTEX_ID1" != "" ]; then
  echo -e "${GREEN}✅ Jose adicionado - Lytex ID: $LYTEX_ID1${NC}\n"
else
  echo -e "${RED}❌ Jose NÃO foi integrado ao Lytex${NC}\n"
fi

sleep 2

# Participante 2: Lol
echo -e "${BLUE}➕ 2/3: Adicionando Lol...${NC}"
RESPONSE2=$(curl -s --location 'http://localhost:3000/api/usuarios' \
--header 'Content-Type: application/json' \
--data-raw '{
  "nome": "Lol",
  "email": "lol@gmail.com",
  "senha": "Senha@123",
  "telefone": "71989892220",
  "cpf": "02992220000",
  "chavePix": "teste@gmail.com",
  "tipo": "usuario"
}')

LYTEX_ID2=$(echo $RESPONSE2 | jq -r '.lytexClientId')
if [ "$LYTEX_ID2" != "null" ] && [ "$LYTEX_ID2" != "" ]; then
  echo -e "${GREEN}✅ Lol adicionado - Lytex ID: $LYTEX_ID2${NC}\n"
else
  echo -e "${RED}❌ Lol NÃO foi integrado ao Lytex${NC}\n"
fi

sleep 2

# Participante 3: Isaias Silva
echo -e "${BLUE}➕ 3/3: Adicionando Isaias Silva...${NC}"
RESPONSE3=$(curl -s --location 'http://localhost:3000/api/usuarios' \
--header 'Content-Type: application/json' \
--data-raw '{
  "nome": "Isaias Silva",
  "email": "isaiasilva.info@gmail.com",
  "senha": "Senha@123",
  "telefone": "71989898989",
  "cpf": "03630594582",
  "chavePix": "03630594582",
  "tipo": "usuario"
}')

LYTEX_ID3=$(echo $RESPONSE3 | jq -r '.lytexClientId')
if [ "$LYTEX_ID3" != "null" ] && [ "$LYTEX_ID3" != "" ]; then
  echo -e "${GREEN}✅ Isaias Silva adicionado - Lytex ID: $LYTEX_ID3${NC}\n"
else
  echo -e "${RED}❌ Isaias Silva NÃO foi integrado ao Lytex${NC}\n"
fi

# Resumo
echo -e "\n${BLUE}📊 Resumo:${NC}"
echo -e "Jose: ${LYTEX_ID1:-❌ Falhou}"
echo -e "Lol: ${LYTEX_ID2:-❌ Falhou}"
echo -e "Isaias Silva: ${LYTEX_ID3:-❌ Falhou}"

# Contar quantos foram adicionados com sucesso
SUCCESS=0
[ "$LYTEX_ID1" != "null" ] && [ "$LYTEX_ID1" != "" ] && ((SUCCESS++))
[ "$LYTEX_ID2" != "null" ] && [ "$LYTEX_ID2" != "" ] && ((SUCCESS++))
[ "$LYTEX_ID3" != "null" ] && [ "$LYTEX_ID3" != "" ] && ((SUCCESS++))

echo -e "\n${BLUE}Total: ${GREEN}$SUCCESS/3${BLUE} integrados com Lytex${NC}"

if [ $SUCCESS -eq 3 ]; then
  echo -e "\n${GREEN}🎉 Todos os participantes foram integrados com sucesso!${NC}"
else
  echo -e "\n${RED}⚠️ Alguns participantes não foram integrados. Verifique os logs do backend.${NC}"
fi
```

**Como usar**:
```bash
# Salvar como test_lytex.sh
chmod +x test_lytex.sh
./test_lytex.sh
```

---

## 🔍 Verificar Integração

### 1. Ver Logs do Backend em Tempo Real
```bash
cd backend
npm run start:dev
```

**Procurar por**:
```
[LytexService] 🔄 [Tentativa 1/2] Criando cliente no Lytex: jose@gmail.com
[LytexService] ✅ Cliente criado no Lytex: 693889710b94786c6437a658
```

### 2. Verificar MongoDB
```bash
curl http://localhost:3000/api/usuarios | jq '.[] | {nome, email, lytexClientId}'
```

**Resposta esperada**:
```json
{
  "nome": "Jose",
  "email": "jose@gmail.com",
  "lytexClientId": "693889710b94786c6437a658"
}
```

### 3. Verificar Lytex Sandbox
```bash
# Obter token
TOKEN=$(curl -s 'https://sandbox-api-pay.lytex.com.br/v2/auth/obtain_token' \
-H 'Content-Type: application/json' \
-d '{
  "grantType": "clientCredentials",
  "clientId": "6938822ba3bcd5f5161a732b",
  "clientSecret": "mzB9m5sWmtUd1NRazppjjE0ij2HMrkyaZkXWyC092xDJdDPYKPHXnf6OY48HLffCzLrZg1WZEJqpokgtye4WvCAWxCvmp4mwZ5qwVkDyGFAZrCqLuwIRwT7e4SHDVcfqVdR86VC2UA3JAbXqwBUCXuI74tlmiL6z4gIEfsaKyFXqBxxCDUPGelFrtS3huQJrrdzXDaAs3b61jkHZAzll6otffc1wihE4AToNFdQnvrbVtywRzC8dph2R4l2yV5S4"
}' | jq -r '.accessToken')

# Listar clientes
curl -s "https://sandbox-api-pay.lytex.com.br/v2/clients" \
-H "Authorization: Bearer $TOKEN" | jq
```

---

## 🚨 Troubleshooting

### Problema: Participantes não aparecem no Lytex

#### Solução 1: Verificar se backend está rodando com última versão
```bash
cd backend
npm run start:dev

# Aguardar ver:
[LytexService] Lytex Service inicializado em modo: SANDBOX
[LytexService] ⏳ Token será obtido na primeira requisição...
```

#### Solução 2: Ver logs detalhados
No terminal do backend, após adicionar um participante, procurar por:
```
[UsuariosService] Criando usuário: jose@gmail.com
[LytexService] 🔄 Criando cliente no Lytex: jose@gmail.com
[LytexService] 🔑 Token obtido com sucesso
[LytexService] ✅ Cliente criado no Lytex: 693889710b94786c6437a658
```

#### Solução 3: Se não vê os logs acima
```bash
# Parar o backend (Ctrl+C)
# Limpar node_modules e reinstalar
cd backend
rm -rf node_modules dist
npm install
npm run build
npm run start:dev
```

#### Solução 4: Verificar se o erro está sendo silenciado
Abrir `backend/src/modules/usuarios/usuarios.service.ts` e verificar se há `try/catch` sem throw:
```typescript
// ❌ Errado (silencia o erro)
try {
  await this.lytexService.createClient(...)
} catch (error) {
  this.logger.error('Erro'); // Só loga, não propaga
}

// ✅ Correto
try {
  const lytexClient = await this.lytexService.createClient(...)
  if (!lytexClient) {
    this.logger.warn('Lytex retornou null');
  }
} catch (error) {
  this.logger.error('Erro:', error.message);
}
```

---

## 📝 Checklist de Validação

Antes de testar, confirmar:
- [ ] Backend rodando com `npm run start:dev`
- [ ] Ver logs do LytexService na inicialização
- [ ] Testar obter token manualmente (CURL acima)
- [ ] Token funcionando (listar clientes)
- [ ] Adicionar 1 participante via frontend
- [ ] Ver logs do backend (deve mostrar integração)
- [ ] Verificar MongoDB (deve ter lytexClientId)
- [ ] Verificar Lytex (deve ter cliente)

---

**Última Atualização**: Dezembro 2024  
**Sandbox Base URL**: `https://sandbox-api-pay.lytex.com.br/v2`  
**Client ID**: `6938822ba3bcd5f5161a732b`

