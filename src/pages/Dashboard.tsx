import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, TrendingUp, Wallet, Plus, Gift, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { caixasService, participantesService, pagamentosService } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
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
      nome: 'Juntix',
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
      } catch { }
    };
    timer = setInterval(refreshStats, 5000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [usuario]);

  const calcDiasRestantes = (item: any) => {
    const pos = Number(item.posicao);
    if (!Number.isFinite(pos) || pos <= 0) return null;
    const startRaw = item.dataInicio ? new Date(item.dataInicio) : new Date();
    const start = isNaN(startRaw.getTime()) ? new Date() : startRaw;
    const semanal = item.tipo === 'semanal';
    const target = new Date(start);
    if (semanal) {
      target.setDate(target.getDate() + (pos - 1) * 7);
    } else {
      target.setMonth(target.getMonth() + (pos - 1));
      const baseDay = target.getDate();
      const dia = Number(item.diaVencimento);
      target.setDate(Number.isFinite(dia) && dia > 0 ? dia : baseDay);
    }
    const time = target.getTime();
    if (isNaN(time)) return null;
    const diff = Math.max(0, time - Date.now());
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // ---- VISÃO DE PARTICIPANTE (usuario comum) ----
  if (isParticipant) {
    const comparativo = gerarComparativoCredito(selectedCreditParticipant);

    return (
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header - Tudo na mesma linha */}
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-gray-500">Olá,</p>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            {usuario?.nome?.split(' ')[0]}
          </h1>
          <Badge variant="info" size="sm">Participante</Badge>
          <span className="text-sm text-gray-500">• Score: {usuario?.score ?? 0}</span>
        </div>

        {/* Comparativo de Crédito - Fixed overflow */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/60 overflow-hidden">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Comparativo de Crédito</h2>
            <div className="flex gap-1.5 flex-wrap">
              {[2000, 5000, 10000].map((v) => (
                <button
                  key={v}
                  onClick={() => setSelectedCreditParticipant(v)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                    selectedCreditParticipant === v
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {formatCurrency(v)}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs md:text-sm text-gray-700 mb-3">
            Compare o custo total das modalidades para o valor escolhido. No Juntix a taxa é
            de <span className="font-semibold text-green-700">2%</span>, geralmente a melhor opção.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {comparativo.map((c) => (
              <Card key={c.nome} className="text-center p-3">
                <p className="text-xs text-gray-500 mb-1 truncate">{c.nome}</p>
                <p className="text-sm md:text-lg font-bold text-gray-900 break-words">
                  {formatCurrency(c.valor)}
                </p>
                <Badge variant={c.nome === 'Juntix' ? 'success' : 'gray'} size="sm">
                  {c.juros}%
                </Badge>
                {c.nome === 'Juntix' && (
                  <p className="mt-1 text-[10px] text-green-700 font-medium">Melhor opção</p>
                )}
              </Card>
            ))}
          </div>
        </Card>

        {/* Juntix - Contribuição Coletiva Simplificada */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Juntix</h2>
          <p className="text-lg text-green-700 font-semibold mb-4">Contribuição Coletiva Simplificada</p>
          <p className="text-sm text-gray-700 leading-relaxed">
            O Juntix é uma plataforma digital que moderniza o tradicional "caixa" ou "consórcio informal"
            que você já conhece. Transformamos uma prática antiga e confiável em uma experiência
            <span className="font-semibold text-green-700"> 100% digital, segura e transparente</span>.
          </p>
        </Card>

        {/* Como funciona? */}
        <Card>
          <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-2xl">🔄</span> Como funciona?
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            É simples: um grupo de pessoas de confiança se reúne e todos contribuem com parcelas mensais iguais.
            A cada mês, um participante recebe o valor total acumulado, até que todos tenham recebido sua vez.
            É como uma vaquinha rotativa entre amigos!
          </p>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm font-semibold text-blue-900 mb-2">📊 Exemplo prático:</p>
            <ul className="space-y-1.5 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <span>10 amigos formam um grupo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <span>Cada um paga R$ 1.000 por mês</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <span>Todo mês, um participante recebe R$ 10.000</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <span>Em 10 meses, todos terão recebido</span>
              </li>
            </ul>
          </div>
        </Card>

        {/* Principais Vantagens */}
        <Card>
          <h3 className="text-xl font-bold text-gray-900 mb-4">✨ Principais Vantagens</h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <span className="text-2xl">💰</span>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Custo Ultra Baixo</h4>
                <p className="text-sm text-gray-700">
                  Apenas <span className="font-bold text-green-600">R$ 10 de taxa por boleto</span> - muito mais
                  acessível que empréstimos bancários, financiamentos ou consórcios tradicionais.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">🚀</span>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Acesso Rápido a Valores Altos</h4>
                <p className="text-sm text-gray-700">
                  Receba até <span className="font-bold text-green-600">R$ 10.000</span> (ou mais, dependendo do grupo)
                  sem burocracia, análise de crédito ou juros abusivos.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">🤝</span>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Baseado em Confiança</h4>
                <p className="text-sm text-gray-700">
                  Forme grupos com pessoas que você conhece: amigos, familiares, colegas de trabalho.
                  A base é a confiança mútua.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">📱</span>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">100% Digital</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Gestão completa pelo app ou site</li>
                  <li>• Pagamentos via boleto ou PIX </li>
                  <li>• Notificações automáticas</li>
                  <li>• Histórico transparente de todas as transações</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Segurança e Transparência</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Todos veem quem pagou e quem recebeu</li>
                  <li>• Contratos digitais claros</li>
                  <li>• Sistema de lembretes automáticos</li>
                  <li>• Rastreabilidade completa</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Organização Garantida</h4>
                <p className="text-sm text-gray-700">
                  Esqueça planilhas, grupos de WhatsApp confusos e cobranças manuais.
                  O Juntix cuida de toda a gestão para você.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Sem Burocracia</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Não precisa de análise de crédito</li>
                  <li>• Sem consulta ao SPC/Serasa</li>
                  <li>• Sem garantias ou avalistas</li>
                  <li>• Cadastro rápido e simples</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Para quem é ideal? */}
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
          <h3 className="text-xl font-bold text-gray-900 mb-3">🎯 Para quem é ideal?</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✅</span>
              <span>Quem precisa de dinheiro para realizar sonhos (viagem, reforma, casamento)</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✅</span>
              <span>Empreendedores que precisam de capital de giro</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✅</span>
              <span>Quem quer comprar algo parcelado sem juros bancários</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✅</span>
              <span>Grupos que já fazem "caixinha" e querem profissionalizar</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✅</span>
              <span>Quem busca alternativa aos juros altos dos bancos</span>
            </p>
          </div>
        </Card>

        {/* Fundo de Reserva */}
        <Card>
          <h3 className="text-xl font-bold text-gray-900 mb-3">🛡️ Como funciona o Fundo de Reserva?</h3>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            No primeiro mês, é formado um <span className="font-semibold text-blue-600">Fundo de Reserva</span> para
            garantir a segurança de todos os participantes.
          </p>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">📊 Exemplo prático:</p>
            <ul className="space-y-1.5 text-sm text-gray-700">
              <li>• Valor da parcela: R$ 1.000</li>
              <li>• Grupo de 10 pessoas</li>
              <li>• <span className="font-bold text-green-600">Cada um contribui com apenas R$ 100 extras no 1º mês</span></li>
              <li>• Total do Fundo de Reserva: R$ 1.000</li>
            </ul>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
              <span className="text-xl">🎁</span> O melhor: o Fundo é devolvido!
            </h4>
            <p className="text-sm text-gray-700 mb-3">
              Ao final de <span className="font-bold text-blue-600">10 meses</span> (duração do grupo de 10 participantes),
              o Fundo de Reserva é <span className="font-bold text-green-600">devolvido para todos</span>!
            </p>
            <p className="text-sm text-gray-700 bg-white rounded p-3 border border-green-300">
              💡 <span className="font-semibold">Importante:</span> O fundo é dividido por <span className="font-bold text-blue-600">11 partes</span>
              (10 participantes + Juntix como participante). Essa é a <span className="font-bold text-green-600">única forma de lucro da plataforma</span>,
              o que é totalmente justo! Uma ferramenta fantástica que protege o grupo e ainda permite que a plataforma se sustente.
            </p>
          </div>
        </Card>

        {/* Papel do Administrador */}
        <Card>
          <h3 className="text-xl font-bold text-gray-900 mb-3">👨‍💼 O Papel do Administrador/Gestor</h3>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            Cada grupo tem um <span className="font-semibold text-blue-600">Administrador</span> responsável por:
          </p>

          <div className="space-y-2 text-sm text-gray-700 mb-4">
            <p className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✅</span>
              <span><span className="font-semibold">Recrutar</span> pessoas de confiança para o grupo</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✅</span>
              <span><span className="font-semibold">Organizar</span> os pagamentos e o calendário</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✅</span>
              <span><span className="font-semibold">Cobrar a adimplência</span> e garantir que todos paguem em dia</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✅</span>
              <span><span className="font-semibold">Engajar</span> o grupo e manter a comunicação ativa</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✅</span>
              <span><span className="font-semibold">Policiar</span> e mediar conflitos se necessário</span>
            </p>
          </div>

          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
              <span className="text-xl">💼</span> Recompensa justa pelo trabalho
            </h4>
            <p className="text-sm text-gray-700 mb-2">
              O administrador recebe <span className="font-bold text-green-600">10% do valor total do caixa</span>,
              mas com uma condição importante:
            </p>
            <p className="text-sm text-gray-700 bg-white rounded p-3 border border-amber-300">
              ⚠️ <span className="font-bold">Só recebe ao final se tudo der certo mês a mês!</span>
            </p>
            <p className="text-sm text-gray-700 mt-3">
              Isso significa que o administrador tem um <span className="font-semibold">baita trabalho</span> e uma
              <span className="font-semibold"> grande responsabilidade</span>: garantir que todos paguem, que o grupo
              permaneça unido e que tudo funcione perfeitamente até o fim.
            </p>
            <p className="text-sm text-green-700 font-semibold mt-2">
              É um incentivo perfeito: quanto melhor o trabalho do administrador, maior a recompensa!
            </p>
          </div>
        </Card>

        {/* Tabela Comparativa */}
        <Card>
          <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Diferenciais do Juntix</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Critério</th>
                  <th className="text-center py-3 px-2 font-semibold text-green-700 bg-green-50">Juntix</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-700">Empréstimo Bancário</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-700">Consórcio</th>
                </tr>
              </thead>
              <tbody className="text-xs md:text-sm">
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-2 text-gray-700">Taxa/Juros</td>
                  <td className="py-3 px-2 text-center bg-green-50 font-semibold text-green-700">R$ 10</td>
                  <td className="py-3 px-2 text-center text-red-600">5-15% ao mês</td>
                  <td className="py-3 px-2 text-center text-amber-600">Taxas altas</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-2 text-gray-700">Análise de crédito</td>
                  <td className="py-3 px-2 text-center bg-green-50 font-semibold text-green-700">Não precisa</td>
                  <td className="py-3 px-2 text-center text-red-600">Score alto exigido</td>
                  <td className="py-3 px-2 text-center text-amber-600">Documentação extensa</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-2 text-gray-700">Tempo para receber</td>
                  <td className="py-3 px-2 text-center bg-green-50 font-semibold text-green-700">Até 10 meses</td>
                  <td className="py-3 px-2 text-center text-amber-600">Parcelas com juros</td>
                  <td className="py-3 px-2 text-center text-red-600">Sorteio/lance</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-2 text-gray-700">Processo</td>
                  <td className="py-3 px-2 text-center bg-green-50 font-semibold text-green-700">Digital e rápido</td>
                  <td className="py-3 px-2 text-center text-red-600">Burocrático</td>
                  <td className="py-3 px-2 text-center text-red-600">Demorado</td>
                </tr>
                <tr>
                  <td className="py-3 px-2 text-gray-700">Proteção</td>
                  <td className="py-3 px-2 text-center bg-green-50 font-semibold text-green-700">Fundo devolvido</td>
                  <td className="py-3 px-2 text-center text-red-600">Sem proteção</td>
                  <td className="py-3 px-2 text-center text-red-600">Sem fundo</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Call to Action Final */}
        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white text-center">
          <h3 className="text-2xl font-bold mb-3">🚀 O Juntix é a evolução do caixa tradicional</h3>
          <p className="text-sm leading-relaxed mb-4 text-green-50">
            Mantemos o que sempre funcionou (a força da união e da confiança) e eliminamos o que era
            complicado (desorganização, falta de controle, cobranças manuais).
          </p>
          <p className="text-lg font-semibold">
            Junte-se ao Juntix e realize seus objetivos com a ajuda de quem você confia! 💚
          </p>
        </Card>
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
      {/* Header - Olá, Nome - Administrador • Score: X */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <p className="text-sm text-gray-500">Olá,</p>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
          {usuario?.nome?.split(' ')[0]}
        </h1>
        <Badge variant="info" size="sm">Administrador</Badge>
        <span className="text-sm text-gray-500">• Score: {usuario?.score ?? 70}</span>
      </div>

      {/* Botões de Ação */}
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
            💡 Com Juntix você economiza até <strong className="text-green-600">
              {formatCurrency(economiaMaxima)}
            </strong> (<strong className="text-green-600">32%</strong>) comparado ao agiota!
          </p>
        </Card>
      </motion.div>

      {/* Conteúdo Educacional - Igual ao Participante */}

      {/* Juntix - Contribuição Coletiva Simplificada */}
      <motion.div variants={itemVariants}>
        <Card className="mb-6 bg-gradient-to-br from-green-50 to-emerald-50">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Juntix</h2>
          <p className="text-lg text-green-700 font-semibold mb-4">Contribuição Coletiva Simplificada</p>
          <p className="text-sm text-gray-700 leading-relaxed">
            O Juntix é uma plataforma digital que moderniza o tradicional "caixa" ou "consórcio informal"
            que você já conhece. Transformamos uma prática antiga e confiável em uma experiência
            <span className="font-semibold text-green-700"> 100% digital, segura e transparente</span>.
          </p>
        </Card>
      </motion.div>

      {/* Como funciona? */}
      <motion.div variants={itemVariants}>
        <Card className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-2xl">🔄</span> Como funciona?
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            É simples: um grupo de pessoas de confiança se reúne e todos contribuem com parcelas mensais iguais.
            A cada mês, um participante recebe o valor total acumulado, até que todos tenham recebido sua vez.
            É como uma vaquinha rotativa entre amigos!
          </p>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm font-semibold text-blue-900 mb-2">📊 Exemplo prático:</p>
            <ul className="space-y-1.5 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <span>10 amigos formam um grupo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <span>Cada um paga R$ 1.000 por mês</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <span>Todo mês, um participante recebe R$ 10.000</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <span>Em 10 meses, todos terão recebido</span>
              </li>
            </ul>
          </div>
        </Card>
      </motion.div>

      {/* Principais Vantagens */}
      <motion.div variants={itemVariants}>
        <Card className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">✨ Principais Vantagens</h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <span className="text-2xl">💰</span>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Custo Ultra Baixo</h4>
                <p className="text-sm text-gray-700">
                  Apenas <span className="font-bold text-green-600">R$ 10 de taxa por boleto</span> - muito mais
                  acessível que empréstimos bancários, financiamentos ou consórcios tradicionais.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">🚀</span>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Acesso Rápido a Valores Altos</h4>
                <p className="text-sm text-gray-700">
                  Receba até <span className="font-bold text-green-600">R$ 10.000</span> (ou mais, dependendo do grupo)
                  sem burocracia, análise de crédito ou juros abusivos.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">🤝</span>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Baseado em Confiança</h4>
                <p className="text-sm text-gray-700">
                  Forme grupos com pessoas que você conhece: amigos, familiares, colegas de trabalho.
                  A base é a confiança mútua.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">📱</span>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">100% Digital</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Gestão completa pelo app ou site</li>
                  <li>• Pagamentos via boleto ou PIX </li>
                  <li>• Notificações automáticas</li>
                  <li>• Histórico transparente de todas as transações</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Segurança e Transparência</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Todos veem quem pagou e quem recebeu</li>
                  <li>• Contratos digitais claros</li>
                  <li>• Sistema de lembretes automáticos</li>
                  <li>• Rastreabilidade completa</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Organização Garantida</h4>
                <p className="text-sm text-gray-700">
                  Esqueça planilhas, grupos de WhatsApp confusos e cobranças manuais.
                  O Juntix cuida de toda a gestão para você.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Sem Burocracia</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Não precisa de análise de crédito</li>
                  <li>• Sem consulta ao SPC/Serasa</li>
                  <li>• Sem garantias ou avalistas</li>
                  <li>• Cadastro rápido e simples</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Para quem é ideal? */}
      <motion.div variants={itemVariants}>
        <Card className="mb-6 bg-gradient-to-br from-purple-50 to-pink-50">
          <h3 className="text-xl font-bold text-gray-900 mb-3">🎯 Para quem é ideal?</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✅</span>
              <span>Quem precisa de dinheiro para realizar sonhos (viagem, reforma, casamento)</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✅</span>
              <span>Empreendedores que precisam de capital de giro</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✅</span>
              <span>Quem quer comprar algo parcelado sem juros bancários</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✅</span>
              <span>Grupos que já fazem "caixinha" e querem profissionalizar</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✅</span>
              <span>Quem busca alternativa aos juros altos dos bancos</span>
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Fundo de Reserva */}
      <motion.div variants={itemVariants}>
        <Card className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-3">🛡️ Como funciona o Fundo de Reserva?</h3>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            No primeiro mês, é formado um <span className="font-semibold text-blue-600">Fundo de Reserva</span> para
            garantir a segurança de todos os participantes.
          </p>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">📊 Exemplo prático:</p>
            <ul className="space-y-1.5 text-sm text-gray-700">
              <li>• Valor da parcela: R$ 1.000</li>
              <li>• Grupo de 10 pessoas</li>
              <li>• <span className="font-bold text-green-600">Cada um contribui com apenas R$ 100 extras no 1º mês</span></li>
              <li>• Total do Fundo de Reserva: R$ 1.000</li>
            </ul>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
              <span className="text-xl">🎁</span> O melhor: o Fundo é devolvido!
            </h4>
            <p className="text-sm text-gray-700 mb-3">
              Ao final de <span className="font-bold text-blue-600">10 meses</span> (duração do grupo de 10 participantes),
              o Fundo de Reserva é <span className="font-bold text-green-600">devolvido para todos</span>!
            </p>
            <p className="text-sm text-gray-700 bg-white rounded p-3 border border-green-300">
              💡 <span className="font-semibold">Importante:</span> O fundo é dividido por <span className="font-bold text-blue-600">11 partes</span>
              (10 participantes + Juntix como participante). Essa é a <span className="font-bold text-green-600">única forma de lucro da plataforma</span>,
              o que é totalmente justo! Uma ferramenta fantástica que protege o grupo e ainda permite que a plataforma se sustente.
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Papel do Administrador */}
      <motion.div variants={itemVariants}>
        <Card className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-3">👨‍💼 O Papel do Administrador/Gestor</h3>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            Cada grupo tem um <span className="font-semibold text-blue-600">Administrador</span> responsável por:
          </p>

          <div className="space-y-2 text-sm text-gray-700 mb-4">
            <p className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✅</span>
              <span><span className="font-semibold">Recrutar</span> pessoas de confiança para o grupo</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✅</span>
              <span><span className="font-semibold">Organizar</span> os pagamentos e o calendário</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✅</span>
              <span><span className="font-semibold">Cobrar a adimplência</span> e garantir que todos paguem em dia</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✅</span>
              <span><span className="font-semibold">Engajar</span> o grupo e manter a comunicação ativa</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✅</span>
              <span><span className="font-semibold">Policiar</span> e mediar conflitos se necessário</span>
            </p>
          </div>

          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
              <span className="text-xl">💼</span> Recompensa justa pelo trabalho
            </h4>
            <p className="text-sm text-gray-700 mb-2">
              O administrador recebe <span className="font-bold text-green-600">10% do valor total do caixa</span>,
              mas com uma condição importante:
            </p>
            <p className="text-sm text-gray-700 bg-white rounded p-3 border border-amber-300">
              ⚠️ <span className="font-bold">Só recebe ao final se tudo der certo mês a mês!</span>
            </p>
            <p className="text-sm text-gray-700 mt-3">
              Isso significa que o administrador tem um <span className="font-semibold">baita trabalho</span> e uma
              <span className="font-semibold"> grande responsabilidade</span>: garantir que todos paguem, que o grupo
              permaneça unido e que tudo funcione perfeitamente até o fim.
            </p>
            <p className="text-sm text-green-700 font-semibold mt-2">
              É um incentivo perfeito: quanto melhor o trabalho do administrador, maior a recompensa!
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Tabela Comparativa */}
      <motion.div variants={itemVariants}>
        <Card className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Diferenciais do Juntix</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Critério</th>
                  <th className="text-center py-3 px-2 font-semibold text-green-700 bg-green-50">Juntix</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-700">Empréstimo Bancário</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-700">Consórcio</th>
                </tr>
              </thead>
              <tbody className="text-xs md:text-sm">
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-2 text-gray-700">Taxa/Juros</td>
                  <td className="py-3 px-2 text-center bg-green-50 font-semibold text-green-700">R$ 10</td>
                  <td className="py-3 px-2 text-center text-red-600">5-15% ao mês</td>
                  <td className="py-3 px-2 text-center text-amber-600">Taxas altas</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-2 text-gray-700">Análise de crédito</td>
                  <td className="py-3 px-2 text-center bg-green-50 font-semibold text-green-700">Não precisa</td>
                  <td className="py-3 px-2 text-center text-red-600">Score alto exigido</td>
                  <td className="py-3 px-2 text-center text-amber-600">Documentação extensa</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-2 text-gray-700">Tempo para receber</td>
                  <td className="py-3 px-2 text-center bg-green-50 font-semibold text-green-700">Até 10 meses</td>
                  <td className="py-3 px-2 text-center text-amber-600">Parcelas com juros</td>
                  <td className="py-3 px-2 text-center text-red-600">Sorteio/lance</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-2 text-gray-700">Processo</td>
                  <td className="py-3 px-2 text-center bg-green-50 font-semibold text-green-700">Digital e rápido</td>
                  <td className="py-3 px-2 text-center text-red-600">Burocrático</td>
                  <td className="py-3 px-2 text-center text-red-600">Demorado</td>
                </tr>
                <tr>
                  <td className="py-3 px-2 text-gray-700">Proteção</td>
                  <td className="py-3 px-2 text-center bg-green-50 font-semibold text-green-700">Fundo devolvido</td>
                  <td className="py-3 px-2 text-center text-red-600">Sem proteção</td>
                  <td className="py-3 px-2 text-center text-red-600">Sem fundo</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Call to Action Final */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white text-center">
          <h3 className="text-2xl font-bold mb-3">🚀 O Juntix é a evolução do caixa tradicional</h3>
          <p className="text-sm leading-relaxed mb-4 text-green-50">
            Mantemos o que sempre funcionou (a força da união e da confiança) e eliminamos o que era
            complicado (desorganização, falta de controle, cobranças manuais).
          </p>
          <p className="text-lg font-semibold">
            Junte-se ao Juntix e realize seus objetivos com a ajuda de quem você confia! 💚
          </p>
        </Card>
      </motion.div>
    </motion.div>
  );
}
