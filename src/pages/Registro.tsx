import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Mail, Lock, Eye, EyeOff, Phone, User, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { formatPhone, unformatPhone } from '../lib/phoneMask';

export function Registro() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    senha: '',
    tipo: 'usuario' as 'usuario' | 'administrador',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      setLoading(true);
      // Remove máscara do telefone antes de enviar
      const formData = {
        ...form,
        telefone: unformatPhone(form.telefone),
      };
      await register(formData);

      // Administradores vão para login (precisam de aprovação)
      // Participantes vão direto para dashboard
      if (form.tipo === 'administrador') {
        navigate('/login', {
          state: {
            message: 'Conta criada com sucesso! Aguarde a aprovação do administrador master para fazer login.'
          }
        });
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar conta');
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
          <h1 className="text-3xl font-bold text-white mb-2">CaixaJunto</h1>
          <p className="text-white/80">Crie sua conta gratuita</p>
        </div>

        {/* Register Form */}
        <Card className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Criar Conta</h2>
          <p className="text-gray-500 mb-6">Preencha seus dados para começar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo de Conta */}
            <div>
              <label className="label">Tipo de Conta</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, tipo: 'usuario' })}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    form.tipo === 'usuario'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-200'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <User className={cn('w-5 h-5', form.tipo === 'usuario' ? 'text-primary-600' : 'text-gray-400')} />
                    <span className={cn('font-semibold', form.tipo === 'usuario' ? 'text-primary-700' : 'text-gray-700')}>
                      Participante
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Participe de caixas</p>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, tipo: 'administrador' })}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    form.tipo === 'administrador'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-200'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Users className={cn('w-5 h-5', form.tipo === 'administrador' ? 'text-primary-600' : 'text-gray-400')} />
                    <span className={cn('font-semibold', form.tipo === 'administrador' ? 'text-primary-700' : 'text-gray-700')}>
                      Administrador
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Crie e gerencie caixas</p>
                </button>
              </div>
            </div>

            <Input
              label="Nome Completo"
              placeholder="Seu nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              leftIcon={<User className="w-4 h-4" />}
            />

            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Telefone (WhatsApp)"
              placeholder="(11) 99999-9999"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: formatPhone(e.target.value) })}
              leftIcon={<Phone className="w-4 h-4" />}
              maxLength={15}
            />

            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-danger-50 text-danger-600 text-sm rounded-xl"
              >
                {error}
              </motion.div>
            )}

            {form.tipo === 'administrador' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-blue-50 text-blue-700 text-sm rounded-xl flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  Seu cadastro será analisado pelo administrador master antes de você poder acessar a plataforma.
                </p>
              </motion.div>
            )}

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="termos"
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                required
              />
              <label htmlFor="termos" className="text-sm text-gray-600">
                Concordo com os{' '}
                <a
                  href="https://drive.google.com/file/d/1k-uURKA1B1ZUBpDTw1Hd483w8yIwGMQK/view?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  Termos de Uso
                </a>{' '}
                e{' '}
                <a
                  href="https://drive.google.com/file/d/1WUZXJ4b6QgOiDSyBIy6LChHJAOiTYGX5/view?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  Contrato
                </a>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={loading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Criar Conta
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                Fazer login
              </Link>
            </p>
          </div>
        </Card>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center"
        >
          <div className="flex items-center justify-center gap-4 text-white/80 text-sm">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Gratuito
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Sem juros
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Seguro
            </span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

