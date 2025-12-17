import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { caixasService, splitService } from '../lib/api';
import { formatCurrency } from '../lib/utils';

interface CaixaItem {
  _id: string;
  nome: string;
  tipo?: 'mensal' | 'semanal';
  valorTotal: number;
  qtdParticipantes: number;
  duracaoMeses: number;
}

export default function SplitConfig() {
  const navigate = useNavigate();
  const [caixas, setCaixas] = useState<CaixaItem[]>([]);
  const [selectedCaixaId, setSelectedCaixaId] = useState<string>('');
  const [selectedMes, setSelectedMes] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof splitService.calculate>> | null>(null);

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
          }));
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCaixaId, selectedMes]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Configuração de Split</h1>
        <Button variant="secondary" onClick={() => navigate(-1)}>Voltar</Button>
      </div>

      <Card className="mb-6">
        <div className="grid md:grid-cols-2 gap-4">
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
        </div>
        <div className="mt-4">
          <Button onClick={calcular} disabled={loading}>Recalcular</Button>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/40">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Participantes</p>
            <span className="text-lg font-bold text-gray-900">{selectedCaixa?.qtdParticipantes || 0}</span>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100/40">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Valor do Caixa</p>
            <span className="text-lg font-bold text-green-700">{formatCurrency(selectedCaixa?.valorTotal || 0)}</span>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-violet-50 to-violet-100/40">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Meses</p>
            <span className="text-lg font-bold text-gray-900">{selectedCaixa?.duracaoMeses || 0}</span>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Distribuição do Split</h3>
          <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {result?.tipoParcela || '—'}
          </span>
        </div>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Valor da Parcela</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(result?.valorParcela || 0)}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Total Arrecadado ({selectedCaixa?.qtdParticipantes || 0} participantes)</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(result?.totalArrecadado || 0)}</p>
          </div>
        </div>

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
    </div>
  );
}

