import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Registro } from './pages/Registro';
import { Dashboard } from './pages/Dashboard';
import { Caixas } from './pages/Caixas';
import { CaixaDetalhes } from './pages/CaixaDetalhes';
import { NovoCaixa } from './pages/NovoCaixa';
import { Participantes } from './pages/Participantes';
import { Perfil } from './pages/Perfil';
import { Notificacoes } from './pages/Notificacoes';
import { Pagamentos } from './pages/Pagamentos';
import { PainelMaster } from './pages/PainelMaster';
import { Contrato } from './pages/Contrato';
import Carteira from './pages/Carteira';
import CarteiraBanco from './pages/CarteiraBanco';
import SplitConfig from './pages/SplitConfig';

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

      {/* Protected Routes */}
  <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/caixas" element={<Caixas />} />
        <Route path="/caixas/novo" element={
          <RoleRoute allow={["administrador","master"]}>
            <NovoCaixa />
          </RoleRoute>
        } />
        <Route path="/caixas/:id" element={<CaixaDetalhes />} />
        <Route path="/participantes" element={
          <RoleRoute allow={["administrador","master"]}>
            <Participantes />
          </RoleRoute>
        } />
        <Route path="/contrato" element={<Contrato />} />
        <Route path="/carteira" element={<Carteira />} />
        <Route path="/carteira/banco" element={<CarteiraBanco />} />
        <Route path="/painel-master/split" element={
          <RoleRoute allow={["master"]}>
            <SplitConfig />
          </RoleRoute>
        } />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/notificacoes" element={<Notificacoes />} />
        <Route path="/pagamentos" element={
          <RoleRoute allow={["administrador","master"]}>
            <Pagamentos />
          </RoleRoute>
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
        <AppRoutes />
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
