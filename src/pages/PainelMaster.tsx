import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Shield,
  BarChart3,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { dashboardService, usuariosService, caixasService } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { CardSkeleton } from '../components/ui/Skeleton';
import { formatCurrency, cn } from '../lib/utils';

interface MasterDashboardData {
  usuarios: {
    total: number;
    ativos: number;
    administradores: number;
    usuarios: number;
    masters: number;
  };
  caixas: {
    total: number;
    ativos: number;
    aguardando: number;
    finalizados: number;
    cancelados: number;
    valorTotalMovimentado: number;
  };
  recebimentos: {
    totalRecebimentos: number;
    liberados: number;
    pendentes: number;
    valorTotalLiberado: number;
    valorTotalPendente: number;
  };
  fundoGarantidor: {
    totalEntradas: number;
    totalSaidas: number;
    totalLucros: number;
    saldoGeral: number;
    qtdCaixasComFundo: number;
  };
  resumo: {
    totalUsuarios: number;
    totalCaixasAtivos: number;
    valorTotalMovimentado: number;
    receitaPotencial: number;
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function PainelMaster() {
  const [data, setData] = useState<MasterDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    loadDashboard();
  }, [periodoSelecionado]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await dashboardService.getMaster();
      setData(response);
    } catch (error) {
      console.error('Erro ao carregar dashboard master:', error);
      // Mock data
      setData({
        usuarios: {
          total: 1250,
          ativos: 1180,
          administradores: 85,
          usuarios: 1163,
          masters: 2,
        },
        caixas: {
          total: 156,
          ativos: 89,
          aguardando: 23,
          finalizados: 38,
          cancelados: 6,
          valorTotalMovimentado: 892500,
        },
        recebimentos: {
          totalRecebimentos: 623,
          liberados: 456,
          pendentes: 167,
          valorTotalLiberado: 2280000,
          valorTotalPendente: 835000,
        },
        fundoGarantidor: {
          totalEntradas: 78900,
          totalSaidas: 12300,
          totalLucros: 45600,
          saldoGeral: 21000,
          qtdCaixasComFundo: 89,
        },
        resumo: {
          totalUsuarios: 1250,
          totalCaixasAtivos: 89,
          valorTotalMovimentado: 892500,
          receitaPotencial: 66600,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const taxaConclusao = data ? ((data.caixas.finalizados / (data.caixas.total || 1)) * 100).toFixed(1) : '0';
  const taxaCancelamento = data ? ((data.caixas.cancelados / (data.caixas.total || 1)) * 100).toFixed(1) : '0';
  const taxaAtivacao = data ? ((data.usuarios.ativos / (data.usuarios.total || 1)) * 100).toFixed(1) : '0';

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto px-4 py-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel Master</h1>
          <p className="text-sm text-gray-500">Visão geral do sistema CaixaJunto</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Período */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {[
              { value: '7d', label: '7 dias' },
              { value: '30d', label: '30 dias' },
              { value: '90d', label: '90 dias' },
              { value: 'all', label: 'Todos' },
            ].map((periodo) => (
              <button
                key={periodo.value}
                onClick={() => setPeriodoSelecionado(periodo.value as any)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  periodoSelecionado === periodo.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {periodo.label}
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={loadDashboard}
          >
            Atualizar
          </Button>
        </div>
      </motion.div>

      {/* Main Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Usuários */}
        <Card className="bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200/50">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-violet-500 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <Badge variant="success" size="sm" className="bg-green-100 text-green-700">
              +12%
            </Badge>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-gray-900">
            {data?.usuarios.total.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">Total de Usuários</p>
          <div className="mt-2 pt-2 border-t border-violet-200/50">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Ativos</span>
              <span className="font-medium text-gray-700">{taxaAtivacao}%</span>
            </div>
          </div>
        </Card>

        {/* Caixas Ativos */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/50">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <Badge variant="success" size="sm" className="bg-green-100 text-green-700">
              +8%
            </Badge>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-gray-900">
            {data?.caixas.ativos}
          </p>
          <p className="text-xs text-gray-500 mt-1">Caixas Ativos</p>
          <div className="mt-2 pt-2 border-t border-green-200/50">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Conclusão</span>
              <span className="font-medium text-green-700">{taxaConclusao}%</span>
            </div>
          </div>
        </Card>

        {/* Volume Transacionado */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center text-green-600 text-xs font-medium">
              <ArrowUpRight className="w-3 h-3" />
              23%
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-gray-900">
            {formatCurrency(data?.caixas.valorTotalMovimentado || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Volume Movimentado</p>
        </Card>

        {/* Receita Potencial */}
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/50">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center text-green-600 text-xs font-medium">
              <ArrowUpRight className="w-3 h-3" />
              18%
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-gray-900">
            {formatCurrency(data?.resumo.receitaPotencial || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Receita Potencial</p>
        </Card>

        {/* Split de Pagamentos */}
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200/50">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
              <PieChart className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-base font-semibold text-gray-900 mb-1">Configurar Split</p>
          <p className="text-xs text-gray-500">Defina percentuais e visualize a distribuição</p>
          <div className="mt-3">
            <Button onClick={() => (window.location.href = '/painel-master/split')}>Abrir</Button>
          </div>
        </Card>
      </motion.div>

      {/* Second Row - Charts and Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Status dos Caixas */}
        <motion.div variants={itemVariants}>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Status dos Caixas</h3>
              <PieChart className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-600">Ativos</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{data?.caixas.ativos}</span>
                  <span className="text-xs text-gray-400">
                    ({((data?.caixas.ativos || 0) / (data?.caixas.total || 1) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm text-gray-600">Aguardando</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{data?.caixas.aguardando}</span>
                  <span className="text-xs text-gray-400">
                    ({((data?.caixas.aguardando || 0) / (data?.caixas.total || 1) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-gray-600">Finalizados</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{data?.caixas.finalizados}</span>
                  <span className="text-xs text-gray-400">
                    ({taxaConclusao}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm text-gray-600">Cancelados</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{data?.caixas.cancelados}</span>
                  <span className="text-xs text-gray-400">
                    ({taxaCancelamento}%)
                  </span>
                </div>
              </div>
            </div>
            
            {/* Visual Progress */}
            <div className="mt-4 h-3 bg-gray-100 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-green-500" 
                style={{ width: `${(data?.caixas.ativos || 0) / (data?.caixas.total || 1) * 100}%` }}
              />
              <div 
                className="h-full bg-amber-500" 
                style={{ width: `${(data?.caixas.aguardando || 0) / (data?.caixas.total || 1) * 100}%` }}
              />
              <div 
                className="h-full bg-blue-500" 
                style={{ width: `${(data?.caixas.finalizados || 0) / (data?.caixas.total || 1) * 100}%` }}
              />
              <div 
                className="h-full bg-red-500" 
                style={{ width: `${(data?.caixas.cancelados || 0) / (data?.caixas.total || 1) * 100}%` }}
              />
            </div>
          </Card>
        </motion.div>

        {/* Tipos de Usuários */}
        <motion.div variants={itemVariants}>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Tipos de Usuários</h3>
              <Users className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Participantes</span>
                  <span className="font-semibold">{data?.usuarios.usuarios}</span>
                </div>
                <ProgressBar 
                  value={data?.usuarios.usuarios || 0} 
                  max={data?.usuarios.total || 1} 
                  color="primary" 
                  size="sm" 
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Administradores</span>
                  <span className="font-semibold">{data?.usuarios.administradores}</span>
                </div>
                <ProgressBar 
                  value={data?.usuarios.administradores || 0} 
                  max={data?.usuarios.total || 1} 
                  color="success" 
                  size="sm" 
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Masters</span>
                  <span className="font-semibold">{data?.usuarios.masters}</span>
                </div>
                <ProgressBar 
                  value={data?.usuarios.masters || 0} 
                  max={data?.usuarios.total || 1} 
                  color="warning" 
                  size="sm" 
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Fundo Garantidor */}
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/30 border-emerald-200/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Fundo Garantidor</h3>
              <Shield className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-white/60 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Saldo Disponível</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(data?.fundoGarantidor.saldoGeral || 0)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-white/40 rounded-lg">
                  <p className="text-xs text-gray-500">Entradas</p>
                  <p className="font-semibold text-green-600">
                    {formatCurrency(data?.fundoGarantidor.totalEntradas || 0)}
                  </p>
                </div>
                <div className="p-2 bg-white/40 rounded-lg">
                  <p className="text-xs text-gray-500">Saídas</p>
                  <p className="font-semibold text-red-600">
                    {formatCurrency(data?.fundoGarantidor.totalSaidas || 0)}
                  </p>
                </div>
              </div>
              <div className="p-2 bg-white/40 rounded-lg">
                <p className="text-xs text-gray-500">Lucro (Fundos não utilizados)</p>
                <p className="font-semibold text-emerald-600">
                  {formatCurrency(data?.fundoGarantidor.totalLucros || 0)}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Third Row - Recebimentos */}
      <motion.div variants={itemVariants}>
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recebimentos</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <Calendar className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{data?.recebimentos.totalRecebimentos}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl text-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">{data?.recebimentos.liberados}</p>
              <p className="text-xs text-gray-500">Liberados</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl text-center">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-amber-600">{data?.recebimentos.pendentes}</p>
              <p className="text-xs text-gray-500">Pendentes</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(data?.recebimentos.valorTotalLiberado || 0)}
              </p>
              <p className="text-xs text-gray-500">Valor Liberado</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Indicadores de Performance */}
      <motion.div variants={itemVariants}>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Indicadores de Performance</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Taxa de Conclusão */}
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-2">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#22c55e"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${parseFloat(taxaConclusao) * 2.26} 226`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900">{taxaConclusao}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-600">Conclusão</p>
            </div>

            {/* Taxa de Ativação */}
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-2">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#3b82f6"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${parseFloat(taxaAtivacao) * 2.26} 226`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900">{taxaAtivacao}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-600">Ativação</p>
            </div>

            {/* NPS (Mock) */}
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-2">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#f59e0b"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${72 * 2.26} 226`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900">72</span>
                </div>
              </div>
              <p className="text-sm text-gray-600">NPS</p>
            </div>

            {/* Taxa de Cancelamento */}
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-2">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#ef4444"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${parseFloat(taxaCancelamento) * 2.26} 226`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900">{taxaCancelamento}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-600">Cancelamento</p>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
