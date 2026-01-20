import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Wallet,
  Users,
  Calendar,
  DollarSign,
  Info,
  CheckCircle,
  UserPlus,
  PartyPopper,
  Clock,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { caixasService } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { formatCurrency, cn } from '../lib/utils';

const valorOptions = [
  { value: 1000, label: 'R$ 1.000' },
  { value: 2000, label: 'R$ 2.000' },
  { value: 3000, label: 'R$ 3.000' },
  { value: 5000, label: 'R$ 5.000' },
  { value: 7000, label: 'R$ 7.000' },
  { value: 10000, label: 'R$ 10.000' },
];

// Taxas
const TAXA_SERVICO = 10; // R$ 10,00 - taxa de serviço fixa
const TAXA_ADMINISTRATIVA = 50; // R$ 50,00 - lucro da aplicação (cobrado no primeiro ponto)

type TipoCaixa = 'mensal' | 'semanal' | 'diario';

export function NovoCaixa() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [caixaCriado, setCaixaCriado] = useState<{ id: string; nome: string } | null>(null);
  const [valorCustom, setValorCustom] = useState('');
  const [showValorCustom, setShowValorCustom] = useState(false);
  const [customParticipantes, setCustomParticipantes] = useState(false);
  const [customDuracao, setCustomDuracao] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [valorError, setValorError] = useState('');
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    tipo: 'mensal' as TipoCaixa,
    valorTotal: 5000,
    qtdParticipantes: 10,
    duracaoMeses: 10,
    dataVencimento: '', // Data completa de vencimento da 1ª parcela
  });

  // Calcular data mínima de vencimento baseado no tipo
  const getMinDataVencimento = () => {
    const data = new Date();
    // Diário: 2 dias (bloqueia amanhã) | Semanal/Mensal: 5 dias
    const diasMinimos = form.tipo === 'diario' ? 2 : 5;
    data.setDate(data.getDate() + diasMinimos);
    return data.toISOString().split('T')[0];
  };

  // Resetar ao montar o componente
  useEffect(() => {
    setStep(1);
    setCaixaCriado(null);
    setShowValorCustom(false);
    setValorCustom('');
    setCustomParticipantes(false);
    setCustomDuracao(false);
    const dataInicial = new Date();
    dataInicial.setDate(dataInicial.getDate() + 7); // 7 dias por padrão
    setForm({
      nome: '',
      descricao: '',
      tipo: 'mensal',
      valorTotal: 5000,
      qtdParticipantes: 10,
      duracaoMeses: 10,
      dataVencimento: dataInicial.toISOString().split('T')[0],
    });
  }, []);

  // Opções de participantes baseado no tipo
  const participantesOptions = form.tipo === 'semanal'
    ? [4, 6, 8, 10, 12, 16, 20, 24]
    : form.tipo === 'diario'
      ? [4, 5, 6, 7, 10, 14, 20, 30]
      : [4, 5, 6, 7, 8, 9, 10, 11, 12];

  // Opções de duração baseado no tipo (independente de participantes)
  const duracaoOptions = form.tipo === 'semanal'
    ? [4, 6, 8, 10, 12, 16, 20, 24]
    : form.tipo === 'diario'
      ? [4, 5, 6, 7, 10, 14, 20, 30]
      : [4, 5, 6, 7, 8, 9, 10, 11, 12];

  // REGRA: Parcela = valorTotal / qtdParticipantes
  const valorParcela = form.valorTotal / form.qtdParticipantes;
  // REGRA: Ganho admin = 10% do valor total
  const ganhoAdmin = form.valorTotal * 0.10;


  // Validar se a data de vencimento é válida (mínimo baseado no tipo)
  const isDataVencimentoValida = () => {
    if (!form.dataVencimento) return false;
    const dataVenc = new Date(form.dataVencimento);
    const minData = new Date();
    // Diário: bloqueia apenas amanhã (dia 21), permite depois de amanhã (dia 22+)
    // Semanal/Mensal: 5 dias
    const diasMinimos = form.tipo === 'diario' ? 1 : 5;
    minData.setDate(minData.getDate() + diasMinimos);
    return dataVenc > minData;
  };

  // Função para obter valor mínimo baseado no tipo
  const getValorMinimo = () => {
    if (form.tipo === 'diario') return 10; // R$ 10,00 mínimo para diário
    return 500; // R$ 500 para semanal e mensal
  };

  // Função para calcular data da última parcela
  const getDataUltimaParcela = () => {
    if (!form.dataVencimento) return null;
    const data = new Date(form.dataVencimento + 'T00:00:00');

    switch (form.tipo) {
      case 'mensal':
        data.setMonth(data.getMonth() + (form.qtdParticipantes - 1));
        break;
      case 'semanal':
        data.setDate(data.getDate() + (form.qtdParticipantes - 1) * 7);
        break;
      case 'diario':
        data.setDate(data.getDate() + (form.qtdParticipantes - 1));
        break;
    }

    return data.toLocaleDateString('pt-BR');
  };

  // Função para calcular data de contemplação (+1 dia)
  const getDataContemplacao = () => {
    if (!form.dataVencimento) return null;
    const data = new Date(form.dataVencimento + 'T00:00:00');
    data.setDate(data.getDate() + 1); // +1 dia
    return data.toLocaleDateString('pt-BR');
  };

  const handleValorCustomChange = (value: string) => {
    const numValue = parseInt(value.replace(/\D/g, '')) || 0;
    setValorCustom(value);

    const minimo = getValorMinimo();
    if (numValue > 0 && numValue < minimo) {
      setValorError(`Valor mínimo para caixa ${form.tipo}: R$ ${minimo.toFixed(2)}`);
    } else {
      setValorError('');
    }

    if (numValue >= minimo) {
      setForm({ ...form, valorTotal: numValue });
    }
  };

  const handleSubmit = async () => {
    if (!usuario?._id) return;

    // Validações finais
    if (!isDataVencimentoValida()) {
      alert('A data de vencimento deve ser no mínimo 5 dias após hoje');
      return;
    }

    try {
      setLoading(true);
      const dataVenc = new Date(form.dataVencimento);
      const response = await caixasService.create({
        nome: form.nome,
        descricao: form.descricao,
        tipo: form.tipo,
        valorTotal: form.valorTotal,
        valorParcela: valorParcela,
        qtdParticipantes: form.qtdParticipantes,
        duracaoMeses: form.duracaoMeses,
        diaVencimento: dataVenc.getDate(),
        dataInicio: form.dataVencimento,
        dataVencimento: form.dataVencimento,
        taxaApp: ganhoAdmin,
        taxaAdmin: ganhoAdmin,
        taxaServico: TAXA_SERVICO,
        taxaAdministrativa: TAXA_ADMINISTRATIVA,
        adminId: usuario._id,
        status: 'aguardando',
      });

      if (!response || !response._id) {
        throw new Error('Resposta inválida do servidor ao criar caixa');
      }

      setCaixaCriado({ id: response._id, nome: form.nome });
      setStep(4);
    } catch (error: any) {
      console.error('Erro ao criar caixa:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao criar caixa. Tente novamente.';
      setErrorModalMessage(errorMessage);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid = form.nome.length >= 3;
  const isStep2Valid = form.valorTotal >= getValorMinimo() && form.qtdParticipantes >= 2;
  const isStep3Valid = form.duracaoMeses >= 2 && isDataVencimentoValida();

  // Tela de sucesso
  if (step === 4 && caixaCriado) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <PartyPopper className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Caixa Criado com Sucesso! 🎉
          </h1>
          <p className="text-gray-500 mb-8">
            O caixa <strong>"{caixaCriado.nome}"</strong> foi criado. Agora você precisa adicionar os participantes.
          </p>

          <Card className="bg-amber-50 border-amber-200 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-amber-800">Próximo passo importante!</p>
                <p className="text-sm text-amber-700">
                  Cadastre os {form.qtdParticipantes} participantes do seu caixa para poder iniciá-lo.
                </p>
              </div>
            </div>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="primary"
              className="flex-1"
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => navigate(`/caixas/${caixaCriado.id}`)}
            >
              Adicionar Participantes
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => navigate('/caixas')}
            >
              Ver Meus Caixas
            </Button>
          </div>

          <div className="mt-6 p-4 bg-green-50 rounded-xl">
            <p className="text-sm text-green-700">
              💰 Seu ganho estimado: <strong>{formatCurrency(ganhoAdmin)}</strong> (10% do caixa)
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* Error Modal */}
      <Modal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title=""
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Erro ao criar caixa</h3>
          <p className="text-gray-600 mb-6 whitespace-pre-line">{errorModalMessage}</p>
          <Button
            variant="primary"
            onClick={() => setShowErrorModal(false)}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
          >
            Entendi
          </Button>
        </div>
      </Modal>

      <div className="max-w-2xl mx-auto px-4 py-6" data-testid="page-novo-caixa">
        {/* Back Button */}
        <button
          onClick={() => step > 1 ? setStep(step - 1) : navigate('/caixas')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          data-testid="btn-cancelar"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{step > 1 ? 'Voltar' : 'Cancelar'}</span>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Criar Novo Caixa{form.tipo && ` - ${form.tipo.charAt(0).toUpperCase() + form.tipo.slice(1)}`}
          </h1>
          <p className="text-gray-500">Configure seu caixa em poucos passos</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8" data-testid="step-indicator">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <motion.div
                initial={false}
                animate={{
                  scale: step === s ? 1.1 : 1,
                  backgroundColor: step >= s ? '#22c55e' : '#e5e7eb',
                }}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all',
                  step >= s ? 'text-white' : 'text-gray-400'
                )}
                style={step === s ? { boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)' } : {}}
                data-testid={`step-${s}`}
              >
                {step > s ? <CheckCircle className="w-5 h-5" /> : s}
              </motion.div>
              {s < 3 && (
                <div
                  className={cn(
                    'w-16 sm:w-24 h-1 mx-2 rounded-full transition-all',
                    step > s ? 'bg-green-500' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && (
              <Card data-testid="step1-card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Informações Básicas
                </h2>
                <div className="space-y-4">
                  <Input
                    label="Nome do Caixa"
                    placeholder="Ex: Caixa da Família"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    leftIcon={<Wallet className="w-4 h-4" />}
                    data-testid="input-nome"
                  />
                  <div>
                    <label className="label">Descrição (opcional)</label>
                    <textarea
                      className="input resize-none h-24"
                      placeholder="Descreva o objetivo deste caixa..."
                      value={form.descricao}
                      onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                      data-testid="input-descricao"
                    />
                  </div>

                  {/* Tipo do Caixa */}
                  <div>
                    <label className="label flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-500" />
                      Tipo do Caixa
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, tipo: 'diario', qtdParticipantes: 4, duracaoMeses: 4 })}
                        className={cn(
                          'p-4 rounded-xl border-2 text-left transition-all',
                          form.tipo === 'diario'
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-green-200'
                        )}
                        data-testid="tipo-diario"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className={cn('w-5 h-5', form.tipo === 'diario' ? 'text-green-600' : 'text-gray-400')} />
                          <span className={cn('font-semibold', form.tipo === 'diario' ? 'text-green-700' : 'text-gray-700')}>
                            Diário
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Pagamentos diários, até 30 participantes/dias
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, tipo: 'semanal', qtdParticipantes: 12, duracaoMeses: 12 })}
                        className={cn(
                          'p-4 rounded-xl border-2 text-left transition-all',
                          form.tipo === 'semanal'
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-green-200'
                        )}
                        data-testid="tipo-semanal"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className={cn('w-5 h-5', form.tipo === 'semanal' ? 'text-green-600' : 'text-gray-400')} />
                          <span className={cn('font-semibold', form.tipo === 'semanal' ? 'text-green-700' : 'text-gray-700')}>
                            Semanal
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Pagamentos semanais, até 24 participantes/semanas
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, tipo: 'mensal', qtdParticipantes: 10, duracaoMeses: 10 })}
                        className={cn(
                          'p-4 rounded-xl border-2 text-left transition-all',
                          form.tipo === 'mensal'
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-green-200'
                        )}
                        data-testid="tipo-mensal"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className={cn('w-5 h-5', form.tipo === 'mensal' ? 'text-green-600' : 'text-gray-400')} />
                          <span className={cn('font-semibold', form.tipo === 'mensal' ? 'text-green-700' : 'text-gray-700')}>
                            Mensal
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Pagamentos mensais, até 12 participantes/meses
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Valor e Participantes
                </h2>
                <div className="space-y-6">
                  {/* Valor Total */}
                  <div>
                    <label className="label flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      Valor Total do Caixa
                    </label>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {valorOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setForm({ ...form, valorTotal: option.value });
                            setShowValorCustom(false);
                            setValorCustom('');
                          }}
                          className={cn(
                            'p-3 rounded-xl border-2 text-center transition-all',
                            form.valorTotal === option.value && !showValorCustom
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 hover:border-green-200'
                          )}
                        >
                          <span className="font-semibold">{option.label}</span>
                        </button>
                      ))}
                    </div>
                    {/* Valor personalizado */}
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setShowValorCustom(!showValorCustom)}
                        className={cn(
                          'w-full p-3 rounded-xl border-2 text-center transition-all',
                          showValorCustom
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-dashed border-gray-300 text-gray-500 hover:border-green-300'
                        )}
                      >
                        {showValorCustom ? 'Valor Personalizado' : '+ Digitar outro valor'}
                      </button>
                      {showValorCustom && (
                        <div className="mt-3">
                          <Input
                            placeholder="Ex: 15000"
                            value={valorCustom}
                            onChange={(e) => handleValorCustomChange(e.target.value)}
                            leftIcon={<DollarSign className="w-4 h-4" />}
                            type="number"
                            min={form.tipo === 'diario' ? 10 : 500}
                          />
                          {valorError ? (
                            <p className="text-xs text-red-600 mt-1">{valorError}</p>
                          ) : (
                            <p className="text-xs text-gray-500 mt-1">
                              {form.tipo === 'diario' ? 'Mínimo: R$ 10,00' : 'Mínimo: R$ 500,00'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Participantes - Com opção personalizada */}
                  <div>
                    <label className="label flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-500" />
                      Número de Participantes (= número de parcelas)
                    </label>
                    {!customParticipantes ? (
                      <>
                        <div className="grid grid-cols-4 gap-2">
                          {participantesOptions.map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setForm({ ...form, qtdParticipantes: num, duracaoMeses: num })}
                              className={cn(
                                'p-3 rounded-xl border-2 text-center transition-all',
                                form.qtdParticipantes === num
                                  ? 'border-green-500 bg-green-50 text-green-700'
                                  : 'border-gray-200 hover:border-green-200'
                              )}
                            >
                              <span className="font-semibold">{num}</span>
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setCustomParticipantes(true)}
                          className="w-full mt-2 p-2 text-sm text-gray-500 border-dashed border-2 border-gray-200 rounded-xl hover:border-green-300"
                        >
                          + Outro valor
                        </button>
                      </>
                    ) : (
                      <div>
                        <Input
                          type="number"
                          min={2}
                          max={form.tipo === 'semanal' ? 24 : 12}
                          value={form.qtdParticipantes}
                          onChange={(e) => {
                            const val = Math.max(2, Math.min(parseInt(e.target.value) || 2, form.tipo === 'semanal' ? 24 : 12));
                            setForm({ ...form, qtdParticipantes: val, duracaoMeses: val });
                          }}
                          leftIcon={<Users className="w-4 h-4" />}
                        />
                        <div className="flex justify-between mt-1">
                          <p className="text-xs text-gray-500">
                            Mín: 2 | Máx: {form.tipo === 'semanal' ? '24' : '12'}
                          </p>
                          <button
                            type="button"
                            onClick={() => setCustomParticipantes(false)}
                            className="text-xs text-green-600 hover:underline"
                          >
                            Ver opções
                          </button>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-amber-600 mt-2">
                      ⚠️ Importante: Cada participante recebe em uma posição. {form.qtdParticipantes} participantes = {form.qtdParticipantes} parcelas
                    </p>
                  </div>

                  {/* Preview */}
                  <div className="p-4 bg-green-50 rounded-xl">
                    <p className="text-sm font-medium text-green-700 mb-2">Resumo</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tipo</span>
                        <span className="font-semibold text-gray-900 capitalize">{form.tipo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Valor total</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(form.valorTotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Parcela</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(valorParcela)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total de parcelas</span>
                        <span className="font-semibold text-gray-900">
                          {form.qtdParticipantes}{form.tipo === 'diario' ? '' : form.tipo === 'semanal' ? ' semanas' : ' meses'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <Card>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Data de Vencimento
                  </h2>
                  <div className="space-y-4">
                    {/* Data de Vencimento da Primeira Parcela + Data de Contemplação */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-green-500" />
                          Data de Vencimento da 1ª Parcela
                        </label>
                        <Input
                          type="date"
                          min={getMinDataVencimento()}
                          value={form.dataVencimento}
                          onChange={(e) => setForm({ ...form, dataVencimento: e.target.value })}
                          leftIcon={<Calendar className="w-4 h-4" />}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {form.tipo === 'diario'
                            ? 'A data deve ser depois de amanhã (bloqueia apenas amanhã)'
                            : 'A data deve ser no mínimo 5 dias a partir de hoje'
                          }
                        </p>
                        {form.dataVencimento && !isDataVencimentoValida() && (
                          <p className="text-xs text-red-600 mt-1">
                            ⚠️ Data inválida! {form.tipo === 'diario' ? 'Selecione depois de amanhã ou uma data futura.' : 'Selecione uma data pelo menos 5 dias no futuro.'}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="label flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Data Prevista de Contemplação
                        </label>
                        <Input
                          type="text"
                          value={getDataContemplacao() || '-'}
                          disabled
                          className="bg-gray-50 text-gray-700"
                        />
                        <p className="text-xs text-green-600 mt-1">
                          ✨ Pagar antes é bem melhor
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Resumo Final */}
                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/50">
                  <h3 className="font-semibold text-gray-900 mb-4">Resumo do Caixa</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-green-200/50">
                      <span className="text-gray-600">Nome</span>
                      <span className="font-semibold text-gray-900">{form.nome || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-green-200/50">
                      <span className="text-gray-600">Tipo</span>
                      <span className="font-semibold text-gray-900 capitalize">{form.tipo}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-green-200/50">
                      <span className="text-gray-600">Valor Total</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(form.valorTotal)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-green-200/50">
                      <span className="text-gray-600">Parcela</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(valorParcela)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-green-200/50">
                      <span className="text-gray-600">Participantes / Parcelas</span>
                      <span className="font-semibold text-gray-900">{form.qtdParticipantes}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-green-200/50">
                      <span className="text-gray-600">1ª Parcela</span>
                      <span className="font-semibold text-gray-900">
                        {form.dataVencimento ? new Date(form.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-green-200/50">
                      <span className="text-gray-600">Última Parcela</span>
                      <span className="font-semibold text-gray-900">
                        {getDataUltimaParcela() || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Composição das Parcelas */}
                  <div className="mt-4 p-3 bg-white/50 rounded-xl">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-green-700 mb-1">Composição das Parcelas:</p>
                        <ul className="text-gray-600 space-y-0.5 text-xs">
                          <li>• 1ª Parcela: {formatCurrency(valorParcela)} + R$ {TAXA_SERVICO},00 (serviço) + R$ {TAXA_ADMINISTRATIVA},00 (taxa admin)</li>
                          <li>• Parcelas 2 a {form.qtdParticipantes - 1}: {formatCurrency(valorParcela)} + R$ {TAXA_SERVICO},00 + IPCA</li>
                          <li>• Última: {formatCurrency(valorParcela)} + R$ {TAXA_SERVICO},00 + R$ {TAXA_ADMINISTRATIVA},00 (comissão admin) + IPCA</li>
                        </ul>
                        <p className="mt-2 text-green-700 font-medium">
                          💰 Seu ganho como admin: {formatCurrency(ganhoAdmin)} (10%)
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <Button
              variant="secondary"
              onClick={() => setStep(step - 1)}
              className="flex-1"
              data-testid="btn-voltar"
            >
              Voltar
            </Button>
          )}
          {step < 3 ? (
            <Button
              variant="primary"
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !isStep1Valid : !isStep2Valid}
              className="flex-1"
              data-testid="btn-proximo"
            >
              Próximo
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={loading}
              disabled={!isStep3Valid}
              className="flex-1"
              data-testid="btn-criar-caixa"
            >
              Criar Caixa
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
