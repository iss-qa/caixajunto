import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  CreditCard,
  Award,
  LogOut,
  ChevronRight,
  Shield,
  Bell,
  HelpCircle,
  FileText,
  Edit2,
  Camera,
  Upload,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { caixasService, usuariosService, carteiraService } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { formatCurrency, formatDate } from '../lib/utils';

interface LytexSubAccountInfo {
  _id: string;
  type?: string;
  typeAccount?: string;
  cpfCnpj?: string;
  fantasyName?: string;
  corporateName?: string;
  name?: string;
  openedAt?: string;
  address?: {
    street?: string;
    number?: string;
    zone?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

const menuItems = [
  { icon: Bell, label: 'Notificações', path: '/notificacoes', badge: '3' },
  { icon: Shield, label: 'Segurança', path: '/seguranca' },
  { icon: HelpCircle, label: 'Ajuda', path: '/ajuda' },
  { icon: FileText, label: 'Termos de Uso', path: '/termos' },
];

export function Perfil() {
  const { usuario, logout, updateUsuario } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [ganhosPrevistos, setGanhosPrevistos] = useState(0);
  const [ganhosAcumulados, setGanhosAcumulados] = useState(0);
  const [totalCaixas, setTotalCaixas] = useState(0);
  const [fotoUrl, setFotoUrl] = useState<string | undefined>(usuario?.fotoUrl);
  const [uploading, setUploading] = useState(false);
  const [editForm, setEditForm] = useState({
    nome: usuario?.nome || '',
    telefone: usuario?.telefone || '',
    chavePix: usuario?.chavePix || '',
  });
  const [lytexSubAccount, setLytexSubAccount] =
    useState<LytexSubAccountInfo | null>(null);
  const [loadingSubAccount, setLoadingSubAccount] = useState(false);

  useEffect(() => {
    loadDados();
  }, [usuario]);

  const loadDados = async () => {
    if (!usuario?._id) return;
    
    try {
      const caixasResponse = await caixasService.getByAdmin(usuario._id);
      const caixas = Array.isArray(caixasResponse) ? caixasResponse : caixasResponse.caixas || [];
      
      // Calcular ganhos previstos: 10% do valor total de cada caixa
      const previstos = caixas.reduce((total: number, caixa: any) => {
        return total + (caixa.valorTotal * 0.10);
      }, 0);
      
      // Calcular ganhos acumulados (apenas de caixas finalizados)
      const acumulados = caixas
        .filter((c: any) => c.status === 'finalizado')
        .reduce((total: number, caixa: any) => {
          return total + (caixa.valorTotal * 0.10);
        }, 0);
      
      setGanhosPrevistos(previstos);
      setGanhosAcumulados(acumulados);
      setTotalCaixas(caixas.length);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      // Mock
      setGanhosPrevistos(1500);
      setGanhosAcumulados(500);
      setTotalCaixas(3);
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      usuario: 'Participante',
      administrador: 'Administrador',
      master: 'Super Admin',
    };
    return labels[tipo] || tipo;
  };

  const getNivelLabel = (caixasConcluidos: number) => {
    if (caixasConcluidos >= 25) return { label: 'Diamante', color: 'bg-purple-100 text-purple-700' };
    if (caixasConcluidos >= 10) return { label: 'Ouro', color: 'bg-amber-100 text-amber-700' };
    if (caixasConcluidos >= 3) return { label: 'Prata', color: 'bg-gray-200 text-gray-700' };
    return { label: 'Bronze', color: 'bg-amber-700/20 text-amber-800' };
  };

  const nivel = getNivelLabel(usuario?.caixasConcluidos || 0);

  const formatCpfCnpj = (value?: string) => {
    if (!value) return '';
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11) {
      return digits.replace(
        /(\d{3})(\d{3})(\d{3})(\d{2})/,
        '$1.$2.$3-$4',
      );
    }
    if (digits.length === 14) {
      return digits.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        '$1.$2.$3/$4-$5',
      );
    }
    return value;
  };

  const formatAddress = (sub: LytexSubAccountInfo | null) => {
    const address = sub?.address;
    if (!address) return '';
    const parts = [
      address.street,
      address.number,
      address.zone,
      address.city,
      address.state,
      address.zip,
    ].filter(Boolean);
    return parts.join(', ');
  };

  useEffect(() => {
    const fetchSubAccount = async () => {
      if (usuario?.tipo !== 'master') {
        setLytexSubAccount(null);
        return;
      }
      try {
        setLoadingSubAccount(true);
        const data = await carteiraService.getSubAccount();
        if (data && (data as LytexSubAccountInfo)._id) {
          setLytexSubAccount(data as LytexSubAccountInfo);
        } else {
          setLytexSubAccount(null);
        }
      } catch (error) {
        console.error('Erro ao carregar subconta Lytex:', error);
        setLytexSubAccount(null);
      } finally {
        setLoadingSubAccount(false);
      }
    };

    fetchSubAccount();
  }, [usuario?.tipo]);

  const handleSaveProfile = async () => {
    try {
      if (usuario?._id) {
        await usuariosService.update(usuario._id, editForm);
      }
      updateUsuario(editForm);
      setShowEditModal(false);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      updateUsuario(editForm);
      setShowEditModal(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem.');
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB.');
      return;
    }

    try {
      setUploading(true);
      
      // Converter para base64 para preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFotoUrl(base64);
        
        // Aqui você faria o upload real para o backend
        // await usuariosService.uploadFoto(usuario._id, file);
      };
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 -m-4 md:-m-5 mb-4 p-6 text-white text-center">
            <div className="relative inline-block mb-3">
              {fotoUrl ? (
                <img
                  src={fotoUrl}
                  alt={usuario?.nome}
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-white/30"
                />
              ) : (
                <Avatar name={usuario?.nome || 'U'} size="xl" />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-gray-600" />
                )}
              </button>
            </div>
            <h1 className="text-xl font-bold">{usuario?.nome}</h1>
            <p className="text-white/80 text-sm">{usuario?.email}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant="success" className="bg-white/20 text-white">
                {getTipoLabel(usuario?.tipo || '')}
              </Badge>
              <Badge className={nivel.color}>{nivel.label}</Badge>
            </div>
          </div>

          {/* Stats - Dinâmicos */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
                <Award className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{usuario?.score || 70}</p>
              <p className="text-xs text-gray-500">Score</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-gray-900">{totalCaixas}</p>
              <p className="text-xs text-gray-500">Caixas</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(ganhosPrevistos)}</p>
              <p className="text-xs text-gray-500">Ganhos</p>
            </div>
          </div>

          {/* Info sobre ganhos */}
          <div className="mt-4 p-3 bg-green-50 rounded-xl">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Ganhos Acumulados:</span>
              <span className="font-semibold text-green-600">{formatCurrency(ganhosAcumulados)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Ganhos Previstos:</span>
              <span className="font-semibold text-blue-600">{formatCurrency(ganhosPrevistos)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * Ganho = 10% do valor total de cada caixa organizado
            </p>
          </div>

          <Button
            variant="secondary"
            className="w-full mt-4"
            leftIcon={<Edit2 className="w-4 h-4" />}
            onClick={() => setShowEditModal(true)}
          >
            Editar Perfil
          </Button>
        </Card>
      </motion.div>

      {/* Info Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Informações</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{usuario?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Telefone</p>
                <p className="font-medium text-gray-900">{usuario?.telefone || 'Não informado'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Chave Pix</p>
                <p className="font-medium text-gray-900">{usuario?.chavePix || 'Não configurada'}</p>
              </div>
            </div>
            {usuario?.tipo === 'master' && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Conta PJ no Gateway LyTex</p>
                  {loadingSubAccount && (
                    <p className="text-xs text-gray-400 mt-1">Carregando dados da conta...</p>
                  )}
                  {!loadingSubAccount && lytexSubAccount && (
                    <>
                      <p className="font-medium text-gray-900">
                        {lytexSubAccount.fantasyName ||
                          lytexSubAccount.corporateName ||
                          lytexSubAccount.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        ID: {lytexSubAccount._id}
                      </p>
                      <p className="text-xs text-gray-500">
                        Tipo: {lytexSubAccount.typeAccount || lytexSubAccount.type}
                      </p>
                      <p className="text-xs text-gray-500">
                        CNPJ: {formatCpfCnpj(lytexSubAccount.cpfCnpj)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Abertura:{' '}
                        {lytexSubAccount.openedAt
                          ? formatDate(lytexSubAccount.openedAt)
                          : 'Não informado'}
                      </p>
                      {formatAddress(lytexSubAccount) && (
                        <p className="text-xs text-gray-500">
                          Endereço: {formatAddress(lytexSubAccount)}
                        </p>
                      )}
                    </>
                  )}
                  {!loadingSubAccount && !lytexSubAccount && (
                    <p className="text-xs text-gray-500 mt-1">
                      Conta LyTex ainda não configurada.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Menu */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="mb-6" padding="none">
          {menuItems.map((item) => (
            <button
              key={item.path}
              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <item.icon className="w-5 h-5 text-gray-600" />
              </div>
              <span className="flex-1 text-left font-medium text-gray-900">{item.label}</span>
              {item.badge && (
                <span className="w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </Card>
      </motion.div>

      {/* Logout */}
      <Button
        variant="danger"
        className="w-full"
        leftIcon={<LogOut className="w-4 h-4" />}
        onClick={logout}
      >
        Sair da Conta
      </Button>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar Perfil"
      >
        <div className="space-y-4">
          {/* Upload de foto no modal */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              {fotoUrl ? (
                <img
                  src={fotoUrl}
                  alt={usuario?.nome}
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-green-100"
                />
              ) : (
                <Avatar name={usuario?.nome || 'U'} size="xl" />
              )}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-green-600 transition-colors"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <Input
            label="Nome Completo"
            value={editForm.nome}
            onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
            leftIcon={<User className="w-4 h-4" />}
          />
          <Input
            label="Telefone"
            value={editForm.telefone}
            onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
            leftIcon={<Phone className="w-4 h-4" />}
          />
          <Input
            label="Chave Pix"
            value={editForm.chavePix}
            onChange={(e) => setEditForm({ ...editForm, chavePix: e.target.value })}
            leftIcon={<CreditCard className="w-4 h-4" />}
            placeholder="CPF, Email ou Telefone"
          />
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleSaveProfile}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
