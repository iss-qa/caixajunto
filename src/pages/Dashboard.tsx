import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Award,
  TrendingUp,
  Wallet,
  Plus,
  ChevronRight,
  CheckCircle2,
  Clock,
  Gift,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService, caixasService, participantesService, pagamentosService } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, cn } from '../lib/utils';

interface CaixaResumo {
  id: string;
  nome: string;
  status: string;
  tipo?: 'mensal' | 'semanal';
  valorTotal: number;
  valorParcela?: number;
  participantes: number;
  qtdParticipantes: number;
  mesAtual: number;
  duracaoMeses: number;
  ganhoEstimado: number;
  stats?: { pagos: number; pendentes: number };
}

interface DashboardData {
  resumo: {
    totalCaixas: number;
    caixasAtivos: number;
    caixasFinalizados: number;
    totalParticipantes: number;
    ganhosAcumulados: number;
    ganhosPrevistos: number;
  };
  caixas: CaixaResumo[];
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

// Taxa admin = 10% do valor total do caixa
const calcularGanhoAdmin = (valorTotal: number) => {
  return valorTotal * 0.10;
};

// Comparativo de crédito para diferentes valores
const gerarComparativoCredito = (valor: number) => {
  const jurosAgiota = valor * 0.5;
  const jurosCartao = valor * 0.44;
  const jurosBanco = valor * 0.3;
  const taxaCaixa = valor * 0.02;
  
  const valorCaixa = valor + taxaCaixa;
  
  return [
    { 
      nome: 'Agiota', 
      valor: valor + jurosAgiota, 
      juros: '50%+', 
      color: 'text-red-500',
      economia: ((jurosAgiota - taxaCaixa) / (valor + jurosAgiota) * 100).toFixed(0),
    },
    { 
      nome: 'Cartão de crédito', 
      valor: valor + jurosCartao, 
      juros: '44%', 
      color: 'text-red-500',
      economia: ((jurosCartao - taxaCaixa) / (valor + jurosCartao) * 100).toFixed(0),
    },
    { 
      nome: 'Empréstimo banco', 
      valor: valor + jurosBanco, 
      juros: '30%', 
      color: 'text-amber-500',
      economia: ((jurosBanco - taxaCaixa) / (valor + jurosBanco) * 100).toFixed(0),
    },
    { 
      nome: 'CaixaJunto', 
      valor: valorCaixa, 
      juros: '2%', 
      color: 'text-green-500', 
      highlight: true,
      economia: '0',
    },
  ];
};

const valoresComparativo = [
  { valor: 2000, label: 'R$ 2.000' },
  { valor: 5000, label: 'R$ 5.000' },
  { valor: 10000, label: 'R$ 10.000' },
];

export function Dashboard() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparativoSelecionado, setComparativoSelecionado] = useState(5000);
  // Estados para participante comum
  const [caixasParticipante, setCaixasParticipante] = useState<any[]>([]);
  const [loadingPart, setLoadingPart] = useState(true);
  const [selectedCreditParticipant, setSelectedCreditParticipant] = useState(5000);
  const isParticipant = usuario?.tipo === 'usuario';

  useEffect(() => {
    if (!isParticipant) {
      loadDashboard();
    }
  }, [usuario, isParticipant]);

  useEffect(() => {
    if (isParticipant && usuario?._id) {
      loadParticipanteView();
    }
  }, [isParticipant, usuario]);

  const loadParticipanteView = async () => {
    try {
      setLoadingPart(true);
      const res = await participantesService.getByUsuario(usuario!._id);
      const lista = Array.isArray(res) ? res : res?.participacoes || [];
      setCaixasParticipante(lista);
    } catch (e) {
      setCaixasParticipante([]);
    } finally {
      setLoadingPart(false);
    }
  };
  
  useEffect(() => {
    if (usuario?.tipo === 'usuario') return;
    let timer: any;
    const refreshStats = async () => {
      try {
        const caixasResponse = await caixasService.getByAdmin(usuario!._id);
        const caixas = Array.isArray(caixasResponse) ? caixasResponse : caixasResponse.caixas || [];
        const base = caixas.map((c: any) => ({ id: c._id, qtdParticipantes: c.qtdParticipantes }));
        const stats = await Promise.all(
          base.map(async (cx: { id: string; qtdParticipantes: number }) => {
            try {
              const s = await pagamentosService.getEstatisticasCaixa(cx.id);
              return { id: cx.id, pagos: s.pagos || 0, pendentes: s.pendentes ?? cx.qtdParticipantes };
            } catch {
              return { id: cx.id, pagos: 0, pendentes: cx.qtdParticipantes };
            }
          })
        );
        setData((prev) => {
          if (!prev) return prev;
          const updated = prev.caixas.map((c) => {
            const s = stats.find((i) => i.id === c.id);
            return s ? { ...c, stats: { pagos: s.pagos, pendentes: s.pendentes } } : c;
          });
          return { ...prev, caixas: updated };
        });
      } catch {}
    };
    timer = setInterval(refreshStats, 5000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [usuario]);

  const calcDiasRestantes = (item: any) => {
    const start = item.dataInicio ? new Date(item.dataInicio) : new Date();
    const semanas = item.tipo === 'semanal';
    const target = new Date(start);
    if (semanas) {
      target.setDate(target.getDate() + (item.posicao - 1) * 7);
    } else {
      target.setMonth(target.getMonth() + (item.posicao - 1));
      target.setDate(item.diaVencimento || target.getDate());
    }
    const diff = Math.max(0, target.getTime() - Date.now());
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // ---- VISÃO DE PARTICIPANTE (usuario comum) ----
  if (isParticipant) {
    const comparativo = gerarComparativoCredito(selectedCreditParticipant);

    return (
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <p className="text-sm text-gray-500">Olá,</p>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {usuario?.nome?.split(' ')[0]}
            <Badge variant="info" size="sm">Participante</Badge>
          </h1>
          <p className="text-sm text-gray-500">Score: {usuario?.score ?? 0}</p>
        </div>

        {/* Comparativo de Crédito */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/60">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Comparativo de Crédito</h2>
            <div className="flex gap-2">
              {[2000, 5000, 10000].map((v) => (
                <Button
                  key={v}
                  size="sm"
                  variant={selectedCreditParticipant === v ? 'primary' : 'secondary'}
                  onClick={() => setSelectedCreditParticipant(v)}
                >
                  {formatCurrency(v)}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {comparativo.map((c) => (
              <Card key={c.nome} className="text-center">
                <p className="text-sm text-gray-500">{c.nome}</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(c.valor)}</p>
                <Badge variant={c.nome === 'CaixaJunto' ? 'success' : 'gray'} size="sm">
                  {c.juros}%
                </Badge>
              </Card>
            ))}
          </div>
        </Card>

        {/* Caixas que participo */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Meus Caixas</h2>
        </div>

        {loadingPart ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2].map((i) => <CardSkeleton key={i} />)}
          </div>
        ) : caixasParticipante.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Nenhum caixa encontrado"
            description="Você ainda não participa de nenhum caixa."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {caixasParticipante.map((item) => {
              const dias = calcDiasRestantes(item);
              return (
                <Card key={item.caixaId} hover onClick={() => navigate(`/caixas/${item.caixaId}`)}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm text-gray-500">Tipo: {item.tipo === 'semanal' ? 'Semanal' : 'Mensal'}</p>
                      <h3 className="font-semibold text-gray-900">{item.caixaNome || 'Caixa'}</h3>
                    </div>
                    <Badge variant="info" size="sm">Posição {item.posicao}</Badge>
                  </div>
                  <p className="text-sm text-gray-700">
                    Faltam <strong>{dias} dia{dias === 1 ? '' : 's'}</strong> para sua contemplação.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Participantes: {item.qtdParticipantes} • Duração: {item.duracaoMeses} {item.tipo === 'semanal' ? 'semanas' : 'meses'}
                  </p>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const loadDashboard = async () => {
    if (!usuario?._id) return;
    
    try {
      setLoading(true);
      // Tentar carregar caixas do backend
      const caixasResponse = await caixasService.getByAdmin(usuario._id);
      const caixas = Array.isArray(caixasResponse) ? caixasResponse : caixasResponse.caixas || [];
      
      // Calcular ganhos previstos dinamicamente
      const ganhosPrevistos = caixas.reduce((total: number, caixa: any) => {
        return total + calcularGanhoAdmin(caixa.valorTotal || 0);
      }, 0);
      
      const caixasResumoBase: CaixaResumo[] = caixas.map((c: any) => ({
        id: c._id,
        nome: c.nome,
        status: c.status,
        tipo: c.tipo || 'mensal',
        valorTotal: c.valorTotal,
        valorParcela: c.valorParcela,
        participantes: c.participantesAtivos ?? c.qtdParticipantes ?? 0,
        qtdParticipantes: c.qtdParticipantes,
        mesAtual: c.mesAtual || 1,
        duracaoMeses: c.duracaoMeses,
        ganhoEstimado: calcularGanhoAdmin(c.valorTotal),
      }));

      const stats = await Promise.all(
        caixasResumoBase.map(async (cx) => {
          try {
            const s = await pagamentosService.getEstatisticasCaixa(cx.id);
            return { id: cx.id, pagos: s.pagos || 0, pendentes: s.pendentes || cx.qtdParticipantes };
          } catch {
            return { id: cx.id, pagos: 0, pendentes: cx.qtdParticipantes };
          }
        })
      );

      const caixasComStats = caixasResumoBase.map((cx) => {
        const s = stats.find((i) => i.id === cx.id);
        return { ...cx, stats: { pagos: s?.pagos || 0, pendentes: s?.pendentes || cx.qtdParticipantes } };
      });

      setData({
        resumo: {
          totalCaixas: caixas.length,
          caixasAtivos: caixas.filter((c: any) => c.status === 'ativo').length,
          caixasFinalizados: caixas.filter((c: any) => c.status === 'finalizado').length,
          totalParticipantes: caixas.reduce((t: number, c: any) => t + (c.participantesAtivos || c.qtdParticipantes || 0), 0),
          ganhosAcumulados: 0,
          ganhosPrevistos,
        },
        caixas: caixasComStats,
      });
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      setData({
        resumo: {
          totalCaixas: 0,
          caixasAtivos: 0,
          caixasFinalizados: 0,
          totalParticipantes: 0,
          ganhosAcumulados: 0,
          ganhosPrevistos: 0,
        },
        caixas: [],
      });
    } finally {
      setLoading(false);
    }
  };

  // Calcular ganhos previstos dinamicamente
  const calcularGanhosPrevistos = () => {
    if (!data?.caixas || data.caixas.length === 0) return 0;
    return data.caixas.reduce((total, caixa) => {
      // Ganho = 10% do valor total do caixa
      return total + (caixa.valorTotal * 0.10);
    }, 0);
  };

  const ganhosPrevistosDinamico = calcularGanhosPrevistos();
  const comparativoCredito = gerarComparativoCredito(comparativoSelecionado);
  const economiaMaxima = comparativoSelecionado * 0.48; // Economia vs agiota

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="space-y-4">
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
      {usuario?.tipo !== 'usuario' && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={() => navigate('/caixas/novo')}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Criar Caixa
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/participantes')}
              leftIcon={<Users className="w-4 h-4" />}
            >
              Participantes
            </Button>
          </div>
        </div>
      )}

      {/* Stats Cards - Com espaçamento do header */}
      <motion.div variants={itemVariants} className="mb-6 mt-2">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Score de Confiança */}
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/50">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-amber-700 font-medium mb-1">Score de Confiança</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl md:text-4xl font-bold text-amber-600">
                    {usuario?.score || 70}
                  </span>
                  <Award className="w-5 h-5 text-amber-500" />
                </div>
              </div>
            </div>
            <p className="text-[10px] md:text-xs text-amber-600 flex items-center gap-1">
              <Gift className="w-3 h-3" />
              Complete mais 1 caixa para virar <span className="font-bold">Parceiro Prata!</span>
            </p>
          </Card>

          {/* Caixas Ativos */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/50">
            <p className="text-xs text-green-700 font-medium mb-1">Caixas Ativos</p>
            <p className="text-3xl md:text-4xl font-bold text-green-600">
              {data?.resumo.caixasAtivos || 0}
            </p>
            <p className="text-xs text-green-500 mt-1">
              {data?.resumo.caixasFinalizados || 0} concluídos
            </p>
          </Card>

          {/* Ganhos Acumulados */}
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/50">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <p className="text-xs text-emerald-700 font-medium">Ganhos Acumulados</p>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-emerald-600">
              {formatCurrency(data?.resumo.ganhosAcumulados || 0)}
            </p>
          </Card>

          {/* Ganhos Previstos - Dinâmico e sem NaN */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <p className="text-xs text-blue-700 font-medium">Ganhos Previstos</p>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-blue-600">
              {formatCurrency(ganhosPrevistosDinamico || 0)}
            </p>
            <p className="text-[10px] text-blue-500 mt-1">
              {data?.caixas.length || 0} caixa{(data?.caixas.length || 0) !== 1 ? 's' : ''} × 10% do valor
            </p>
          </Card>
        </div>
      </motion.div>

      {/* Comparativo de Crédito */}
      <motion.div variants={itemVariants}>
        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-sm font-semibold text-gray-500">
              Comparativo de Crédito
            </h3>
            <div className="flex gap-2">
              {valoresComparativo.map((item) => (
                <button
                  key={item.valor}
                  onClick={() => setComparativoSelecionado(item.valor)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    comparativoSelecionado === item.valor
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Tabela comparativa */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left py-2 font-medium">Modalidade</th>
                  <th className="text-right py-2 font-medium">Valor Final</th>
                  <th className="text-right py-2 font-medium">Juros</th>
                  <th className="text-right py-2 font-medium">Economia</th>
                </tr>
              </thead>
              <tbody>
                {comparativoCredito.map((item) => (
                  <tr
                    key={item.nome}
                    className={cn(
                      'border-b border-gray-50 last:border-0',
                      item.highlight && 'bg-green-50'
                    )}
                  >
                    <td className={cn(
                      'py-3 font-medium',
                      item.highlight ? 'text-green-700' : 'text-gray-700'
                    )}>
                      {item.nome}
                    </td>
                    <td className={cn('py-3 text-right font-bold', item.color)}>
                      {formatCurrency(item.valor)}
                    </td>
                    <td className="py-3 text-right text-gray-500 text-sm">
                      {item.juros}
                    </td>
                    <td className="py-3 text-right">
                      {item.highlight ? (
                        <span className="text-green-600 font-bold">Melhor opção</span>
                      ) : (
                        <span className="text-green-600 font-semibold">
                          -{item.economia}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <p className="text-xs text-gray-500 mt-3 text-center bg-green-50 p-2 rounded-lg">
            💡 Com CaixaJunto você economiza até <strong className="text-green-600">
              {formatCurrency(economiaMaxima)}
            </strong> (<strong className="text-green-600">32%</strong>) comparado ao agiota!
          </p>
        </Card>
      </motion.div>

      {/* Meus Caixas */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Meus Caixas</h2>
        </div>

        {data?.caixas && data.caixas.length > 0 ? (
          <div className="space-y-4">
            {data.caixas.map((caixa, index) => {
              const participantesFaltando = caixa.qtdParticipantes - caixa.participantes;
              const isIncompleto = participantesFaltando > 0;
              const semParticipantes = caixa.participantes === 0;
              
              // Calcular ganho correto: 10% do valor total
              const ganhoCorreto = caixa.valorTotal * 0.10;
              
              return (
                <motion.div
                  key={caixa.id}
                  variants={itemVariants}
                  custom={index}
                >
                  <Card
                    hover
                    onClick={() => navigate(`/caixas/${caixa.id}`)}
                    className={cn(
                      'overflow-hidden min-h-[220px]',
                      semParticipantes && 'ring-2 ring-red-300 bg-red-50/30',
                      isIncompleto && !semParticipantes && 'ring-2 ring-amber-300 bg-amber-50/30',
                      !semParticipantes && !isIncompleto && caixa.status === 'ativo' && 'ring-2 ring-green-300 bg-green-50/30'
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{caixa.nome}</h3>
                          {caixa.status === 'ativo' ? (
                            <Badge variant="success" size="sm">
                              {caixa.tipo === 'semanal' ? 'Semana' : 'Mês'} {Math.max(1, caixa.mesAtual)}/{caixa.duracaoMeses}
                            </Badge>
                          ) : caixa.status === 'aguardando' ? (
                            <Badge variant="warning" size="sm">
                              Aguardando início
                            </Badge>
                          ) : (
                            <Badge variant="gray" size="sm">
                              {caixa.status}
                            </Badge>
                          )}
                          {semParticipantes && (
                            <Badge variant="danger" size="sm">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Sem participantes
                            </Badge>
                          )}
                          {isIncompleto && !semParticipantes && (
                            <Badge variant="warning" size="sm">
                              <Users className="w-3 h-3 mr-1" />
                              Faltam {participantesFaltando}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          Tipo: {caixa.tipo === 'semanal' ? 'Semanal' : 'Mensal'} • Parcela {formatCurrency(caixa.valorParcela || 0)} • {caixa.participantes}/{caixa.qtdParticipantes} participantes • {formatCurrency(caixa.valorTotal)}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>

                    {/* Alerta visual */}
                    {(semParticipantes || isIncompleto) && (
                      <div className={cn(
                        "p-2 rounded-lg mb-3 flex items-center gap-2",
                        semParticipantes ? "bg-red-100" : "bg-amber-100"
                      )}>
                        <AlertTriangle className={cn(
                          "w-4 h-4",
                          semParticipantes ? "text-red-600" : "text-amber-600"
                        )} />
                        <span className={cn(
                          "text-xs font-medium",
                          semParticipantes ? "text-red-700" : "text-amber-700"
                        )}>
                          {semParticipantes 
                            ? "Adicione participantes para começar!" 
                            : `Adicione mais ${participantesFaltando} participante${participantesFaltando > 1 ? 's' : ''} para completar`
                          }
                        </span>
                      </div>
                    )}

                    {/* Pagamentos do mês */}
                    {caixa.status === 'ativo' && (
                      <div className="flex items-center gap-4 text-sm mb-3">
                        <div className="flex items-center gap-1.5 text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{caixa.stats?.pagos || 0} pagos</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-amber-600">
                          <Clock className="w-4 h-4" />
                          <span>{caixa.stats?.pendentes ?? caixa.qtdParticipantes} pendentes</span>
                        </div>
                      </div>
                    )}

                    {/* Progress Bar */}
                    {caixa.status === 'ativo' && (
                      <ProgressBar
                        value={Math.max(1, caixa.mesAtual)}
                        max={caixa.duracaoMeses}
                        color="primary"
                        size="sm"
                      />
                    )}

                    {/* Ganho Estimado - Corrigido */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-500">Seu ganho estimado (10%)</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(ganhoCorreto)}
                      </span>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Wallet}
            title="Nenhum caixa ainda"
            description="Crie seu primeiro caixa e comece a organizar sua caixinha!"
            actionLabel="Criar Caixa"
            onAction={() => navigate('/caixas/novo')}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
