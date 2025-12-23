# Hook: useCaixaConfiguracao

## Descrição
Hook customizado que gerencia a verificação de configuração de caixas, incluindo status de subcontas de participantes e administradores, e validação de regras de split.

## Localização
`/src/hooks/useCaixaConfiguracao.ts`

## Funcionalidades

### 1. Verificação de Subcontas
- Busca todas as subcontas do sistema via API
- Verifica se o administrador possui subconta criada
- Verifica quais participantes possuem subcontas criadas
- Retorna status individual de cada participante

### 2. Validação de Regras de Split
- Verifica se as regras de split estão configuradas
- Valida campos obrigatórios: `taxaServicoSubId`, `fundoReservaSubId`, `adminSubId`
- Verifica se participantes estão ordenados corretamente

### 3. Validação antes de Iniciar Caixa
- Função `validarIniciarCaixa()` que retorna status de validação
- Mensagens de erro específicas para cada caso

## Parâmetros

```typescript
interface Parametros {
  caixaId: string;              // ID do caixa
  participantes: Participante[]; // Lista de participantes
  adminId: string;              // ID do administrador
}
```

## Retorno

```typescript
interface Retorno {
  splitConfigStatus: {
    adminTemSubconta: boolean;
    regrasSplit: boolean;
    participantesVinculados: boolean;
  };
  participantesSubcontasStatus: Array<{
    _id: string;
    nome: string;
    temSubconta: boolean;  // ✅ Exibe checkmark verde quando true
  }>;
  loading: boolean;
  error: string | null;
  verificarConfiguracaoSplitDetalhada: () => Promise<void>;
  validarIniciarCaixa: () => { valido: boolean; mensagem?: string };
}
```

## Uso

```typescript
import { useCaixaConfiguracao } from '../hooks/useCaixaConfiguracao';

function CaixaDetalhes() {
  const {
    splitConfigStatus,
    participantesSubcontasStatus,
    loading,
    error,
    verificarConfiguracaoSplitDetalhada,
    validarIniciarCaixa,
  } = useCaixaConfiguracao(
    caixaId,
    participantes,
    adminId
  );

  // Usar os dados no componente ou passar para child components
}
```

## Integração com ConfiguracoesObrigatoriasCaixa

O componente `ConfiguracoesObrigatoriasCaixa` recebe os dados do hook e exibe:

- ✅ **Checkmark verde** para participantes com subconta criada
- ❌ **X vermelho** para participantes sem subconta
- Contador de progresso (ex: "3/4 completos")
- Barra de progresso visual

## Logs de Debug

O hook fornece logs detalhados no console:
- 🔄 Iniciando verificação
- 📊 Subcontas encontradas
- 👤 Admin tem subconta
- 👥 Status dos participantes
- ⚙️ Regras de split configuradas
- ✅ Verificação completa
- ❌ Erros específicos

## Benefícios

1. **Manutenibilidade**: Lógica centralizada em um único local
2. **Reusabilidade**: Pode ser usado em outros componentes
3. **Testabilidade**: Mais fácil de testar isoladamente
4. **Transparência**: Logs detalhados para debugging
5. **Performance**: Verificação automática via useEffect
6. **Código limpo**: Redução de ~71 linhas no componente principal

## API Endpoints Utilizados

- `GET /api/subcontas` - Busca todas as subcontas
- `GET /api/caixas/:caixaId/split-config` - Busca configuração de split

## Observações

- A verificação é executada automaticamente quando `caixaId`, `participantes` ou `adminId` mudam
- O hook gerencia seu próprio estado de loading e error
- Logs detalhados facilitam o debugging em produção
