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
  MoreVertical,
  CheckCircle,
  XCircle,
  ArrowRightLeft,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchAddressByCEP, formatCEP } from '../utils/cep';
import { usuariosService, participantesService, caixasService, subcontasService } from '../lib/api';
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
  caixasConcluidos?: number;
  ativo?: boolean;
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
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [selectedCaixaId, setSelectedCaixaId] = useState('');
  const [subcontaDetails, setSubcontaDetails] = useState<any | null>(null);
  const [loadingSubconta, setLoadingSubconta] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loadingBankAccounts, setLoadingBankAccounts] = useState(false);

  // Transfer Participants State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [administrators, setAdministrators] = useState<Usuario[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    chavePix: '',
    picture: '',
    senha: '',
    score: 70,
    tipo: 'usuario' as 'usuario' | 'administrador' | 'master',
    ativo: true,
    caixasConcluidos: 0,
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

  // Sincronização automática de dados bancários em background
  useEffect(() => {
    const syncBankAccountsInBackground = async () => {
      if (participantes.length === 0) return;

      console.log('🔄 Iniciando sincronização automática de dados bancários em background...');

      for (const participante of participantes) {
        if (!participante._id) continue;

        try {
          // Buscar subconta do participante
          const subcontaResponse = await subcontasService.getByUsuarioId(participante._id);

          if (subcontaResponse.success && subcontaResponse.subconta?._id) {
            // Salvar dados bancários automaticamente (silencioso)
            await subcontasService.saveBankAccounts(subcontaResponse.subconta._id);
          }
        } catch (error) {
          // Silencioso - não bloqueia nem mostra erro
          console.debug(`Sync silencioso para ${participante.nome}: sem subconta ou erro`);
        }
      }

      console.log('✅ Sincronização automática de dados bancários concluída');
    };

    // Executar sync em background após um pequeno delay
    const timeoutId = setTimeout(() => {
      syncBankAccountsInBackground();
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [participantes]);

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

      // 2️⃣ Buscar todos os usuários (removido filtro de tipo para exibir todos)
      const responseUsuarios = await usuariosService.getAll();
      const listaUsuarios = Array.isArray(responseUsuarios) ? responseUsuarios : responseUsuarios.usuarios || [];
      // Exibir todos os usuários, não apenas tipo 'usuario'
      const usuarios = listaUsuarios;

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

  // Handler para buscar endereço pelo CEP
  const handleCEPLookup = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');

    // Só busca se tiver 8 dígitos
    if (cleanCEP.length !== 8) return;

    try {
      setLoadingCEP(true);
      const addressData = await fetchAddressByCEP(cep);

      if (addressData) {
        setFormData({
          ...formData,
          address: {
            ...formData.address,
            street: addressData.street,
            zone: addressData.zone,
            city: addressData.city,
            state: addressData.state,
            zip: cep, // Mantém o CEP formatado
          },
        });
      } else {
        setErrorMessage('CEP não encontrado. Verifique o número digitado.');
        setShowErrorModal(true);
      }
    } catch (error: any) {
      console.error('Erro ao buscar CEP:', error);
      setErrorMessage(error.message || 'Erro ao buscar CEP. Tente novamente.');
      setShowErrorModal(true);
    } finally {
      setLoadingCEP(false);
    }
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
        // Note: tipo, score, ativo, and caixasConcluidos are set by backend defaults
        // Backend will set: tipo='usuario', score=70, ativo=true, caixasConcluidos=0
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
      const zipDigits = formData.address.zip.replace(/\D/g, '');
      await usuariosService.update(selectedParticipante._id, {
        nome: formData.nome,
        email: formData.email,
        telefone: telefoneDigits,
        cpf: cpfDigits,
        chavePix: formData.chavePix,
        picture: formData.picture,
        score: formData.score,
        tipo: formData.tipo,
        ativo: formData.ativo,
        caixasConcluidos: formData.caixasConcluidos,
        address: {
          street: formData.address.street,
          zone: formData.address.zone,
          city: formData.address.city,
          state: formData.address.state,
          number: formData.address.number,
          complement: formData.address.complement,
          zip: zipDigits,
        },
        // Envia senha somente se informada
        ...(formData.senha ? { senha: formData.senha } : {}),
      });

      // Handle caixa change if caixa was changed
      const oldCaixaId = selectedParticipante.caixaId;
      const newCaixaId = selectedCaixaId;

      if (oldCaixaId !== newCaixaId) {
        // If there's a new caixa, create or update the participant-caixa association
        if (newCaixaId) {
          try {
            await participantesService.create({
              caixaId: newCaixaId,
              usuarioId: selectedParticipante._id,
              aceite: true,
              status: 'ativo',
            });
          } catch (error: any) {
            // If creation fails, it might already exist, which is okay
            console.log('Caixa association may already exist or was updated');
          }
        }
        // Note: We don't delete old associations to preserve history
      }

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
      telefone: maskPhone(participante.telefone),
      cpf: participante.cpf ? maskCPF(participante.cpf) : '',
      chavePix: participante.chavePix || '',
      picture: participante.picture || '',
      senha: '',
      score: participante.score || 70,
      tipo: participante.tipo || 'usuario',
      ativo: participante.ativo !== undefined ? participante.ativo : true,
      caixasConcluidos: participante.caixasConcluidos || 0,
      address: {
        street: participante.address?.street || (participante as any).endereco || '',
        zone: participante.address?.zone || '',
        city: participante.address?.city || (participante as any).cidade || '',
        state: participante.address?.state || (participante as any).estado || '',
        number: participante.address?.number || '',
        complement: participante.address?.complement || '',
        zip: participante.address?.zip ? formatCEP(participante.address.zip) : (participante as any).cep ? formatCEP((participante as any).cep) : '',
      },
    });
    setImagePreview(participante.picture || '');
    // Set the caixa ID if participant has one
    setSelectedCaixaId(participante.caixaId || '');
    setShowEditModal(true);
  };

  const openDeleteModal = (participante: Usuario) => {
    setSelectedParticipante(participante);
    setShowDeleteModal(true);
  };

  const openDetailModal = async (participante: Usuario) => {
    setSelectedParticipante(participante);
    setShowDetailModal(true);
    setSubcontaDetails(null);
    setBankAccounts([]);

    // Fetch subconta details if participant has an ID
    if (participante._id) {
      try {
        setLoadingSubconta(true);
        const response = await subcontasService.getByUsuarioId(participante._id);
        if (response.success && response.subconta) {
          setSubcontaDetails(response.subconta);

          // Fetch bank accounts using subconta _id
          if (response.subconta._id) {
            try {
              setLoadingBankAccounts(true);

              // 1. Buscar dados do Lytex (sempre mostra dados atualizados)
              console.log('📡 Buscando dados bancários do Lytex...');
              const lytexResponse = await subcontasService.getBankAccounts(response.subconta._id);

              if (lytexResponse.success && lytexResponse.bankAccounts && lytexResponse.bankAccounts.length > 0) {
                // Exibir dados do Lytex imediatamente
                setBankAccounts(lytexResponse.bankAccounts);
                console.log('✅ Dados bancários carregados do Lytex');

                // 2. Salvar localmente em background (para próximas consultas)
                console.log('💾 Salvando dados bancários localmente...');
                subcontasService.saveBankAccounts(response.subconta._id)
                  .then(() => {
                    console.log('✅ Dados bancários salvos com sucesso no banco local');
                  })
                  .catch((error) => {
                    console.error('⚠️ Erro ao salvar dados bancários:', error);
                  });
              } else {
                // 3. Se Lytex não retornar dados, tenta buscar do local como fallback
                console.log('⚠️ Nenhum dado no Lytex, tentando buscar do banco local...');
                const localResponse = await subcontasService.getLocalBankAccounts(response.subconta._id);

                if (localResponse.success && localResponse.bankAccounts && localResponse.bankAccounts.length > 0) {
                  setBankAccounts(localResponse.bankAccounts);
                  console.log('✅ Dados bancários carregados do banco local (fallback)');
                }
              }
            } catch (error) {
              console.error('❌ Erro ao carregar dados bancários do Lytex:', error);

              // Fallback: tentar buscar do local se Lytex falhar
              try {
                console.log('� Tentando buscar do banco local como fallback...');
                const localResponse = await subcontasService.getLocalBankAccounts(response.subconta._id);

                if (localResponse.success && localResponse.bankAccounts && localResponse.bankAccounts.length > 0) {
                  setBankAccounts(localResponse.bankAccounts);
                  console.log('✅ Dados bancários carregados do banco local (fallback após erro)');
                }
              } catch (localError) {
                console.error('❌ Erro ao buscar dados locais:', localError);
              }
            } finally {
              setLoadingBankAccounts(false);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes da subconta:', error);
      } finally {
        setLoadingSubconta(false);
      }
    }
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
      score: 70,
      tipo: 'usuario',
      ativo: true,
      caixasConcluidos: 0,
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

  const loadAdministrators = async () => {
    try {
      // Fetch administrators for the transfer modal
      const response = await usuariosService.getAll({ tipo: 'administrador', ativo: true });
      const admins = Array.isArray(response) ? response : response.usuarios || [];
      setAdministrators(admins);
    } catch (error) {
      console.error('Erro ao carregar administradores:', error);
    }
  };

  const openTransferModal = (participante: Usuario) => {
    setSelectedParticipante(participante);
    setSelectedAdminId(''); // Reset selection
    loadAdministrators();
    setShowTransferModal(true);
  };

  const handleTransfer = async () => {
    if (!selectedParticipante || !selectedAdminId) return;

    try {
      setTransferLoading(true);

      // Find selected admin to get their name
      const selectedAdmin = administrators.find(a => a._id === selectedAdminId);
      const adminName = selectedAdmin?.nome || 'Novo Administrador';

      await usuariosService.update(selectedParticipante._id, {
        criadoPorId: selectedAdminId,
        criadoPorNome: adminName,
        // Optional: clear caixa association when transferring? 
        // User request says: "once transferred... admin can add to their caixa".
        // This implies preserving current state but changing ownership.
      });

      await loadParticipantes();
      setShowTransferModal(false);
      setSelectedParticipante(null);
      setSelectedAdminId('');
      setSuccessMessage('Participante transferido com sucesso!');
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Erro ao transferir participante:', error);
      const msg = error.response?.data?.message || 'Erro ao transferir participante. Tente novamente.';
      setErrorMessage(msg);
      setShowErrorModal(true);
    } finally {
      setTransferLoading(false);
    }
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
                      <div className="flex items-center justify-end gap-2 relative">
                        <button
                          onClick={() => setOpenDropdownId(openDropdownId === participante._id ? null : participante._id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-600" />
                        </button>

                        {openDropdownId === participante._id && (
                          <>
                            {/* Backdrop to close dropdown */}
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenDropdownId(null)}
                            />
                            {/* Dropdown menu */}
                            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px] z-20">
                              <button
                                onClick={() => {
                                  openDetailModal(participante);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                Visualizar Detalhes
                              </button>
                              <button
                                onClick={() => {
                                  openEditModal(participante);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4" />
                                Editar Participante
                              </button>
                              {usuarioLogado?.tipo === 'master' && (
                                <button
                                  onClick={() => {
                                    openTransferModal(participante);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <ArrowRightLeft className="w-4 h-4" />
                                  Transferir Participante
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  openDeleteModal(participante);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Excluir Participante
                              </button>
                            </div>
                          </>
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
                    leftIcon={loadingCEP ? <div className="animate-spin w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full" /> : <MapPin className="w-4 h-4" />}
                    value={formData.address.zip}
                    onChange={(e) => {
                      const formatted = formatCEP(e.target.value);
                      setFormData({
                        ...formData,
                        address: { ...formData.address, zip: formatted },
                      });
                    }}
                    onBlur={(e) => handleCEPLookup(e.target.value)}
                    maxLength={9}
                    disabled={loadingCEP}
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

      {/* Modal Transferir Participante */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setSelectedParticipante(null);
          setSelectedAdminId('');
        }}
        title="Transferir Participante"
        size="md"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
            <ArrowRightLeft className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 font-medium">
                Transferindo: {selectedParticipante?.nome}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                Selecione o novo administrador que será responsável por gerenciar este participante.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Novo Administrador
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              value={selectedAdminId}
              onChange={(e) => setSelectedAdminId(e.target.value)}
            >
              <option value="">Selecione um administrador...</option>
              {administrators.map((admin) => (
                <option key={admin._id} value={admin._id}>
                  {admin.nome} {admin.email ? `(${admin.email})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setShowTransferModal(false);
                setSelectedParticipante(null);
                setSelectedAdminId('');
              }}
              disabled={transferLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleTransfer}
              disabled={!selectedAdminId || transferLoading}
            >
              {transferLoading ? 'Transferindo...' : 'Confirmar Transferência'}
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
            <Input
              label="Nova Senha"
              type="password"
              placeholder="Deixe em branco para manter a atual"
              value={formData.senha}
              onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
            />
          </div>

          {/* Campos Adicionais: SCORE, TIPO, STATUS, Caixas Concluídos */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Informações Adicionais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Score"
                type="number"
                placeholder="Score (0-100)"
                value={formData.score}
                onChange={(e) => {
                  const value = Math.min(100, Math.max(0, Number(e.target.value)));
                  setFormData({ ...formData, score: value });
                }}
                min={0}
                max={100}
              />

              {usuarioLogado?.tipo === 'master' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Usuário
                  </label>
                  <select
                    className="w-full h-[42px] px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                  >
                    <option value="usuario">Usuário</option>
                    <option value="administrador">Administrador</option>
                    <option value="master">Master</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  className="w-full h-[42px] px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  value={formData.ativo ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.value === 'true' })}
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>

              <Input
                label="Caixas Concluídos"
                type="number"
                placeholder="0"
                value={formData.caixasConcluidos}
                onChange={(e) => setFormData({ ...formData, caixasConcluidos: Number(e.target.value) })}
                min={0}
              />
            </div>

            {/* Caixa Selection */}
            {(usuarioLogado?.tipo === 'master' || usuarioLogado?.tipo === 'administrador') && caixas.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Caixa do Participante
                </label>
                <select
                  className="w-full h-[42px] px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  value={selectedCaixaId}
                  onChange={(e) => setSelectedCaixaId(e.target.value)}
                >
                  <option value="">Sem caixa</option>
                  {caixas.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.nome}
                      {c.adminId && typeof c.adminId === 'object' && c.adminId.nome
                        ? ` • Admin: ${c.adminId.nome}`
                        : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Altere para mover o participante para outro caixa
                </p>
              </div>
            )}
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
                    leftIcon={loadingCEP ? <div className="animate-spin w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full" /> : <MapPin className="w-4 h-4" />}
                    value={formData.address.zip}
                    onChange={(e) => {
                      const formatted = formatCEP(e.target.value);
                      setFormData({
                        ...formData,
                        address: { ...formData.address, zip: formatted },
                      });
                    }}
                    onBlur={(e) => handleCEPLookup(e.target.value)}
                    maxLength={9}
                    disabled={loadingCEP}
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
          setSubcontaDetails(null);
          setBankAccounts([]);
        }}
        title="Detalhes do Participante"
        size="xl"
      >
        {selectedParticipante && (
          <div className="space-y-6">
            {/* Header com Avatar e Nome */}
            <div className="flex flex-col items-center gap-3 pb-4 border-b border-gray-200">
              <Avatar
                src={selectedParticipante.picture}
                name={selectedParticipante.nome}
                size="xl"
              />
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900">{selectedParticipante.nome}</h3>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge variant={selectedParticipante.score >= 80 ? 'success' : 'warning'} size="sm">
                    <Award className="w-3 h-3 mr-1" />
                    Score: {selectedParticipante.score}
                  </Badge>
                  <Badge
                    variant={selectedParticipante.ativo ? 'success' : 'danger'}
                    size="sm"
                  >
                    {selectedParticipante.ativo ? (
                      <><CheckCircle className="w-3 h-3 mr-1" />Ativo</>
                    ) : (
                      <><XCircle className="w-3 h-3 mr-1" />Inativo</>
                    )}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Informações Pessoais */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Informações Pessoais
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Tipo</p>
                  <Badge
                    variant={
                      selectedParticipante.tipo === 'master' ? 'success' :
                        selectedParticipante.tipo === 'administrador' ? 'info' : 'gray'
                    }
                    size="sm"
                  >
                    {selectedParticipante.tipo === 'master' ? 'Master' :
                      selectedParticipante.tipo === 'administrador' ? 'Administrador' : 'Usuário'}
                  </Badge>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Caixas Concluídos</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedParticipante.caixasConcluidos || 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 mt-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{selectedParticipante.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Telefone</p>
                    <p className="text-sm font-medium text-gray-900">{maskPhone(selectedParticipante.telefone)}</p>
                  </div>
                </div>
                {selectedParticipante.cpf && (
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">CPF</p>
                      <p className="text-sm font-medium text-gray-900">{maskCPF(selectedParticipante.cpf)}</p>
                    </div>
                  </div>
                )}
                {selectedParticipante.chavePix && (
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Chave PIX</p>
                      <p className="text-sm font-medium text-gray-900">{selectedParticipante.chavePix}</p>
                    </div>
                  </div>
                )}
              </div>

              {selectedParticipante.caixaNome && (
                <div className="bg-green-50 p-3 rounded-lg mt-3">
                  <p className="text-xs text-green-600 mb-1">Caixa Atual</p>
                  <p className="text-sm font-semibold text-green-900">{selectedParticipante.caixaNome}</p>
                </div>
              )}
            </div>

            {/* Endereço */}
            {(selectedParticipante.address?.street || selectedParticipante.address?.zip) && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Endereço
                </h4>
                <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm text-gray-600">
                  {selectedParticipante.address?.street && (
                    <p>
                      <span className="font-medium">Rua:</span> {selectedParticipante.address.street}
                      {selectedParticipante.address?.number && `, ${selectedParticipante.address.number}`}
                    </p>
                  )}
                  {selectedParticipante.address?.complement && (
                    <p><span className="font-medium">Complemento:</span> {selectedParticipante.address.complement}</p>
                  )}
                  {selectedParticipante.address?.zone && (
                    <p><span className="font-medium">Bairro:</span> {selectedParticipante.address.zone}</p>
                  )}
                  {(selectedParticipante.address?.city || selectedParticipante.address?.state) && (
                    <p>
                      <span className="font-medium">Cidade/UF:</span>{' '}
                      {selectedParticipante.address.city}, {selectedParticipante.address.state}
                    </p>
                  )}
                  {selectedParticipante.address?.zip && (
                    <p><span className="font-medium">CEP:</span> {formatCEP(selectedParticipante.address.zip)}</p>
                  )}
                </div>
              </div>
            )}

            {/* Detalhes da Subconta */}
            {loadingSubconta ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : subcontaDetails ? (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-green-600" />
                  Detalhes da Subconta Lytex
                </h4>
                <div className="bg-green-50 p-4 rounded-lg space-y-3">
                  {/* Type and Name */}
                  <div className="grid grid-cols-2 gap-3">
                    {subcontaDetails.type && (
                      <div>
                        <p className="text-xs text-green-600 mb-1">Tipo</p>
                        <Badge variant={subcontaDetails.type === 'pf' ? 'info' : 'warning'} size="sm">
                          {subcontaDetails.type === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                        </Badge>
                      </div>
                    )}
                    {subcontaDetails.nomeCaixa && (
                      <div>
                        <p className="text-xs text-green-600 mb-1">Nome do Caixa</p>
                        <p className="text-sm font-medium text-gray-900">{subcontaDetails.nomeCaixa}</p>
                      </div>
                    )}
                  </div>

                  {/* Lytex Credentials */}
                  <div className="border-t border-green-200 pt-3">
                    <p className="text-xs text-green-600 mb-2 font-semibold">Credenciais Lytex</p>
                    <div className="space-y-2">
                      {subcontaDetails.lytexId && (
                        <div>
                          <p className="text-xs text-gray-500">Lytex ID</p>
                          <p className="text-sm font-mono text-gray-900 bg-white px-2 py-1 rounded border border-green-200">
                            {subcontaDetails.lytexId}
                          </p>
                        </div>
                      )}
                      {subcontaDetails.clientId && (
                        <div>
                          <p className="text-xs text-gray-500">Client ID</p>
                          <p className="text-sm font-mono text-gray-900 bg-white px-2 py-1 rounded border border-green-200">
                            {subcontaDetails.clientId}
                          </p>
                        </div>
                      )}
                      {subcontaDetails.clientSecret && (
                        <div>
                          <p className="text-xs text-gray-500">Client Secret</p>
                          <p className="text-sm font-mono text-gray-900 bg-white px-2 py-1 rounded border border-green-200">
                            {'•'.repeat(20)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Dados Bancários */}
            {loadingBankAccounts ? (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  Dados Bancários
                </h4>
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              </div>
            ) : bankAccounts.length > 0 ? (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  Dados Bancários
                </h4>
                <div className="space-y-3">
                  {bankAccounts.map((account, index) => (
                    <div key={account._id || index} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      {/* Bank Info */}
                      <div className="mb-3 pb-3 border-b border-blue-200">
                        <p className="text-xs text-blue-600 mb-1">Banco</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {account.bank?.name} ({account.bank?.code})
                        </p>
                        {account.bank?.ispb && (
                          <p className="text-xs text-gray-500">ISPB: {account.bank.ispb}</p>
                        )}
                      </div>

                      {/* Account Details */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-blue-600 mb-1">Agência</p>
                          <p className="text-sm font-mono text-gray-900">
                            {account.agency?.number}{account.agency?.dv ? `-${account.agency.dv}` : ''}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-600 mb-1">Conta</p>
                          <p className="text-sm font-mono text-gray-900">
                            {account.account?.number}{account.account?.dv ? `-${account.account.dv}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-blue-600 mb-1">Tipo de Conta</p>
                          <Badge variant="info" size="sm">
                            {account.account?.type === 'corrente' ? 'Corrente' : 'Poupança'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-blue-600 mb-1">Status</p>
                          <Badge
                            variant={account.status === 'approved' ? 'success' : 'warning'}
                            size="sm"
                          >
                            {account.status === 'approved' ? 'Aprovada' : account.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Additional Info */}
                      {account.createdAt && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <p className="text-xs text-gray-500">
                            Criada em: {new Date(account.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : subcontaDetails ? (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  Dados Bancários
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500 text-sm">
                  Nenhuma conta bancária cadastrada
                </div>
              </div>
            ) : null}
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
