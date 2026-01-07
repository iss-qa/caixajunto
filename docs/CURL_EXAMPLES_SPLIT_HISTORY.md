# Exemplos de CURL - Sistema de Histórico de Splits

## ⚠️ Importante: Prefixo Global `/api`

Todas as rotas do backend usam o prefixo global `/api`. Os endpoints corretos são:

- ✅ `http://localhost:3000/api/split-history`
- ❌ `http://localhost:3000/split-history`

## 📡 Endpoints e Exemplos Funcionais

### 1. Listar Todos os Splits

```bash
curl -X GET 'http://localhost:3000/api/split-history'
```

**Resposta de sucesso:**
```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "pages": 0
}
```

### 2. Listar com Paginação

```bash
curl -X GET 'http://localhost:3000/api/split-history?page=1&limit=20'
```

### 3. Filtrar por Caixa

```bash
curl -X GET 'http://localhost:3000/api/split-history?caixaId=<ID_DO_CAIXA>'
```

### 4. Filtrar por Tipo de Parcela

```bash
# Apenas primeiras parcelas (com fundo de reserva)
curl -X GET 'http://localhost:3000/api/split-history?tipoParcela=primeira'

# Parcelas intermediárias
curl -X GET 'http://localhost:3000/api/split-history?tipoParcela=intermediaria'

# Últimas parcelas (com bônus admin)
curl -X GET 'http://localhost:3000/api/split-history?tipoParcela=ultima'
```

### 5. Filtrar por Período

```bash
curl -X GET 'http://localhost:3000/api/split-history?dataInicio=2025-12-01&dataFim=2025-12-31'
```

### 6. Filtrar por Usuário (nos recipients)

```bash
curl -X GET 'http://localhost:3000/api/split-history?usuarioId=<ID_DO_USUARIO>'
```

### 7. Histórico de Recebimentos de um Usuário

```bash
curl -X GET 'http://localhost:3000/api/split-history/usuario/<USUARIO_ID>'
```

### 8. ⭐ Saldo Pendente por Usuário (Mais Usado)

```bash
# Exemplo com ID real
curl -X GET 'http://localhost:3000/api/split-history/usuario/694eacd4f1620142ece1cd73/saldo'
```

**Resposta de sucesso:**
```json
{
  "saldoTotal": 4000,
  "saldoTotalReais": "R$ 40.00",
  "detalhamento": [
    {
      "splitId": "...",
      "caixaNome": "Caixa ValorMinimo",
      "parcela": "1/5",
      "dataTransacao": "2025-12-26T17:15:24.000Z",
      "valor": 2000,
      "valorReais": "R$ 20.00",
      "tipo": "fundo_reserva",
      "descricao": "Fundo de Reserva R$ 20.00",
      "status": "pendente"
    },
    {
      "splitId": "...",
      "caixaNome": "Outro Caixa",
      "parcela": "1/4",
      "dataTransacao": "2025-12-26T18:30:15.000Z",
      "valor": 2000,
      "valorReais": "R$ 20.00",
      "tipo": "fundo_reserva",
      "descricao": "Fundo de Reserva R$ 20.00",
      "status": "pendente"
    }
  ]
}
```

### 9. Histórico por Recipient ID (Lytex)

```bash
curl -X GET 'http://localhost:3000/api/split-history/recipient/<RECIPIENT_ID>'
```

### 10. Saldo por Recipient ID

```bash
# Exemplo: Fundo de Reserva
curl -X GET 'http://localhost:3000/api/split-history/recipient/694eae6ab64e11cc41ef1daa/saldo'
```

### 11. Histórico de um Caixa Específico

```bash
curl -X GET 'http://localhost:3000/api/split-history/caixa/<CAIXA_ID>'
```

### 12. Buscar Split Específico por ID

```bash
curl -X GET 'http://localhost:3000/api/split-history/<SPLIT_HISTORY_ID>'
```

### 13. Filtros Combinados

```bash
# Fundo de reserva de um caixa específico em dezembro
curl -X GET 'http://localhost:3000/api/split-history?caixaId=<ID>&tipoParcela=primeira&dataInicio=2025-12-01&dataFim=2025-12-31'
```

## 🔐 Autenticação

O sistema usa o guard global `OptionalAuthGuard`. Para endpoints protegidos, inclua o token:

```bash
curl -X GET 'http://localhost:3000/api/split-history' \
  -H 'Authorization: Bearer <SEU_TOKEN_JWT>'
```

## 📊 Formato de Resposta

### findAll() - Listagem Paginada

```json
{
  "data": [/* array de splits */],
  "total": 0,
  "page": 1,
  "pages": 0
}
```

### getSaldoPendenteByUsuario() - Saldo com Detalhamento

```json
{
  "saldoTotal": 0,          // em centavos
  "saldoTotalReais": "R$ 0.00",
  "detalhamento": [
    {
      "splitId": "...",
      "caixaNome": "...",
      "parcela": "1/5",
      "dataTransacao": "2025-12-26...",
      "valor": 2000,        // em centavos
      "valorReais": "R$ 20.00",
      "tipo": "fundo_reserva",
      "descricao": "...",
      "status": "pendente"
    }
  ]
}
```

## ✅ Status de Teste

- ✅ Servidor inicializado corretamente
- ✅ Rotas registradas em `/api/split-history`
- ✅ Endpoint de listagem funcionando
- ✅ Endpoint de saldo funcionando
- ✅ Build sem erros
- ✅ Integração automática ativa

## 🎯 Próximos Passos

1. Criar uma fatura com split para gerar dados reais
2. Consultar o histórico após criação da fatura
3. Verificar saldo pendente dos recebedores
4. Implementar frontend para visualização
