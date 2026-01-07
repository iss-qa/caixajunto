# Changelog - CaixaJunto

## [Versão 2.0.0] - Dezembro 2024

### ✨ Novas Funcionalidades

#### 1. Página de Gerenciamento de Participantes
- **Nova rota `/participantes`** com interface completa para gerenciar usuários participantes
- Tabela responsiva com busca por nome, email ou telefone
- Upload de foto de perfil (base64) diretamente na interface
- Operações CRUD completas: Criar, Visualizar, Editar e Excluir participantes
- Exibição de score e informações detalhadas de cada participante
- Modal de confirmação para exclusão segura

#### 2. Integração com Lytex Pagamentos
- **Sincronização automática** de participantes com a API Lytex
- Criação de clientes no Lytex ao adicionar participante no sistema
- Atualização sincronizada de dados do cliente
- Remoção automática de clientes no Lytex ao deletar participante
- Campo `lytexClientId` no schema de usuários para rastreamento
- Configuração flexível via variáveis de ambiente (sandbox/produção)
- Modo de teste local sem Lytex (`LYTEX_ENABLED=false`)

#### 3. Melhorias no Dashboard

##### Para Administradores:
- Botões reorganizados: "Criar Caixa" e "Adicionar Participante" no topo
- Ganhos previstos dinâmicos baseados em 10% do valor total de cada caixa
- Comparativo de crédito expandido (R$ 2.000, R$ 5.000, R$ 10.000)
- Cards visuais indicando caixas sem participantes (borda vermelha)
- Badge de alerta mostrando quantos participantes faltam

##### Para Participantes (tipo: usuario):
- Interface simplificada e objetiva
- Exibição do score pessoal
- Lista de caixas em que participa com posição e tipo
- Contador dinâmico de dias até contemplação
- Comparativo de crédito (mesmas opções dos administradores)
- Remoção de "Ganhos Acumulados" e "Ganhos Previstos" (não aplicável)

#### 4. Melhorias em Detalhes do Caixa

##### Upload de Foto ao Adicionar Participante:
- Campo de upload de imagem no modal "Cadastrar Participante"
- Preview da foto antes de salvar
- Envio em base64 junto com outros dados do participante
- Tipo automaticamente definido como `"usuario"`
- Senha padrão `"Senha@123"` para novos participantes

##### Sorteio de Posições:
- Sorteio direto sem modal de confirmação
- Botão desabilitado até que o caixa esteja completo
- Validação: só sorteia quando `participantes.length === qtdParticipantes`
- Chamada ao endpoint `POST /api/participantes/caixa/:id/sortear`

##### Modal de Exclusão de Participante:
- Modal de confirmação visual com ícone de alerta
- Substituição do `confirm()` nativo do navegador
- Informações claras sobre a ação irreversível

##### Outras Melhorias:
- Cálculo correto de parcelas (base + taxas + IPCA + comissões)
- Edição de caixa com todos os campos (tipo, valor, participantes, duração)
- Validação de data de vencimento (mínimo 5 dias após criação)
- Card de parcelas exibindo valor e quantidade
- Proteção contra exclusão de caixas ativos por não-master

#### 5. Melhorias em Criar Caixa

- Seleção de tipo: **Mensal** ou **Semanal**
  - Mensal: máximo 12 participantes/meses
  - Semanal: máximo 24 participantes/semanas
- Valor total personalizado (não apenas opções pré-definidas)
- Quantidade de participantes personalizada
- Duração personalizada (vinculada à quantidade de participantes)
- Data de vencimento completa (não apenas dia do mês)
- Validação: duração = quantidade de participantes
- Cálculo dinâmico de parcelas e ganho do administrador

#### 6. Navegação Atualizada

- **Header**: Adicionado "Participantes" entre "Caixas" e "Pagamentos"
- **BottomNav**: Também inclui "Participantes" na navegação móvel
- Rota configurada em `App.tsx`: `/participantes`

#### 7. Gestão de Pagamentos (Participantes)

- Botão "Enviar Comprovante" para cada boleto/parcela
- Status "enviado" após upload (aguardando validação do admin)
- Badge de cor diferente para cada status:
  - **Pago**: verde
  - **Pendente**: amarelo
  - **Atrasado**: vermelho
  - **Enviado**: azul (aguardando validação)

### 🔧 Correções de Bugs

1. **Tela em branco ao clicar em caixa sem participantes**
   - Proteção de renderização no `CaixaDetalhes.tsx`
   - Validação de arrays vazios antes de `.map()`

2. **Hooks condicionais no Dashboard**
   - Refatoração para declarar todos hooks no nível superior
   - Lógica condicional movida para dentro de `useEffect` e JSX

3. **Botão "Adicionar Participante" redirecionava para "/caixas"**
   - Corrigido para redirecionar para "/participantes"

4. **Campos faltando ao editar caixa**
   - Adicionados: `tipo`, `valorTotal`, `qtdParticipantes`, `duracaoMeses`

5. **Validações de participantes e duração**
   - Limites corretos por tipo de caixa
   - Validação de mínimo/máximo
   - Sincronização entre duração e participantes

### 🏗️ Arquitetura e Backend

#### Novo Módulo: Lytex
- Localização: `backend/src/common/lytex/`
- **LytexService**: Serviço global para comunicação com API Lytex
- **LytexModule**: Módulo global disponível em todo o sistema
- Métodos implementados:
  - `createClient(data)`: Cria cliente no Lytex
  - `updateClient(id, data)`: Atualiza cliente
  - `deleteClient(id)`: Remove cliente
  - `listClients(page, limit)`: Lista clientes
  - `getClient(id)`: Busca cliente específico

#### Schema de Usuário Atualizado
- Campo `picture?: string` para foto de perfil
- Campo `lytexClientId?: string` para ID do cliente no Lytex
- Índices adicionados para performance

#### Serviço de Usuários
- Integração com `LytexService` injetado via DI
- Sincronização automática nas operações:
  - **CREATE**: Cria cliente no Lytex se `tipo === 'usuario'` e `cpf` informado
  - **UPDATE**: Atualiza cliente no Lytex se `lytexClientId` existir
  - **DELETE**: Remove cliente no Lytex antes de deletar localmente
- Logs detalhados de cada operação
- Não bloqueia operações locais em caso de falha no Lytex

### 📦 Dependências

Nenhuma nova dependência foi adicionada. O projeto utiliza apenas:
- **Axios**: Já existente, usado pelo `LytexService`
- **NestJS**: Framework do backend
- **React + Vite**: Frontend

### 🚀 Como Usar

#### Configurar Integração Lytex

1. Crie/edite o arquivo `.env` no backend:

```bash
LYTEX_ENABLED=true
LYTEX_BASE_URL=https://sandbox-api-pay.lytex.com.br/v2
LYTEX_TOKEN=seu_token_sandbox_aqui
```

2. Inicie o backend:

```bash
cd backend
npm run start:dev
```

3. Para produção, altere a URL e token:

```bash
LYTEX_BASE_URL=https://api-pay.lytex.com.br/v2
LYTEX_TOKEN=seu_token_producao_aqui
```

#### Testar sem Lytex

```bash
LYTEX_ENABLED=false npm run start:dev
```

#### Acessar Nova Página de Participantes

1. Faça login como administrador
2. Clique em "Participantes" no menu superior
3. Ou acesse diretamente: `http://localhost:5173/participantes`

### 📝 Notas Importantes

- **Participantes são sempre tipo "usuario"**: Ao criar via modal ou página de participantes
- **Senha padrão**: `Senha@123` para participantes criados pelo admin
- **Sincronização assíncrona**: Falhas no Lytex não bloqueiam operações locais
- **Logs detalhados**: Todas operações Lytex são logadas no console do backend
- **CPF obrigatório para Lytex**: Cliente só é criado no Lytex se CPF for informado

### 🔮 Próximas Implementações Sugeridas

1. **Split de Pagamentos**: Integrar com Lytex para dividir valores entre múltiplos recebedores
2. **Webhooks Lytex**: Receber notificações de pagamento em tempo real
3. **Dashboard Master**: Visualizar todos os clientes sincronizados com Lytex
4. **Relatórios de Sincronização**: Identificar divergências entre MongoDB e Lytex
5. **Retry Automático**: Retentar sincronizações que falharam
6. **Fila de Processamento**: Para sincronizações em massa

---

**Desenvolvido com ❤️ para CaixaJunto**

