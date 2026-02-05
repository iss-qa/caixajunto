import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Wallet, User, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';

export function BottomNav() {
  const location = useLocation();
  const { usuario } = useAuth();
  const { isBottomNavVisible } = useUI();

  // Hide bottom nav when not visible (e.g., during identity verification)
  if (!isBottomNavVisible) {
    return null;
  }
  const navItems =
    usuario?.tipo === 'usuario'
      ? [
        { path: '/dashboard', label: 'Início', icon: Home },
        { path: '/caixas', label: 'Caixas', icon: Wallet },
        { path: '/contrato', label: 'Contrato', icon: FileText },
        { path: '/carteira', label: 'Carteira', icon: Wallet },
        { path: '/perfil', label: 'Perfil', icon: User },
      ]
      : [
        { path: '/dashboard', label: 'Início', icon: Home },
        { path: '/caixas', label: 'Caixas', icon: Wallet },
        { path: '/contrato', label: 'Contrato', icon: FileText },
        { path: '/carteira', label: 'Carteira', icon: Wallet },
        { path: '/perfil', label: 'Perfil', icon: User },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-100 safe-area-bottom z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full relative transition-colors',
                isActive ? 'text-green-500' : 'text-gray-400'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-0.5 w-12 h-1 bg-green-500 rounded-full"
                />
              )}
              <item.icon className={cn('w-5 h-5 mb-1', isActive && 'animate-scale-in')} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
