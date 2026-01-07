# Integração de Cobrança PIX/Boleto - Lytex

## ✅ Implementações Realizadas

### 1. **Correção do PUT (Atualizar Cliente)** ✅
- ❌ O Lytex NÃO permite atualizar `cpfCnpj`
- ✅ Removido `cpfCnpj` do payload de atualização

**Antes**:
```typescript
if (updateUsuarioDto.cpf) lytexData.cpfCnpj = updateUsuarioDto.cpf;
```

**Depois**:
```typescript
// NÃO enviar cpfCnpj no PUT - Lytex não permite atualização de CPF
```

---

### 2. **Endpoint de Cobrança** ✅

**Rota**: `POST /api/cobrancas/gerar`

**Backend** (`CobrancasModule`):
- ✅ Controller para gerar cobranças
- ✅ Integração com LytexService
- ✅ Cálculo automático de taxas

---

### 3. **Frontend - Modal de Pagamento** ✅

No `CaixaDetalhes.tsx`:
- ✅ Botão "Gerar PIX / Boleto" em cada parcela pendente
- ✅ Modal com QR Code PIX e código Copia e Cola
- ✅ Modal com linha digitável do boleto
- ✅ Botão para copiar código PIX
- ✅ Link para página de pagamento

---

## 📋 CURLs de Referência

### 1. Obter Token

```bash
curl --location 'https://sandbox-api-pay.lytex.com.br/v2/auth/obtain_token' \
--header 'Content-Type: application/json' \
--data '{
  "grantType": "clientCredentials",
  "clientId": "6938822ba3bcd5f5161a732b",
  "clientSecret": "mzB9m5sWmtUd1NRazppjjE0ij2HMrkyaZkXWyC092xDJdDPYKPHXnf6OY48HLffCzLrZg1WZEJqpokgtye4WvCAWxCvmp4mwZ5qwVkDyGFAZrCqLuwIRwT7e4SHDVcfqVdR86VC2UA3JAbXqwBUCXuI74tlmiL6z4gIEfsaKyFXqBxxCDUPGelFrtS3huQJrrdzXDaAs3b61jkHZAzll6otffc1wihE4AToNFdQnvrbVtywRzC8dph2R4l2yV5S4"
}'
```

---

### 2. Criar Fatura (Invoice) - Cobrança PIX/Boleto

```bash
curl --location 'https://sandbox-api-pay.lytex.com.br/v2/invoices' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer SEU_TOKEN_AQUI' \
--data-raw '{
  "client": {
    "treatmentPronoun": "you",
    "name": "Valerio de Aguiar Zorzato",
    "type": "pf",
    "cpfCnpj": "96050176876",
    "email": "valerio@gmail.com",
    "cellphone": "78798798798",
    "address": {
      "zip": "35170128",
      "city": "Coronel Fabriciano",
      "street": "Rua Doutor Moacir Byrro",
      "state": "MG",
      "zone": "Centro"
    }
  },
  "items": [
    {
      "name": "Referente ao caixa Caixa Amarelo - semana 1 de 4",
      "quantity": 1,
      "value": 30300
    }
  ],
  "dueDate": "2025-12-30T23:59:59.999Z",
  "paymentMethods": {
    "pix": {
      "enable": true
    },
    "boleto": {
      "enable": true
    },
    "creditCard": {
      "enable": false
    }
  }
}'
```

**IMPORTANTE**:
- `value` deve ser em **centavos** (30300 = R$ 303,00)
- `dueDate` deve ser **maior que a data atual**
- Use CPFs fictícios do Lytex Sandbox

---

### 3. Usuários Fictícios do Sandbox

Para testes no sandbox, use APENAS estes CPFs:

| Nome | CPF |
|------|-----|
| Valerio de Aguiar Zorzato | 96050176876 |
| Joao da Costa Antunes | 88398158808 |
| Valerio Alves Barros | 71943984190 |
| Joao da Costa Antunes | 97965940132 |

---

### 4. CURL via API CaixaJunto

```bash
curl --location 'http://localhost:3000/api/cobrancas/gerar' \
--header 'Content-Type: application/json' \
--data '{
  "participante": {
    "nome": "Valerio de Aguiar Zorzato",
    "cpf": "96050176876",
    "email": "valerio@gmail.com",
    "telefone": "71999999999"
  },
  "caixa": {
    "nome": "Caixa Amarelo",
    "tipo": "semanal",
    "valorParcela": 250,
    "taxaServico": 5,
    "taxaAdministrativa": 50,
    "mesOuSemana": 1,
    "totalParcelas": 4
  },
  "dataVencimento": "2025-12-30T23:59:59.999Z",
  "habilitarPix": true,
  "habilitarBoleto": true
}'
```

**Resposta esperada**:
```json
{
  "success": true,
  "cobranca": {
    "id": "6938xxxxx",
    "status": "pending",
    "valor": 305,
    "valorCentavos": 30500,
    "vencimento": "2025-12-30T23:59:59.999Z",
    "descricao": "Referente ao caixa Caixa Amarelo - semana 1 de 4",
    "paymentUrl": "https://sandbox-pay.lytex.com.br/...",
    "pix": {
      "qrCode": "data:image/png;base64,...",
      "copiaCola": "00020126580014br.gov.bcb.pix..."
    },
    "boleto": {
      "codigoBarras": "23793.38128...",
      "linhaDigitavel": "23793381286000...",
      "url": "https://sandbox-pay.lytex.com.br/boleto/..."
    }
  }
}
```

---

## 🧪 Como Testar

### No Frontend:

1. **Criar um caixa** com participantes
2. **Iniciar o caixa** (status = ativo)
3. **Clicar em um participante** para ver os detalhes
4. **Clicar em "Gerar PIX / Boleto"** em uma parcela pendente
5. **Ver o QR Code** e código PIX
6. **Copiar** o código PIX ou **abrir o boleto**

### No Backend (Logs):

```
[CobrancasController] Gerando cobrança para Valerio de Aguiar Zorzato - Caixa: Caixa Amarelo
[CobrancasController] 📦 Dados da cobrança: {
  "cliente": "Valerio de Aguiar Zorzato",
  "valor": "R$ 305.00",
  "valorCentavos": 30500,
  "item": "Referente ao caixa Caixa Amarelo - semana 1 de 4"
}
[LytexService] 🔄 [Tentativa 1/2] Criando fatura no Lytex...
[LytexService] ✅ Fatura criada no Lytex: 6938xxxxx
[CobrancasController] ✅ Cobrança gerada com sucesso: 6938xxxxx
```

---

## 📊 Estrutura do Valor

Para um caixa de R$ 1.000 com 4 participantes:

**Parcela Base**: R$ 250,00

### Semana/Mês 1 (Primeira):
| Item | Valor |
|------|-------|
| Parcela | R$ 250,00 |
| Taxa serviço | R$ 7,20 |
| Taxa administrativa | R$ 50,00 |
| **Total** | **R$ 305,00** |

### Semanas/Meses 2 e 3:
| Item | Valor |
|------|-------|
| Parcela | R$ 250,00 |
| Taxa serviço | R$ 5,00 |
| IPCA (~0.4%) | ~R$ 1,00 |
| **Total** | **~R$ 256,00** |

### Semana/Mês 4 (Última):
| Item | Valor |
|------|-------|
| Parcela | R$ 250,00 |
| Taxa serviço | R$ 5,00 |
| Taxa admin (comissão) | R$ 50,00 |
| IPCA (~0.4%) | ~R$ 1,00 |
| **Total** | **~R$ 306,00** |

---

## 🔄 Fluxo de Pagamento

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND: Detalhes do Participante                     │
│  Clica em "Gerar PIX / Boleto" na parcela 1            │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  BACKEND: POST /api/cobrancas/gerar                     │
│  - Calcula valor total                                  │
│  - Monta descrição do item                              │
│  - Chama LytexService.createInvoice()                  │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  LYTEX: POST /v2/invoices                              │
│  - Gera QR Code PIX                                     │
│  - Gera Boleto                                          │
│  - Retorna dados de pagamento                          │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  FRONTEND: Modal de Pagamento                          │
│  - Exibe QR Code PIX                                    │
│  - Exibe código Copia e Cola                            │
│  - Exibe linha digitável do boleto                     │
│  - Botão para copiar / abrir página de pagamento       │
└─────────────────────────────────────────────────────────┘
```

---

## ⚠️ Importante

### Para Produção:
1. Usar CPFs reais (não os fictícios do sandbox)
2. Trocar `sandbox-api-pay.lytex.com.br` por `api-pay.lytex.com.br`
3. Usar credenciais de produção

### Validações:
- ✅ CPF validado antes de enviar
- ✅ Data de vencimento > data atual
- ✅ Valor em centavos
- ✅ Retry automático em caso de erro 401

---

**Implementado em**: Dezembro 2024  
**Versão**: 2.6.0  
**Status**: ✅ Pronto para teste no Sandbox

