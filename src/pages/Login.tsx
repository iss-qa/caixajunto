import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState({
    email: '',
    senha: '',
  });

  useEffect(() => {
    // Preencher email se vier do registro
    if (location.state?.email) {
      setForm(prev => ({ ...prev, email: location.state.email }));
    }

    // Mostrar mensagem de sucesso se vier do registro
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Limpar o state para não mostrar novamente ao recarregar
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      await login(form.email, form.senha);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Email ou senha inválidos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-white/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-20 h-20 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"
          >
            <Users className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Juntix</h1>
          <p className="text-white/80">Junte seus amigos e realize seus sonhos</p>
        </div>

        {/* Login Form */}
        <Card className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Entrar</h2>
          <p className="text-gray-500 mb-6">Acesse sua conta para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              disabled={loading}
              error={error && !form.email ? 'Email é obrigatório' : undefined}
            />

            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              leftIcon={<Lock className="w-4 h-4" />}
              autoComplete="current-password"
              disabled={loading}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 -m-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              }
              error={error && !form.senha ? 'Senha é obrigatória' : undefined}
            />

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-green-50 text-green-700 text-sm rounded-xl border border-green-200"
              >
                {successMessage}
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 text-sm rounded-xl ${error.includes('Aguardando aprovação')
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : error.includes('recusou')
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-danger-50 text-danger-600'
                  }`}
              >
                {error.includes('Aguardando aprovação') && (
                  <p className="flex items-start gap-2">
                    <span className="text-lg">⏳</span>
                    <span>{error}</span>
                  </p>
                )}
                {error.includes('recusou') && (
                  <p className="flex items-start gap-2">
                    <span className="text-lg">❌</span>
                    <span>{error}</span>
                  </p>
                )}
                {!error.includes('Aguardando aprovação') && !error.includes('recusou') && error}
              </motion.div>
            )}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
                <span className="text-gray-600">Lembrar de mim</span>
              </label>
              <Link to="/esqueci-senha" className="text-primary-600 hover:text-primary-700 font-medium">
                Esqueci minha senha
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={loading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Entrar
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500">
              Não tem uma conta?{' '}
              <Link to="/registro" className="text-primary-600 hover:text-primary-700 font-semibold">
                Cadastre-se
              </Link>
            </p>
          </div>
        </Card>

      </motion.div>
    </div>
  );
}

