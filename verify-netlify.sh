#!/bin/bash

# Script para verificar configuração do Netlify

echo "🔍 Verificando configuração do Netlify..."
echo ""

# 1. Verificar se o arquivo .env.production existe
if [ -f ".env.production" ]; then
    echo "✅ Arquivo .env.production encontrado"
    echo "📄 Conteúdo:"
    cat .env.production
    echo ""
else
    echo "❌ Arquivo .env.production NÃO encontrado!"
    echo ""
fi

# 2. Verificar build do Netlify
echo "📦 Verificando último build..."
if [ -d "dist" ]; then
    echo "✅ Pasta dist/ encontrada"
    echo "📊 Arquivos no dist/:"
    ls -lh dist/
    echo ""
    
    # Verificar se o arquivo de configuração foi incluído no build
    if [ -f "dist/index.html" ]; then
        echo "✅ index.html encontrado no build"
        
        # Verificar se há referências à API no bundle
        echo ""
        echo "🔍 Procurando referências à API no bundle JavaScript..."
        find dist -name "*.js" -type f -exec grep -l "api.juntix.com.br" {} \; | head -5
        echo ""
    fi
else
    echo "⚠️  Pasta dist/ NÃO encontrada - build ainda não foi executado"
    echo ""
fi

# 3. Instruções para configurar variáveis de ambiente no Netlify
echo "📝 INSTRUÇÕES PARA CONFIGURAR NO NETLIFY:"
echo "=========================================="
echo ""
echo "1. Acesse: https://app.netlify.com/sites/[seu-site]/settings/deploys"
echo "2. Vá em 'Environment' → 'Environment variables'"
echo "3. Adicione a variável:"
echo "   - Key: VITE_API_URL"
echo "   - Value: https://api.juntix.com.br"
echo ""
echo "4. Faça um novo deploy (Deploys → Trigger deploy → Deploy site)"
echo ""
echo "⚠️  IMPORTANTE: Variáveis de ambiente são aplicadas apenas em NOVOS deploys!"
echo ""

# 4. Testar a API diretamente
echo "🧪 Testando API de produção..."
echo ""
response=$(curl -s -o /dev/null -w "%{http_code}" https://api.juntix.com.br/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"suporte@juntix.com.br","senha":"Juntix@01"}')

if [ "$response" = "201" ]; then
    echo "✅ API respondendo corretamente (Status: $response)"
else
    echo "❌ API com problema (Status: $response)"
fi
echo ""

echo "✨ Verificação concluída!"
