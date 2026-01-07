import { useEffect, useState } from 'react';
import { transacoesService } from '../../../lib/api';

interface TransacaoDetalhada {
    caixaNome: string;
    parcela: string;
    mesReferencia: number;
    valorParcela: number;
    duracaoMeses: number;
    nomeCliente: string;
    dataTransacao: Date;
    tipoRecipient: 'taxa' | 'admin' | 'participante';
    recipientNome: string;
    descricao: string;
}

export function TransacoesDetalhadas() {
    const [transacoes, setTransacoes] = useState<TransacaoDetalhada[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTransacoes = async () => {
            try {
                setLoading(true);
                const data = await transacoesService.getDetalhadas();
                setTransacoes(data);
            } catch (err: any) {
                console.error('Erro ao buscar transações:', err);
                setError(err.response?.data?.message || 'Erro ao carregar transações');
            } finally {
                setLoading(false);
            }
        };

        fetchTransacoes();
    }, []);

    const formatarData = (data: Date) => {
        return new Date(data).toLocaleDateString('pt-BR');
    };

    const formatarValor = (valor: number) => {
        return `R$ ${(valor / 100).toFixed(2)}`;
    };

    const calcularTotal = () => {
        return transacoes.reduce((acc, t) => acc + t.valorParcela, 0);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Detalhes das Transações Pendentes</h3>
                <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Carregando transações...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Detalhes das Transações Pendentes</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    {error}
                </div>
            </div>
        );
    }

    if (transacoes.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Detalhes das Transações Pendentes</h3>
                <div className="text-center py-8 text-gray-500">
                    Nenhuma transação pendente encontrada.
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Detalhes das Transações Pendentes</h3>
                <div className="text-sm text-gray-600">
                    Total: {transacoes.length} transação(ões)
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Caixa
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Parcela
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Mês Ref.
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Cliente
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Beneficiário
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Valor
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Data
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {transacoes.map((transacao, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">
                                    {transacao.caixaNome}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                    {transacao.parcela}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                    {transacao.mesReferencia}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                    {transacao.nomeCliente}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{transacao.recipientNome}</span>
                                        <span className="text-xs text-gray-500 capitalize">
                                            {transacao.tipoRecipient}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-green-600">
                                    {formatarValor(transacao.valorParcela)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                    {formatarData(transacao.dataTransacao)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                        <tr>
                            <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                                Total Pendente:
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-green-600">
                                {formatarValor(calcularTotal())}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                    <strong>💡 Informação:</strong> Esta tabela mostra todas as transações pendentes
                    relevantes para você. O total acima deve corresponder ao seu saldo pendente.
                </p>
            </div>
        </div>
    );
}
