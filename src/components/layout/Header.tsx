import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Settings, LogOut, Menu, X, Users, LayoutDashboard, Wallet, ChevronDown, Crown, CreditCard, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { notificacoesService } from '../../lib/api';
import { cn } from '../../lib/utils';

export function Header() {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const [notificacoes, setNotificacoes] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Menu items baseado no tipo de usuário
  const getMenuItems = () => {
    const baseItems = [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/caixas', label: 'Caixas', icon: Wallet },
      { path: '/participantes', label: 'Participantes', icon: Users },
      { path: '/pagamentos', label: 'Gestão Financeira', icon: CreditCard },
      { path: '/contrato', label: 'Contrato', icon: FileText },
    ];

    // Se for master, adiciona opção do Painel Master
    if (usuario?.tipo === 'master') {
      return [
        { path: '/painel-master', label: 'Painel Master', icon: Crown },
        ...baseItems,
      ];
    }

    return baseItems;
  };

  const menuItems = getMenuItems();

  useEffect(() => {
    if (usuario?._id) {
      notificacoesService.contarNaoLidas(usuario._id).then(setNotificacoes).catch(() => {});
    }
  }, [usuario]);

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      usuario: 'Participante',
      administrador: 'Administrador',
      master: 'Super Admin',
    };
    return labels[tipo] || tipo;
  };

  const getTipoBadgeVariant = (tipo: string): 'success' | 'warning' | 'info' => {
    const variants: Record<string, 'success' | 'warning' | 'info'> = {
      usuario: 'info',
      administrador: 'success',
      master: 'warning',
    };
    return variants[tipo] || 'info';
  };

  return (
    <header className="sticky top-0 z-40">
      {/* Gradient Background */}
      <div className="bg-gradient-to-r from-green-500 via-green-600 to-green-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg hidden sm:block">CaixaJunto</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {menuItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* User Info - Visible on Desktop */}
              <div className="hidden lg:flex items-center gap-2 mr-2">
                <span className="text-white/80 text-sm">Olá,</span>
                <span className="font-semibold">{usuario?.nome?.split(' ')[0]}</span>
              </div>

              {/* Notifications */}
              <Link
                to="/notificacoes"
                className="relative p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <Bell className="w-5 h-5" />
                {notificacoes > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-green-600">
                    {notificacoes > 9 ? '9+' : notificacoes}
                  </span>
                )}
              </Link>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <Avatar
                    name={usuario?.nome || 'U'}
                    src={usuario?.fotoUrl || usuario?.picture || usuario?.avatar}
                    size="sm"
                  />
                  <ChevronDown className={cn('w-4 h-4 transition-transform hidden sm:block', userMenuOpen && 'rotate-180')} />
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-gray-100">
                        <p className="font-semibold text-gray-900">{usuario?.nome}</p>
                        <p className="text-sm text-gray-500">{usuario?.email}</p>
                        <Badge variant={getTipoBadgeVariant(usuario?.tipo || '')} className="mt-2">
                          {usuario?.tipo === 'master' && <Crown className="w-3 h-3 mr-1" />}
                          {getTipoLabel(usuario?.tipo || '')}
                        </Badge>
                      </div>
                      <div className="p-2">
                        {usuario?.tipo === 'master' && (
                          <Link
                            to="/painel-master"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Crown className="w-4 h-4" />
                            Painel Master
                          </Link>
                        )}
                        <Link
                          to="/configuracoes"
                          className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="w-4 h-4 text-gray-400" />
                          Configurações
                        </Link>
                        <button
                          onClick={() => {
                            logout();
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sair
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed right-0 top-0 bottom-0 w-72 bg-white z-50 shadow-2xl md:hidden"
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <span className="font-bold text-lg">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {menuItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                      isActive
                        ? 'bg-green-50 text-green-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        </>
      )}
    </header>
  );
}
