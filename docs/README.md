# CaixaJunto - Frontend

Painel Administrativo do CaixaJunto - Aplicação web responsiva para gerenciamento de caixinhas/consórcios informais.

## 🚀 Tecnologias

- **React 18** - Biblioteca JavaScript para interfaces
- **TypeScript** - Tipagem estática
- **Vite** - Build tool ultrarrápido
- **TailwindCSS 3** - Framework CSS utilitário
- **Framer Motion** - Animações fluidas
- **React Router DOM** - Roteamento SPA
- **Lucide React** - Ícones modernos
- **Axios** - Cliente HTTP

## 📋 Pré-requisitos

- Node.js >= 18.x
- npm ou yarn
- Backend rodando em `http://localhost:3000`

## 🔧 Instalação

```bash
# Entre na pasta do frontend
cd caixaJunto/frontend

# Instale as dependências
npm install

# Configure as variáveis de ambiente
# O arquivo .env.local já deve existir com:
VITE_API_URL=http://localhost:3000/api
```

## ▶️ Executando

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

## 📁 Estrutura do Projeto

```
src/
├── components/
│   ├── layout/          # Layout, Header, BottomNav
│   └── ui/              # Componentes reutilizáveis
├── contexts/
│   └── AuthContext.tsx  # Contexto de autenticação
├── lib/
│   ├── api.ts          # Serviços de API
│   └── utils.ts        # Funções utilitárias
├── pages/
│   ├── Dashboard.tsx    # Dashboard principal
│   ├── Caixas.tsx       # Listagem de caixas
│   ├── CaixaDetalhes.tsx # Detalhes e gestão
│   ├── NovoCaixa.tsx    # Criação de caixa
│   ├── Login.tsx        # Autenticação
│   ├── Registro.tsx     # Cadastro
│   ├── Perfil.tsx       # Perfil do usuário
│   └── Notificacoes.tsx # Central de notificações
├── App.tsx              # Rotas principais
├── main.tsx             # Entry point
└── index.css            # Estilos globais
```

## 🎨 Design System

### Cores Principais

- **Primary (Verde)**: `#22c55e` - Ações principais, sucesso
- **Danger (Vermelho)**: `#ef4444` - Alertas, erros
- **Warning (Âmbar)**: `#f59e0b` - Avisos, pendentes
- **Info (Azul)**: `#3b82f6` - Informações

### Componentes

| Componente | Descrição |
|------------|-----------|
| `Button` | Botões com variantes e loading state |
| `Card` | Cards com hover animation |
| `Input` | Inputs com ícones e validação |
| `Badge` | Badges coloridos para status |
| `Avatar` | Avatares com iniciais |
| `Modal` | Modais com animação |
| `ProgressBar` | Barras de progresso animadas |

## 📱 Responsividade

A aplicação é totalmente responsiva:

- **Mobile** (< 768px): Bottom navigation, layout simplificado
- **Tablet** (768px - 1024px): Layout adaptado, grid 2 colunas
- **Desktop** (> 1024px): Layout completo, sidebar opcional

## 🔐 Autenticação

O sistema usa JWT para autenticação:

1. Token armazenado no `localStorage`
2. Renovação automática antes de expirar
3. Redirecionamento para login quando expirado

## 📄 Páginas

### Dashboard
- Score de confiança do administrador
- Estatísticas de ganhos (acumulados e previstos)
- Comparativo de crédito (CaixaJunto vs outros)
- Lista de caixas ativos com status de pagamentos

### Caixas
- Listagem com filtros por status
- Busca por nome
- Cards com informações resumidas
- Progress bar de conclusão

### Detalhes do Caixa
- Informações completas do caixa
- Gestão de participantes
- Status de pagamentos do mês
- Código de convite para compartilhar
- Sorteio de posições

### Criação de Caixa
- Wizard de 3 etapas
- Seleção de valor e participantes
- Preview de taxas e ganhos
- Resumo antes de confirmar

## 🔗 Integração com API

O arquivo `src/lib/api.ts` contém todos os serviços:

```typescript
// Autenticação
authService.login(email, senha)
authService.register(data)

// Caixas
caixasService.getAll(params)
caixasService.create(data)
caixasService.alterarStatus(id, status)

// Participantes
participantesService.getByCaixa(caixaId)
participantesService.sortear(caixaId)

// Dashboard
dashboardService.getAdmin(adminId)
```

## 🎬 Animações

Usando Framer Motion para:

- Transições de página (fade + slide)
- Hover em cards (lift effect)
- Botões (tap feedback)
- Modais (scale + fade)
- Listas (stagger children)

## 🛠️ Scripts Disponíveis

```bash
npm run dev      # Inicia servidor de desenvolvimento
npm run build    # Build de produção
npm run preview  # Preview da build
npm run lint     # Verifica código com ESLint
```

## 📊 Performance

- **Code Splitting** automático por rota
- **Lazy Loading** de imagens
- **Tree Shaking** de dependências
- Build otimizado: ~150KB gzipped

## 🌐 Deploy

Build otimizado para:

- **Vercel** (recomendado)
- **Netlify**
- **Qualquer CDN estática**

```bash
npm run build
# Arquivos em /dist
```

## 📄 Licença

MIT
