# Teste Unitário: Modal de Onboarding após Criação de Subconta

## Arquivo Criado

[`SubAccountCreation.test.tsx`](file:///Users/isaiassilva/development/projects/caixaJunto/frontend/src/pages/__tests__/SubAccountCreation.test.tsx)

## Objetivo

Garantir que após o preenchimento correto do formulário de criação de subconta, o modal de verificação de identidade (upload de documento e reconhecimento facial) seja exibido corretamente.

## Como Executar

### Pré-requisitos

Certifique-se de que o projeto tem as dependências de teste instaladas:

```bash
cd /Users/isaiassilva/development/projects/caixaJunto/frontend
npm install --save-dev vitest @testing-library/react @testing-library/user-event @vitest/ui
```

### Executar Todos os Testes

```bash
npm run test
```

### Executar Apenas Este Teste

```bash
npm run test SubAccountCreation.test.tsx
```

### Executar em Modo Watch (desenvolvimento)

```bash
npm run test:watch
```

### Executar com Interface UI

```bash
npm run test:ui
```

## Casos de Teste Implementados

### 1. ✅ Validação de Campos Obrigatórios

**Teste**: `deve exibir asterisco (*) em todos os campos obrigatórios`

**Valida**:
- Todos os campos obrigatórios têm asterisco vermelho (*)
- Campos validados: Sobre o negócio, Ramo de atividade, Data de nascimento, Nome da mãe

**Resultado Esperado**: Asteriscos são renderizados corretamente

---

### 2. ✅ Botão Desabilitado com Formulário Incompleto

**Teste**: `deve desabilitar botão "Criar Subconta" quando formulário está incompleto`

**Valida**:
- Botão "Criar Subconta" está desabilitado inicialmente
- Usuário não pode submeter formulário vazio

**Resultado Esperado**: `submitButton.disabled === true`

---

### 3. ✅ Mensagens de Erro em Tempo Real

**Teste**: `deve exibir mensagem de erro ao sair de campo obrigatório vazio`

**Valida**:
- Ao sair de um campo obrigatório vazio (onBlur), mensagem de erro aparece
- Mensagem específica: "Por favor, informe sobre o seu negócio"

**Resultado Esperado**: Mensagem de erro é exibida abaixo do campo

---

### 4. ✅ Botão Habilitado com Formulário Completo

**Teste**: `deve habilitar botão quando todos os campos obrigatórios são preenchidos`

**Valida**:
- Após preencher todos os campos obrigatórios, botão é habilitado
- Campos preenchidos: negócio, ramo, admin (CPF, nome, telefone, data, mãe), endereço completo

**Resultado Esperado**: `submitButton.disabled === false`

---

### 5. ✅ **TESTE PRINCIPAL**: Modal de Onboarding Aparece

**Teste**: `deve chamar setOnboardingUrl e setShowOnboardingModal quando API retorna onboardingUrl`

**Valida**:
- Quando API retorna `onboardingUrl`, as funções corretas são chamadas
- `setOnboardingUrl` é chamada com a URL do Lytex
- `setShowOnboardingModal` é chamada com `true`
- `onSuccess` é chamada
- `updateUsuario` é chamada com `lytexSubAccountId`

**Mock da API**:
```typescript
{
  success: true,
  subconta: {
    _id: 'subconta-123',
    lytexId: 'lytex-456',
  },
  onboardingUrl: 'https://cadastro.io/60afac2db9665dd6a1ab5dbf90e19119'
}
```

**Resultado Esperado**:
```typescript
expect(mockSetOnboardingUrl).toHaveBeenCalledWith('https://cadastro.io/...');
expect(mockSetShowOnboardingModal).toHaveBeenCalledWith(true);
expect(mockOnSuccess).toHaveBeenCalled();
expect(mockUpdateUsuario).toHaveBeenCalledWith({ lytexSubAccountId: 'lytex-456' });
```

---

### 6. ✅ Aviso Quando URL Não É Retornada

**Teste**: `deve exibir log de aviso quando API não retorna onboardingUrl`

**Valida**:
- Quando API não retorna `onboardingUrl`, log de aviso é exibido
- Modal de onboarding NÃO é exibido
- Processo continua normalmente (onSuccess é chamado)

**Mock da API**:
```typescript
{
  success: true,
  subconta: {
    _id: 'subconta-123',
    lytexId: 'lytex-456',
  }
  // onboardingUrl ausente
}
```

**Resultado Esperado**:
```typescript
expect(console.warn).toHaveBeenCalledWith('⚠️ URL de onboarding não recebida do backend');
expect(mockSetOnboardingUrl).not.toHaveBeenCalled();
expect(mockSetShowOnboardingModal).not.toHaveBeenCalled();
expect(mockOnSuccess).toHaveBeenCalled(); // Processo continua
```

---

### 7. ✅ Tratamento de Erro da API

**Teste**: `deve exibir mensagem de erro quando API retorna erro`

**Valida**:
- Quando API retorna erro, mensagem é exibida ao usuário
- Modal de onboarding NÃO é exibido
- Processo é interrompido (onSuccess NÃO é chamado)

**Mock da API**:
```typescript
{
  success: false,
  message: 'Erro ao criar subconta no Lytex',
  error: 'LYTEX_NO_ID'
}
```

**Resultado Esperado**:
```typescript
expect(screen.getByText(/Erro ao criar subconta no Lytex/i)).toBeInTheDocument();
expect(mockSetOnboardingUrl).not.toHaveBeenCalled();
expect(mockSetShowOnboardingModal).not.toHaveBeenCalled();
expect(mockOnSuccess).not.toHaveBeenCalled();
```

## Cobertura de Teste

### ✅ Validação de Formulário
- Campos obrigatórios marcados com *
- Botão desabilitado quando formulário incompleto
- Mensagens de erro em tempo real
- Botão habilitado quando formulário completo

### ✅ Integração com API
- Sucesso com onboardingUrl → Modal aparece
- Sucesso sem onboardingUrl → Aviso, sem modal
- Erro da API → Mensagem de erro, sem modal

### ✅ Comportamento do Modal
- `setOnboardingUrl` chamado com URL correta
- `setShowOnboardingModal` chamado com `true`
- Callbacks de sucesso executados corretamente

## Interpretação dos Resultados

### ✅ Todos os Testes Passam

Significa que:
1. Validação de formulário está funcionando
2. Modal de onboarding será exibido quando API retornar `onboardingUrl`
3. Tratamento de erros está correto
4. Usuário não consegue submeter formulário incompleto

### ❌ Teste 5 Falha

Se o teste principal falhar, pode indicar:
- `setOnboardingUrl` ou `setShowOnboardingModal` não estão sendo chamados
- Lógica de verificação de `resp.onboardingUrl` está incorreta
- Props não estão sendo passadas corretamente

### ❌ Teste 2 ou 4 Falha

Se testes de validação falharem:
- Lógica de `isFormValid` está incorreta
- Campos obrigatórios não estão sendo verificados
- Botão não está respeitando estado de validação

## Próximos Passos

1. ✅ Teste criado
2. 🔄 Executar teste: `npm run test`
3. 🔄 Verificar que todos os 7 testes passam
4. 🔄 Se algum teste falhar, corrigir implementação
5. ✅ Commit do teste no repositório

## Comandos Úteis

```bash
# Executar testes
npm run test

# Executar com cobertura
npm run test:coverage

# Executar em modo watch
npm run test:watch

# Executar com UI interativa
npm run test:ui

# Executar apenas testes que falharam
npm run test:failed
```
