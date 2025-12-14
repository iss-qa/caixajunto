import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  CheckCircle,
  Clock,
  AlertCircle,
  Gift,
  Trash2,
  CheckCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { notificacoesService } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { cn, formatDateRelative } from '../lib/utils';

interface Notificacao {
  _id: string;
  tipo: 'lembrete' | 'confirmacao' | 'alerta' | 'celebracao';
  titulo: string;
  mensagem: string;
  lida: boolean;
  createdAt: string;
  caixaId?: {
    nome: string;
  };
}

const tipoConfig = {
  lembrete: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-100' },
  confirmacao: { icon: CheckCircle, color: 'text-primary-500', bg: 'bg-primary-100' },
  alerta: { icon: AlertCircle, color: 'text-danger-500', bg: 'bg-danger-100' },
  celebracao: { icon: Gift, color: 'text-amber-500', bg: 'bg-amber-100' },
};

export function Notificacoes() {
  const { usuario } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todas' | 'nao_lidas'>('todas');

  useEffect(() => {
    loadNotificacoes();
  }, [usuario]);

  const loadNotificacoes = async () => {
    if (!usuario?._id) return;

    try {
      setLoading(true);
      const response = await notificacoesService.getByUsuario(usuario._id);
      setNotificacoes(response);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      // Mock data
      setNotificacoes([
        {
          _id: '1',
          tipo: 'lembrete',
          titulo: 'Lembrete de Pagamento',
          mensagem: 'Faltam 5 dias para o pagamento do caixa Caixa da Família. Valor: R$ 500,00',
          lida: false,
          createdAt: new Date().toISOString(),
          caixaId: { nome: 'Caixa da Família' },
        },
        {
          _id: '2',
          tipo: 'confirmacao',
          titulo: 'Pagamento Confirmado',
          mensagem: 'Maria Santos pagou R$ 500,00 no caixa Caixa da Família. Faltam 2 pessoas.',
          lida: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          caixaId: { nome: 'Caixa da Família' },
        },
        {
          _id: '3',
          tipo: 'celebracao',
          titulo: '🎉 Parabéns!',
          mensagem: 'R$ 5.000,00 do caixa Caixa do Trabalho foi liberado na sua conta!',
          lida: true,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          caixaId: { nome: 'Caixa do Trabalho' },
        },
        {
          _id: '4',
          tipo: 'alerta',
          titulo: 'Pagamento em Atraso',
          mensagem: 'Pedro Oliveira está com 3 dias de atraso no caixa Caixa Vizinhos.',
          lida: true,
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          caixaId: { nome: 'Caixa Vizinhos' },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarComoLida = async (id: string) => {
    try {
      await notificacoesService.marcarComoLida(id);
      setNotificacoes(notificacoes.map((n) =>
        n._id === id ? { ...n, lida: true } : n
      ));
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const handleMarcarTodasComoLidas = async () => {
    if (!usuario?._id) return;

    try {
      await notificacoesService.marcarTodasComoLidas(usuario._id);
      setNotificacoes(notificacoes.map((n) => ({ ...n, lida: true })));
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const filteredNotificacoes = notificacoes.filter((n) =>
    filter === 'todas' ? true : !n.lida
  );

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
          <p className="text-sm text-gray-500">
            {naoLidas > 0 ? `${naoLidas} não lidas` : 'Tudo em dia'}
          </p>
        </div>
        {naoLidas > 0 && (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<CheckCheck className="w-4 h-4" />}
            onClick={handleMarcarTodasComoLidas}
          >
            Marcar todas
          </Button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('todas')}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-medium transition-all',
            filter === 'todas'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('nao_lidas')}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2',
            filter === 'nao_lidas'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          Não lidas
          {naoLidas > 0 && (
            <span className={cn(
              'w-5 h-5 rounded-full text-xs flex items-center justify-center',
              filter === 'nao_lidas' ? 'bg-white text-primary-500' : 'bg-danger-500 text-white'
            )}>
              {naoLidas}
            </span>
          )}
        </button>
      </div>

      {/* Notificações List */}
      {filteredNotificacoes.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          {filteredNotificacoes.map((notificacao, index) => {
            const config = tipoConfig[notificacao.tipo];
            const Icon = config.icon;

            return (
              <motion.div
                key={notificacao._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={cn(
                    'cursor-pointer transition-all',
                    !notificacao.lida && 'ring-2 ring-primary-200 bg-primary-50/30'
                  )}
                  onClick={() => handleMarcarComoLida(notificacao._id)}
                >
                  <div className="flex gap-3">
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', config.bg)}>
                      <Icon className={cn('w-5 h-5', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={cn(
                            'font-semibold text-gray-900',
                            !notificacao.lida && 'text-primary-700'
                          )}>
                            {notificacao.titulo}
                          </p>
                          <p className="text-sm text-gray-600 mt-0.5">{notificacao.mensagem}</p>
                        </div>
                        {!notificacao.lida && (
                          <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {notificacao.caixaId && (
                          <Badge variant="gray" size="sm">
                            {notificacao.caixaId.nome}
                          </Badge>
                        )}
                        <span className="text-xs text-gray-400">
                          {formatDateRelative(notificacao.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <EmptyState
          icon={Bell}
          title="Nenhuma notificação"
          description={filter === 'nao_lidas' ? 'Você está em dia com todas as notificações!' : 'Você ainda não recebeu notificações.'}
        />
      )}
    </div>
  );
}

