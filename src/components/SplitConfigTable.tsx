import { useEffect, useState } from 'react'
import { MoreVertical, Edit, Trash2, AlertCircle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { splitConfigService } from '../lib/api'
import { formatDate } from '../lib/utils'

interface SplitConfig {
    _id: string
    caixaId: {
        _id: string
        nome: string
        tipo?: string
        valorTotal?: number
        qtdParticipantes?: number
    }
    taxaServicoSubId?: string
    fundoReservaSubId?: string
    adminSubId?: string
    participantesMesOrdem?: string[]
    createdAt?: string
    updatedAt?: string
}

interface SplitConfigTableProps {
    onEdit?: (config: SplitConfig) => void
    refreshTrigger?: number
}

export function SplitConfigTable({ onEdit, refreshTrigger }: SplitConfigTableProps) {
    const [configs, setConfigs] = useState<SplitConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)

    const loadConfigs = async () => {
        try {
            setLoading(true)
            setError('')
            const response = await splitConfigService.getAll()
            setConfigs(response.configs || [])
        } catch (err: any) {
            console.error('Erro ao carregar configurações:', err)
            setError('Erro ao carregar configurações')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadConfigs()
    }, [refreshTrigger])

    const handleDelete = async (id: string, caixaNome: string) => {
        if (!confirm(`Deseja realmente excluir a configuração do caixa "${caixaNome}"?`)) {
            return
        }

        try {
            await splitConfigService.delete(id)
            await loadConfigs()
            setOpenMenuId(null)
        } catch (err: any) {
            console.error('Erro ao excluir:', err)
            alert('Erro ao excluir configuração')
        }
    }

    const handleEdit = (config: SplitConfig) => {
        onEdit?.(config)
        setOpenMenuId(null)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="font-medium text-red-900">Erro ao carregar configurações</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={loadConfigs}
                        className="mt-3"
                    >
                        Tentar novamente
                    </Button>
                </div>
            </div>
        )
    }

    if (configs.length === 0) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <p className="text-gray-600">Nenhuma configuração de split cadastrada ainda.</p>
                <p className="text-sm text-gray-500 mt-2">
                    Configure o split para um caixa usando o formulário acima.
                </p>
            </div>
        )
    }

    return (
        <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Configurações de Split Cadastradas ({configs.length})
            </h3>

            <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Caixa
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Taxa Serviço
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Fundo Reserva
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Admin
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Criado em
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Ações
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {configs.map((config) => (
                            <tr key={config._id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-900">
                                            {config.caixaId?.nome || 'N/A'}
                                        </span>
                                        <span className="text-xs text-gray-500 mt-1">
                                            ID: {config.caixaId?._id?.slice(-8) || 'N/A'}
                                        </span>
                                        {config.caixaId?.tipo && (
                                            <Badge variant="gray" className="mt-1 w-fit text-xs">
                                                {config.caixaId.tipo}
                                            </Badge>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex flex-col">
                                        <code className="text-xs bg-gray-100 px-2 py-1 rounded w-fit">
                                            {config.taxaServicoSubId?.slice(-8) || 'N/A'}
                                        </code>
                                        <span className="text-xs text-gray-500 mt-1">
                                            ISS SOFTWARE
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex flex-col">
                                        <code className="text-xs bg-gray-100 px-2 py-1 rounded w-fit">
                                            {config.fundoReservaSubId?.slice(-8) || 'N/A'}
                                        </code>
                                        <span className="text-xs text-gray-500 mt-1">
                                            ISS SOFTWARE
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex flex-col">
                                        <code className="text-xs bg-gray-100 px-2 py-1 rounded w-fit">
                                            {config.adminSubId?.slice(-8) || 'N/A'}
                                        </code>
                                        <span className="text-xs text-gray-500 mt-1">
                                            Administrador
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <span className="text-sm text-gray-600">
                                        {config.createdAt ? formatDate(config.createdAt) : 'N/A'}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center justify-end relative">
                                        <button
                                            onClick={() => setOpenMenuId(openMenuId === config._id ? null : config._id)}
                                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                        >
                                            <MoreVertical className="w-5 h-5 text-gray-600" />
                                        </button>

                                        {openMenuId === config._id && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setOpenMenuId(null)}
                                                />
                                                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                                                    <button
                                                        onClick={() => handleEdit(config)}
                                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-t-lg"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(config._id, config.caixaId?.nome || 'este caixa')}
                                                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-b-lg"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Excluir
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
