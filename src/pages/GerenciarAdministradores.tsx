import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    UserCheck,
    UserX,
    Mail,
    Phone,
    Calendar,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Loader2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../lib/api';

interface AdministradorPendente {
    _id: string;
    nome: string;
    email: string;
    telefone: string;
    createdAt: string;
    statusAprovacao: 'pendente' | 'aprovado' | 'recusado';
}

export function GerenciarAdministradores() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [administradores, setAdministradores] = useState<AdministradorPendente[]>([]);
    const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'aprovado' | 'recusado'>('todos');
    const [showRecusaModal, setShowRecusaModal] = useState(false);
    const [showAprovarModal, setShowAprovarModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState<AdministradorPendente | null>(null);
    const [motivoRecusa, setMotivoRecusa] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        loadAdministradores();
    }, []);

    const loadAdministradores = async () => {
        try {
            setLoading(true);
            // Buscar TODOS os administradores
            const response = await api.get('/usuarios?tipo=administrador');
            // Ordenar por data de criação (mais recentes primeiro)
            const sorted = response.data.usuarios.sort((a: any, b: any) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setAdministradores(sorted);
        } catch (error) {
            console.error('Erro ao carregar administradores:', error);
            setErrorMessage('Erro ao carregar administradores. Tente novamente.');
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handleAprovar = async () => {
        if (!selectedAdmin) return;

        try {
            setActionLoading(true);
            await api.post(`/usuarios/administradores/${selectedAdmin._id}/aprovar`);
            await loadAdministradores();
            setShowAprovarModal(false);
            setSuccessMessage(`${selectedAdmin.nome} foi aprovado com sucesso!`);
            setShowSuccessModal(true);
            setSelectedAdmin(null);
        } catch (error: any) {
            setShowAprovarModal(false);
            setErrorMessage(error.response?.data?.message || 'Erro ao aprovar administrador');
            setShowErrorModal(true);
        } finally {
            setActionLoading(false);
        }
    };

    const handleRecusar = async () => {
        if (!selectedAdmin || !motivoRecusa.trim()) {
            setErrorMessage('Por favor, informe o motivo da recusa');
            setShowErrorModal(true);
            return;
        }

        try {
            setActionLoading(true);
            await api.post(`/usuarios/administradores/${selectedAdmin._id}/recusar`, {
                motivoRecusa: motivoRecusa.trim(),
            });
            await loadAdministradores();
            setShowRecusaModal(false);
            setSuccessMessage(`${selectedAdmin.nome} foi recusado.`);
            setShowSuccessModal(true);
            setSelectedAdmin(null);
            setMotivoRecusa('');
        } catch (error: any) {
            setShowRecusaModal(false);
            setErrorMessage(error.response?.data?.message || 'Erro ao recusar administrador');
            setShowErrorModal(true);
        } finally {
            setActionLoading(false);
        }
    };

    const openAprovarModal = (admin: AdministradorPendente) => {
        setSelectedAdmin(admin);
        setShowAprovarModal(true);
    };

    const openRecusaModal = (admin: AdministradorPendente) => {
        setSelectedAdmin(admin);
        setShowRecusaModal(true);
        setMotivoRecusa('');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatPhone = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
        }
        return phone;
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<ArrowLeft className="w-4 h-4" />}
                    onClick={() => navigate('/painel-master')}
                >
                    Voltar
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">Gerenciar Administradores</h1>
                    <p className="text-sm text-gray-500">Aprovar ou recusar solicitações de administradores</p>
                </div>
            </div>

            {/* Filtros de Status */}
            {!loading && administradores.length > 0 && (
                <div className="flex gap-2 mb-6">
                    <Button
                        variant={filtroStatus === 'todos' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setFiltroStatus('todos')}
                    >
                        Todos ({administradores.length})
                    </Button>
                    <Button
                        variant={filtroStatus === 'pendente' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setFiltroStatus('pendente')}
                        className={filtroStatus === 'pendente' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                    >
                        Pendentes ({administradores.filter(a => a.statusAprovacao === 'pendente').length})
                    </Button>
                    <Button
                        variant={filtroStatus === 'aprovado' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setFiltroStatus('aprovado')}
                        className={filtroStatus === 'aprovado' ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                        Aprovados ({administradores.filter(a => a.statusAprovacao === 'aprovado').length})
                    </Button>
                    <Button
                        variant={filtroStatus === 'recusado' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setFiltroStatus('recusado')}
                        className={filtroStatus === 'recusado' ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                        Recusados ({administradores.filter(a => a.statusAprovacao === 'recusado').length})
                    </Button>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
            )}

            {/* Empty State */}
            {!loading && administradores.length === 0 && (
                <Card className="p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UserCheck className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Nenhum administrador cadastrado
                    </h3>
                    <p className="text-gray-500">
                        Não há administradores cadastrados no sistema no momento.
                    </p>
                </Card>
            )}

            {/* Table */}
            {!loading && administradores.length > 0 && (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Nome
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Telefone
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Data de Cadastro
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {administradores
                                    .filter(admin => filtroStatus === 'todos' || admin.statusAprovacao === filtroStatus)
                                    .map((admin) => (
                                        <motion.tr
                                            key={admin._id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                                        <span className="text-primary-600 font-semibold">
                                                            {admin.nome.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="ml-3">
                                                        <p className="text-sm font-medium text-gray-900">{admin.nome}</p>
                                                        {admin.statusAprovacao === 'pendente' && (
                                                            <Badge variant="warning" size="sm" className="mt-1">
                                                                Pendente
                                                            </Badge>
                                                        )}
                                                        {admin.statusAprovacao === 'aprovado' && (
                                                            <Badge variant="success" size="sm" className="mt-1 bg-green-100 text-green-700">
                                                                Aprovado
                                                            </Badge>
                                                        )}
                                                        {admin.statusAprovacao === 'recusado' && (
                                                            <Badge variant="danger" size="sm" className="mt-1">
                                                                Recusado
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Mail className="w-4 h-4 text-gray-400" />
                                                    {admin.email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Phone className="w-4 h-4 text-gray-400" />
                                                    {formatPhone(admin.telefone)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    {formatDate(admin.createdAt)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {admin.statusAprovacao === 'pendente' && (
                                                        <>
                                                            <Button
                                                                variant="primary"
                                                                size="sm"
                                                                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                                                                onClick={() => openAprovarModal(admin)}
                                                                disabled={actionLoading}
                                                                className="bg-green-600 hover:bg-green-700"
                                                            >
                                                                Aprovar
                                                            </Button>
                                                            <Button
                                                                variant="danger"
                                                                size="sm"
                                                                leftIcon={<XCircle className="w-4 h-4" />}
                                                                onClick={() => openRecusaModal(admin)}
                                                                disabled={actionLoading}
                                                            >
                                                                Recusar
                                                            </Button>
                                                        </>
                                                    )}
                                                    {admin.statusAprovacao === 'aprovado' && (
                                                        <span className="text-sm text-green-600 font-medium">
                                                            ✓ Aprovado
                                                        </span>
                                                    )}
                                                    {admin.statusAprovacao === 'recusado' && (
                                                        <span className="text-sm text-red-600 font-medium">
                                                            ✗ Recusado
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Modal de Recusa */}
            {showRecusaModal && selectedAdmin && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
                    >
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Recusar Administrador</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Você está prestes a recusar <strong>{selectedAdmin.nome}</strong>
                                </p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Motivo da recusa *
                            </label>
                            <textarea
                                value={motivoRecusa}
                                onChange={(e) => setMotivoRecusa(e.target.value)}
                                placeholder="Explique o motivo da recusa..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                rows={4}
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Este motivo será exibido ao administrador quando ele tentar fazer login.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                className="flex-1"
                                onClick={() => {
                                    setShowRecusaModal(false);
                                    setSelectedAdmin(null);
                                    setMotivoRecusa('');
                                }}
                                disabled={actionLoading}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="danger"
                                className="flex-1"
                                onClick={handleRecusar}
                                isLoading={actionLoading}
                                disabled={!motivoRecusa.trim()}
                            >
                                Confirmar Recusa
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Modal de Aprovação */}
            {showAprovarModal && selectedAdmin && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
                    >
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Aprovar Administrador</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Tem certeza que deseja aprovar <strong>{selectedAdmin.nome}</strong>?
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                    Após a aprovação, o administrador poderá fazer login no sistema.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                className="flex-1"
                                onClick={() => {
                                    setShowAprovarModal(false);
                                    setSelectedAdmin(null);
                                }}
                                disabled={actionLoading}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={handleAprovar}
                                isLoading={actionLoading}
                            >
                                Confirmar Aprovação
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Modal de Sucesso */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sucesso!</h3>
                            <p className="text-sm text-gray-600 mb-6">{successMessage}</p>
                            <Button
                                variant="primary"
                                className="w-full bg-green-600 hover:bg-green-700"
                                onClick={() => setShowSuccessModal(false)}
                            >
                                OK
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Modal de Erro */}
            {showErrorModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <XCircle className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro</h3>
                            <p className="text-sm text-gray-600 mb-6">{errorMessage}</p>
                            <Button
                                variant="danger"
                                className="w-full"
                                onClick={() => setShowErrorModal(false)}
                            >
                                Fechar
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
