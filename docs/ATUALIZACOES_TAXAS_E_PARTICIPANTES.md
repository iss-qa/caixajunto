# Atualiz Taxas e Coluna de Participantes

## ✅ Implementações Realizadas

### 1. **Nova Coluna "Caixa" na Listagem de Participantes**

#### Frontend (`Participantes.tsx`)
- **Adicionada coluna "Caixa"** após "Score"
- Mostra o nome do caixa ao qual o participante está vinculado
- Se não estiver vinculado, mostra "Sem caixa" em cinza

**Lógica implementada**:
```typescript
// Busca usuários + vínculos de participantes
const participantesComCaixa = usuarios.map((usuario) => {
  const vinculo = listaParticipantes.find(p => 
    p.usuarioId === usuario._id || p.usuarioId?._id === usuario._id
  );
  
  return {
    ...usuario,
    caixaNome: vinculo?.caixaId?.nome || vinculo?.caixaNome || '',
    caixaId: vinculo?.caixaId?._id || vinculo?.caixaId || '',
  };
});
```

**Tabela**:
| Participante | Contato | Chave PIX | Score | **Caixa** | Ações |
|--------------|---------|-----------|-------|-----------|-------|
| Carlos | email/tel | pix | 70 | **Caixa Teste** | 👁️ ✏️ 🗑️ |
| João | email/tel | pix | 85 | **Sem caixa** | 👁️ ✏️ 🗑️ |

---

### 2. **Renomeação: fundoGarantidor → taxaAdministrativa**

#### Backend

**Schema (`caixa.schema.ts`)**:
```typescript
// ANTES:
@Prop({ default: 0 })
fundoGarantidor: number;

// DEPOIS:
@Prop({ default: 50 })
taxaAdministrativa: number; // R$ 50,00 por usuário (cobrado no primeiro ponto)

@Prop({ default: 5 })
taxaServico: number; // R$ 5,00 por transação (taxa do gateway)
```

**DTO (`create-caixa.dto.ts`)**:
```typescript
@IsOptional()
@IsNumber()
taxaAdministrativa?: number;

@IsOptional()
@IsNumber()
taxaServico?: number;
```

**Service (`caixas.service.ts`)**:
```typescript
// Taxas fixas
const taxaServico = 5; // R$ 5,00 por transação (gateway)
const taxaAdministrativa = 50; // R$ 50,00 por usuário

const caixa = new this.caixaModel({
  ...createCaixaDto,
  taxaServico: createCaixaDto.taxaServico || taxaServico,
  taxaAdministrativa: createCaixaDto.taxaAdministrativa || taxaAdministrativa,
  // Compatibilidade com campos antigos
  taxaApp: createCaixaDto.taxaApp || taxaServico,
  taxaAdmin: createCaixaDto.taxaAdmin || taxaAdministrativa,
});
```

#### Frontend

**NovoCaixa.tsx**:
```typescript
// ANTES:
const FUNDO_RESERVA = 50;

// DEPOIS:
const TAXA_ADMINISTRATIVA = 50; // R$ 50,00 - lucro da aplicação (cobrado no primeiro ponto)
```

**Composição de Parcelas**:
- **1ª Parcela**: R$ 250,00 + R$ 5,00 (serviço) + R$ 50,00 (taxa admin)
- **Parcelas 2 a N-1**: R$ 250,00 + R$ 5,00 + IPCA
- **Última Parcela**: R$ 250,00 + R$ 5,00 + R$ 50,00 (comissão admin) + IPCA

---

### 3. **Correção do Erro 500 ao Criar Caixa**

#### Problema Identificado
```bash
# CURL que falhava:
curl --location 'http://localhost:3000/api/caixas' \
--header 'Content-Type: application/json' \
--data '{
  "nome": "Caixa de viagem2 natal",
  "diaVencimento": 10  # ❌ Apenas o dia, sem data completa
}'
```

**Causas**:
1. Schema exigia `min: 4` participantes (muito restritivo)
2. Campo `diaVencimento` era Number, mas frontend enviava Date
3. Faltava campo `dataVencimento` (Date completo)

#### Correções

**Schema**:
```typescript
// ANTES:
@Prop({ required: true, min: 4, max: 24 })
qtdParticipantes: number;

// DEPOIS:
@Prop({ required: true, min: 2, max: 24 })  ✅ Permite caixas menores
qtdParticipantes: number;

// ADICIONADO:
@Prop()
dataVencimento?: Date;  ✅ Data completa de vencimento
```

**DTO**:
```typescript
@IsOptional()
@IsDateString()
dataVencimento?: string;  ✅ Aceita data completa

@IsOptional()
@IsNumber()
@Min(1)
@Max(28)
diaVencimento?: number;  ✅ Mantido para compatibilidade
```

**Service**:
```typescript
const caixa = new this.caixaModel({
  ...createCaixaDto,
  dataVencimento: createCaixaDto.dataVencimento 
    ? new Date(createCaixaDto.dataVencimento) 
    : undefined,
});
```

---

## 📋 Mudanças de Nomenclatura

| Antigo | Novo | Descrição |
|--------|------|-----------|
| `fundoGarantidor` | `taxaAdministrativa` | R$ 50,00 fixo - Lucro da aplicação |
| `taxaApp` | `taxaServico` | R$ 5,00 fixo - Taxa do gateway |
| `FUNDO_RESERVA` | `TAXA_ADMINISTRATIVA` | Constante frontend |
| `TAXA_SERVICO = 3` | `TAXA_SERVICO = 5` | Atualizado para R$ 5,00 |

---

## 🧪 Como Testar

### Teste 1: Criar Caixa com Novas Taxas
```bash
curl --location 'http://localhost:3000/api/caixas' \
--header 'Content-Type: application/json' \
--data '{
  "nome": "Caixa Teste Taxas",
  "descricao": "Testando novas taxas",
  "valorTotal": 1000,
  "qtdParticipantes": 4,
  "duracaoMeses": 4,
  "adminId": "SEU_ADMIN_ID",
  "diaVencimento": 15,
  "dataVencimento": "2025-01-15T00:00:00.000Z"
}'
```

**Resposta esperada**:
```json
{
  "_id": "...",
  "nome": "Caixa Teste Taxas",
  "taxaServico": 5,
  "taxaAdministrativa": 50,
  "valorParcela": 250,
  "dataVencimento": "2025-01-15T00:00:00.000Z",
  "diaVencimento": 15
}
```

### Teste 2: Verificar Coluna "Caixa" em Participantes
1. Acessar `/participantes`
2. Verificar coluna "Caixa" após "Score"
3. Participantes vinculados mostram nome do caixa
4. Participantes sem vínculo mostram "Sem caixa"

### Teste 3: Criar Caixa com 2 Participantes
```bash
curl --location 'http://localhost:3000/api/caixas' \
--header 'Content-Type: application/json' \
--data '{
  "nome": "Caixa Pequena",
  "valorTotal": 500,
  "qtdParticipantes": 2,  # ✅ Agora aceita 2
  "duracaoMeses": 2,
  "adminId": "SEU_ADMIN_ID"
}'
```

---

## 💰 Estrutura de Taxas Detalhada

### Por Transação (Todas as parcelas)
- **Taxa de Serviço**: R$ 5,00 (gateway Lytex)

### Primeira Parcela
- **Valor Base**: R$ X (valor do caixa / participantes)
- **Taxa de Serviço**: R$ 5,00
- **Taxa Administrativa**: R$ 50,00 (lucro CaixaJunto)
- **IPCA**: Aplicado conforme índice
- **Total**: Base + 5 + 50 + IPCA

### Parcelas Intermediárias (2 a N-1)
- **Valor Base**: R$ X
- **Taxa de Serviço**: R$ 5,00
- **IPCA**: Aplicado conforme índice
- **Total**: Base + 5 + IPCA

### Última Parcela
- **Valor Base**: R$ X
- **Taxa de Serviço**: R$ 5,00
- **Comissão Admin**: R$ 50,00 (10% para o organizador)
- **IPCA**: Aplicado conforme índice
- **Total**: Base + 5 + 50 + IPCA

---

## 🔄 Migração de Dados

### Caixas Existentes
Caixas criados antes desta atualização manterão:
- `fundoGarantidor` (valor antigo)
- `taxaApp` e `taxaAdmin` (valores antigos)

Novos caixas usarão:
- `taxaAdministrativa = 50`
- `taxaServico = 57.2`

### Retrocompatibilidade
O backend mantém ambos os campos:
```typescript
taxaServico: createCaixaDto.taxaServico || taxaServico,
taxaAdministrativa: createCaixaDto.taxaAdministrativa || taxaAdministrativa,
taxaApp: createCaixaDto.taxaApp || taxaServico, // Fallback
taxaAdmin: createCaixaDto.taxaAdmin || taxaAdministrativa, // Fallback
```

---

## 📊 Exemplo Prático

**Caixa de R$ 1.000,00 para 4 participantes**:

| Parcela | Base | Taxa Serviço | Taxa Admin | IPCA | Total Aprox. |
|---------|------|--------------|------------|------|--------------|
| 1 | R$ 250 | R$ 5 | R$ 50 | R$ 2 | R$ 307 |
| 2 | R$ 250 | R$ 5 | - | R$ 2 | R$ 257 |
| 3 | R$ 250 | R$ 5 | - | R$ 2 | R$ 257 |
| 4 | R$ 250 | R$ 5 | R$ 50 | R$ 2 | R$ 307 |

**Total arrecadado**: R$ 1.128
- **Valor do caixa**: R$ 1.000
- **Gateway (Lytex)**: R$ 20 (4 × R$ 5)
- **CaixaJunto**: R$ 50 (taxa administrativa)
- **Organizador**: R$ 50 (comissão)
- **IPCA**: R$ 8 (exemplo)

---

## ✅ Status

- ✅ Backend compilando
- ✅ Frontend compilando
- ✅ Coluna "Caixa" implementada
- ✅ Taxas renomeadas
- ✅ Erro 500 corrigido
- ✅ Validações ajustadas (min: 2 participantes)
- ✅ Campo `dataVencimento` adicionado

---

**Data**: Dezembro 2024  
**Versão**: 2.2.0

