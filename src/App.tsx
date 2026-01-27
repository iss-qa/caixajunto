import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UIProvider } from './contexts/UIContext';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Registro } from './pages/Registro';
import { EsqueciSenha } from './pages/EsqueciSenha';
import { Dashboard } from './pages/Dashboard';
import { Caixas } from './pages/Caixas';
import { CaixaDetalhes } from './pages/CaixaDetalhes';
import { NovoCaixa } from './pages/NovoCaixa';
import { Participantes } from './pages/Participantes';
import { Perfil } from './pages/Perfil';
import { Notificacoes } from './pages/Notificacoes';
import { Pagamentos } from './pages/Pagamentos';
import { PainelMaster } from './pages/PainelMaster';
import ContratoViewer from './pages/Contrato';
import Carteira from './pages/Carteira';
import SplitConfig from './pages/SplitConfig';
import GerenciarSplit from './pages/GerenciarSplit';
import { GerenciarComunicacao } from './pages/GerenciarComunicacao';
import { GerenciarAdministradores } from './pages/GerenciarAdministradores';
import { GerenciarComissoes } from './pages/GerenciarComissoes';
import { GestorContemplacao } from './pages/GestorContemplacao';
import { Seguranca } from './pages/Seguranca';
import { TaxaAdesao } from './pages/TaxaAdesao';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public Route (redirects if already authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Route que requer taxa de adesão paga para administradores
function TaxaAdesaoRoute({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth();

  // Se não é administrador, ou é master, permitir acesso
  if (!usuario || usuario.tipo !== 'administrador') {
    return <>{children}</>;
  }

  // Se é administrador e taxa não está paga nem isenta, redirecionar
  const taxaStatus = (usuario as any).taxaAdesao?.status;
  if (taxaStatus !== 'pago' && taxaStatus !== 'isento') {
    return <Navigate to="/taxa-adesao" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/registro"
        element={
          <PublicRoute>
            <Registro />
          </PublicRoute>
        }
      />
      <Route
        path="/esqueci-senha"
        element={<EsqueciSenha />}
      />

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard sempre acessível (mesmo com taxa pendente) */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Taxa de Adesão - sempre acessível para administradores */}
        <Route path="/taxa-adesao" element={<TaxaAdesao />} />

        {/* Rotas que requerem taxa de adesão paga */}
        <Route path="/caixas" element={
          <TaxaAdesaoRoute>
            <Caixas />
          </TaxaAdesaoRoute>
        } />
        <Route path="/caixas/novo" element={
          <TaxaAdesaoRoute>
            <RoleRoute allow={["administrador", "master"]}>
              <NovoCaixa />
            </RoleRoute>
          </TaxaAdesaoRoute>
        } />
        <Route path="/caixas/:id" element={
          <TaxaAdesaoRoute>
            <CaixaDetalhes />
          </TaxaAdesaoRoute>
        } />
        <Route path="/participantes" element={
          <TaxaAdesaoRoute>
            <RoleRoute allow={["administrador", "master"]}>
              <Participantes />
            </RoleRoute>
          </TaxaAdesaoRoute>
        } />
        <Route path="/contrato" element={<ContratoViewer />} />
        <Route path="/carteira" element={
          <TaxaAdesaoRoute>
            <Carteira />
          </TaxaAdesaoRoute>
        } />
        <Route path="/painel-master/split" element={
          <RoleRoute allow={["master"]}>
            <SplitConfig />
          </RoleRoute>
        } />
        <Route path="/painel-master/split/gerenciar" element={
          <RoleRoute allow={["master"]}>
            <GerenciarSplit />
          </RoleRoute>
        } />
        <Route path="/painel-master/comunicacao" element={
          <RoleRoute allow={["master"]}>
            <GerenciarComunicacao />
          </RoleRoute>
        } />
        <Route path="/painel-master/administradores" element={
          <RoleRoute allow={["master"]}>
            <GerenciarAdministradores />
          </RoleRoute>
        } />
        <Route path="/painel-master/comissoes" element={
          <RoleRoute allow={["master"]}>
            <GerenciarComissoes />
          </RoleRoute>
        } />
        <Route path="/painel-master/contemplacao" element={
          <RoleRoute allow={["master"]}>
            <GestorContemplacao />
          </RoleRoute>
        } />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/seguranca" element={<Seguranca />} />
        <Route path="/notificacoes" element={<Notificacoes />} />
        <Route path="/pagamentos" element={
          <TaxaAdesaoRoute>
            <RoleRoute allow={["administrador", "master"]}>
              <Pagamentos />
            </RoleRoute>
          </TaxaAdesaoRoute>
        } />
        <Route path="/configuracoes" element={<Perfil />} />
        <Route path="/painel-master" element={
          <RoleRoute allow={["master"]}>
            <PainelMaster />
          </RoleRoute>
        } />
      </Route>

      {/* Redirect root to dashboard or login */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 - Not Found */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
            <p className="text-xl text-gray-600 mb-4">Página não encontrada</p>
            <a
              href="/dashboard"
              className="btn btn-primary"
            >
              Voltar ao início
            </a>
          </div>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UIProvider>
          <AppRoutes />
        </UIProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

function RoleRoute({ children, allow }: { children: React.ReactNode; allow: Array<'usuario' | 'administrador' | 'master'> }) {
  const { usuario } = useAuth();
  if (!usuario || !allow.includes(usuario.tipo)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
