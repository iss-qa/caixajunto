# 📋 PLANO DE TESTES - Sistema de Comunicação Juntix

**Data:** Janeiro 2026  
**Versão:** 1.0  
**Responsável:** QA Team

---

## 📌 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Fase 1-3: Mensagens Básicas](#fase-1-3-mensagens-básicas)
3. [Fase 4: Lembretes e Alertas](#fase-4-lembretes-e-alertas)
4. [Fase 5: Confirmação de Pagamento](#fase-5-confirmação-de-pagamento)
5. [Fase 6: Fluxo de Boas-Vindas Aprimorado](#fase-6-fluxo-de-boas-vindas-aprimorado)
6. [Ferramentas de Simulação](#ferramentas-de-simulação)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 Pré-requisitos

### Configuração do Ambiente

1. ✅ Backend rodando em `localhost:3000`
2. ✅ Redis rodando (BullMQ)
3. ✅ MongoDB com dados de teste
4. ✅ Evolution API configurada e conectada
5. ✅ Variáveis de ambiente configuradas:
   ```env
   EVOLUTION_BASE_URL=https://evo2.wastezero.com.br
   EVOLUTION_INSTANCE_NAME=WasteZeroSuporte
   EVOLUTION_API_KEY=dsprhfprvgainztbb0tv7f
   DOCUMENT_CONTRACT_URL=https://drive.google.com/uc?id=1Qo1lD9HzKEuBE-VL7kVD43uggkuFRyyc
   DOCUMENT_TERMS_URL=https://drive.google.com/uc?id=17yBwzaMcmNNvAnqnfwgHmxCKzkimd7LI
   ```

### Acesso ao Banco de Dados

Você precisará acessar o MongoDB para manipular datas. Use:
- **MongoDB Compass** (GUI recomendado)
- **mongo shell** (via terminal)
- **VS Code Extension** (MongoDB for VS Code)

**String de conexão:**
```
mongodb://localhost:27017/caixajunto
```

---

## 📱 Fase 1-3: Mensagens Básicas

### TC-001: Mensagem de Boas-Vindas ao Iniciar Caixa. - OK

**Objetivo:** Verificar envio de boas-vindas quando caixa é iniciado

**Pré-condições:**
- Caixa criado com status `COMPLETO`
- Mínimo 2 participantes cadastrados
- Split configurado

**Passos:**
1. Login como administrador
2. Acessar caixa de teste
3. Clicar em "Iniciar Caixa"
4. Aceitar termos do contrato
5. Confirmar iniciação

**Resultado Esperado:**
- ✅ Todos os participantes recebem mensagem de boas-vindas
- ✅ Mensagens registradas na tabela `mensagem_historicos`
- ✅ Status `ENVIADO` para sucessos
- ✅ Verificar no painel: `/painel-master/comunicacao`

**Verificação:**
```javascript
// MongoDB Query
db.mensagem_historicos.find({
  tipo: "Boas-vindas",
  createdAt: { $gte: new Date(Date.now() - 5*60*1000) } // últimos 5min
}).pretty()
```

**Critérios de Aceitação:**
- [ ] Mensagem contém nome do participante
- [ ] Mensagem contém nome do admin
- [ ] Todas enviadas com sucesso
- [ ] Aparecem no painel de comunicação

---

## 🔔 Fase 4: Lembretes e Alertas

### TC-101: Lembrete 5 Dias Antes do Vencimento
### TC-102: Reenvio do Lembrete via painel do administrador master

**Objetivo:** Testar lembrete amigável enviado 5 dias antes do vencimento

#### Cenário A: Data de vencimento natural (aguardar)

**Data atual:** 05/01/2026  
**Vencimento:** 10/01/2026 (5 dias no futuro)

**Passos:**
1. Criar caixa com vencimento em 10/01
2. Aguardar até 05/01 às 09:00
3. Cron executa automaticamente

**Limitação:** Precisa aguardar data real

#### Cenário B: Simulação por manipulação de data (RECOMENDADO)

**Passo 1: Criar Pagamento de Teste**

```javascript
// MongoDB - Criar pagamento com vencimento em 5 dias
db.pagamentos.insertOne({
  caixaId: ObjectId("SEU_CAIXA_ID"),
  participanteId: ObjectId("SEU_PARTICIPANTE_ID"),  
  pagadorId: ObjectId("SEU_USUARIO_ID"),
  recebedorId: ObjectId("CONTEMPLADO_ID"),
  mesReferencia: 2,
  valorParcela: 250.00,
  status: "PENDENTE",
  dataVencimento: new Date("2026-01-10T00:00:00.000Z"), // 10/01/2026
  tipoTaxa: "NENHUMA",
  diasAtraso: 0,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**Passo 2: Ajustar Data do Sistema (Temporário)**

Modifique temporariamente o cron para rodar imediatamente:

```typescript
// backend/src/modules/comunicacao/cron/comunicacao.cron.ts
// LINHA 28 - Mudar de:
@Cron('0 9 * * *', {...})

// Para (executa a cada minuto):
@Cron('* * * * *', {...})
```


**Passo 3: Executar e Observar**

1. Reiniciar backend
2. Aguardar 1 minuto (cron executa)
3. Verificar logs:
   ```
   🔔 Iniciando verificação de pagamentos para lembretes...
   📅 Enviando lembrete de 5 dias para [Nome]
   ```

**Passo 4: Reverter Alteração**

```typescript
// Voltar para:
@Cron('0 9 * * *', {...})
```

**Resultado Esperado:**
- ✅ Mensagem enviada para participante
- ✅ Contém link de pagamento
- ✅ Campo `ultimoLembreteEnviado` atualizado

**Verificação:**
```javascript
db.pagamentos.findOne({ _id: ObjectId("...") })
// Conferir campo: ultimoLembreteEnviado
```

---

### TC-102: Alerta de Atraso Inicial (1-5 dias)

**Objetivo:** Testar alerta enviado quando pagamento está 1-5 dias atrasado

**Simulação:**

```javascript
// MongoDB - Criar pagamento atrasado (3 dias)
const hoje = new Date();
const vencimentoAtrasado = new Date(hoje.getTime() - 3*24*60*60*1000); // -3 dias

db.pagamentos.insertOne({
  caixaId: ObjectId("SEU_CAIXA_ID"),
  participanteId: ObjectId("SEU_PARTICIPANTE_ID"),
  pagadorId: ObjectId("SEU_USUARIO_ID"),
  recebedorId: ObjectId("CONTEMPLADO_ID"),
  mesReferencia: 2,
  valorParcela: 250.00,
  status: "ATRASADO",
  dataVencimento: vencimentoAtrasado,
  diasAtraso: 3,
  tipoTaxa: "NENHUMA",
  ultimoLembreteEnviado: null, // Importante!
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**Resultado Esperado:**
- ✅ Mensagem de alerta para participante
- ✅ Mensagem de notificação para administrador
- ✅ Ambas com tom de urgência

**Mensagens Esperadas:**
- **Participante:**  
  ```
  ⏰ Atenção! Seu pagamento do caixa [...] está com 3 dias de atraso.
  ```
- **Admin:**  
  ```
  👨‍💼 ALERTA: O participante [...] está em atraso de 3 dias.
  ```

---

### TC-103: Alerta de Atraso Grave (>5 dias)

**Objetivo:** Testar alerta severo + notificação para todo o grupo

**Simulação:**

```javascript
// MongoDB - Criar pagamento muito atrasado (8 dias)
const hoje = new Date();
const vencimentoMuitoAtrasado = new Date(hoje.getTime() - 8*24*60*60*1000);

db.pagamentos.insertOne({
  caixaId: ObjectId("SEU_CAIXA_ID"),
  participanteId: ObjectId("PARTICIPANTE_DEVEDOR_ID"),
  pagadorId: ObjectId("SEU_USUARIO_ID"),
  recebedorId: ObjectId("CONTEMPLADO_ID"),
  mesReferencia: 2,
  valorParcela: 250.00,
  status: "ATRASADO",
  dataVencimento: vencimentoMuitoAtrasado,
  diasAtraso: 8,
  tipoTaxa: "NENHUMA",
  ultimoLembreteEnviado: null,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**Resultado Esperado:**
- ✅ Alerta grave para participante devedor
- ✅ Mensagem para TODOS os outros participantes (pressão social)
- ✅ Limitação: 1 notificação ao grupo a cada 3 dias

**Verificação:**
```javascript
// Deve criar múltiplas mensagens
db.mensagem_historicos.find({
  tipo: "Alerta de atraso",
  createdAt: { $gte: new Date(Date.now() - 5*60*1000) }
}).count()

// Esperado: 1 (devedor) + N (outros participantes)
```

---

### TC-104: Prevenção de Duplicatas

**Objetivo:** Garantir que não envia lembrete duplicado no mesmo dia

**Passos:**
1. Executar TC-101 (lembrete 5 dias)
2. Verificar `ultimoLembreteEnviado` foi preenchido
3. Executar cron novamente (força manualmente)
4. Verificar logs: deve pular com mensagem "já enviado hoje"

**Resultado Esperado:**
```
Lembrete já enviado hoje para pagamento [ID]
```

**Verificação:**
```javascript
db.mensagem_historicos.find({
  participanteId: ObjectId("..."),
  tipo: "Lembrete de pagamento",
  createdAt: { $gte: new Date().setHours(0,0,0,0) } // hoje
}).count()

// Esperado: 1 (não duplicado)
```

---

## 🎉 Fase 5: Confirmação de Pagamento

### TC-201: Notificação de Pagamento Confirmado

**Objetivo:** Todos os participantes recebem notificação quando alguém paga

**Simulação via Webhook:**

**Método 1: Webhook Simulator (Postman/Insomnia)**

```bash
curl -X POST http://localhost:3000/api/webhook/lytex-pagamento \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment.paid",
    "data": {
      "referencia": "bolt_ABC123DEF456",
      "status": "paid",
      "valor": 25000,
      "dataPagamento": "2026-01-05T10:30:00.000Z",
      "metodoPagamento": "pix"
    }
  }'
```

**Pré-condição:** A cobrança `bolt_ABC123DEF456` deve existir no banco:

```javascript
db.cobrancas.findOne({ lytexId: "bolt_ABC123DEF456" })
// Deve retornar a cobrança associada a um caixa e participante
```

**Método 2: Marcar Pagamento Manualmente**

```javascript
// MongoDB - Atualizar cobrança para PAGO
db.cobrancas.updateOne(
  { lytexId: "bolt_ABC123DEF456" },
  { 
    $set: { 
      status: "PAGO",
      dataPagamento: new Date(),
      transacaoId: "tx_simulated_123"
    } 
  }
)

// Depois chamar o webhook (acima)
```

**Resultado Esperado:**
- ✅ Todos os participantes do caixa recebem mensagem celebratória
- ✅ Mensagem contém nome de quem pagou
- ✅ Mensagem contém parcela e valor

**Mensagem Esperada:**
```
🎉 Ótima notícia!

O participante [Nome] acabou de pagar a parcela 2/10
do caixa [Nome do Caixa]! ✅

Continue acompanhando e não esqueça de pagar sua parcela em dia! 😊
```

**Verificação:**
```javascript
db.mensagem_historicos.find({
  tipo: "Confirmação de pagamento",
  createdAt: { $gte: new Date(Date.now() - 5*60*1000) }
}).count()

// Esperado: N-1 (total participantes - quem pagou)
```

---

## 📬 Fase 6: Fluxo de Boas-Vindas Aprimorado

### TC-301: Ordem de Contemplação (Delay 1min)

**Objetivo:** Verificar envio da ordem 1 minuto após boas-vindas

**Passos:**
1. Iniciar um caixa novo (TC-001)
2. Aguardar exatamente 1 minuto
3. Verificar recebimento da ordem

**Resultado Esperado:**
- ✅ Mensagem chega ~60 segundos após boas-vindas
- ✅ Contém lista completa de participantes ordenados
- ✅ Destaca posição do destinatário com emoji 👉

**Mensagem Esperada:**
```
📋 Ordem de Contemplação - [Nome do Caixa]

Sua posição: *3º*

Ordem completa:
1º - João Silva
2º - Maria Santos
👉 3º - Pedro Costa
4º - Ana Lima
5º - Carlos Souza

_Mensagem automática - Juntix_
```

**Verificação Técnica:**

```javascript
// Job na fila Redis com delay
// Verificar via Bull Board (se tiver) ou logs

// MongoDB
db.mensagem_historicos.find({
  tipo: "Boas-vindas",
  participanteId: ObjectId("..."),
  "metadata.posicao": { $exists: true }
}).pretty()
```

**Timing esperado:**
- T+0s: Boas-vindas
- T+60s: Ordem contemplação

---

### TC-302: Envio de Contrato PDF (Delay 2min)

**Objetivo:** Verificar envio do contrato 2 minutos após boas-vindas

**Pré-condição:**
✅ `DOCUMENT_CONTRACT_URL` configurada no `.env`

**Passos:**
1. Iniciar caixa
2. Aguardar 2 minutos
3. Verificar recebimento do PDF no WhatsApp

**Resultado Esperado:**
- ✅ PDF de contrato recebido
- ✅ Nome do arquivo: `contrato_juntix.pdf`
- ✅ Caption: "Contrato Juntix"
- ✅ Arquivo abrível e legível

**Verificação:**

```javascript
db.mensagem_historicos.find({
  tipo: "MANUAL",
  "metadata.fileName": "contrato_juntix.pdf",
  createdAt: { $gte: new Date(Date.now() - 10*60*1000) }
}).pretty()
```

**Troubleshooting:**
- Se não receber: verificar se URL do Google Drive está pública
- Testar URL diretamente no navegador
- Verificar logs do Evolution API

---

### TC-303: Envio de Termos PDF (Delay 3min)

**Objetivo:** Verificar envio dos termos 3 minutos após boas-vindas

**Passos:**
1. Continuar do TC-302
2. Aguardar +1 minuto (total 3min)
3. Verificar recebimento

**Resultado Esperado:**
- ✅ PDF de termos recebido
- ✅ Nome: `termos_uso_juntix.pdf`
- ✅ Caption: "Termos de Uso - Juntix"

**Timeline Completa do Fluxo:**
```
T+0s   → Boas-vindas
T+60s  → Ordem de Contemplação  
T+120s → Contrato PDF
T+180s → Termos PDF
```

---

## 🛠️ Ferramentas de Simulação

### Ferramenta 1: Script de Manipulação de Datas

Crie um arquivo `backend/scripts/simulate-payment-dates.js`:

```javascript
const { MongoClient, ObjectId } = require('mongodb');

async function createTestPayment(daysOffset, status = 'PENDENTE') {
  const client = await MongoClient.connect('mongodb://localhost:27017');
  const db = client.db('caixajunto');
  
  const hoje = new Date();
  const dataVencimento = new Date(hoje.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  
  const result = await db.collection('pagamentos').insertOne({
    caixaId: ObjectId("679b31dac17e3cebd51f5df0"), // ALTERAR
    participanteId: ObjectId("679ad3e8b0947860c6f8fb5e"), // ALTERAR
    pagadorId: ObjectId("679ad3e8b0947860c6f8fb5d"), // ALTERAR
    recebedorId: ObjectId("679ad3e8b0947860c6f8fb5d"), // ALTERAR
    mesReferencia: 2,
    valorParcela: 250.00,
    status: status,
    dataVencimento: dataVencimento,
    diasAtraso: daysOffset < 0 ? Math.abs(daysOffset) : 0,
    tipoTaxa: "NENHUMA",
    ultimoLembreteEnviado: null,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  console.log(`✅ Pagamento criado com vencimento em ${dataVencimento.toLocaleDateString()}`);
  console.log(`ID: ${result.insertedId}`);
  
  await client.close();
}

// Exemplos de uso:
// node scripts/simulate-payment-dates.js 5    // Vence em 5 dias
// node scripts/simulate-payment-dates.js -3   // Atrasado 3 dias
// node scripts/simulate-payment-dates.js -8   // Atrasado 8 dias

const daysOffset = parseInt(process.argv[2] || 5);
createTestPayment(daysOffset).catch(console.error);
```

**Uso:**
```bash
# Criar pagamento que vence em 5 dias
node scripts/simulate-payment-dates.js 5

# Criar pagamento atrasado 3 dias
node scripts/simulate-payment-dates.js -3

# Criar pagamento atrasado 8 dias  
node scripts/simulate-payment-dates.js -8
```

---

### Ferramenta 2: Forçar Execução do Cron Manualmente

Crie endpoint temporário para testes:

```typescript
// backend/src/modules/comunicacao/comunicacao.controller.ts
import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ComunicacaoCron } from './cron/comunicacao.cron';

@Controller('api/comunicacao')
@UseGuards(JwtAuthGuard)
export class ComunicacaoController {
  constructor(private readonly comunicacaoCron: ComunicacaoCron) {}

  @Post('trigger-cron')
  async triggerCron() {
    console.log('🧪 Forçando execução do cron...');
    await this.comunicacaoCron.verificarPagamentosEEnviarLembretes();
    return { message: 'Cron executado manualmente' };
  }
}
```

**Uso:**
```bash
curl -X POST http://localhost:3000/api/comunicacao/trigger-cron \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

---

### Ferramenta 3: Monitor de Filas (Bull Board)

Instale Bull Board para visualizar filas:

```bash
npm install @bull-board/api @bull-board/express
```

Adicione ao `main.ts`:

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bull';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const queues = app.get<Queue>('/queue/mensagens'); // Ajustar conforme necessário

createBullBoard({
  queues: [new BullAdapter(queues)],
  serverAdapter: serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
```

**Acesso:** `http://localhost:3000/admin/queues`

---

## 🔍 Troubleshooting

### Problema: Mensagens não estão sendo enviadas

**Diagnóstico:**

1. **Verificar Evolution API:**
   ```bash
   curl -X GET https://evo2.wastezero.com.br/instance/connectionState/WasteZeroSuporte \
     -H "apikey: dsprhfprvgainztbb0tv7f"
   ```
   Esperado: `{"state": "open"}`

2. **Verificar Redis:**
   ```bash
   redis-cli ping
   # Esperado: PONG
   ```

3. **Verificar logs do backend:**
   ```bash
   # Procurar por erros
   grep -i "erro" logs/backend.log
   ```

4. **Verificar tabela de mensagens:**
   ```javascript
   db.mensagem_historicos.find({ status: "FALHA" }).limit(10).pretty()
   ```

---

### Problema: Cron não está executando

**Diagnóstico:**

1. **Verificar se está registrado:**
   ```bash
   # Logs devem mostrar ao subir o backend:
   # "CronJobs registered: payment-reminders"
   ```

2. **Verificar timezone:**
   ```javascript
   console.log(new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
   ```

3. **Forçar execução manual** (Tool 2)

---

### Problema: PDFs não chegam

**Diagnóstico:**

1. **Testar URL diretamente:**
   ```bash
   curl -I https://drive.google.com/uc?id=1Qo1lD9HzKEuBE-VL7kVD43uggkuFRyyc
   # Deve retornar 200 OK
   ```

2. **Verificar configuração:**
   ```bash
   # No backend
   echo $DOCUMENT_CONTRACT_URL
   echo $DOCUMENT_TERMS_URL
   ```

3. **Verificar jobs na fila:**
   ```javascript
   db.mensagem_historicos.find({
     tipo: "MANUAL",
     "metadata.fileName": { $exists: true }
   }).pretty()
   ```

---

## ✅ Checklist de Testes

### Fase 4: Lembretes
- [ ] TC-101: Lembrete 5 dias antes
- [ ] TC-102: Alerta atraso 1-5 dias
- [ ] TC-103: Alerta atraso >5 dias  
- [ ] TC-104: Prevenção duplicatas

### Fase 5: Confirmações
- [ ] TC-201: Notificação pagamento confirmado

### Fase 6: Fluxo Aprimorado
- [ ] TC-301: Ordem contemplação (1min)
- [ ] TC-302: Contrato PDF (2min)
- [ ] TC-303: Termos PDF (3min)

---

## 📊 Métricas de Sucesso

### Indicadores de Qualidade

| Métrica | Meta | Como Verificar |
|---------|------|----------------|
| Taxa de Entrega | >95% | `SELECT COUNT(*) FROM mensagem_historicos WHERE status='ENVIADO'` |
| Tempo de Envio (Médio) | <3s | Comparar `createdAt` e `dataEnvio` |
| Taxa de Falha | <5% | `SELECT COUNT(*) WHERE status='FALHA'` |
| Duplicatas | 0 | Verificar `ultimoLembreteEnviado` |
| Precisão de Timing | ±10s | Verificar delays (1min, 2min, 3min) |

---

## 📝 Registro de Testes

**Template de Execução:**

```markdown
### Teste Executado: TC-XXX
**Data:** DD/MM/YYYY HH:MM
**Ambiente:** Local / Staging / Produção
**Resultado:** ✅ Passou / ❌ Falhou
**Observações:**
- [Descrever comportamento observado]
**Evidências:**
- Screenshot: [link]
- Logs: [trecho relevante]
**Bugs Encontrados:**
- [ID do bug se aplicável]
```

---

## 🎯 Conclusão

Este plano de testes cobre:
- ✅ **7 cenários de teste detalhados**
- ✅ **3 ferramentas de simulação**
- ✅ **Guia de troubleshooting**
- ✅ **Métricas de sucesso**
- ✅ **Checklist de execução**

**Próximos Passos:**
1. Configurar PDFs no `.env`
2. Executar TC-001 a TC-303 sequencialmente
3. Documentar resultados
4. Reportar bugs encontrados
5. Validar em staging antes de produção

**Contato para Dúvidas:**
- Backend Team
- QA Lead

---

**Última Atualização:** Janeiro 2026  
**Versão:** 1.0.0
