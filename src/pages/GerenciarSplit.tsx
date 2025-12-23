import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { caixasService, splitService, pagamentosService, participantesService, splitConfigService } from '../lib/api';
import { formatCurrency } from '../lib/utils';

type ExistingSplitConfig = {
    taxaServicoSubId?: string;
    fundoReservaSubId?: string;
    adminSubId?: string;
    participantesMesOrdem?: string[];
};

const asRecord = (v: unknown): Record<string, unknown> =>
    typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};

const toStringSafe = (v: unknown, fallback = ''): string =>
    typeof v === 'string' ? v : v === null || v === undefined ? fallback : String(v);

const toNumberSafe = (v: unknown, fallback = 0): number => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
};

const getErrorMessage = (e: unknown, fallback: string): string => {
    const rec = asRecord(e);
    const msg = rec.message;
    return typeof msg === 'string' && msg.trim().length > 0 ? msg : fallback;
};

interface CaixaItem {
    _id: string;
    nome: string;
    tipo?: 'mensal' | 'semanal';
    valorTotal: number;
    valorParcela?: number;
    taxaServico?: number;
    qtdParticipantes: number;
    duracaoMeses: number;
    diaVencimento?: number;
    dataInicio?: string;
    status?: string;
}

export default function GerenciarSplit() {
    const navigate = useNavigate();
    const [caixas, setCaixas] = useState<CaixaItem[]>([]);
    const [selectedCaixaId, setSelectedCaixaId] = useState<string>('');
    const [selectedMes, setSelectedMes] = useState<number>(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<Awaited<ReturnType<typeof splitService.calculate>> | null>(null);
    const [participantesOrdem, setParticipantesOrdem] = useState<Array<{ id: string; nome: string }>>([]);
    const [mesPaymentsSum, setMesPaymentsSum] = useState<number>(0);
    const [prevMesPaymentsSum, setPrevMesPaymentsSum] = useState<number>(0);

    useEffect(() => {
        const loadCaixas = async () => {
            try {
                const resp = await caixasService.getAll();
                const respRec = asRecord(resp);
                const list = Array.isArray(resp) ? resp : Array.isArray(respRec.caixas) ? respRec.caixas : [];
                const normalized = (list || [])
                    .filter((c) => {
                        const rec = asRecord(c);
                        return Boolean(rec._id);
                    })
                    .map((c) => {
                        const rec = asRecord(c);
                        return {
                            _id: toStringSafe(rec._id),
                            nome: toStringSafe(rec.nome),
                            tipo: rec.tipo === 'semanal' ? 'semanal' : 'mensal',
                            valorTotal: toNumberSafe(rec.valorTotal, 0),
                            valorParcela: toNumberSafe(rec.valorParcela, 0) || undefined,
                            taxaServico: toNumberSafe(rec.taxaServico, 0) || undefined,
                            qtdParticipantes: toNumberSafe(rec.qtdParticipantes, 0),
                            duracaoMeses: toNumberSafe(rec.duracaoMeses, 0),
                            diaVencimento:
                                typeof rec.diaVencimento === 'number'
                                    ? rec.diaVencimento
                                    : undefined,
                            dataInicio:
                                typeof rec.dataInicio === 'string'
                                    ? rec.dataInicio
                                    : typeof rec.createdAt === 'string'
                                        ? rec.createdAt
                                        : undefined,
                            status: toStringSafe(rec.status),
                        } satisfies CaixaItem;
                    })
                    .filter((c: CaixaItem) => {
                        const status = c.status?.toLowerCase();
                        return status === 'ativo' || status === 'completo' || status === 'pausado';
                    });
                setCaixas(normalized);
                if (normalized.length) {
                    setSelectedCaixaId(normalized[0]._id);
                    setSelectedMes(1);
                }
            } catch (e: unknown) {
                setError(getErrorMessage(e, 'Erro ao carregar caixas'));
            }
        };
        loadCaixas();
    }, []);

    const selectedCaixa = useMemo(() => caixas.find((c) => c._id === selectedCaixaId), [caixas, selectedCaixaId]);

    const calcular = async () => {
        if (!selectedCaixaId) return;
        try {
            setLoading(true);
            setError(null);
            const data = await splitService.calculate({ caixaId: selectedCaixaId, mes: selectedMes });
            setResult(data);
        } catch (e: unknown) {
            setError(getErrorMessage(e, 'Erro ao calcular split'));
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedCaixaId) {
            calcular();
            (async () => {
                try {
                    const resp = await participantesService.getByCaixa(selectedCaixaId);
                    const respRec = asRecord(resp);
                    const list = Array.isArray(resp)
                        ? resp
                        : Array.isArray(respRec.participantes)
                            ? respRec.participantes
                            : [];
                    const ordered = (list || [])
                        .map((p) => {
                            const pRec = asRecord(p);
                            const usuarioId = asRecord(pRec.usuarioId);
                            return {
                                id: toStringSafe(pRec._id),
                                nome: toStringSafe(usuarioId.nome || pRec.nome),
                                posicao: toNumberSafe(pRec.posicao, 0),
                            };
                        })
                        .filter((p: { id: string }) => p.id)
                        .sort(
                            (
                                a: { posicao: number },
                                b: { posicao: number },
                            ) => (a.posicao || 0) - (b.posicao || 0),
                        );
                    setParticipantesOrdem(
                        ordered.map((o: { id: string; nome: string }) => ({
                            id: o.id,
                            nome: o.nome,
                        })),
                    );
                } catch {
                    void 0;
                }
                // Pagamentos do mês selecionado e anterior
                try {
                    const pagosResp = await pagamentosService.getByCaixaMes(selectedCaixaId, selectedMes);
                    const pagosRec = asRecord(pagosResp);
                    const lista = Array.isArray(pagosResp)
                        ? pagosResp
                        : Array.isArray(pagosRec.pagamentos)
                            ? pagosRec.pagamentos
                            : Array.isArray(pagosRec.data)
                                ? pagosRec.data
                                : [];
                    const sumPaid = (lista || []).reduce((sum: number, p) => {
                        const pRec = asRecord(p);
                        const status = toStringSafe(pRec.status).toLowerCase();
                        const isPaid = ['aprovado', 'pago', 'paid', 'liquidated', 'settled', 'pago_gateway'].includes(status);
                        const valor =
                            typeof pRec.valorParcela === 'number'
                                ? Number(pRec.valorParcela)
                                : typeof pRec.valor === 'number'
                                    ? Number(pRec.valor)
                                    : 0;
                        return sum + (isPaid ? valor : 0);
                    }, 0);
                    setMesPaymentsSum(sumPaid);
                } catch {
                    void 0;
                }
                try {
                    if (selectedMes > 1) {
                        const prevResp = await pagamentosService.getByCaixaMes(selectedCaixaId, selectedMes - 1);
                        const prevRec = asRecord(prevResp);
                        const prevList = Array.isArray(prevResp)
                            ? prevResp
                            : Array.isArray(prevRec.pagamentos)
                                ? prevRec.pagamentos
                                : Array.isArray(prevRec.data)
                                    ? prevRec.data
                                    : [];
                        const prevSum = (prevList || []).reduce((sum: number, p) => {
                            const pRec = asRecord(p);
                            const status = toStringSafe(pRec.status).toLowerCase();
                            const isPaid = ['aprovado', 'pago', 'paid', 'liquidated', 'settled', 'pago_gateway'].includes(status);
                            const valor =
                                typeof pRec.valorParcela === 'number'
                                    ? Number(pRec.valorParcela)
                                    : typeof pRec.valor === 'number'
                                        ? Number(pRec.valor)
                                        : 0;
                            return sum + (isPaid ? valor : 0);
                        }, 0);
                        setPrevMesPaymentsSum(prevSum);
                    } else {
                        setPrevMesPaymentsSum(0);
                    }
                } catch {
                    void 0;
                }
            })();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCaixaId, selectedMes]);

    return (
        <div className="max-w-5xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900">Gerenciar Split</h1>
                <Button variant="secondary" onClick={() => navigate(-1)}>Voltar</Button>
            </div>

            {/* Selecione o Caixa primeiro */}
            <Card className="mb-6">
                <div className="grid md:grid-cols-2 gap-4 items-end">
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o Caixa</label>
                        <select
                            value={selectedCaixaId}
                            onChange={(e) => setSelectedCaixaId(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                        >
                            {caixas.map((c) => (
                                <option key={c._id} value={c._id}>
                                    {c.nome} - {formatCurrency(c.valorTotal)} ({c.tipo})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Período ({selectedCaixa?.tipo || 'mensal'})</label>
                            <select
                                value={selectedMes}
                                onChange={(e) => setSelectedMes(parseInt(e.target.value, 10))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {Array.from({ length: selectedCaixa?.duracaoMeses || 0 }).map((_, idx) => {
                                    const mes = idx + 1;
                                    const tipo = mes === 1 ? 'Primeira' : mes === (selectedCaixa?.duracaoMeses || 0) ? 'Última' : 'Intermediária';
                                    return (
                                        <option key={mes} value={mes}>
                                            Mês {mes} ({tipo})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                        <div className="flex md:justify-end">
                            <Button onClick={calcular} disabled={loading}>Recalcular</Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* 8 cards: 4 + 4 */}
            {(() => {
                const dist = result?.distribuicao || [];
                const valorParcela = result?.valorParcela || 0;
                const totalArrecadado = result?.totalArrecadado || 0;
                const taxaValor = dist.find((d) => d.chave === 'taxa')?.valor || 0;
                const fundoValor = dist.find((d) => d.chave === 'fundo_reserva')?.valor || 0;
                const participanteValor = dist.find((d) => d.chave === 'participante')?.valor || 0;
                const sistemaValor = taxaValor + fundoValor;
                const mesesTotal = selectedCaixa?.duracaoMeses || 0;
                const mesLabel = `${selectedMes}/${mesesTotal || 0}`;
                const participantesQtd = selectedCaixa?.qtdParticipantes || 0;
                const valorParcelaBase =
                    participantesQtd > 0
                        ? Number(selectedCaixa?.valorParcela || (selectedCaixa?.valorTotal || 0) / participantesQtd)
                        : 0;
                const taxaServico = typeof selectedCaixa?.taxaServico === 'number' ? selectedCaixa.taxaServico : 5;
                return (
                    <div className="mb-6 space-y-4">
                        <div className="grid md:grid-cols-4 gap-4">
                            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/40">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Participantes</p>
                                        <span className="text-lg font-bold text-gray-900">{participantesQtd}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-600">Mês selecionado</p>
                                        <span className="text-lg font-bold text-gray-900">{mesLabel}</span>
                                    </div>
                                </div>
                            </Card>
                            <Card className="bg-gradient-to-br from-green-50 to-green-100/40">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-600">Valor do Caixa</p>
                                    <span className="text-lg font-bold text-green-700">{formatCurrency(selectedCaixa?.valorTotal || 0)}</span>
                                </div>
                            </Card>
                            <Card className="bg-gradient-to-br from-gray-50 to-gray-100/40">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-600">Valor da Parcela (base)</p>
                                    <span className="text-lg font-bold text-gray-900">{formatCurrency(valorParcelaBase)}</span>
                                </div>
                            </Card>
                            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/40">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-600">Taxa de Serviço</p>
                                    <span className="text-lg font-bold text-gray-900">{formatCurrency(taxaServico)}</span>
                                </div>
                            </Card>
                        </div>
                        <div className="grid md:grid-cols-4 gap-4">
                            <Card className="bg-gradient-to-br from-gray-50 to-gray-100/40">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-600">Valor da Parcela com adicionais</p>
                                    <span className="text-lg font-bold text-gray-900">{formatCurrency(valorParcela)}</span>
                                </div>
                            </Card>
                            <Card className="bg-gradient-to-br from-gray-50 to-gray-100/40">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-600">Total Arrecadado</p>
                                    <span className="text-lg font-bold text-gray-900">{formatCurrency(totalArrecadado)}</span>
                                </div>
                            </Card>
                            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/40">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-600">Fundo de Reserva + Taxa de Serviço (Sistema)</p>
                                    <span className="text-lg font-bold text-gray-900">{formatCurrency(sistemaValor)}</span>
                                </div>
                            </Card>
                            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/40">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-600">Repasse ao Participante</p>
                                    <span className="text-lg font-bold text-gray-900">{formatCurrency(participanteValor)}</span>
                                </div>
                            </Card>
                        </div>
                    </div>
                );
            })()}

            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Distribuição do Split</h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {result?.tipoParcela || '—'}
                    </span>
                </div>
                {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
                <div className="divide-y">
                    {result?.distribuicao.map((d) => (
                        <div key={d.chave} className="py-3 flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-800">{d.descricao}</p>
                                {d.recipientId && (
                                    <p className="text-xs text-gray-500">ID: {d.recipientId}</p>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-semibold text-blue-700">{d.percentual}%</p>
                                <p className="text-sm text-gray-700">{formatCurrency(d.valor)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Cards grandes: Próximo contemplado e Último contemplado */}
            {(() => {
                const dist = result?.distribuicao || [];
                const pctPart = dist.find((d) => d.chave === 'participante')?.percentual || 0;
                const repasseTarget = dist.find((d) => d.chave === 'participante')?.valor || 0;
                const repasseAtual = Math.round((mesPaymentsSum * (pctPart / 100)) * 100) / 100;
                const repasseAnterior = Math.round((prevMesPaymentsSum * (pctPart / 100)) * 100) / 100;
                const proximo = participantesOrdem[selectedMes - 1];
                const anterior = selectedMes > 1 ? participantesOrdem[selectedMes - 2] : undefined;
                const progress = repasseTarget > 0 ? Math.min(100, Math.round((repasseAtual / repasseTarget) * 100)) : 0;
                return (
                    <div className="mb-6 grid md:grid-cols-4 gap-4 mt-6">
                        <Card className="md:col-span-2 p-4 bg-white">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-gray-900">Próximo Contemplado</h4>
                                <span className="text-xs text-gray-500">Mês {selectedMes}</span>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{proximo?.nome || '—'}</p>
                            <p className="text-xs text-gray-500">Repasse alvo: {formatCurrency(repasseTarget)}</p>
                            <div className="mt-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Valor acumulado</span>
                                    <span className="text-sm font-semibold text-green-700">{formatCurrency(repasseAtual)}</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full mt-2">
                                    <div className="h-2 bg-green-500 rounded-full" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        </Card>
                        <Card className="md:col-span-2 p-4 bg-white">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-gray-900">Contemplado Anterior</h4>
                                <span className="text-xs text-gray-500">Mês {selectedMes - 1}</span>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{anterior?.nome || '—'}</p>
                            <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                <span>Contemplado</span>
                                <span>•</span>
                                <span>{formatCurrency(repasseAnterior)}</span>
                            </div>
                        </Card>
                    </div>
                );
            })()}

            <Card className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Percentuais do Split</h3>
                {(() => {
                    const participantesQtd = selectedCaixa?.qtdParticipantes || 0;
                    const mesesTotal = selectedCaixa?.duracaoMeses || 0;
                    const valorCaixa = selectedCaixa?.valorTotal || 0;
                    const base =
                        participantesQtd > 0
                            ? Number(selectedCaixa?.valorParcela || valorCaixa / participantesQtd)
                            : 0;
                    const taxaServico = typeof selectedCaixa?.taxaServico === 'number' ? selectedCaixa.taxaServico : 5;
                    const taxaAdminPct = 0.1;

                    const pct = (mes: number) => {
                        if (!participantesQtd || !mesesTotal) return null;
                        const isPrimeira = mes === 1;
                        const isUltima = mes === mesesTotal;
                        const fundo = isPrimeira ? base / participantesQtd : 0;
                        const admin = isUltima ? (valorCaixa * taxaAdminPct) / participantesQtd : 0;
                        const total = base + taxaServico + fundo + admin;
                        if (total <= 0) return null;
                        const pctTaxa = Number(((taxaServico / total) * 100).toFixed(2));
                        const pctFundo = Number(((fundo / total) * 100).toFixed(2));
                        const pctAdmin = Number(((admin / total) * 100).toFixed(2));
                        const pctPart = Number((100 - pctTaxa - pctFundo - pctAdmin).toFixed(2));
                        return { pctPart, pctTaxa, pctFundo, pctAdmin };
                    };

                    const p1 = pct(1);
                    const pMid = mesesTotal > 2 ? pct(2) : pct(1);
                    const pLast = mesesTotal ? pct(mesesTotal) : null;

                    return (
                        <div className="grid md:grid-cols-3 gap-3">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">Mês 1 (Primeira)</p>
                                <p className="text-sm text-gray-800">Participante {p1 ? `${p1.pctPart}%` : '—'}</p>
                                <p className="text-sm text-gray-800">Taxa de Serviço {p1 ? `${p1.pctTaxa}%` : '—'}</p>
                                <p className="text-sm text-gray-800">Fundo de Reserva {p1 ? `${p1.pctFundo}%` : '—'}</p>
                                <p className="text-sm text-gray-800">Administrador {p1 ? `${p1.pctAdmin}%` : '—'}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">Intermediárias</p>
                                <p className="text-sm text-gray-800">Participante {pMid ? `${pMid.pctPart}%` : '—'}</p>
                                <p className="text-sm text-gray-800">Taxa de Serviço {pMid ? `${pMid.pctTaxa}%` : '—'}</p>
                                <p className="text-sm text-gray-400">Fundo de Reserva {pMid ? `${pMid.pctFundo}%` : '—'}</p>
                                <p className="text-sm text-gray-400">Administrador {pMid ? `${pMid.pctAdmin}%` : '—'}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">Mês Final (Última)</p>
                                <p className="text-sm text-gray-800">Participante {pLast ? `${pLast.pctPart}%` : '—'}</p>
                                <p className="text-sm text-gray-800">Taxa de Serviço {pLast ? `${pLast.pctTaxa}%` : '—'}</p>
                                <p className="text-sm text-gray-800">Administrador {pLast ? `${pLast.pctAdmin}%` : '—'}</p>
                                <p className="text-sm text-gray-400">Fundo de Reserva {pLast ? `${pLast.pctFundo}%` : '—'}</p>
                            </div>
                        </div>
                    );
                })()}
            </Card>

        </div>
    );
}
