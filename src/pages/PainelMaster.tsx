import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Wallet,
  TrendingUp,
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
  MessageSquare,
  UserCheck,
} from 'lucide-react';
import { dashboardService } from '../lib/api';
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
    receitaPotencialBruta: number;
    receitaPotencialLiquida: number;
    receitaBrutaAdmins: number;
    receitaLiquidaAdmins: number;
    custosLytexCriacaoSubconta: number;
    custosLytexManutencao: number;
    totalCustosLytexSubcontas: number;
    receitaEfetiva: number;
  };
}

// Helper para Tooltip
const InfoTooltip = ({ text }: { text: string }) => (
  <div className="group relative ml-2 inline-flex">
    <div className="cursor-help rounded-full bg-gray-200 px-1.5 text-[10px] text-gray-600 font-bold">?</div>
    <div className="absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 hidden rounded bg-gray-800 p-2 text-xs text-white shadow-lg group-hover:block z-10">
      {text}
      <div className="absolute top-full left-1/2 -mt-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-800"></div>
    </div>
  </div>
);

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

  // State for collapsible sections
  const [showFinanceiro, setShowFinanceiro] = useState(false);
  const [showGestao, setShowGestao] = useState(false);

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
      // Mock data adjusted for testing
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
          receitaPotencialBruta: 66600,
          receitaPotencialLiquida: 60000,
          receitaBrutaAdmins: 8500,
          receitaLiquidaAdmins: 8000,
          custosLytexCriacaoSubconta: 1500,
          custosLytexManutencao: 500,
          totalCustosLytexSubcontas: 2000,
          receitaEfetiva: 45000,
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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <CardSkeleton /> <CardSkeleton />
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
          <p className="text-sm text-gray-500">Visão geral do sistema Juntix</p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Row 1: Main Stats (Condensed) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Usuários */}
        <Card className="bg-white border-violet-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total de Usuários</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">{data?.usuarios.total.toLocaleString()}</p>
                <Badge variant="success" size="sm" className="bg-green-50 text-green-700">+12%</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Caixas Ativos */}
        <Card className="bg-white border-green-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Caixas Ativos</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">{data?.caixas.ativos}</p>
                <Badge variant="success" size="sm" className="bg-green-50 text-green-700">+8%</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Caixas Concluídos */}
        <Card className="bg-white border-blue-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Caixas Concluídos</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">{data?.caixas.finalizados}</p>
                <Badge variant="neutral" size="sm" className="bg-gray-100 text-gray-600">{taxaConclusao}%</Badge>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Row 2: Grouped Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Section: Dados Financeiros */}
        <motion.div variants={itemVariants} className="space-y-4">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-r from-gray-900 to-gray-800 text-white border-none"
            onClick={() => setShowFinanceiro(!showFinanceiro)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Dados Financeiros</h3>
                  <p className="text-sm text-gray-300">Clique para visualizar métricas financeiras</p>
                </div>
              </div>
              <div className={cn("transition-transform duration-300", showFinanceiro ? "rotate-180" : "")}>
                <ArrowDownRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </Card>

          {showFinanceiro && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {/* Volume Movimentado */}
              <Card className="bg-white border-l-4 border-l-blue-500">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs text-gray-500 font-medium uppercase">Volume Movimentado</p>
                  <InfoTooltip text="Soma de todos os valores de cobranças PAGAS em caixas Ativos ou Concluídos" />
                </div>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(data?.caixas.valorTotalMovimentado || 0)}</p>
              </Card>

              {/* Receita Potencial Bruta */}
              <Card className="bg-white border-l-4 border-l-amber-500">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs text-gray-500 font-medium uppercase">Rec. Potencial Bruta</p>
                  <InfoTooltip text="Total Parcelas x Taxa de Serviço (R$ 10,00)" />
                </div>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(data?.resumo.receitaPotencialBruta || 0)}</p>
              </Card>

              {/* Receita Potencial Líquida */}
              <Card className="bg-white border-l-4 border-l-amber-600">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs text-gray-500 font-medium uppercase">Rec. Potencial Líquida</p>
                  <InfoTooltip text="Receita Bruta - Custo Lytex (R$ 0,59/boleto)" />
                </div>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(data?.resumo.receitaPotencialLiquida || 0)}</p>
              </Card>

              {/* Receita Efetiva */}
              <Card className="bg-white border-l-4 border-l-emerald-500">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs text-gray-500 font-medium uppercase">Receita Efetiva</p>
                  <InfoTooltip text="Rec. Líquida + Rec. Adm - Custos Subconta" />
                </div>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(data?.resumo.receitaEfetiva || 0)}</p>
              </Card>

              {/* Receita Adm */}
              <Card className="bg-white border-l-4 border-l-cyan-500 col-span-1 sm:col-span-2">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs text-gray-500 font-medium uppercase">Receita Adm (Pagantes)</p>
                  <InfoTooltip text="Receita de adesão de admins não isentos" />
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-gray-400">Bruta</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(data?.resumo.receitaBrutaAdmins || 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Líquida (-Lytex)</p>
                    <p className="text-lg font-bold text-cyan-600">{formatCurrency(data?.resumo.receitaLiquidaAdmins || 0)}</p>
                  </div>
                </div>
              </Card>

              {/* Custos Lytex */}
              <Card className="bg-white border-l-4 border-l-pink-500 col-span-1 sm:col-span-2">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs text-gray-500 font-medium uppercase">Custos Subcontas Lytex</p>
                  <InfoTooltip text="Criação (R$10) e Manutenção (R$2/mês)" />
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Criação</span>
                  <span className="font-medium">{formatCurrency(data?.resumo.custosLytexCriacaoSubconta || 0)}</span>
                </div>
                <div className="flex justify-between text-sm border-b border-gray-100 pb-1 mb-1">
                  <span className="text-gray-500">Manutenção</span>
                  <span className="font-medium">{formatCurrency(data?.resumo.custosLytexManutencao || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-pink-700">Total</span>
                  <span className="font-bold text-pink-700">{formatCurrency(data?.resumo.totalCustosLytexSubcontas || 0)}</span>
                </div>
              </Card>
            </motion.div>
          )}
        </motion.div>

        {/* Section: Gestão de Caixas */}
        <motion.div variants={itemVariants} className="space-y-4">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow bg-white border-l-4 border-violet-500"
            onClick={() => setShowGestao(!showGestao)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Gestão de Caixas</h3>
                  <p className="text-sm text-gray-500">Administração e configurações</p>
                </div>
              </div>
              <div className={cn("transition-transform duration-300", showGestao ? "rotate-180" : "")}>
                <ArrowDownRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </Card>

          {showGestao && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="grid grid-cols-2 gap-3"
            >
              {/* Configurar Split */}
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-colors"
                onClick={() => (window.location.href = '/painel-master/split')}
              >
                <PieChart className="w-5 h-5" />
                <span className="text-xs font-semibold">Configurar Split</span>
              </Button>

              {/* Gerenciar Split */}
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-colors"
                onClick={() => (window.location.href = '/painel-master/split/gerenciar')}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="text-xs font-semibold">Gerenciar Split</span>
              </Button>

              {/* Gerenciar Comunicação */}
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-colors"
                onClick={() => (window.location.href = '/painel-master/comunicacao')}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-xs font-semibold">Comunicação</span>
              </Button>

              {/* Gerenciar Admins */}
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-colors"
                onClick={() => (window.location.href = '/painel-master/administradores')}
              >
                <UserCheck className="w-5 h-5" />
                <span className="text-xs font-semibold">Administradores</span>
              </Button>

              {/* Contemplação */}
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-colors"
                onClick={() => (window.location.href = '/painel-master/contemplacao')}
              >
                <DollarSign className="w-5 h-5" />
                <span className="text-xs font-semibold">Contemplação</span>
              </Button>

              {/* Regras de Comissão */}
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-colors"
                onClick={() => (window.location.href = '/painel-master/comissoes')}
              >
                <TrendingUp className="w-5 h-5" />
                <span className="text-xs font-semibold">Comissões</span>
              </Button>
            </motion.div>
          )}

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
