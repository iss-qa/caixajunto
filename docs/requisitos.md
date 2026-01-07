# CaixaJunto - Documento de Requisitos MVP v2

## 1. Visão Geral

**Problema:** Pessoas de baixa/média renda recorrem a agiotas, empréstimos no cartão de crédito e financeiras com juros abusivos para conseguir valores de R$ 1.000 a R$ 10.000.

**Solução:** Digitalizar e profissionalizar o sistema de "caixas" (ROSCA), oferecendo uma alternativa de crédito rotativo sem juros, com transparência e segurança.

**Proposta de Valor:** Acesso a crédito sem juros, apenas com uma pequena taxa administrativa única.

---

## 2. Comparativo: Por que CaixaJunto?

| Modalidade | Valor R$ 5.000 | Custo Total | Juros/Taxas |
|------------|----------------|-------------|-------------|
| Agiota | R$ 5.000 | R$ 7.500+ | 50%+ |
| Cartão de crédito (parcelado) | R$ 5.000 | R$ 7.200 | ~14% a.m. |
| Empréstimo pessoal banco | R$ 5.000 | R$ 6.500 | ~5% a.m. |
| Financeira | R$ 5.000 | R$ 8.000+ | ~8% a.m. |
| **CaixaJunto** | R$ 5.000 | **R$ 5.050** | **Taxa única R$ 50** |

---

## 3. Modelo de Negócio

### 3.1 Participantes do Ecossistema

| Ator | Função | Ganho |
|------|--------|-------|
| **App CaixaJunto** | Plataforma tecnológica, gateway, transparência | Taxa 1º mês (todos) |
| **Administrador** | Capta pessoas conhecidas, cobra pessoalmente, garante grupo | Taxa último mês (todos) |
| **Usuário** | Participa do caixa, paga parcelas, recebe valor cheio | Recebe 100% do valor do caixa |

### 3.2 Fluxo Financeiro - Exemplo

```
Caixa: R$ 5.000 | 10 participantes | 10 meses

Parcela normal: R$ 500
Taxa App (1º mês): R$ 50 por pessoa
Taxa Admin (último mês): R$ 50 por pessoa

CRONOGRAMA:
─────────────────────────────────────────────────────
Mês 1:  Cada um paga R$ 550 (parcela + taxa app)
        → R$ 500 vai para Recebedor 1
        → R$ 500 vai para Fundo Garantidor (10 x R$ 50)

Mês 2-9: Cada um paga R$ 500
         → R$ 5.000 vai para Recebedor do mês

Mês 10: Cada um paga R$ 550 (parcela + taxa admin)
        → R$ 5.000 vai para Recebedor 10
        → R$ 500 vai para Administrador
─────────────────────────────────────────────────────

RESULTADO FINAL:
• Cada usuário pagou: R$ 5.100 (10x R$ 500 + R$ 50 + R$ 50)
• Cada usuário recebeu: R$ 5.000
• Custo real: R$ 100 (2% do valor) - SEM JUROS

• App fatura: R$ 500 (se não usar fundo garantidor)
• Administrador fatura: R$ 500
```

### 3.3 Destino do Fundo Garantidor

| Cenário | Uso do Fundo | Receita do App |
|---------|--------------|----------------|
| Sem inadimplência | R$ 0 | R$ 500 (100%) |
| 1 inadimplente | R$ 500 | R$ 0 |
| Inadimplência parcial | R$ 250 | R$ 250 |

**Regra:** O fundo garantidor cobre atrasos, mas NÃO pode haver inadimplência total. O Administrador é responsável por cobrar pessoalmente e garantir os pagamentos.

---

## 4. Regras de Negócio

### RN01 - Limites do Caixa
| Parâmetro | Mínimo | Máximo | Ideal |
|-----------|--------|--------|-------|
| Participantes | 5 | 12 | 10 |
| Duração | 5 meses | 24 meses | 10-12 meses |
| Valor do caixa | R$ 1.000 | R$ 10.000 | R$ 3.000-5.000 |

**Excepcional:** Caixas de 18 ou 24 meses apenas para Administradores com histórico comprovado (3+ caixas concluídos).

### RN02 - Taxas (MODELO ATUALIZADO)
| Taxa | Valor | Quando | Destino |
|------|-------|--------|---------|
| Taxa de Serviço | R$ 3,00 | Todo pagamento | App (cobre gateway) |
| Fundo Garantidor | R$ 50 (10% parcela) | 1º mês apenas | Reserva → App ao final |
| Taxa Admin | R$ 50 (10% parcela) | Último mês apenas | Administrador |

**Custo total para usuário (exemplo caixa R$ 5.000 / 10 pessoas / 10 meses):**
- 10 parcelas × R$ 500 = R$ 5.000
- 10 taxas de serviço × R$ 3 = R$ 30
- 1 fundo garantidor = R$ 50
- 1 taxa admin = R$ 50
- **TOTAL PAGO: R$ 5.130 (custo extra: R$ 130 ou 2,6%)**

### RN03 - Papel do Administrador
- **Obrigatório:** Conhecer pessoalmente TODOS os participantes
- **Responsabilidade:** Cobrar face a face em caso de atraso
- **Poder:** Aprovar/rejeitar participantes, validar comprovantes
- **Risco:** Responde pela inadimplência do grupo

### RN04 - Fundo Garantidor
- Formado pelas taxas do 1º mês
- Cobre atrasos de até 30 dias
- Máximo: 1 parcela por inadimplente por caixa
- Saldo final: 100% vira receita do App

### RN05 - Inadimplência
| Dias de atraso | Ação |
|----------------|------|
| 1-3 dias | Notificação automática + aviso ao Admin |
| 4-7 dias | Admin cobra pessoalmente |
| 8-15 dias | Fundo garantidor cobre temporariamente |
| 16-30 dias | Admin deve resolver ou repor valor |
| 30+ dias | Participante bloqueado, Admin penalizado |

### RN06 - Score de Confiança
| Ação | Pontos |
|------|--------|
| Pagamento em dia | +3 |
| Pagamento atrasado (1-3 dias) | -5 |
| Pagamento atrasado (4-7 dias) | -10 |
| Uso do fundo garantidor | -20 |
| Caixa concluído sem atrasos | +15 |
| Score inicial | 70 |

### RN07 - Ordem de Recebimento
- Definida pelo Administrador ou por sorteio no app
- Pode haver leilão (participante paga extra por posição melhor)
- Administrador NÃO recebe ponto (diferente do modelo tradicional)

### RN08 - Gateway de Pagamento
- Pagamentos via Pix através de gateway integrado
- Valor retido até validação do comprovante
- Liberação automática no dia/hora combinado
- Split automático (parcela → recebedor / taxa → app/admin)

---

## 5. Estrutura de Dados

### Tabela: usuarios
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| nome | VARCHAR(100) | Nome completo |
| telefone | VARCHAR(15) | WhatsApp (único) |
| cpf | VARCHAR(11) | CPF (único, opcional MVP) |
| chave_pix | VARCHAR(100) | Chave Pix para recebimento |
| score | INT | Score de confiança (0-100) |
| tipo | ENUM | usuario/administrador |
| caixas_concluidos | INT | Qtd de caixas finalizados |
| created_at | TIMESTAMP | Data de cadastro |

### Tabela: caixas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| nome | VARCHAR(50) | Nome do caixa |
| valor_total | DECIMAL | Valor total do caixa |
| valor_parcela | DECIMAL | Valor da parcela mensal |
| taxa_app | DECIMAL | Taxa cobrada pelo app (10%) |
| taxa_admin | DECIMAL | Taxa do administrador (10%) |
| qtd_participantes | INT | Número de participantes (5-12) |
| duracao_meses | INT | Duração em meses |
| admin_id | UUID | FK para usuarios |
| status | ENUM | rascunho/aguardando/ativo/finalizado/cancelado |
| data_inicio | DATE | Data de início |
| dia_vencimento | INT | Dia do mês para pagamento (1-28) |
| fundo_garantidor | DECIMAL | Saldo atual do fundo |
| created_at | TIMESTAMP | Data de criação |

### Tabela: participantes
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| caixa_id | UUID | FK para caixas |
| usuario_id | UUID | FK para usuarios |
| posicao | INT | Ordem de recebimento (1 a N) |
| aceite | BOOLEAN | Aceitou participar? |
| data_aceite | TIMESTAMP | Quando aceitou |
| status | ENUM | convidado/ativo/inadimplente/bloqueado |

### Tabela: pagamentos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| caixa_id | UUID | FK para caixas |
| pagador_id | UUID | FK para usuarios |
| recebedor_id | UUID | FK para usuarios |
| mes_referencia | INT | Mês do pagamento (1 a N) |
| valor_parcela | DECIMAL | Valor da parcela |
| valor_taxa | DECIMAL | Taxa (se aplicável) |
| tipo_taxa | ENUM | nenhuma/app/admin |
| comprovante_url | VARCHAR(255) | URL do comprovante |
| status | ENUM | pendente/enviado/aprovado/rejeitado/pago_gateway |
| transacao_gateway | VARCHAR(100) | ID da transação no gateway |
| data_vencimento | DATE | Data limite |
| data_pagamento | TIMESTAMP | Quando pagou |
| data_validacao | TIMESTAMP | Quando admin validou |

### Tabela: recebimentos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| caixa_id | UUID | FK para caixas |
| recebedor_id | UUID | FK para usuarios |
| mes_referencia | INT | Mês do recebimento |
| valor_total | DECIMAL | Valor recebido |
| data_prevista | DATE | Data prevista |
| data_liberacao | TIMESTAMP | Quando foi liberado |
| transacao_gateway | VARCHAR(100) | ID da transação |
| status | ENUM | pendente/liberado |

### Tabela: fundo_garantidor_movimentos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| caixa_id | UUID | FK para caixas |
| tipo | ENUM | entrada/saida/lucro |
| valor | DECIMAL | Valor movimentado |
| descricao | VARCHAR(200) | Descrição do movimento |
| inadimplente_id | UUID | FK usuarios (se saída) |
| created_at | TIMESTAMP | Data do movimento |

### Tabela: notificacoes
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| caixa_id | UUID | FK para caixas |
| usuario_id | UUID | FK para usuarios |
| tipo | ENUM | lembrete/confirmacao/alerta/celebracao |
| canal | ENUM | whatsapp/push/email |
| mensagem | TEXT | Conteúdo |
| enviada | BOOLEAN | Foi enviada? |
| data_agendada | TIMESTAMP | Quando enviar |
| data_envio | TIMESTAMP | Quando foi enviada |

---

## 6. Notificações WhatsApp (n8n)

| Gatilho | Mensagem | Para |
|---------|----------|------|
| D-5 | "Olá {nome}! 📅 Faltam 5 dias para o pagamento do caixa {caixa}. Valor: R$ {valor}. Pix: {chave_recebedor}" | Todos |
| D-3 | "⏰ Lembrete: Pagamento do {caixa} vence em 3 dias!" | Pendentes |
| Pagou | "🎉 {nome} pagou R$ {valor} no {caixa}! Faltam {x} pessoas." | Todos |
| Todos pagaram | "✅ {caixa} em dia! Todos pagaram. {recebedor} receberá R$ {valor} em {data}!" | Todos |
| D-1 pendentes | "⚠️ ATENÇÃO: {nomes} ainda não pagaram o {caixa}. Vencimento amanhã!" | Admin |
| Recebimento | "💰 Parabéns {nome}! R$ {valor} do {caixa} foi liberado na sua conta!" | Recebedor |
| Atraso 3 dias | "🚨 {nome} está com 3 dias de atraso no {caixa}. Por favor, regularize." | Inadimplente + Admin |

---

## 7. Análise Financeira e Viabilidade

### 7.1 Custo do Gateway por Transação
| Gateway | Taxa Pix | Observação |
|---------|----------|------------|
| Asaas | R$ 0,99 (3 meses) → R$ 1,99 | Popular, boa API |
| OpenPix/AbacatePay | ~R$ 0,80 | Mais barato |
| PayZu/PushInPay | ~R$ 0,30 | Mais barato do mercado |
| **Recomendado MVP** | **R$ 0,80** | OpenPix ou similar |

### 7.2 Margem por Transação
```
Taxa de serviço cobrada: R$ 3,00
Custo gateway: R$ 0,80
─────────────────────────
Margem líquida: R$ 2,20 por pagamento
```

### 7.3 Receita do App por Caixa (10 pessoas, 10 meses)
```
Taxa de serviço: 100 pagamentos × R$ 2,20 = R$ 220
Fundo garantidor (se não usar): R$ 500
─────────────────────────────────────────
Receita total por caixa: R$ 720

Se usar fundo garantidor (1 inadimplente):
Taxa de serviço: R$ 220
Fundo: R$ 0 (usado)
─────────────────────
Receita: R$ 220
```

### 7.4 Projeção de Receita
| Cenário | Caixas/mês | Receita Mensal | Receita Anual |
|---------|------------|----------------|---------------|
| MVP (3 meses) | 20 | R$ 4.400 | - |
| Tração (6 meses) | 100 | R$ 22.000 | - |
| Escala (12 meses) | 500 | R$ 110.000 | R$ 1.32M |

*Considerando receita média de R$ 220/caixa (cenário conservador)*

### 7.5 Comparativo com Concorrentes Globais
| Plataforma | Região | Modelo de Receita |
|------------|--------|-------------------|
| Bloom Money | UK | % do payout (variável) |
| AjoMoney | Nigéria | Taxa por ciclo |
| Esusu | EUA | Assinatura + % |
| MoneyClub | Índia | Taxa administrativa |
| **CaixaJunto** | **Brasil** | **R$ 3/pagamento + fundo** |

**Diferencial:** Não existe solução digital focada em caixa rotativo no Brasil. Mercado inexplorado!

---

## 8. Integrações Técnicas

### 7.1 Stack MVP (Web App)
| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| Frontend | React + Tailwind | PWA, sem custo de loja |
| Backend | Supabase | Auth, DB, Storage, Edge Functions | preferencial MongoDB - NextJs
| Gateway | Asaas ou PagBank | Pix, split, baixo custo |
| Notificações | n8n + Evolution API | WhatsApp sem custo oficial |
| Hospedagem | Vercel | Gratuito para MVP |

### 7.2 Gateway de Pagamento - Requisitos
- Recebimento via Pix
- Split de pagamento automático
- API para consulta de status
- Webhook para confirmação
- Saque para conta do recebedor
- Custo: ~1% por transação

### 7.3 Fluxo do Gateway
```
1. Participante inicia pagamento no app
2. App gera QR Code Pix via gateway
3. Participante paga
4. Gateway confirma via webhook
5. App registra pagamento
6. No dia combinado: gateway libera para recebedor
7. Split automático das taxas
```

---

## 8. Questões Legais e Empresariais

### 8.1 Tipo de Empresa para MVP

| Tipo | Prós | Contras | Recomendação |
|------|------|---------|--------------|
| **MEI** | Simples, barato, rápido | Limite R$ 81k/ano, sem sócio | ⚠️ Só para validação inicial |
| **ME (Simples)** | Até R$ 360k/ano, sócios | Mais burocracia | ✅ **Recomendado MVP** |
| **LTDA** | Flexível, escalável | Custo maior | Para escala |

### 8.2 Recomendação MVP

**Fase 1 - Validação (0-3 meses):**
- Abrir MEI (CNAE: 6311-9/00 - Tratamento de dados)
- Testar com 5-10 grupos de conhecidos
- Custo: ~R$ 70/mês (DAS)

**Fase 2 - Tração (3-6 meses):**
- Migrar para ME Simples Nacional
- CNAE sugerido: 6311-9/00 + 6399-2/00
- Contratar contador
- Custo: ~R$ 200-400/mês

### 8.3 Pontos de Atenção Legal
- **Não é instituição financeira:** O app apenas facilita a organização, não empresta dinheiro
- **Contrato de adesão:** Participantes aceitam termos digitalmente
- **Responsabilidade:** Deixar claro que inadimplência é risco do grupo
- **LGPD:** Política de privacidade obrigatória

---

## 9. Programa de Administradores Parceiros

### 9.1 Níveis

| Nível | Requisito | Benefício |
|-------|-----------|-----------|
| **Bronze** | 1º caixa | Taxa Admin normal (10%) |
| **Prata** | 3 caixas concluídos | +5% bônus sobre taxa |
| **Ouro** | 10 caixas concluídos | +10% bônus + badge |
| **Diamante** | 25 caixas + indicações | +15% bônus + prioridade |

### 9.2 Ganhos do Administrador

```
Administrador gerencia 5 caixas simultâneos:

Caixa 1: 10 pessoas × R$ 50 = R$ 500
Caixa 2: 8 pessoas × R$ 50 = R$ 400
Caixa 3: 12 pessoas × R$ 40 = R$ 480
Caixa 4: 10 pessoas × R$ 30 = R$ 300
Caixa 5: 6 pessoas × R$ 60 = R$ 360

Total ao final de todos: R$ 2.040
```

### 9.3 Indicação de Administradores
- Admin indica novo Admin: ganha 10% da primeira taxa dele
- Cria rede de captação orgânica

---

## 10. Monetização Futura (Pós-MVP)

| Fonte | Descrição | Potencial |
|-------|-----------|-----------|
| Leilão de posição | Cobrar % do lance | Médio |
| Seguro premium | Cobertura estendida | Alto |
| Antecipação | Receber antes pagando taxa | Alto |
| White label | Licenciar para igrejas/associações | Médio |
| Crédito parceiros | Comissão por lead | Alto |
| Publicidade | Ofertas segmentadas | Baixo |

---

## 11. Métricas de Sucesso MVP

| Métrica | Meta 3 meses | Meta 6 meses |
|---------|--------------|--------------|
| Caixas criados | 20 | 100 |
| Usuários ativos | 150 | 800 |
| Administradores | 10 | 50 |
| Taxa de conclusão | > 90% | > 95% |
| Uso fundo garantidor | < 15% | < 10% |
| Receita bruta | R$ 5.000 | R$ 25.000 |
| NPS | > 40 | > 60 |

---

## 12. Painéis de Gestão

### 12.1 Painel do Administrador
**Visão Geral:**
- Total de caixas gerenciados (ativos/finalizados)
- Participantes sob gestão
- Ganhos acumulados
- Ganhos previstos

**Métricas por Caixa:**
- Status de pagamentos do mês
- Participantes em atraso
- Próximo recebedor
- Saldo do fundo garantidor

**Ganhos:**
- Histórico de recebimentos
- Previsão de ganhos futuros
- Extrato detalhado

**Ações:**
- Validar comprovantes
- Enviar cobrança manual
- Acionar fundo garantidor
- Convidar novos participantes

### 12.2 Painel de Gestão do App (Admin Master)
**Dashboard Principal:**
- Total de caixas ativos
- Total de usuários
- Volume transacionado (R$)
- Receita bruta / líquida

**Métricas Financeiras:**
- Receita de taxas de serviço
- Saldo total em fundos garantidores
- Fundos utilizados vs. disponíveis
- Projeção de receita (fundos a liberar)

**Operacional:**
- Caixas com inadimplência
- Administradores mais ativos
- Taxa de conclusão de caixas
- NPS / Satisfação

**Relatórios:**
- Receita por período
- Custos de gateway
- Margem líquida
- Crescimento de usuários

---

## 13. Cronograma MVP

| Fase | Semanas | Entregas |
|------|---------|----------|
| 1 | 1-2 | Setup projeto, DB, auth WhatsApp |
| 2 | 3-4 | Cadastro usuários, criar caixa, convites |
| 3 | 5-6 | Fluxo de pagamento, upload comprovante |
| 4 | 7-8 | Integração gateway (Pix + split) |
| 5 | 9 | Notificações WhatsApp (n8n) |
| 6 | 10 | Fundo garantidor, score, dashboard admin |
| 7 | 11-12 | Testes, ajustes, deploy |

**Total: 12 semanas para MVP completo**

---

## 13. Investimento Estimado MVP

| Item | Custo Mensal | Custo Único |
|------|--------------|-------------|
| Supabase (Pro) | R$ 125 | - |
| Vercel (Pro) | R$ 100 | - |
| Gateway (setup) | - | R$ 0-500 |
| n8n Cloud | R$ 100 | - |
| Domínio + SSL | R$ 10 | R$ 50 |
| MEI/Contador | R$ 100-400 | R$ 200 |
| **Total** | **~R$ 450/mês** | **~R$ 750** |

*Se desenvolver internamente. Terceirizar: R$ 15.000-30.000*