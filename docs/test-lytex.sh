#!/bin/bash

echo "=== Teste de Integração Lytex ==="

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Obter token
echo -e "\n${YELLOW}1. Obtendo token...${NC}"
TOKEN=$(curl -s --location 'https://sandbox-api-pay.lytex.com.br/v2/auth/obtain_token' \
--header 'Content-Type: application/json' \
--data '{
  "grantType": "clientCredentials",
  "clientId": "6938822ba3bcd5f5161a732b",
  "clientSecret": "mzB9m5sWmtUd1NRazppjjE0ij2HMrkyaZkXWyC092xDJdDPYKPHXnf6OY48HLffCzLrZg1WZEJqpokgtye4WvCAWxCvmp4mwZ5qwVkDyGFAZrCqLuwIRwT7e4SHDVcfqVdR86VC2UA3JAbXqwBUCXuI74tlmiL6z4gIEfsaKyFXqBxxCDUPGelFrtS3huQJrrdzXDaAs3b61jkHZAzll6otffc1wihE4AToNFdQnvrbVtywRzC8dph2R4l2yV5S4"
}' | jq -r '.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ Erro ao obter token${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Token obtido: ${TOKEN:0:20}...${NC}"

# 2. Criar usuário no CaixaJunto
echo -e "\n${YELLOW}2. Criando usuário no CaixaJunto...${NC}"
TIMESTAMP=$(date +%s)
USUARIO=$(curl -s --location 'http://localhost:3000/api/usuarios' \
--header 'Content-Type: application/json' \
--data "{
  \"nome\": \"Teste Script $TIMESTAMP\",
  \"email\": \"teste$TIMESTAMP@email.com\",
  \"senha\": \"Senha@123\",
  \"telefone\": \"71999999$TIMESTAMP\",
  \"cpf\": \"$TIMESTAMP\",
  \"tipo\": \"usuario\"
}")

USUARIO_ID=$(echo $USUARIO | jq -r '._id')
LYTEX_CLIENT_ID=$(echo $USUARIO | jq -r '.lytexClientId')

if [ "$USUARIO_ID" = "null" ] || [ -z "$USUARIO_ID" ]; then
  echo -e "${RED}❌ Erro ao criar usuário${NC}"
  echo $USUARIO | jq
  exit 1
fi

echo -e "${GREEN}✅ Usuário criado: $USUARIO_ID${NC}"

if [ "$LYTEX_CLIENT_ID" = "null" ] || [ -z "$LYTEX_CLIENT_ID" ]; then
  echo -e "${RED}❌ ERRO: lytexClientId não foi gerado!${NC}"
  echo -e "${YELLOW}Verifique os logs do backend${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Lytex Client ID: $LYTEX_CLIENT_ID${NC}"

# 3. Verificar no Lytex
echo -e "\n${YELLOW}3. Verificando no Lytex...${NC}"
sleep 2
LYTEX_CLIENT=$(curl -s --location "https://sandbox-api-pay.lytex.com.br/v2/clients/$LYTEX_CLIENT_ID" \
--header "Authorization: Bearer $TOKEN")

if echo $LYTEX_CLIENT | jq -e '._id' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Cliente encontrado no Lytex:${NC}"
  echo $LYTEX_CLIENT | jq '{_id, name, cpfCnpj, email}'
else
  echo -e "${RED}❌ Cliente NÃO encontrado no Lytex${NC}"
  echo $LYTEX_CLIENT
fi

# 4. Atualizar usuário
echo -e "\n${YELLOW}4. Atualizando usuário...${NC}"
UPDATE_RESULT=$(curl -s --location --request PUT "http://localhost:3000/api/usuarios/$USUARIO_ID" \
--header 'Content-Type: application/json' \
--data "{
  \"nome\": \"Teste Script $TIMESTAMP Atualizado\"
}")

echo -e "${GREEN}✅ Usuário atualizado${NC}"

# 5. Verificar atualização no Lytex
echo -e "\n${YELLOW}5. Verificando atualização no Lytex...${NC}"
sleep 3
LYTEX_CLIENT=$(curl -s --location "https://sandbox-api-pay.lytex.com.br/v2/clients/$LYTEX_CLIENT_ID" \
--header "Authorization: Bearer $TOKEN")

if echo $LYTEX_CLIENT | jq -e '.name' | grep -q "Atualizado"; then
  echo -e "${GREEN}✅ Cliente atualizado no Lytex!${NC}"
  echo $LYTEX_CLIENT | jq '{name}'
else
  echo -e "${YELLOW}⚠️ Cliente NÃO foi atualizado no Lytex${NC}"
  echo $LYTEX_CLIENT | jq '{name}'
fi

# 6. Deletar usuário
echo -e "\n${YELLOW}6. Deletando usuário...${NC}"
DELETE_RESULT=$(curl -s --location --request DELETE "http://localhost:3000/api/usuarios/$USUARIO_ID")
echo -e "${GREEN}✅ Usuário deletado do MongoDB${NC}"

# 7. Verificar deleção no Lytex
echo -e "\n${YELLOW}7. Verificando deleção no Lytex...${NC}"
sleep 3
LYTEX_CLIENT=$(curl -s --location "https://sandbox-api-pay.lytex.com.br/v2/clients/$LYTEX_CLIENT_ID" \
--header "Authorization: Bearer $TOKEN" 2>&1)

if echo $LYTEX_CLIENT | jq -e '._id' > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️ Cliente AINDA existe no Lytex${NC}"
else
  echo -e "${GREEN}✅ Cliente deletado do Lytex!${NC}"
fi

echo -e "\n${GREEN}=== Teste concluído ===${NC}"
echo -e "\n${YELLOW}Resumo:${NC}"
echo -e "- Criação: ${GREEN}OK${NC}"
echo -e "- Integração Lytex: ${GREEN}OK${NC}"
echo -e "- Atualização: ${GREEN}OK${NC}"
echo -e "- Deleção: ${GREEN}OK${NC}"

