import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Search,
  Eye,
  Phone,
  Mail,
  Award,
  User,
  CreditCard,
  Camera,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usuariosService, participantesService } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, cn } from '../lib/utils';

interface Usuario {
  _id: string;
  nome: string;
  email: string;
  telefone: string;
  cpf?: string;
  chavePix?: string;
  tipo: 'usuario' | 'administrador' | 'master';
  score: number;
  picture?: string;
  lytexClientId?: string;
  caixaNome?: string; // Nome do caixa vinculado
  caixaId?: string; // ID do caixa vinculado
}

// Função auxiliar para remover formatação do CPF
const formatCPF = (cpf: string): string => {
  return cpf.replace(/[^\d]/g, ''); // Remove tudo que não é dígito
};

// Função para aplicar máscara de CPF
const maskCPF = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

// Função para aplicar máscara de telefone
const maskPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};

// Função para validar CPF
const validarCPF = (cpf: string): boolean => {
  const digits = cpf.replace(/\D/g, '');
  
  if (digits.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(digits)) return false;
  
  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(digits[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(digits[9])) return false;
  
  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(digits[i]) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(digits[10])) return false;
  
  return true;
};

export function Participantes() {
  const { usuario: usuarioLogado } = useAuth();
  const [participantes, setParticipantes] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedParticipante, setSelectedParticipante] = useState<Usuario | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    chavePix: '',
    picture: '',
  });

  useEffect(() => {
    loadParticipantes();
  }, []);

  const loadParticipantes = async () => {
    try {
      setLoading(true);
      
      // Buscar todos os usuários do tipo 'usuario'
      const responseUsuarios = await usuariosService.getAll();
      const listaUsuarios = Array.isArray(responseUsuarios) ? responseUsuarios : responseUsuarios.usuarios || [];
      const usuarios = listaUsuarios.filter((u: any) => u.tipo === 'usuario');
      
      // Buscar todos os participantes (vínculos)
      const responseParticipantes = await participantesService.getAll();
      const listaParticipantes = Array.isArray(responseParticipantes) ? responseParticipantes : responseParticipantes.participantes || [];
      
      // Combinar usuários com seus caixas
      const participantesComCaixa = usuarios.map((usuario: any) => {
        const vinculo = listaParticipantes.find((p: any) => 
          p.usuarioId === usuario._id || p.usuarioId?._id === usuario._id
        );
        
        return {
          ...usuario,
          caixaNome: vinculo?.caixaId?.nome || vinculo?.caixaNome || '',
          caixaId: vinculo?.caixaId?._id || vinculo?.caixaId || '',
        };
      });
      
      setParticipantes(participantesComCaixa);
    } catch (error) {
      console.error('Erro ao carregar participantes:', error);
      // Fallback para mock
      setParticipantes([
        {
          _id: '1',
          nome: 'João Silva',
          email: 'joao@email.com',
          telefone: '11987654321',
          cpf: '12345678901',
          chavePix: 'joao@email.com',
          tipo: 'usuario',
          score: 85,
          caixaNome: 'Caixa Teste',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 400;
          const maxHeight = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedImage = await compressImage(file);
        setImagePreview(compressedImage);
        setFormData({ ...formData, picture: compressedImage });
      } catch (error) {
        console.error('Erro ao processar imagem:', error);
        setErrorMessage('Erro ao processar imagem. Tente outra foto.');
        setShowErrorModal(true);
      }
    }
  };

  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [cpfError, setCpfError] = useState('');

  // Handler para CPF com máscara e validação
  const handleCpfChange = (value: string) => {
    const masked = maskCPF(value);
    setFormData({ ...formData, cpf: masked });
    
    // Validar CPF quando tiver 14 caracteres (com máscara)
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11) {
      if (!validarCPF(digits)) {
        setCpfError('CPF inválido');
      } else {
        setCpfError('');
      }
    } else if (digits.length > 0 && digits.length < 11) {
      setCpfError('');
    }
  };

  // Handler para telefone com máscara
  const handlePhoneChange = (value: string) => {
    const masked = maskPhone(value);
    setFormData({ ...formData, telefone: masked });
  };

  const handleAdd = async () => {
    if (!formData.nome || !formData.email || !formData.telefone) {
      setErrorMessage('Preencha todos os campos obrigatórios (nome, email e telefone)');
      setShowErrorModal(true);
      return;
    }

    // Validar CPF se fornecido
    const cpfDigits = formData.cpf ? formatCPF(formData.cpf) : '';
    if (cpfDigits && cpfDigits.length === 11 && !validarCPF(cpfDigits)) {
      setErrorMessage('O CPF informado é inválido. Por favor, verifique e tente novamente.');
      setShowErrorModal(true);
      return;
    }

    // Validar telefone (mínimo 10 dígitos)
    const telefoneDigits = formData.telefone.replace(/\D/g, '');
    if (telefoneDigits.length < 10) {
      setErrorMessage('O telefone deve ter pelo menos 10 dígitos.');
      setShowErrorModal(true);
      return;
    }

    try {
      const newUser = await usuariosService.create({
        ...formData,
        cpf: cpfDigits,
        telefone: telefoneDigits,
        tipo: 'usuario',
        senha: 'Senha@123', // Senha padrão
      });
      
      await loadParticipantes();
      setShowAddModal(false);
      resetForm();
      setSuccessMessage('Participante adicionado com sucesso!');
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Erro ao adicionar participante:', error);
      const msg = error.response?.data?.message || 'Erro ao adicionar participante. Tente novamente.';
      setErrorMessage(msg);
      setShowErrorModal(true);
    }
  };

  const handleEdit = async () => {
    if (!selectedParticipante) return;

    // Validar CPF se fornecido
    const cpfDigits = formData.cpf ? formatCPF(formData.cpf) : '';
    if (cpfDigits && cpfDigits.length === 11 && !validarCPF(cpfDigits)) {
      setErrorMessage('O CPF informado é inválido. Por favor, verifique e tente novamente.');
      setShowErrorModal(true);
      return;
    }

    // Validar telefone (mínimo 10 dígitos)
    const telefoneDigits = formData.telefone.replace(/\D/g, '');
    if (telefoneDigits.length < 10) {
      setErrorMessage('O telefone deve ter pelo menos 10 dígitos.');
      setShowErrorModal(true);
      return;
    }

    try {
      await usuariosService.update(selectedParticipante._id, {
        ...formData,
        cpf: cpfDigits,
        telefone: telefoneDigits,
      });
      await loadParticipantes();
      setShowEditModal(false);
      setSelectedParticipante(null);
      resetForm();
      setSuccessMessage('Participante atualizado com sucesso!');
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Erro ao editar participante:', error);
      const msg = error.response?.data?.message || 'Erro ao atualizar participante. Tente novamente.';
      setErrorMessage(msg);
      setShowErrorModal(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedParticipante) return;

    try {
      await usuariosService.delete(selectedParticipante._id);
      await loadParticipantes();
      setShowDeleteModal(false);
      setSelectedParticipante(null);
      setSuccessMessage('Participante removido com sucesso!');
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Erro ao deletar participante:', error);
      const msg = error.response?.data?.message || 'Erro ao remover participante. Tente novamente.';
      setErrorMessage(msg);
      setShowErrorModal(true);
    }
  };

  const openEditModal = (participante: Usuario) => {
    setSelectedParticipante(participante);
    setFormData({
      nome: participante.nome,
      email: participante.email,
      telefone: participante.telefone,
      cpf: participante.cpf || '',
      chavePix: participante.chavePix || '',
      picture: participante.picture || '',
    });
    setImagePreview(participante.picture || '');
    setShowEditModal(true);
  };

  const openDeleteModal = (participante: Usuario) => {
    setSelectedParticipante(participante);
    setShowDeleteModal(true);
  };

  const openDetailModal = (participante: Usuario) => {
    setSelectedParticipante(participante);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      cpf: '',
      chavePix: '',
      picture: '',
    });
    setImagePreview('');
    setCpfError('');
  };

  const filteredParticipantes = participantes.filter((p) =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.telefone.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Gerenciar Participantes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {participantes.length} participante{participantes.length !== 1 ? 's' : ''} cadastrado{participantes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Adicionar Participante
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </Card>

      {/* Tabela de Participantes */}
      {filteredParticipantes.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum participante encontrado"
          description={searchTerm ? "Tente buscar com outros termos" : "Adicione seu primeiro participante para começar"}
          actionLabel={!searchTerm ? "Adicionar Participante" : undefined}
          onAction={!searchTerm ? () => setShowAddModal(true) : undefined}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Participante</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Contato</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Chave PIX</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Score</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Caixa</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipantes.map((participante) => (
                  <motion.tr
                    key={participante._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={participante.picture}
                          name={participante.nome}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{participante.nome}</p>
                          <p className="text-xs text-gray-500">{participante.cpf || 'CPF não informado'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-3 h-3" />
                          {participante.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-3 h-3" />
                          {participante.telefone}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CreditCard className="w-3 h-3" />
                        {participante.chavePix || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={participante.score >= 80 ? 'success' : 'warning'} size="sm">
                        <Award className="w-3 h-3 mr-1" />
                        {participante.score}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {participante.caixaNome ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="info" size="sm">
                            {participante.caixaNome}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Sem caixa</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDetailModal(participante)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(participante)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDeleteModal(participante)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Adicionar Participante */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title="Adicionar Participante"
        size="lg"
      >
        <div className="space-y-4">
          {/* Upload de Foto */}
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="relative">
              <Avatar
                src={imagePreview}
                name={formData.nome || 'Participante'}
                size="xl"
              />
              <label
                htmlFor="picture-upload-add"
                className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full cursor-pointer hover:bg-green-600 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </label>
              <input
                id="picture-upload-add"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            <p className="text-xs text-gray-500">Clique no ícone para adicionar uma foto</p>
          </div>

          <Input
            label="Nome Completo *"
            placeholder="Nome do participante"
            leftIcon={<User className="w-4 h-4" />}
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          />
          <Input
            label="Email *"
            type="email"
            placeholder="email@exemplo.com"
            leftIcon={<Mail className="w-4 h-4" />}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Telefone *"
              placeholder="(11) 99999-9999"
              leftIcon={<Phone className="w-4 h-4" />}
              value={formData.telefone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              maxLength={15}
            />
            <div>
              <Input
                label="CPF"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={(e) => handleCpfChange(e.target.value)}
                maxLength={14}
                className={cpfError ? 'border-red-500' : ''}
              />
              {cpfError && (
                <p className="text-red-500 text-xs mt-1">{cpfError}</p>
              )}
            </div>
          </div>
          <Input
            label="Chave PIX"
            placeholder="CPF, email, telefone ou chave aleatória"
            leftIcon={<CreditCard className="w-4 h-4" />}
            value={formData.chavePix}
            onChange={(e) => setFormData({ ...formData, chavePix: e.target.value })}
          />

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setShowAddModal(false);
                resetForm();
                setCpfError('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleAdd}
              disabled={!formData.nome || !formData.email || !formData.telefone || !!cpfError}
            >
              Adicionar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Editar Participante */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedParticipante(null);
          resetForm();
        }}
        title="Editar Participante"
        size="lg"
      >
        <div className="space-y-4">
          {/* Upload de Foto */}
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="relative">
              <Avatar
                src={imagePreview}
                name={formData.nome || 'Participante'}
                size="xl"
              />
              <label
                htmlFor="picture-upload-edit"
                className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full cursor-pointer hover:bg-green-600 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </label>
              <input
                id="picture-upload-edit"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            <p className="text-xs text-gray-500">Clique no ícone para alterar a foto</p>
          </div>

          <Input
            label="Nome Completo *"
            placeholder="Nome do participante"
            leftIcon={<User className="w-4 h-4" />}
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          />
          <Input
            label="Email *"
            type="email"
            placeholder="email@exemplo.com"
            leftIcon={<Mail className="w-4 h-4" />}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Telefone *"
              placeholder="(11) 99999-9999"
              leftIcon={<Phone className="w-4 h-4" />}
              value={formData.telefone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              maxLength={15}
            />
            <div>
              <Input
                label="CPF"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={(e) => handleCpfChange(e.target.value)}
                maxLength={14}
                className={cpfError ? 'border-red-500' : ''}
              />
              {cpfError && (
                <p className="text-red-500 text-xs mt-1">{cpfError}</p>
              )}
            </div>
          </div>
          <Input
            label="Chave PIX"
            placeholder="CPF, email, telefone ou chave aleatória"
            leftIcon={<CreditCard className="w-4 h-4" />}
            value={formData.chavePix}
            onChange={(e) => setFormData({ ...formData, chavePix: e.target.value })}
          />

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setShowEditModal(false);
                setSelectedParticipante(null);
                resetForm();
                setCpfError('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleEdit}
              disabled={!formData.nome || !formData.email || !formData.telefone || !!cpfError}
            >
              Salvar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Excluir */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedParticipante(null);
        }}
        title="Remover Participante"
        size="sm"
      >
        {selectedParticipante && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-gray-600 mb-2">
              Tem certeza que deseja remover <strong>{selectedParticipante.nome}</strong>?
            </p>
            <p className="text-sm text-red-600 mb-6">
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedParticipante(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleDelete}
              >
                Remover
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Detalhes */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedParticipante(null);
        }}
        title="Detalhes do Participante"
        size="xl"
      >
        {selectedParticipante && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4">
              <Avatar
                src={selectedParticipante.picture}
                name={selectedParticipante.nome}
                size="xl"
              />
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900">{selectedParticipante.nome}</h3>
                <Badge variant={selectedParticipante.score >= 80 ? 'success' : 'warning'} size="sm">
                  <Award className="w-3 h-3 mr-1" />
                  Score: {selectedParticipante.score}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 border-t border-gray-200 pt-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{selectedParticipante.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Telefone</p>
                  <p className="text-sm font-medium text-gray-900">{selectedParticipante.telefone}</p>
                </div>
              </div>
              {selectedParticipante.cpf && (
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">CPF</p>
                    <p className="text-sm font-medium text-gray-900">{selectedParticipante.cpf}</p>
                  </div>
                </div>
              )}
              {selectedParticipante.chavePix && (
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Chave PIX</p>
                    <p className="text-sm font-medium text-gray-900">{selectedParticipante.chavePix}</p>
                  </div>
                </div>
              )}
              {selectedParticipante.lytexClientId && (
                <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">L</span>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600">ID Lytex</p>
                    <p className="text-sm font-mono text-blue-900">{selectedParticipante.lytexClientId}</p>
                  </div>
                </div>
              )}
            </div>

            
          </div>
        )}
      </Modal>

      {/* Modal de Erro */}
      <Modal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Erro"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-gray-700 mb-6">{errorMessage}</p>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => setShowErrorModal(false)}
          >
            OK
          </Button>
        </div>
      </Modal>

      {/* Modal de Sucesso */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Sucesso"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-gray-700 mb-6">{successMessage}</p>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => setShowSuccessModal(false)}
          >
            OK
          </Button>
        </div>
      </Modal>
    </div>
  );
}
