import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { caixasService, splitService, bancosService, participantesService, splitConfigService } from '../lib/api';
import { formatCurrency } from '../lib/utils';

interface CaixaItem {
  _id: string;
  nome: string;
  tipo?: 'mensal' | 'semanal';
  valorTotal: number;
  qtdParticipantes: number;
  duracaoMeses: number;
  diaVencimento?: number;
  dataInicio?: string;
  status?: string;
}

export default function SplitConfig() {
  const navigate = useNavigate();
  const [caixas, setCaixas] = useState<CaixaItem[]>([]);
  const [selectedCaixaId, setSelectedCaixaId] = useState<string>('');
  const [selectedMes, setSelectedMes] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof splitService.calculate>> | null>(null);
  const [saving, setSaving] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [taxaServicoSubId, setTaxaServicoSubId] = useState<string>('');
  const [fundoReservaSubId, setFundoReservaSubId] = useState<string>('');
  const [adminSubId, setAdminSubId] = useState<string>('');
  const [pjPrincipalInfo, setPjPrincipalInfo] = useState<any | null>(null);
  const [fundoInfo, setFundoInfo] = useState<any | null>(null);
  const [adminInfo, setAdminInfo] = useState<any | null>(null);
  const [participantesOrdem, setParticipantesOrdem] = useState<Array<{ id: string; nome: string }>>([]);
  const [existingConfig, setExistingConfig] = useState<any | null>(null);
  const [mesPaymentsSum, setMesPaymentsSum] = useState<number>(0);
  const [prevMesPaymentsSum, setPrevMesPaymentsSum] = useState<number>(0);

  useEffect(() => {
    const loadCaixas = async () => {
      try {
        const resp = await caixasService.getAll();
        const list = Array.isArray(resp) ? resp : resp.caixas || [];
        const normalized = (list || [])
          .filter((c: any) => c && c._id)
          .map((c: any) => ({
            _id: String(c._id),
            nome: String(c.nome || ''),
            tipo: c.tipo === 'semanal' ? 'semanal' : 'mensal',
            valorTotal: Number(c.valorTotal || 0),
            qtdParticipantes: Number(c.qtdParticipantes || 0),
            duracaoMeses: Number(c.duracaoMeses || 0),
            diaVencimento: typeof c.diaVencimento === 'number' ? c.diaVencimento : undefined,
            dataInicio: typeof c.dataInicio === 'string' ? c.dataInicio : (c.createdAt || undefined),
            status: String(c.status || ''),
          }))
          .filter((c: CaixaItem) => c.status?.toLowerCase() === 'ativo');
        setCaixas(normalized);
        if (normalized.length) {
          setSelectedCaixaId(normalized[0]._id);
          setSelectedMes(1);
        }
      } catch (e: any) {
        setError(e?.message || 'Erro ao carregar caixas');
      }
    };
    loadCaixas();
  }, []);

  useEffect(() => {
    const fetchPrincipalAccount = async () => {
      try {
        const resp = await bancosService.getAccounts();
        const account = Array.isArray(resp?.accounts) ? resp.accounts[0] : null;
        setPjPrincipalInfo(account);
      } catch {}
    };
    fetchPrincipalAccount();
  }, []);

  const selectedCaixa = useMemo(() => caixas.find((c) => c._id === selectedCaixaId), [caixas, selectedCaixaId]);

  const calcular = async () => {
    if (!selectedCaixaId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await splitService.calculate({ caixaId: selectedCaixaId, mes: selectedMes });
      setResult(data);
    } catch (e: any) {
      setError(e?.message || 'Erro ao calcular split');
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
          const cfg = await splitConfigService.getByCaixa(selectedCaixaId);
          const data = cfg?.config || null;
          setExistingConfig(data);
          if (data) {
            setTaxaServicoSubId(data.taxaServicoSubId || '');
            setFundoReservaSubId(data.fundoReservaSubId || '');
            setAdminSubId(data.adminSubId || '');
          }
        } catch {}
        try {
          const resp = await participantesService.getByCaixa(selectedCaixaId);
          const list = Array.isArray(resp) ? resp : resp.participantes || [];
          const ordered = (list || [])
            .map((p: any) => ({ id: String(p._id || ''), nome: String(p.usuarioId?.nome || p.nome || ''), posicao: Number(p.posicao || 0) }))
            .filter(p => p.id)
            .sort((a, b) => (a.posicao || 0) - (b.posicao || 0));
          setParticipantesOrdem(ordered.map(o => ({ id: o.id, nome: o.nome })));
        } catch {}
        // Pagamentos do mês selecionado e anterior
        try {
          const pagosResp = await pagamentosService.getByCaixaMes(selectedCaixaId, selectedMes);
          const lista = Array.isArray(pagosResp) ? pagosResp : pagosResp.pagamentos || pagosResp.data || [];
          const sumPaid = (lista || []).reduce((sum: number, p: any) => {
            const status = String(p.status || '').toLowerCase();
            const isPaid = ['aprovado','pago','paid','liquidated','settled','pago_gateway'].includes(status);
            const valor = typeof p.valorParcela === 'number' ? p.valorParcela : (typeof p.valor === 'number' ? p.valor : 0);
            return sum + (isPaid ? valor : 0);
          }, 0);
          setMesPaymentsSum(sumPaid);
        } catch {}
        try {
          if (selectedMes > 1) {
            const prevResp = await pagamentosService.getByCaixaMes(selectedCaixaId, selectedMes - 1);
            const prevList = Array.isArray(prevResp) ? prevResp : prevResp.pagamentos || prevResp.data || [];
            const prevSum = (prevList || []).reduce((sum: number, p: any) => {
              const status = String(p.status || '').toLowerCase();
              const isPaid = ['aprovado','pago','paid','liquidated','settled','pago_gateway'].includes(status);
              const valor = typeof p.valorParcela === 'number' ? p.valorParcela : (typeof p.valor === 'number' ? p.valor : 0);
              return sum + (isPaid ? valor : 0);
            }, 0);
            setPrevMesPaymentsSum(prevSum);
          } else {
            setPrevMesPaymentsSum(0);
          }
        } catch {}
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCaixaId, selectedMes]);

  const handleFetchFundoInfo = async (id: string) => {
    try {
      setConfigError(null);
      const resp = await bancosService.getAccounts(id);
      const account = Array.isArray(resp?.accounts) ? resp.accounts[0] : null;
      setFundoInfo(account);
    } catch (e: any) {
      setConfigError(e?.message || 'Erro ao carregar subconta do fundo de reserva');
      setFundoInfo(null);
    }
  };

  const handleFetchAdminInfo = async (id: string) => {
    try {
      setConfigError(null);
      const resp = await bancosService.getAccounts(id);
      const account = Array.isArray(resp?.accounts) ? resp.accounts[0] : null;
      setAdminInfo(account);
    } catch (e: any) {
      setConfigError(e?.message || 'Erro ao carregar subconta do administrador');
      setAdminInfo(null);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedCaixaId) return;
    try {
      setSaving(true);
      setConfigError(null);
      // Validação: exige dados carregados de fundo e admin
      if (!fundoReservaSubId || !adminSubId) {
        setConfigError('Informe os IDs do Fundo de Reserva e do Administrador/Gestor do Caixa.');
        return;
      }
      if (!fundoInfo) {
        await handleFetchFundoInfo(fundoReservaSubId);
      }
      if (!adminInfo) {
        await handleFetchAdminInfo(adminSubId);
      }
      if (!fundoInfo || !adminInfo) {
        setConfigError('Carregue corretamente os dados das subcontas de Fundo de Reserva e Administrador antes de salvar.');
        return;
      }
      const payload = {
        taxaServicoSubId: taxaServicoSubId || undefined,
        fundoReservaSubId: fundoReservaSubId || undefined,
        adminSubId: adminSubId || undefined,
        participantesMesOrdem: participantesOrdem.map(p => p.id),
      };
      const resp = await splitConfigService.saveForCaixa(selectedCaixaId, payload);
      setExistingConfig(resp?.config || payload);
      // Limpar campos após salvar
      setFundoReservaSubId('');
      setAdminSubId('');
      // Recarregar infos salvas para exibir nomes
      if (resp?.config?.fundoReservaSubId) {
        try {
          const r = await bancosService.getAccounts(resp.config.fundoReservaSubId);
          const a = Array.isArray(r?.accounts) ? r.accounts[0] : null;
          setFundoInfo(a);
        } catch {}
      }
      if (resp?.config?.adminSubId) {
        try {
          const r = await bancosService.getAccounts(resp.config.adminSubId);
          const a = Array.isArray(r?.accounts) ? r.accounts[0] : null;
          setAdminInfo(a);
        } catch {}
      }
    } catch (e: any) {
      setConfigError(e?.message || 'Erro ao salvar configuração de split');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Configuração de Split</h1>
        <Button variant="secondary" onClick={() => navigate(-1)}>Voltar</Button>
      </div>

      {/* Selecione o Caixa primeiro */}
      <Card className="mb-6">
        <div className="grid md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o Caixa</label>
            <select
              value={selectedCaixaId}
              onChange={(e) => setSelectedCaixaId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {caixas.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.nome} - {formatCurrency(c.valorTotal)} ({c.tipo})
                </option>
              ))}
            </select>
          </div>
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
      </Card>

      {/* Configuração de Split abaixo */}
      <Card className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Configuração de Split</h3>
        {configError && <p className="text-sm text-red-600 mb-2">{configError}</p>}
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">EMPRESA RESPONSÁVEL PELA TAXA DE SERVIÇO</p>
            <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
              <p className="text-sm text-gray-700">
                {pjPrincipalInfo?.owner?.name || 'ISS SOFTWARE QUALITY SOLUTIONS (CAIXA JUNTO)'}
              </p>
              <p className="text-xs text-gray-500">
                {pjPrincipalInfo?.owner?.cpfCnpj || '39997807000186'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RESPONSÁVEL PELO FUNDO DE RESERVA</label>
            <div className="grid md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="ID da subconta (subrecipientid)"
                value={fundoReservaSubId}
                onChange={(e) => setFundoReservaSubId(e.target.value)}
                onBlur={() => fundoReservaSubId && handleFetchFundoInfo(fundoReservaSubId)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <div className="md:col-span-2 rounded-lg border border-gray-200 p-3 bg-gray-50">
                {fundoInfo ? (
                  <div className="text-sm text-gray-700">
                    <p>{fundoInfo.owner?.name} • {fundoInfo.owner?.cpfCnpj}</p>
                    <p className="text-xs text-gray-500">{fundoInfo.bank?.code} - {fundoInfo.bank?.name} • Ag {fundoInfo.agency?.number}-{fundoInfo.agency?.dv} • Conta {fundoInfo.account?.type} {fundoInfo.account?.number}-{fundoInfo.account?.dv}</p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Informe o ID e saia do campo para carregar os dados</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Administrador/Gestor do Caixa</label>
            <div className="grid md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="ID da subconta (subrecipientid)"
                value={adminSubId}
                onChange={(e) => setAdminSubId(e.target.value)}
                onBlur={() => adminSubId && handleFetchAdminInfo(adminSubId)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <div className="md:col-span-2 rounded-lg border border-gray-200 p-3 bg-gray-50">
                {adminInfo ? (
                  <div className="text-sm text-gray-700">
                    <p>{adminInfo.owner?.name} • {adminInfo.owner?.cpfCnpj}</p>
                    <p className="text-xs text-gray-500">{adminInfo.bank?.code} - {adminInfo.bank?.name} • Ag {adminInfo.agency?.number}-{adminInfo.agency?.dv} • Conta {adminInfo.account?.type} {adminInfo.account?.number}-{adminInfo.account?.dv}</p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Informe o ID e saia do campo para carregar os dados</p>
                )}
              </div>
            </div>
          </div>

          {/* Removido bloco redundante de "Participante contemplado no mês 1" */}

          <div className="flex gap-3">
            <Button onClick={handleSaveConfig} disabled={saving || !selectedCaixaId}>{saving ? 'Salvando...' : 'Salvar Configuração'}</Button>
          </div>

          {existingConfig && (
            <div className="mt-4 rounded-lg border border-gray-200 p-3">
              <p className="text-sm font-medium text-gray-800">Configuração salva</p>
              <div className="grid md:grid-cols-2 gap-2 text-xs text-gray-700 mt-2">
                <div>
                  <p>Taxa Serviço: {pjPrincipalInfo?.owner?.cpfCnpj || '39997807000186'}</p>
                  <p className="text-gray-500">{pjPrincipalInfo?.owner?.name || 'ISS SOFTWARE QUALITY SOLUTIONS (CAIXA JUNTO)'}</p>
                </div>
                <div>
                  <p>Fundo Reserva: {existingConfig.fundoReservaSubId || '—'}</p>
                  <p className="text-gray-500">{fundoInfo?.owner?.name || '—'}</p>
                </div>
                <div>
                  <p>Administrador: {existingConfig.adminSubId || '—'}</p>
                  <p className="text-gray-500">{adminInfo?.owner?.name || '—'}</p>
                </div>
                <div>
                  <p>Participantes: {(existingConfig.participantesMesOrdem || []).length}</p>
                </div>
              </div>
              {/* Ordem de classificação e cronograma */}
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-800 mb-2">Ordem de contemplação e previsão</p>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-600">#</th>
                        <th className="px-3 py-2 text-left text-gray-600">Participante</th>
                        <th className="px-3 py-2 text-left text-gray-600">ID</th>
                        <th className="px-3 py-2 text-left text-gray-600">Data Prevista</th>
                        <th className="px-3 py-2 text-right text-gray-600">Valor a receber</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(participantesOrdem || []).map((p, idx) => {
                        const dia = selectedCaixa?.diaVencimento || 10;
                        const start = selectedCaixa?.dataInicio ? new Date(selectedCaixa.dataInicio) : new Date();
                        // data prevista = mês inicial + idx, no dia de vencimento
                        const d = new Date(start);
                        d.setMonth(d.getMonth() + idx);
                        d.setDate(dia);
                        const dataPrevista = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
                        const valorReceber = selectedCaixa?.valorTotal || 0;
                        return (
                          <tr key={p.id} className="border-t border-gray-100">
                            <td className="px-3 py-2">{idx + 1}</td>
                            <td className="px-3 py-2">{p.nome}</td>
                            <td className="px-3 py-2 text-gray-500">{p.id}</td>
                            <td className="px-3 py-2">{dataPrevista}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(valorReceber)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
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
        const mesesTotal = selectedCaixa?.duracaoMeses || 0;
        const mesLabel = `${selectedMes}/${mesesTotal || 0}`;
        return (
          <div className="mb-6 space-y-4">
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100/40">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Participantes</p>
                  <span className="text-lg font-bold text-gray-900">{selectedCaixa?.qtdParticipantes || 0}</span>
                </div>
              </Card>
              <Card className="bg-gradient-to-br from-violet-50 to-violet-100/40">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Meses</p>
                  <span className="text-lg font-bold text-gray-900">{selectedCaixa?.duracaoMeses || 0}</span>
                </div>
              </Card>
              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/40">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Mês selecionado</p>
                  <span className="text-lg font-bold text-gray-900">{mesLabel}</span>
                </div>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100/40">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Valor do Caixa</p>
                  <span className="text-lg font-bold text-green-700">{formatCurrency(selectedCaixa?.valorTotal || 0)}</span>
                </div>
              </Card>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-gray-50 to-gray-100/40">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Valor da Parcela</p>
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
                  <p className="text-sm text-gray-600">Valor Fundo de Reserva</p>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(fundoValor)}</span>
                </div>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100/40">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Valor repasse ao Participante</p>
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
      {/* Métricas removidas (já exibimos acima em cards) */}
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
          <div className="mb-6 grid md:grid-cols-4 gap-4">
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
        <div className="grid md:grid-cols-3 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Mês 1 (Primeira)</p>
            <p className="text-sm text-gray-800">Participante 82,99%</p>
            <p className="text-sm text-gray-800">Taxa de Serviço 0,41%</p>
            <p className="text-sm text-gray-800">Fundo de Reserva 16,60%</p>
            <p className="text-sm text-gray-800">Administrador 0%</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Intermediárias</p>
            <p className="text-sm text-gray-800">Participante 99,50%</p>
            <p className="text-sm text-gray-800">Taxa de Serviço 0,50%</p>
            <p className="text-sm text-gray-400">Fundo de Reserva 0%</p>
            <p className="text-sm text-gray-400">Administrador 0%</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Mês Final (Última)</p>
            <p className="text-sm text-gray-800">Participante 90,50%</p>
            <p className="text-sm text-gray-800">Taxa de Serviço 0,45%</p>
            <p className="text-sm text-gray-800">Administrador 9,05%</p>
            <p className="text-sm text-gray-400">Fundo de Reserva 0%</p>
          </div>
        </div>
      </Card>

      
    </div>
  );
}
