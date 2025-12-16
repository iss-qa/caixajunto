import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Wallet,
  Users,
  Calendar,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserPlus,
  Play,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { caixasService, participantesService, pagamentosService } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { CardSkeleton } from '../components/ui/Skeleton';
import { ProgressBar } from '../components/ui/ProgressBar';
import { formatCurrency, cn, calculateCurrentPeriod } from '../lib/utils';

interface Caixa {
  _id: string;
  nome: string;
  descricao?: string;
  valorTotal: number;
  valorParcela: number;
  qtdParticipantes: number;
  duracaoMeses: number;
  status: string;
  mesAtual: number;
  tipo?: 'mensal' | 'semanal';
  dataInicio?: string;
  codigoConvite: string;
  participantesAtivos?: number;
  stats?: { pagos: number; pendentes: number };
  adminNome?: string;
}

const statusFilters = [
  { value: '', label: 'Todos' },
  { value: 'ativo', label: 'Em Andamento' },
  { value: 'aguardando', label: 'Aguardando Participantes' },
  { value: 'nao_iniciados', label: 'Não iniciados' },
  { value: 'finalizado', label: 'Finalizados' },
];

export function Caixas() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadCaixas();
  }, [usuario, statusFilter]);

  // Função para ler participantes do localStorage
  const getParticipantesCount = (caixaId: string): number => {
    try {
      const stored = localStorage.getItem(`caixa_${caixaId}_participantes`);
      if (stored) {
        const parts = JSON.parse(stored);
        return Array.isArray(parts) ? parts.length : 0;
      }
      return 0;
    } catch {
      return 0;
    }
  };

  const loadCaixas = async () => {
    if (!usuario?._id) return;

    try {
      setLoading(true);
      if (usuario.tipo === 'usuario') {
        const participacoes = await participantesService.getByUsuario(usuario._id);
        const lista = Array.isArray(participacoes) ? participacoes : participacoes?.participacoes || [];
        const caixasList = lista.map((p: any) => ({
          _id: p.caixaId?._id || p.caixaId || `caixa-${p._id}`,
          nome: p.caixaId?.nome || p.nomeCaixa || 'Caixa',
          descricao: p.caixaId?.descricao,
          valorTotal: p.caixaId?.valorTotal || 0,
          valorParcela: p.caixaId?.valorParcela || 0,
          qtdParticipantes: p.caixaId?.qtdParticipantes || p.qtdParticipantes || 0,
          duracaoMeses: p.caixaId?.duracaoMeses || p.duracaoMeses || 0,
          status: p.caixaId?.status || 'aguardando',
          mesAtual: p.caixaId?.mesAtual || 1,
          tipo: p.caixaId?.tipo || p.tipo || 'mensal',
          dataInicio: p.caixaId?.dataInicio,
          codigoConvite: p.caixaId?.codigoConvite || '',
          participantesAtivos: p.caixaId?.qtdParticipantes || p.qtdParticipantes || 0,
          adminNome: p.caixaId?.adminId?.nome || '',
        }));
        setCaixas(caixasList);
      } else {
        let response;
        if (usuario.tipo === 'master') {
          response = await caixasService.getAll();
        } else {
          response = await caixasService.getByAdmin(usuario._id);
        }
        const caixasList = Array.isArray(response) ? response : response.caixas || [];
        const caixasComParticipantes = caixasList.map((c: any) => ({
          _id: c._id,
          nome: c.nome,
          descricao: c.descricao,
          valorTotal: c.valorTotal,
          valorParcela: c.valorParcela,
          qtdParticipantes: c.qtdParticipantes,
          duracaoMeses: c.duracaoMeses,
          status: c.status,
          mesAtual: c.mesAtual || 1,
          tipo: c.tipo || 'mensal',
          dataInicio: c.dataInicio,
          codigoConvite: c.codigoConvite,
          participantesAtivos: getParticipantesCount(c._id) || c.participantesAtivos || c.qtdParticipantes || 0,
          adminNome: typeof c.adminId === 'string' ? '' : c.adminId?.nome || '',
        }));

        const stats = await Promise.all(
          caixasComParticipantes.map(async (cx: Caixa) => {
            try {
              const s = await pagamentosService.getEstatisticasCaixa(cx._id);
              return { id: cx._id, pagos: s.pagos || 0, pendentes: s.pendentes || cx.qtdParticipantes };
            } catch {
              return { id: cx._id, pagos: 0, pendentes: cx.qtdParticipantes };
            }
          })
        );

        const merged = caixasComParticipantes.map((cx: Caixa) => {
          const s = stats.find((i) => i.id === cx._id);
          return { ...cx, stats: { pagos: s?.pagos || 0, pendentes: s?.pendentes || cx.qtdParticipantes } };
        });

        setCaixas(merged);
      }
    } catch (error) {
      console.error('Erro ao carregar caixas:', error);
      // Mock data com diferentes estados
      const mockCaixas = [
        {
          _id: '1',
          nome: 'Caixa da Família',
          descricao: 'Caixa mensal da família Silva',
          valorTotal: 5000,
          valorParcela: 500,
          qtdParticipantes: 10,
          duracaoMeses: 10,
          status: 'ativo',
          mesAtual: 4,
          codigoConvite: 'FAM2024',
          participantesAtivos: 10,
        },
        {
          _id: '2',
          nome: 'Caixa do Trabalho',
          valorTotal: 4000,
          valorParcela: 500,
          qtdParticipantes: 8,
          duracaoMeses: 8,
          status: 'aguardando',
          mesAtual: 0,
          codigoConvite: 'WORK24',
          participantesAtivos: 6,
        },
        {
          _id: '3',
          nome: 'Caixa Vizinhos',
          valorTotal: 6000,
          valorParcela: 500,
          qtdParticipantes: 12,
          duracaoMeses: 12,
          status: 'aguardando',
          mesAtual: 0,
          codigoConvite: 'VIZ2024',
          participantesAtivos: 0,
        },
        {
          _id: '4',
          nome: 'Caixa Igreja',
          valorTotal: 3000,
          valorParcela: 300,
          qtdParticipantes: 10,
          duracaoMeses: 10,
          status: 'ativo',
          mesAtual: 9,
          codigoConvite: 'IGR2024',
          participantesAtivos: 10,
        },
        {
          _id: '5',
          nome: 'Novo Caixa',
          valorTotal: 5000,
          valorParcela: 500,
          qtdParticipantes: 10,
          duracaoMeses: 10,
          status: 'rascunho',
          mesAtual: 0,
          codigoConvite: 'NOVO24',
          participantesAtivos: 3,
        },
      ];
      // Também aplicar contagem do localStorage aos mocks
      const caixasComParticipantes = mockCaixas.map((c) => ({
        ...c,
        participantesAtivos: getParticipantesCount(c._id) || c.participantesAtivos || 0,
      }));
      setCaixas(caixasComParticipantes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!caixas || caixas.length === 0) return;
    let timer: any;
    const refreshStats = async () => {
      try {
        const updates = await Promise.all(
          caixas.map(async (cx) => {
            try {
              const s = await pagamentosService.getEstatisticasCaixa(cx._id);
              return { id: cx._id, pagos: s.pagos || 0, pendentes: s.pendentes ?? cx.qtdParticipantes };
            } catch {
              return { id: cx._id, pagos: cx.stats?.pagos || 0, pendentes: cx.stats?.pendentes ?? cx.qtdParticipantes };
            }
          })
        );
        setCaixas((prev) =>
          prev.map((cx) => {
            const u = updates.find((i) => i.id === cx._id);
            return u ? { ...cx, stats: { pagos: u.pagos, pendentes: u.pendentes } } : cx;
          })
        );
      } catch {}
    };
    timer = setInterval(refreshStats, 5000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [caixas]);
  const filteredCaixas = caixas.filter((caixa) => {
    const matchesSearch = caixa.nome.toLowerCase().includes(search.toLowerCase());
    if (!statusFilter) return matchesSearch;
    if (statusFilter === 'ativo') return matchesSearch && caixa.status === 'ativo';
    if (statusFilter === 'aguardando') return matchesSearch && caixa.status === 'aguardando';
    if (statusFilter === 'finalizado') return matchesSearch && caixa.status === 'finalizado';
    if (statusFilter === 'nao_iniciados') {
      const participantesAtivos = caixa.participantesAtivos || 0;
      const isCompleto = participantesAtivos >= (caixa.qtdParticipantes || 0);
      return matchesSearch && isCompleto && caixa.status !== 'ativo';
    }
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'gray'> = {
      ativo: 'success',
      aguardando: 'warning',
      rascunho: 'gray',
      finalizado: 'info',
      cancelado: 'danger',
    };
    return variants[status] || 'gray';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ativo: 'Em andamento',
      aguardando: 'Aguardando participantes',
      rascunho: 'Não iniciado',
      finalizado: 'Finalizado',
      cancelado: 'Cancelado',
    };
    return labels[status] || status;
  };

  // Ordenar caixas: Em andamento primeiro; entre eles, mais pagos primeiro
  const sortedCaixas = [...filteredCaixas].sort((a, b) => {
    const aAtivo = a.status === 'ativo' ? 1 : 0;
    const bAtivo = b.status === 'ativo' ? 1 : 0;
    if (aAtivo !== bAtivo) return bAtivo - aAtivo; // ativos primeiro

    if (aAtivo === 1 && bAtivo === 1) {
      const pagosA = a.stats?.pagos || 0;
      const pagosB = b.stats?.pagos || 0;
      if (pagosA !== pagosB) return pagosB - pagosA; // mais pagos primeiro
    }

    // Fallback: completos, depois incompletos
    const aParticipantes = a.participantesAtivos || 0;
    const bParticipantes = b.participantesAtivos || 0;
    const aIncompleto = aParticipantes < a.qtdParticipantes;
    const bIncompleto = bParticipantes < b.qtdParticipantes;
    if (aIncompleto && !bIncompleto) return 1;
    if (bIncompleto && !aIncompleto) return -1;
    return 0;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Caixas</h1>
          <p className="text-sm text-gray-500">
            {caixas.length} caixas no total
          </p>
        </div>
        {usuario?.tipo !== 'usuario' && (
          <Button
            onClick={() => navigate('/caixas/novo')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Novo Caixa
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Buscar caixa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                statusFilter === filter.value
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-green-300'
              )}
              style={statusFilter === filter.value ? { boxShadow: '0 4px 14px rgba(34, 197, 94, 0.3)' } : {}}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Caixas List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : sortedCaixas.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {sortedCaixas.map((caixa, index) => {
            const participantesAtivos = caixa.participantesAtivos || 0;
            const participantesFaltando = caixa.qtdParticipantes - participantesAtivos;
            const semParticipantes = participantesAtivos === 0;
            const isIncompleto = participantesFaltando > 0 && !semParticipantes;
            const isCompleto = participantesFaltando === 0;
            const periodoAtual = calculateCurrentPeriod(
              caixa.tipo,
              caixa.dataInicio,
              caixa.duracaoMeses,
              caixa.mesAtual || 1
            );
            const totalPagamentos = (caixa.qtdParticipantes || 0) * (caixa.duracaoMeses || 0);
            const pagos = caixa.stats?.pagos || 0;
            const pendentes = Math.max(0, totalPagamentos - pagos);
            
            return (
              <motion.div
                key={caixa._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  hover
                  onClick={() => navigate(`/caixas/${caixa._id}`)}
                  className={cn(
                    'min-h-[240px] h-full',
                    semParticipantes && 'ring-2 ring-red-300 bg-gradient-to-br from-red-50 to-white',
                    isIncompleto && 'ring-2 ring-amber-300 bg-gradient-to-br from-amber-50 to-white',
                    !semParticipantes && !isIncompleto && caixa.status === 'ativo' && 'ring-2 ring-green-300 bg-gradient-to-br from-green-50 to-white'
                  )}
                >
                  {/* Badge de status no topo */}
                  {semParticipantes && (
                    <div className="flex items-center gap-2 p-2 bg-red-100 rounded-lg mb-3 -mt-1">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="text-xs font-semibold text-red-700">Sem participantes! Adicione agora</span>
                    </div>
                  )}
                  {isIncompleto && (
                    <div className="flex items-center gap-2 p-2 bg-amber-100 rounded-lg mb-3 -mt-1">
                      <Users className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-semibold text-amber-700">
                        Faltam {participantesFaltando} participante{participantesFaltando > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  {isCompleto && caixa.status !== 'ativo' && (
                    <div className="flex items-center gap-2 p-2 bg-green-100 rounded-lg mb-3 -mt-1">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-semibold text-green-700">Completo! Pronto para iniciar</span>
                    </div>
                  )}
                  {caixa.status === 'ativo' && (
                    <div className="flex items-center gap-2 p-2 bg-green-500 rounded-lg mb-3 -mt-1">
                      <Play className="w-4 h-4 text-white" />
                      <span className="text-xs font-semibold text-white">Em andamento</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{caixa.nome}</h3>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(caixa.valorTotal)}
                      </p>
                      {caixa.adminNome && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Organizado por: {caixa.adminNome}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {caixa.status === 'ativo' ? (
                        <Badge variant="success" size="sm">
                          {caixa.tipo === 'semanal' ? 'Semana' : 'Mês'} {periodoAtual}/{caixa.duracaoMeses}
                        </Badge>
                      ) : (
                        <Badge variant={getStatusBadge(caixa.status)} size="sm">
                          {getStatusLabel(caixa.status)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Info Cards */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className={cn(
                      "rounded-lg p-2 text-center",
                      semParticipantes ? "bg-red-50" : isIncompleto ? "bg-amber-50" : "bg-gray-50"
                    )}>
                      <Users className={cn(
                        "w-4 h-4 mx-auto mb-1",
                        semParticipantes ? "text-red-400" : isIncompleto ? "text-amber-400" : "text-gray-400"
                      )} />
                      <p className="text-xs text-gray-500">Participantes</p>
                      <p className={cn(
                        "font-semibold",
                        semParticipantes ? "text-red-600" : isIncompleto ? "text-amber-600" : "text-gray-900"
                      )}>
                        {participantesAtivos}/{caixa.qtdParticipantes}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <Wallet className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                      <p className="text-xs text-gray-500">Parcela</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(caixa.valorParcela)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <Calendar className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                      <p className="text-xs text-gray-500">Duração</p>
                      <p className="font-semibold text-gray-900">{caixa.duracaoMeses} {caixa.tipo === 'semanal' ? 'semanas' : 'meses'}</p>
                    </div>
                  </div>

                  {/* Progress */}
                  {caixa.status === 'ativo' && (
                    <ProgressBar
                      value={periodoAtual}
                      max={caixa.duracaoMeses}
                      color="primary"
                      size="sm"
                    />
                  )}

                  {/* Barra de preenchimento de participantes */}
                  {(semParticipantes || isIncompleto) && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Participantes</span>
                        <span className={semParticipantes ? "text-red-600" : "text-amber-600"}>
                          {participantesAtivos}/{caixa.qtdParticipantes}
                        </span>
                      </div>
                      <div className={cn(
                        "h-2 rounded-full overflow-hidden",
                        semParticipantes ? "bg-red-100" : "bg-amber-100"
                      )}>
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            semParticipantes ? "bg-red-400" : "bg-amber-400"
                          )}
                          style={{ width: `${(participantesAtivos / caixa.qtdParticipantes) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Status Info */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    {caixa.status === 'ativo' ? (
                      <div className="flex items-center gap-3 text-sm">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          {pagos} pagos
                        </span>
                        <span className="flex items-center gap-1 text-amber-600">
                          <Clock className="w-4 h-4" />
                          {pendentes} pendentes
                        </span>
                      </div>
                    ) : (semParticipantes || isIncompleto) ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg",
                          semParticipantes ? "text-red-600 bg-red-50" : "text-amber-600 bg-amber-50"
                        )}
                      >
                        <UserPlus className="w-3 h-3" />
                        Clique para adicionar
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">
                        Pronto para iniciar
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <EmptyState
          icon={Wallet}
          title="Nenhum caixa encontrado"
          description={search ? 'Tente buscar com outros termos' : 'Crie seu primeiro caixa e comece a organizar!'}
          actionLabel="Criar Caixa"
          onAction={() => navigate('/caixas/novo')}
        />
      )}
    </div>
  );
}
