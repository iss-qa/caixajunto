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
  MapPin,
  Home,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usuariosService, participantesService, caixasService } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

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
  caixaNome?: string;
  caixaId?: string;
  adminNome?: string;
  criadoPorId?: string;
  criadoPorNome?: string;
  address?: {
    street?: string;
    zone?: string;
    city?: string;
    state?: string;
    number?: string;
    complement?: string;
    zip?: string;
  };
}

interface CaixaResumo {
  _id: string;
  nome: string;
  adminId?:
  | {
    _id?: string;
    nome?: string;
    email?: string;
    telefone?: string;
  }
  | string;
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
  const [caixas, setCaixas] = useState<CaixaResumo[]>([]);
  const [selectedCaixaId, setSelectedCaixaId] = useState('');

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    chavePix: '',
    picture: '',
    senha: '',
    address: {
      street: '',
      zone: '',
      city: '',
      state: '',
      number: '',
      complement: '',
      zip: '',
    },
  });

  useEffect(() => {
    loadParticipantes();
  }, []);

  const loadParticipantes = async () => {
    try {
      setLoading(true);

      // 1️⃣ PRIMEIRO: Buscar caixas para mapear nomes e administradores
      let caixasPorId: Record<string, CaixaResumo> = {};
      try {
        let respCaixas: any;
        if (usuarioLogado?.tipo === 'master') {
          respCaixas = await caixasService.getAll();
        } else {
          // Administrador: pega apenas seus caixas; fallback para getAll se necessário
          try {
            respCaixas = await caixasService.getByAdmin(usuarioLogado!._id);
          } catch (e) {
            respCaixas = await caixasService.getAll();
          }
        }
        const listaCaixas = (Array.isArray(respCaixas) ? respCaixas : respCaixas.caixas || []) as CaixaResumo[];
        // Expor caixas disponíveis para o combo (exclui em andamento)
        setCaixas(listaCaixas.filter((c: any) => String(c.status || '') !== 'ativo'));
        caixasPorId = listaCaixas.reduce((map: Record<string, CaixaResumo>, c: CaixaResumo) => {
          if (c && c._id) {
            map[c._id] = c;
          }
          return map;
        }, {});
        console.log('📦 Caixas carregados:', Object.keys(caixasPorId).length);
      } catch (e) {
        console.error('Erro ao carregar caixas para mapear administradores:', e);
      }

      // 2️⃣ Buscar todos os usuários do tipo 'usuario'
      const responseUsuarios = await usuariosService.getAll();
      const listaUsuarios = Array.isArray(responseUsuarios) ? responseUsuarios : responseUsuarios.usuarios || [];
      const usuarios = listaUsuarios.filter((u: any) => u.tipo === 'usuario');

      // 3️⃣ Buscar todos os participantes (vínculos)
      const responseParticipantes = await participantesService.getAll();
      const listaParticipantes = Array.isArray(responseParticipantes) ? responseParticipantes : responseParticipantes.participantes || [];

      console.log('🔍 ===== PARTICIPANTES API RESPONSE =====');
      console.log('📊 Total participantes:', listaParticipantes.length);
      if (listaParticipantes.length > 0) {
        console.log('📋 Primeiro participante:', JSON.stringify(listaParticipantes[0], null, 2));
      }

      // 4️⃣ Combinar usuários com seus caixas (agora caixasPorId está disponível!)
      const participantesComCaixa = usuarios.map((usuario: any) => {
        // Find vinculo for this usuario
        const vinculo = listaParticipantes.find((p: any) => {
          const pUsuarioId = p.usuarioId?._id || p.usuarioId;
          return String(pUsuarioId) === String(usuario._id);
        });

        let caixaNome = '';
        let caixaId = '';
        let adminNome = '';

        if (vinculo) {
          // Extract caixa info directly from populated vinculo
          if (vinculo.caixaId) {
            if (typeof vinculo.caixaId === 'object') {
              // caixaId is populated - use it directly!
              caixaId = vinculo.caixaId._id || '';
              caixaNome = vinculo.caixaId.nome || '';

              // Try to get admin name if available
              if (vinculo.caixaId.adminId) {
                if (typeof vinculo.caixaId.adminId === 'object') {
                  adminNome = vinculo.caixaId.adminId.nome || '';
                } else if (caixasPorId[caixaId]) {
                  const caixaInfo = caixasPorId[caixaId];
                  if (typeof caixaInfo.adminId === 'object') {
                    adminNome = (caixaInfo.adminId as any).nome || '';
                  }
                }
              }
            } else {
              // caixaId is just a string ID - look it up in caixasPorId
              caixaId = String(vinculo.caixaId);
              const caixaInfo = caixasPorId[caixaId];
              if (caixaInfo) {
                caixaNome = caixaInfo.nome || '';
                if (typeof caixaInfo.adminId === 'object') {
                  adminNome = (caixaInfo.adminId as any).nome || '';
                }
              }
            }
          }
        }

        return {
          ...usuario,
          caixaNome,
          caixaId,
          adminNome: adminNome || usuario.criadoPorNome || '',
        };
      });

      console.log('\n📊 ===== RESULTADO FINAL =====');
      participantesComCaixa.forEach((p: any) => {
        console.log(`${p.nome}: ${p.caixaNome || '❌ SEM CAIXA'}`);
      });
      console.log('🔍 ===== FIM =====\n');


      // Filter participants based on user type
      let filteredParticipantes = participantesComCaixa;

      // Administrators only see participants they created
      if (usuarioLogado?.tipo === 'administrador') {
        filteredParticipantes = participantesComCaixa.filter((p: any) =>
          p.criadoPorId === usuarioLogado._id
        );
      }
      // Master users see all participants (no filter)

      setParticipantes(filteredParticipantes);
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

    // Validar senha
    if (!formData.senha || formData.senha.length < 6) {
      setErrorMessage('Defina uma senha com pelo menos 6 caracteres.');
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
      // Preparar dados com criadoPorId do usuário logado
      const zipDigits = formData.address.zip.replace(/\D/g, '');
      const newUser = await usuariosService.create({
        nome: formData.nome,
        email: formData.email,
        telefone: telefoneDigits,
        cpf: cpfDigits,
        chavePix: formData.chavePix,
        picture: formData.picture,
        senha: formData.senha,
        tipo: 'usuario',
        criadoPorId: usuarioLogado?._id || '',
        criadoPorNome: usuarioLogado?.nome || '',
        address: {
          street: formData.address.street,
          zone: formData.address.zone,
          city: formData.address.city,
          state: formData.address.state,
          number: formData.address.number,
          complement: formData.address.complement,
          zip: zipDigits,
        },
      });

      if (selectedCaixaId) {
        await participantesService.create({
          caixaId: selectedCaixaId,
          usuarioId: newUser._id,
          aceite: true,
          status: 'ativo',
        });
      }

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
        // Envia senha somente se informada
        ...(formData.senha ? { senha: formData.senha } : {}),
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
      senha: '',
      address: {
        street: participante.address?.street || (participante as any).endereco || '',
        zone: participante.address?.zone || '',
        city: participante.address?.city || (participante as any).cidade || '',
        state: participante.address?.state || (participante as any).estado || '',
        number: participante.address?.number || '',
        complement: participante.address?.complement || '',
        zip: participante.address?.zip || (participante as any).cep || '',
      },
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
      senha: '',
      address: {
        street: '',
        zone: '',
        city: '',
        state: '',
        number: '',
        complement: '',
        zip: '',
      },
    });
    setImagePreview('');
    setCpfError('');
    setSelectedCaixaId('');
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
                  {usuarioLogado?.tipo === 'master' && (
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Gerenciado por</th>
                  )}
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
                    {usuarioLogado?.tipo === 'master' && (
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {participante.adminNome || participante.criadoPorNome || '-'}
                      </td>
                    )}

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
        size="xl"
      >
        <div className="space-y-6 px-1">
          {/* Header com Foto e Campos Principais */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Esquerda: Foto */}
            <div className="flex flex-col items-center gap-3 pt-2 w-full md:w-auto flex-shrink-0">
              <div className="relative">
                <Avatar
                  src={imagePreview}
                  name={formData.nome || 'Participante'}
                  size="xl"
                />
                <label
                  htmlFor="picture-upload-add"
                  className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full cursor-pointer hover:bg-green-600 transition-colors shadow-lg"
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
              <p className="text-xs text-gray-500">Foto</p>
            </div>

            {/* Direita: Campos Principais */}
            <div className="flex-1 space-y-4">
              <Input
                label="Nome Completo *"
                placeholder="Nome do participante"
                leftIcon={<User className="w-4 h-4" />}
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Email *"
                  type="email"
                  placeholder="email@exemplo.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <Input
                  label="Telefone *"
                  placeholder="(11) 99999-9999"
                  leftIcon={<Phone className="w-4 h-4" />}
                  value={formData.telefone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  maxLength={15}
                />
              </div>
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
          </div>

          {/* Dados Financeiros e Senha */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <Input
              label="Chave PIX"
              placeholder="Chave PIX"
              leftIcon={<CreditCard className="w-4 h-4" />}
              value={formData.chavePix}
              onChange={(e) => setFormData({ ...formData, chavePix: e.target.value })}
            />
            <Input
              label="Senha *"
              type="password"
              placeholder="Defina a senha"
              value={formData.senha}
              onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
            />
          </div>

          {/* Seção de Endereço */}
          {/* Seção de Endereço */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Home className="w-4 h-4" />
              Endereço Completo
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <Input
                    label="CEP"
                    placeholder="00000-000"
                    leftIcon={<MapPin className="w-4 h-4" />}
                    value={formData.address.zip}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                      const masked = digits.replace(/(\d{5})(\d)/, '$1-$2');
                      setFormData({
                        ...formData,
                        address: { ...formData.address, zip: masked },
                      });
                    }}
                    maxLength={9}
                  />
                </div>
                <div className="md:col-span-3">
                  <Input
                    label="Rua / Logradouro"
                    placeholder="Nome da rua"
                    value={formData.address.street}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, street: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <Input
                    label="Número"
                    placeholder="123"
                    value={formData.address.number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, number: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="md:col-span-1">
                  <Input
                    label="Complemento"
                    placeholder="Apto 101"
                    value={formData.address.complement}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, complement: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    label="Bairro"
                    placeholder="Bairro"
                    value={formData.address.zone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, zone: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <Input
                    label="Cidade"
                    placeholder="Cidade"
                    value={formData.address.city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, city: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    className="w-full h-[42px] px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    value={formData.address.state}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, state: e.target.value },
                      })
                    }
                  >
                    <option value="">UF</option>
                    <option value="AC">AC</option>
                    <option value="AL">AL</option>
                    <option value="AP">AP</option>
                    <option value="AM">AM</option>
                    <option value="BA">BA</option>
                    <option value="CE">CE</option>
                    <option value="DF">DF</option>
                    <option value="ES">ES</option>
                    <option value="GO">GO</option>
                    <option value="MA">MA</option>
                    <option value="MT">MT</option>
                    <option value="MS">MS</option>
                    <option value="MG">MG</option>
                    <option value="PA">PA</option>
                    <option value="PB">PB</option>
                    <option value="PR">PR</option>
                    <option value="PE">PE</option>
                    <option value="PI">PI</option>
                    <option value="RJ">RJ</option>
                    <option value="RN">RN</option>
                    <option value="RS">RS</option>
                    <option value="RO">RO</option>
                    <option value="RR">RR</option>
                    <option value="SC">SC</option>
                    <option value="SP">SP</option>
                    <option value="SE">SE</option>
                    <option value="TO">TO</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {(usuarioLogado?.tipo === 'master' || usuarioLogado?.tipo === 'administrador') && caixas.length > 0 && (
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <label className="block text-sm font-medium text-green-800 mb-1">
                Vincular ao Caixa
              </label>
              <select
                className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                value={selectedCaixaId}
                onChange={(e) => setSelectedCaixaId(e.target.value)}
              >
                <option value="">Sem caixa (apenas cadastrar usuário)</option>
                {caixas.filter((c: any) => String((c as any).status || '') !== 'ativo').map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.nome}
                    {c.adminId && typeof c.adminId === 'object' && c.adminId.nome
                      ? ` • Admin: ${c.adminId.nome}`
                      : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-6 border-t border-gray-100">
            <Button
              variant="secondary"
              className="flex-1"
              size="lg"
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
              size="lg"
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
        size="xl"
      >
        <div className="space-y-6 px-1">
          {/* Header com Foto e Campos Principais */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Esquerda: Foto */}
            <div className="flex flex-col items-center gap-3 pt-2 w-full md:w-auto flex-shrink-0">
              <div className="relative">
                <Avatar
                  src={imagePreview}
                  name={formData.nome || 'Participante'}
                  size="xl"
                />
                <label
                  htmlFor="picture-upload-edit"
                  className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full cursor-pointer hover:bg-green-600 transition-colors shadow-lg"
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
              <p className="text-xs text-gray-500">Alterar foto</p>
            </div>

            {/* Direita: Campos Principais */}
            <div className="flex-1 space-y-4">
              <Input
                label="Nome Completo *"
                placeholder="Nome do participante"
                leftIcon={<User className="w-4 h-4" />}
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Email *"
                  type="email"
                  placeholder="email@exemplo.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <Input
                  label="Telefone *"
                  placeholder="(11) 99999-9999"
                  leftIcon={<Phone className="w-4 h-4" />}
                  value={formData.telefone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  maxLength={15}
                />
              </div>
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
          </div>

          {/* Dados Financeiros e Senha */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <Input
              label="Chave PIX"
              placeholder="Chave PIX"
              leftIcon={<CreditCard className="w-4 h-4" />}
              value={formData.chavePix}
              onChange={(e) => setFormData({ ...formData, chavePix: e.target.value })}
            />
            {/* Nota: Senha geralmente não é exibida na edição por segurança, mas o usuário pediu para manter os campos iguais. Podemos deixar vazio para não alterar ou permitir redefinir. */}
            <Input
              label="Nova Senha"
              type="password"
              placeholder="Deixe em branco para manter a atual"
              value={formData.senha}
              onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
            />
          </div>

          {/* Seção de Endereço */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Home className="w-4 h-4" />
              Endereço Completo
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <Input
                    label="CEP"
                    placeholder="00000-000"
                    leftIcon={<MapPin className="w-4 h-4" />}
                    value={formData.address.zip}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                      const masked = digits.replace(/(\d{5})(\d)/, '$1-$2');
                      setFormData({
                        ...formData,
                        address: { ...formData.address, zip: masked },
                      });
                    }}
                    maxLength={9}
                  />
                </div>
                <div className="md:col-span-3">
                  <Input
                    label="Rua / Logradouro"
                    placeholder="Nome da rua"
                    value={formData.address.street}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, street: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <Input
                    label="Número"
                    placeholder="123"
                    value={formData.address.number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, number: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="md:col-span-1">
                  <Input
                    label="Complemento"
                    placeholder="Apto 101"
                    value={formData.address.complement}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, complement: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    label="Bairro"
                    placeholder="Bairro"
                    value={formData.address.zone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, zone: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <Input
                    label="Cidade"
                    placeholder="Cidade"
                    value={formData.address.city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, city: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    className="w-full h-[42px] px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    value={formData.address.state}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, state: e.target.value },
                      })
                    }
                  >
                    <option value="">UF</option>
                    <option value="AC">AC</option>
                    <option value="AL">AL</option>
                    <option value="AP">AP</option>
                    <option value="AM">AM</option>
                    <option value="BA">BA</option>
                    <option value="CE">CE</option>
                    <option value="DF">DF</option>
                    <option value="ES">ES</option>
                    <option value="GO">GO</option>
                    <option value="MA">MA</option>
                    <option value="MT">MT</option>
                    <option value="MS">MS</option>
                    <option value="MG">MG</option>
                    <option value="PA">PA</option>
                    <option value="PB">PB</option>
                    <option value="PR">PR</option>
                    <option value="PE">PE</option>
                    <option value="PI">PI</option>
                    <option value="RJ">RJ</option>
                    <option value="RN">RN</option>
                    <option value="RS">RS</option>
                    <option value="RO">RO</option>
                    <option value="RR">RR</option>
                    <option value="SC">SC</option>
                    <option value="SP">SP</option>
                    <option value="SE">SE</option>
                    <option value="TO">TO</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-gray-100">
            <Button
              variant="secondary"
              className="flex-1"
              size="lg"
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
              size="lg"
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
