#!/bin/bash

# Script de Setup Docker na AWS
# Execute este script na AWS EC2 após conectar via SSH

set -e

echo "🚀 Iniciando setup Docker CaixaJunto..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Criar estrutura de diretórios
echo -e "${YELLOW}📁 Criando estrutura de diretórios...${NC}"
mkdir -p ~/caixajunto
cd ~/caixajunto

# 2. Copiar arquivos Docker do backend
echo -e "${YELLOW}📋 Copiando arquivos Docker...${NC}"
if [ -f ~/caixajunto-backend/docker-compose.yml ]; then
    cp ~/caixajunto-backend/docker-compose.yml .
    echo -e "${GREEN}✅ docker-compose.yml copiado${NC}"
else
    echo "❌ docker-compose.yml não encontrado em ~/caixajunto-backend"
    exit 1
fi

if [ -f ~/caixajunto-backend/ngrok.yml ]; then
    cp ~/caixajunto-backend/ngrok.yml .
    echo -e "${GREEN}✅ ngrok.yml copiado${NC}"
else
    echo "❌ ngrok.yml não encontrado em ~/caixajunto-backend"
    exit 1
fi

# 3. Criar links simbólicos
echo -e "${YELLOW}🔗 Criando links simbólicos...${NC}"
if [ -d ~/caixajunto-backend ]; then
    ln -sf ~/caixajunto-backend backend
    echo -e "${GREEN}✅ Link para backend criado${NC}"
else
    echo "❌ Diretório ~/caixajunto-backend não encontrado"
    exit 1
fi

if [ -d ~/caixajunto-frontend ]; then
    ln -sf ~/caixajunto-frontend frontend
    echo -e "${GREEN}✅ Link para frontend criado${NC}"
else
    echo "⚠️  Frontend não encontrado. Clone o repositório:"
    echo "   git clone https://github.com/iss-qa/caixajunto-frontend.git ~/caixajunto-frontend"
fi

# 4. Verificar Ngrok token
echo -e "${YELLOW}🔍 Verificando Ngrok token...${NC}"
if grep -q "36j3FIZzM6uQ6WroQV2YY2VBR6A_2XWpdWfY44JjhXCaNXMEc" ngrok.yml; then
    echo "❌ Ngrok token não configurado!"
    echo "   Edite ngrok.yml e adicione seu token"
    exit 1
else
    echo -e "${GREEN}✅ Ngrok token configurado${NC}"
fi

# 5. Verificar Docker
echo -e "${YELLOW}🐳 Verificando Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não instalado. Instalando..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✅ Docker instalado${NC}"
    echo "⚠️  Faça logout e login novamente para aplicar permissões"
    exit 0
else
    echo -e "${GREEN}✅ Docker já instalado${NC}"
fi

# 6. Verificar Docker Compose
echo -e "${YELLOW}🐳 Verificando Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não instalado. Instalando..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose instalado${NC}"
else
    echo -e "${GREEN}✅ Docker Compose já instalado${NC}"
fi

# 7. Mostrar estrutura
echo -e "${YELLOW}📂 Estrutura criada:${NC}"
tree -L 2 ~/caixajunto 2>/dev/null || ls -la ~/caixajunto

echo ""
echo -e "${GREEN}✅ Setup concluído!${NC}"
echo ""
echo "Próximos passos:"
echo "1. cd ~/caixajunto"
echo "2. docker-compose build"
echo "3. docker-compose up -d"
echo "4. Obter URL do Ngrok: curl http://localhost:4040/api/tunnels | jq '.tunnels[0].public_url'"
echo "5. Atualizar WEBHOOK_BASE_URL em backend/.env.production"
echo "6. docker-compose restart backend"


