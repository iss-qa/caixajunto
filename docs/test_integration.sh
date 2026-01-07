#!/bin/bash

# Script para testar integração Lytex
echo "🧪 Testando integração CaixaJunto + Lytex..."
echo ""

# Verificar se backend está rodando
echo "1️⃣ Verificando se backend está rodando..."
if curl -s http://localhost:3000/api/usuarios > /dev/null 2>&1; then
  echo "✅ Backend está rodando"
else
  echo "❌ Backend NÃO está rodando. Execute: cd backend && npm run start:dev"
  exit 1
fi

echo ""
echo "2️⃣ Listando usuários no MongoDB..."
curl -s http://localhost:3000/api/usuarios | jq -r '.[] | "\(.nome) - lytexClientId: \(.lytexClientId // "❌ SEM ID")"'

echo ""
echo "3️⃣ Para ver logs detalhados, verifique o terminal do backend"
echo ""
echo "📝 O que procurar nos logs:"
echo "   - [LytexService] 🔄 Criando cliente..."
echo "   - [LytexService] ✅ Cliente criado no Lytex: ..."
echo ""
echo "Se NÃO ver esses logs, a integração não está funcionando!"
