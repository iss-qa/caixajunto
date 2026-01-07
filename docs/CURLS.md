# CaixaJunto API - CURLs para Testes

Base URL: `http://localhost:3000/api`

## Autenticação

### Registrar novo usuário
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva",
    "email": "joao@email.com",
    "senha": "123456",
    "telefone": "11999998888",
    "tipo": "administrador"
  }'
```

### Registrar usuário comum
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Maria Santos",
    "email": "maria@email.com",
    "senha": "123456",
    "telefone": "11888887777",
    "chavePix": "maria@email.com"
  }'
```

### Registrar usuário Master
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Admin Master",
    "email": "master@caixajunto.com",
    "senha": "master123",
    "telefone": "11999990000",
    "tipo": "master"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@email.com",
    "senha": "123456"
  }'
```

### Refresh Token (requer autenticação)
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Alterar Senha (requer autenticação)
```bash
curl -X PATCH http://localhost:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "senhaAtual": "123456",
    "novaSenha": "novaSenha123"
  }'
```

---

## Usuários

### Criar usuário
```bash
curl -X POST http://localhost:3000/api/usuarios \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Carlos Oliveira",
    "email": "carlos@email.com",
    "senha": "123456",
    "telefone": "11777776666",
    "cpf": "12345678901",
    "chavePix": "carlos@email.com"
  }'
```

### Listar todos os usuários
```bash
curl -X GET "http://localhost:3000/api/usuarios?page=1&limit=10"
```

### Listar usuários ativos
```bash
curl -X GET "http://localhost:3000/api/usuarios?ativo=true"
```

### Listar administradores
```bash
curl -X GET "http://localhost:3000/api/usuarios?tipo=administrador"
```

### Buscar administradores
```bash
curl -X GET http://localhost:3000/api/usuarios/administradores
```

### Estatísticas de usuários
```bash
curl -X GET http://localhost:3000/api/usuarios/estatisticas
```

### Buscar usuário por ID
```bash
curl -X GET http://localhost:3000/api/usuarios/ID_USUARIO_AQUI
```

### Buscar usuário por email
```bash
curl -X GET http://localhost:3000/api/usuarios/email/joao@email.com
```

### Buscar usuário por telefone
```bash
curl -X GET http://localhost:3000/api/usuarios/telefone/11999998888
```

### Atualizar usuário
```bash
curl -X PATCH http://localhost:3000/api/usuarios/ID_USUARIO_AQUI \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva Atualizado",
    "chavePix": "11999998888"
  }'
```

### Atualizar score do usuário
```bash
curl -X PATCH http://localhost:3000/api/usuarios/ID_USUARIO_AQUI/score \
  -H "Content-Type: application/json" \
  -d '{
    "pontos": 3
  }'
```

### Incrementar caixas concluídos
```bash
curl -X PATCH http://localhost:3000/api/usuarios/ID_USUARIO_AQUI/caixas-concluidos
```

### Deletar usuário
```bash
curl -X DELETE http://localhost:3000/api/usuarios/ID_USUARIO_AQUI
```

---

## Caixas

### Criar caixa mensal
```bash
curl -X POST http://localhost:3000/api/caixas \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Caixa da Família",
    "descricao": "Caixa mensal da família",
    "tipo": "mensal",
    "valorTotal": 5000,
    "valorParcela": 500,
    "qtdParticipantes": 10,
    "duracaoMeses": 10,
    "adminId": "ID_ADMIN_AQUI",
    "diaVencimento": 10,
    "taxaApp": 500,
    "taxaAdmin": 500,
    "fundoGarantidor": 500
  }'
```

### Criar caixa semanal
```bash
curl -X POST http://localhost:3000/api/caixas \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Caixa Semanal Amigos",
    "descricao": "Caixa semanal dos amigos",
    "tipo": "semanal",
    "valorTotal": 2400,
    "valorParcela": 200,
    "qtdParticipantes": 12,
    "duracaoMeses": 12,
    "adminId": "ID_ADMIN_AQUI",
    "diaVencimento": 1,
    "taxaApp": 240,
    "taxaAdmin": 240,
    "fundoGarantidor": 600
  }'
```

**Nota sobre tipos de caixa:**
- **Mensal**: Pagamentos mensais, até 12 participantes
- **Semanal**: Pagamentos semanais, até 24 participantes

### Listar todos os caixas
```bash
curl -X GET "http://localhost:3000/api/caixas?page=1&limit=10"
```

### Listar caixas ativos
```bash
curl -X GET "http://localhost:3000/api/caixas?status=ativo"
```

### Listar caixas por administrador
```bash
curl -X GET "http://localhost:3000/api/caixas?adminId=ID_ADMIN_AQUI"
```

### Estatísticas de caixas
```bash
curl -X GET http://localhost:3000/api/caixas/estatisticas
```

### Buscar caixa por ID
```bash
curl -X GET http://localhost:3000/api/caixas/ID_CAIXA_AQUI
```

### Buscar caixa por código de convite
```bash
curl -X GET http://localhost:3000/api/caixas/convite/CODIGO_CONVITE
```

### Buscar caixas por administrador
```bash
curl -X GET http://localhost:3000/api/caixas/admin/ID_ADMIN_AQUI
```

### Atualizar caixa
```bash
curl -X PATCH http://localhost:3000/api/caixas/ID_CAIXA_AQUI \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Caixa da Família Atualizado",
    "descricao": "Nova descrição"
  }'
```

### Alterar status do caixa
```bash
curl -X PATCH http://localhost:3000/api/caixas/ID_CAIXA_AQUI/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "aguardando"
  }'
```

### Ativar caixa
```bash
curl -X PATCH http://localhost:3000/api/caixas/ID_CAIXA_AQUI/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ativo"
  }'
```

### Atualizar fundo garantidor
```bash
curl -X PATCH http://localhost:3000/api/caixas/ID_CAIXA_AQUI/fundo-garantidor \
  -H "Content-Type: application/json" \
  -d '{
    "valor": 50
  }'
```

### Avançar mês do caixa
```bash
curl -X PATCH http://localhost:3000/api/caixas/ID_CAIXA_AQUI/avancar-mes
```

### Deletar caixa
```bash
curl -X DELETE http://localhost:3000/api/caixas/ID_CAIXA_AQUI
```

---

## Participantes

### Adicionar participante ao caixa
```bash
curl -X POST http://localhost:3000/api/participantes \
  -H "Content-Type: application/json" \
  -d '{
    "caixaId": "ID_CAIXA_AQUI",
    "usuarioId": "ID_USUARIO_AQUI"
  }'
```

### Listar todos os participantes
```bash
curl -X GET "http://localhost:3000/api/participantes?page=1&limit=10"
```

### Listar participantes de um caixa
```bash
curl -X GET "http://localhost:3000/api/participantes?caixaId=ID_CAIXA_AQUI"
```

### Listar participações de um usuário
```bash
curl -X GET "http://localhost:3000/api/participantes?usuarioId=ID_USUARIO_AQUI"
```

### Buscar participantes por caixa
```bash
curl -X GET http://localhost:3000/api/participantes/caixa/ID_CAIXA_AQUI
```

### Buscar participações por usuário
```bash
curl -X GET http://localhost:3000/api/participantes/usuario/ID_USUARIO_AQUI
```

### Contar participantes de um caixa
```bash
curl -X GET http://localhost:3000/api/participantes/caixa/ID_CAIXA_AQUI/contagem
```

### Contar inadimplentes de um caixa
```bash
curl -X GET http://localhost:3000/api/participantes/caixa/ID_CAIXA_AQUI/inadimplentes
```

### Buscar participante por ID
```bash
curl -X GET http://localhost:3000/api/participantes/ID_PARTICIPANTE_AQUI
```

### Aceitar convite
```bash
curl -X PATCH http://localhost:3000/api/participantes/ID_PARTICIPANTE_AQUI/aceitar
```

### Definir posição
```bash
curl -X PATCH http://localhost:3000/api/participantes/ID_PARTICIPANTE_AQUI/posicao \
  -H "Content-Type: application/json" \
  -d '{
    "posicao": 1
  }'
```

### Alterar status do participante
```bash
curl -X PATCH http://localhost:3000/api/participantes/ID_PARTICIPANTE_AQUI/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ativo"
  }'
```

### Marcar recebimento
```bash
curl -X PATCH http://localhost:3000/api/participantes/ID_PARTICIPANTE_AQUI/recebimento \
  -H "Content-Type: application/json" \
  -d '{
    "valor": 5000
  }'
```

### Atualizar pagamento
```bash
curl -X PATCH http://localhost:3000/api/participantes/ID_PARTICIPANTE_AQUI/pagamento \
  -H "Content-Type: application/json" \
  -d '{
    "valor": 500
  }'
```

### Sortear posições
```bash
curl -X POST http://localhost:3000/api/participantes/caixa/ID_CAIXA_AQUI/sortear
```

### Deletar participante
```bash
curl -X DELETE http://localhost:3000/api/participantes/ID_PARTICIPANTE_AQUI
```

---

## Pagamentos

### Criar pagamento
```bash
curl -X POST http://localhost:3000/api/pagamentos \
  -H "Content-Type: application/json" \
  -d '{
    "caixaId": "ID_CAIXA_AQUI",
    "pagadorId": "ID_PAGADOR_AQUI",
    "recebedorId": "ID_RECEBEDOR_AQUI",
    "mesReferencia": 1,
    "valorParcela": 500,
    "dataVencimento": "2024-02-10T00:00:00.000Z"
  }'
```

### Criar pagamentos em lote
```bash
curl -X POST http://localhost:3000/api/pagamentos/lote \
  -H "Content-Type: application/json" \
  -d '[
    {
      "caixaId": "ID_CAIXA_AQUI",
      "pagadorId": "ID_PAGADOR1_AQUI",
      "recebedorId": "ID_RECEBEDOR_AQUI",
      "mesReferencia": 1,
      "valorParcela": 500,
      "dataVencimento": "2024-02-10T00:00:00.000Z"
    },
    {
      "caixaId": "ID_CAIXA_AQUI",
      "pagadorId": "ID_PAGADOR2_AQUI",
      "recebedorId": "ID_RECEBEDOR_AQUI",
      "mesReferencia": 1,
      "valorParcela": 500,
      "dataVencimento": "2024-02-10T00:00:00.000Z"
    }
  ]'
```

### Listar todos os pagamentos
```bash
curl -X GET "http://localhost:3000/api/pagamentos?page=1&limit=10"
```

### Listar pagamentos de um caixa
```bash
curl -X GET "http://localhost:3000/api/pagamentos?caixaId=ID_CAIXA_AQUI"
```

### Listar pagamentos pendentes
```bash
curl -X GET "http://localhost:3000/api/pagamentos?status=pendente"
```

### Buscar pagamentos atrasados
```bash
curl -X GET "http://localhost:3000/api/pagamentos/atrasados?diasMinimo=1"
```

### Estatísticas de pagamentos de um caixa
```bash
curl -X GET http://localhost:3000/api/pagamentos/caixa/ID_CAIXA_AQUI/estatisticas
```

### Buscar pagamentos por caixa e mês
```bash
curl -X GET http://localhost:3000/api/pagamentos/caixa/ID_CAIXA_AQUI/mes/1
```

### Buscar pagamentos pendentes de um caixa
```bash
curl -X GET http://localhost:3000/api/pagamentos/caixa/ID_CAIXA_AQUI/pendentes
```

### Buscar pagamento por ID
```bash
curl -X GET http://localhost:3000/api/pagamentos/ID_PAGAMENTO_AQUI
```

### Enviar comprovante
```bash
curl -X PATCH http://localhost:3000/api/pagamentos/ID_PAGAMENTO_AQUI/comprovante \
  -H "Content-Type: application/json" \
  -d '{
    "comprovanteUrl": "https://storage.com/comprovante123.jpg"
  }'
```

### Aprovar pagamento
```bash
curl -X PATCH http://localhost:3000/api/pagamentos/ID_PAGAMENTO_AQUI/aprovar
```

### Rejeitar pagamento
```bash
curl -X PATCH http://localhost:3000/api/pagamentos/ID_PAGAMENTO_AQUI/rejeitar \
  -H "Content-Type: application/json" \
  -d '{
    "motivoRejeicao": "Comprovante ilegível"
  }'
```

### Calcular atrasos
```bash
curl -X POST http://localhost:3000/api/pagamentos/calcular-atrasos
```

### Gerar pagamentos do mês
```bash
curl -X POST http://localhost:3000/api/pagamentos/caixa/ID_CAIXA_AQUI/gerar-mes \
  -H "Content-Type: application/json" \
  -d '{
    "mesReferencia": 1,
    "participantes": [
      {"usuarioId": "ID_USUARIO1", "posicao": 1},
      {"usuarioId": "ID_USUARIO2", "posicao": 2}
    ],
    "valorParcela": 500,
    "diaVencimento": 10
  }'
```

### Deletar pagamento
```bash
curl -X DELETE http://localhost:3000/api/pagamentos/ID_PAGAMENTO_AQUI
```

---

## Recebimentos

### Criar recebimento
```bash
curl -X POST http://localhost:3000/api/recebimentos \
  -H "Content-Type: application/json" \
  -d '{
    "caixaId": "ID_CAIXA_AQUI",
    "recebedorId": "ID_RECEBEDOR_AQUI",
    "mesReferencia": 1,
    "valorTotal": 5000,
    "dataPrevista": "2024-02-15T00:00:00.000Z"
  }'
```

### Listar todos os recebimentos
```bash
curl -X GET "http://localhost:3000/api/recebimentos?page=1&limit=10"
```

### Listar recebimentos de um caixa
```bash
curl -X GET "http://localhost:3000/api/recebimentos?caixaId=ID_CAIXA_AQUI"
```

### Listar recebimentos pendentes
```bash
curl -X GET "http://localhost:3000/api/recebimentos?status=pendente"
```

### Estatísticas de recebimentos
```bash
curl -X GET http://localhost:3000/api/recebimentos/estatisticas
```

### Buscar próximos recebimentos
```bash
curl -X GET "http://localhost:3000/api/recebimentos/proximos?dias=7"
```

### Buscar recebimentos por caixa
```bash
curl -X GET http://localhost:3000/api/recebimentos/caixa/ID_CAIXA_AQUI
```

### Buscar recebimentos por usuário
```bash
curl -X GET http://localhost:3000/api/recebimentos/usuario/ID_USUARIO_AQUI
```

### Buscar recebimento por ID
```bash
curl -X GET http://localhost:3000/api/recebimentos/ID_RECEBIMENTO_AQUI
```

### Liberar recebimento
```bash
curl -X PATCH http://localhost:3000/api/recebimentos/ID_RECEBIMENTO_AQUI/liberar
```

### Atualizar contagem
```bash
curl -X PATCH http://localhost:3000/api/recebimentos/ID_RECEBIMENTO_AQUI/contagem \
  -H "Content-Type: application/json" \
  -d '{
    "recebidos": 8,
    "pendentes": 2
  }'
```

### Deletar recebimento
```bash
curl -X DELETE http://localhost:3000/api/recebimentos/ID_RECEBIMENTO_AQUI
```

---

## Fundo Garantidor

### Criar movimento
```bash
curl -X POST http://localhost:3000/api/fundo-garantidor \
  -H "Content-Type: application/json" \
  -d '{
    "caixaId": "ID_CAIXA_AQUI",
    "tipo": "entrada",
    "valor": 50,
    "descricao": "Contribuição inicial"
  }'
```

### Listar todos os movimentos
```bash
curl -X GET "http://localhost:3000/api/fundo-garantidor?page=1&limit=10"
```

### Listar movimentos de um caixa
```bash
curl -X GET "http://localhost:3000/api/fundo-garantidor?caixaId=ID_CAIXA_AQUI"
```

### Estatísticas gerais
```bash
curl -X GET http://localhost:3000/api/fundo-garantidor/estatisticas
```

### Buscar movimentos por caixa
```bash
curl -X GET http://localhost:3000/api/fundo-garantidor/caixa/ID_CAIXA_AQUI
```

### Calcular saldo do caixa
```bash
curl -X GET http://localhost:3000/api/fundo-garantidor/caixa/ID_CAIXA_AQUI/saldo
```

### Buscar movimento por ID
```bash
curl -X GET http://localhost:3000/api/fundo-garantidor/ID_MOVIMENTO_AQUI
```

### Registrar entrada
```bash
curl -X POST http://localhost:3000/api/fundo-garantidor/entrada \
  -H "Content-Type: application/json" \
  -d '{
    "caixaId": "ID_CAIXA_AQUI",
    "valor": 50,
    "descricao": "Contribuição do participante"
  }'
```

### Registrar saída (cobrir inadimplência)
```bash
curl -X POST http://localhost:3000/api/fundo-garantidor/saida \
  -H "Content-Type: application/json" \
  -d '{
    "caixaId": "ID_CAIXA_AQUI",
    "valor": 500,
    "inadimplenteId": "ID_INADIMPLENTE_AQUI",
    "descricao": "Cobertura de atraso"
  }'
```

### Registrar lucro (ao final do caixa)
```bash
curl -X POST http://localhost:3000/api/fundo-garantidor/lucro \
  -H "Content-Type: application/json" \
  -d '{
    "caixaId": "ID_CAIXA_AQUI",
    "valor": 500,
    "descricao": "Saldo final convertido em receita"
  }'
```

### Deletar movimento
```bash
curl -X DELETE http://localhost:3000/api/fundo-garantidor/ID_MOVIMENTO_AQUI
```

---

## Notificações

### Criar notificação
```bash
curl -X POST http://localhost:3000/api/notificacoes \
  -H "Content-Type: application/json" \
  -d '{
    "usuarioId": "ID_USUARIO_AQUI",
    "caixaId": "ID_CAIXA_AQUI",
    "tipo": "lembrete",
    "canal": "whatsapp",
    "titulo": "Lembrete de Pagamento",
    "mensagem": "Seu pagamento vence em 3 dias!"
  }'
```

### Listar todas as notificações
```bash
curl -X GET "http://localhost:3000/api/notificacoes?page=1&limit=10"
```

### Listar notificações de um usuário
```bash
curl -X GET "http://localhost:3000/api/notificacoes?usuarioId=ID_USUARIO_AQUI"
```

### Listar notificações não lidas
```bash
curl -X GET "http://localhost:3000/api/notificacoes?lida=false"
```

### Buscar notificações agendadas
```bash
curl -X GET http://localhost:3000/api/notificacoes/agendadas
```

### Buscar notificações por usuário
```bash
curl -X GET http://localhost:3000/api/notificacoes/usuario/ID_USUARIO_AQUI
```

### Contar não lidas de um usuário
```bash
curl -X GET http://localhost:3000/api/notificacoes/usuario/ID_USUARIO_AQUI/nao-lidas
```

### Buscar notificação por ID
```bash
curl -X GET http://localhost:3000/api/notificacoes/ID_NOTIFICACAO_AQUI
```

### Marcar como lida
```bash
curl -X PATCH http://localhost:3000/api/notificacoes/ID_NOTIFICACAO_AQUI/ler
```

### Marcar todas como lidas
```bash
curl -X PATCH http://localhost:3000/api/notificacoes/usuario/ID_USUARIO_AQUI/ler-todas
```

### Enviar notificação
```bash
curl -X POST http://localhost:3000/api/notificacoes/ID_NOTIFICACAO_AQUI/enviar
```

### Criar lembrete de pagamento
```bash
curl -X POST http://localhost:3000/api/notificacoes/lembrete-pagamento \
  -H "Content-Type: application/json" \
  -d '{
    "usuarioId": "ID_USUARIO_AQUI",
    "caixaId": "ID_CAIXA_AQUI",
    "caixaNome": "Caixa da Família",
    "valor": 500,
    "diasRestantes": 5
  }'
```

### Criar alerta de atraso
```bash
curl -X POST http://localhost:3000/api/notificacoes/alerta-atraso \
  -H "Content-Type: application/json" \
  -d '{
    "usuarioId": "ID_USUARIO_AQUI",
    "caixaId": "ID_CAIXA_AQUI",
    "caixaNome": "Caixa da Família",
    "diasAtraso": 3
  }'
```

### Criar celebração de recebimento
```bash
curl -X POST http://localhost:3000/api/notificacoes/celebracao-recebimento \
  -H "Content-Type: application/json" \
  -d '{
    "usuarioId": "ID_USUARIO_AQUI",
    "caixaId": "ID_CAIXA_AQUI",
    "caixaNome": "Caixa da Família",
    "valor": 5000
  }'
```

### Processar notificações agendadas
```bash
curl -X POST http://localhost:3000/api/notificacoes/processar-agendadas
```

### Deletar notificação
```bash
curl -X DELETE http://localhost:3000/api/notificacoes/ID_NOTIFICACAO_AQUI
```

---

## Dashboard

### Dashboard Master (Super Admin)
```bash
curl -X GET http://localhost:3000/api/dashboard/master
```

### Dashboard do Administrador
```bash
curl -X GET http://localhost:3000/api/dashboard/admin/ID_ADMIN_AQUI
```

### Dashboard do Usuário
```bash
curl -X GET http://localhost:3000/api/dashboard/usuario/ID_USUARIO_AQUI
```

### Métricas Gerais
```bash
curl -X GET http://localhost:3000/api/dashboard/metricas
```

---

## Fluxo de Teste Completo

### 1. Criar Admin
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Admin Teste",
    "email": "admin@teste.com",
    "senha": "123456",
    "telefone": "11999990001",
    "tipo": "administrador"
  }'
```

### 2. Criar Usuários Participantes (repetir para cada)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Participante 1",
    "email": "participante1@teste.com",
    "senha": "123456",
    "telefone": "11999990002",
    "chavePix": "participante1@teste.com"
  }'
```

### 3. Criar Caixa
```bash
curl -X POST http://localhost:3000/api/caixas \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Caixa Teste",
    "valorTotal": 5000,
    "qtdParticipantes": 10,
    "duracaoMeses": 10,
    "adminId": "ID_ADMIN",
    "diaVencimento": 10
  }'
```

### 4. Adicionar Participantes
```bash
curl -X POST http://localhost:3000/api/participantes \
  -H "Content-Type: application/json" \
  -d '{
    "caixaId": "ID_CAIXA",
    "usuarioId": "ID_PARTICIPANTE"
  }'
```

### 5. Aceitar Convites
```bash
curl -X PATCH http://localhost:3000/api/participantes/ID_PARTICIPANTE/aceitar
```

### 6. Sortear Posições
```bash
curl -X POST http://localhost:3000/api/participantes/caixa/ID_CAIXA/sortear
```

### 7. Ativar Caixa
```bash
curl -X PATCH http://localhost:3000/api/caixas/ID_CAIXA/status \
  -H "Content-Type: application/json" \
  -d '{"status": "ativo"}'
```

### 8. Ver Dashboard
```bash
curl -X GET http://localhost:3000/api/dashboard/admin/ID_ADMIN
```

---

## Integração Lytex Pagamentos

O sistema integra automaticamente com a API Lytex Pagamentos para gerenciar clientes e pagamentos.

### Configuração

Adicione as seguintes variáveis de ambiente no arquivo `.env`:

```bash
# Habilitar/desabilitar integração Lytex (padrão: true)
LYTEX_ENABLED=true

# URL base da API Lytex
# Sandbox: https://sandbox-api-pay.lytex.com.br/v2
# Produção: https://api-pay.lytex.com.br/v2
LYTEX_BASE_URL=https://sandbox-api-pay.lytex.com.br/v2

# Token de autenticação do Lytex
LYTEX_TOKEN=seu_token_aqui
```

### Sincronização Automática

Quando um usuário do tipo `usuario` (participante) é criado, atualizado ou removido:

1. **Criação**: Automaticamente cria um cliente no Lytex e armazena o `lytexClientId` no MongoDB
2. **Atualização**: Sincroniza dados alterados (nome, email, telefone, CPF) com o Lytex
3. **Remoção**: Remove o cliente do Lytex antes de deletar do MongoDB

### Exemplo de Criação com Integração Lytex

```bash
curl -X POST http://localhost:3000/api/usuarios \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Carlos Oliveira",
    "email": "carlos@email.com",
    "senha": "Senha@123",
    "telefone": "11987654321",
    "cpf": "12345678901",
    "chavePix": "carlos@email.com",
    "tipo": "usuario",
    "picture": "data:image/jpeg;base64,...",
    "endereco": "Rua Exemplo, 123",
    "cidade": "São Paulo",
    "estado": "SP",
    "cep": "01310100"
  }'
```

Resposta incluirá o campo `lytexClientId` se a sincronização for bem-sucedida:

```json
{
  "_id": "64abc123...",
  "nome": "Carlos Oliveira",
  "email": "carlos@email.com",
  "lytexClientId": "693889710b94786c6437a658",
  ...
}
```

### Testes com Lytex Desabilitado

Para testar localmente sem a integração Lytex:

```bash
LYTEX_ENABLED=false npm run start:dev
```

---

## Notas

- Substitua `ID_*_AQUI` pelos IDs reais retornados nas respostas
- Para autenticação em produção, inclua o header `Authorization: Bearer SEU_TOKEN`
- Em localhost, a autenticação é opcional (bypass automático)
- Todos os endpoints retornam JSON
- Datas devem estar no formato ISO 8601
- A integração Lytex é automática e não bloqueia operações locais em caso de falha

