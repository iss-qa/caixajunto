import { useEffect, useState, useRef } from 'react';
import {
  ArrowLeft,
  Search,
  ChevronDown,
  Building2,
  Check,
  Pencil,
  Trash2,
} from 'lucide-react';
import { bancosService, carteiraService } from '../lib/api';

type TipoConta = 'corrente' | 'poupanca';

interface BancoLytex {
  code: string;
  name: string;
}

interface ContaBancariaApi {
  _id?: string;
  bankCode: string;
  bankName: string;
  agency: string;
  agencyDv: string;
  account: string;
  accountDv: string;
  accountType: TipoConta;
  isDefault?: boolean;
}

const CarteiraBanco = () => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [banks, setBanks] = useState<BancoLytex[]>([]);
  const [banksError, setBanksError] = useState<string | null>(null);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [bankSearch, setBankSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<BancoLytex | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    agency: '',
    agencyDv: '',
    account: '',
    accountDv: '',
    accountType: 'corrente' as TipoConta,
  });

  const [bankAccounts, setBankAccounts] = useState<ContaBancariaApi[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const loadBanks = async () => {
      try {
        setLoadingBanks(true);
        setBanksError(null);
        const response = await bancosService.getAll();
        const listRaw = Array.isArray(response?.banks)
          ? response.banks
          : Array.isArray(response)
          ? response
          : [];
        const list = listRaw
          .map((b: any) => ({
            code: String(b.code || ''),
            name: String(b.name || ''),
          }))
          .filter((b: BancoLytex) => b.code && b.name);
        setBanks(list);
      } catch (e) {
        const error = e as { message?: string };
        setBanksError(error.message || 'Erro ao carregar bancos');
      } finally {
        setLoadingBanks(false);
      }
    };

    loadBanks();
  }, []);

  useEffect(() => {
    const loadBankAccounts = async () => {
      try {
        const response = await carteiraService.getBankAccounts();
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.contas)
          ? response.contas
          : response?.data && Array.isArray(response.data)
          ? response.data
          : [];
        setBankAccounts(
          list.map((c: any) => ({
            _id: String(c._id || ''),
            bankCode: String(c.bankCode || ''),
            bankName: String(c.bankName || ''),
            agency: String(c.agency || ''),
            agencyDv: String(c.agencyDv || ''),
            account: String(c.account || ''),
            accountDv: String(c.accountDv || ''),
            accountType:
              c.accountType === 'poupanca' ? 'poupanca' : ('corrente' as TipoConta),
            isDefault: Boolean(c.isDefault),
          })),
        );
      } catch {
        setBankAccounts([]);
      }
    };

    loadBankAccounts();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredBanks = banks.filter((b) => {
    if (!bankSearch.trim()) {
      return true;
    }
    const term = bankSearch.toLowerCase();
    return (
      b.name.toLowerCase().includes(term) ||
      b.code.toLowerCase().includes(term)
    );
  });

  const handleBankSelect = (bank: BancoLytex) => {
    setSelectedBank(bank);
    setIsDropdownOpen(false);
    setBankSearch('');
  };

  const resetForm = () => {
    setSelectedBank(null);
    setFormData({
      agency: '',
      agencyDv: '',
      account: '',
      accountDv: '',
      accountType: 'corrente',
    } as typeof formData);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!selectedBank) {
      setSaveError('Selecione o banco antes de continuar');
      return;
    }

    if (!formData.agency || !formData.account) {
      setSaveError('Preencha agência e conta');
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);
      setSuccessMessage(null);

      const payload = {
        bankCode: selectedBank.code,
        bankName: selectedBank.name,
        agency: formData.agency,
        agencyDv: formData.agencyDv || '0',
        account: formData.account,
        accountDv: formData.accountDv || '0',
        accountType: formData.accountType,
      };

      if (editingId) {
        await carteiraService.updateBankAccount(editingId, payload);
        setSuccessMessage('Conta bancária atualizada com sucesso!');
      } else {
        await carteiraService.saveBankAccount(payload);
        setSuccessMessage('Conta bancária adicionada com sucesso!');
      }

      const response = await carteiraService.getBankAccounts();
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.contas)
        ? response.contas
        : response?.data && Array.isArray(response.data)
        ? response.data
        : [];
      setBankAccounts(
        list.map((c: any) => ({
          _id: String(c._id || ''),
          bankCode: String(c.bankCode || ''),
          bankName: String(c.bankName || ''),
          agency: String(c.agency || ''),
          agencyDv: String(c.agencyDv || ''),
          account: String(c.account || ''),
          accountDv: String(c.accountDv || ''),
          accountType:
            c.accountType === 'poupanca' ? 'poupanca' : ('corrente' as TipoConta),
          isDefault: Boolean(c.isDefault),
        })),
      );

      resetForm();
    } catch (e) {
      const error = e as { response?: { data?: { message?: string } }; message?: string };
      const message =
        error.response?.data?.message ||
        error.message ||
        'Erro ao salvar conta bancária';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (conta: ContaBancariaApi) => {
    setSelectedBank({
      code: conta.bankCode,
      name: conta.bankName,
    });
    setFormData({
      agency: conta.agency,
      agencyDv: conta.agencyDv,
      account: conta.account,
      accountDv: conta.accountDv,
      accountType: conta.accountType,
    });
    setEditingId(conta._id || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (conta: ContaBancariaApi) => {
    if (!conta._id) return;
    const confirmed = window.confirm(
      'Tem certeza que deseja remover esta conta bancária?',
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      setSaveError(null);
      await carteiraService.deleteBankAccount(conta._id);

      const response = await carteiraService.getBankAccounts();
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.contas)
        ? response.contas
        : response?.data && Array.isArray(response.data)
        ? response.data
        : [];
      setBankAccounts(
        list.map((c: any) => ({
          _id: String(c._id || ''),
          bankCode: String(c.bankCode || ''),
          bankName: String(c.bankName || ''),
          agency: String(c.agency || ''),
          agencyDv: String(c.agencyDv || ''),
          account: String(c.account || ''),
          accountDv: String(c.accountDv || ''),
          accountType:
            c.accountType === 'poupanca' ? 'poupanca' : ('corrente' as TipoConta),
          isDefault: Boolean(c.isDefault),
        })),
      );
    } catch (e) {
      const error = e as { response?: { data?: { message?: string } }; message?: string };
      const message =
        error.response?.data?.message ||
        error.message ||
        'Erro ao remover conta bancária';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Adicionar Conta Bancária
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Cadastre os dados da sua conta para receber pagamentos
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-8">
            <div className="space-y-6">
              {/* Banco Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <Building2 className="inline-block w-4 h-4 mr-2" />
                  Banco
                </label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-white text-left flex items-center justify-between hover:border-gray-300"
                  >
                    <span className={selectedBank ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                      {selectedBank ? `${selectedBank.code} - ${selectedBank.name}` : 'Selecione o banco'}
                    </span>
                    <ChevronDown 
                      size={20} 
                      className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-96 overflow-hidden">
                      {/* Search Input */}
                      <div className="p-3 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={bankSearch}
                            onChange={(e) => setBankSearch(e.target.value)}
                            placeholder="Busque por nome ou código..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* Banks List */}
                      <div className="overflow-y-auto max-h-80">
                        {loadingBanks ? (
                          <div className="p-8 text-center">
                            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm text-gray-500 mt-3">Carregando bancos...</p>
                          </div>
                        ) : banksError ? (
                          <div className="p-8 text-center text-red-600">
                            <p className="font-medium">Erro ao carregar bancos</p>
                            <p className="text-sm mt-1">{banksError}</p>
                          </div>
                        ) : filteredBanks.length === 0 ? (
                          <div className="p-8 text-center text-gray-500">
                            <p className="font-medium">Nenhum banco encontrado</p>
                            <p className="text-sm mt-1">Tente buscar com outros termos</p>
                          </div>
                        ) : (
                          filteredBanks.map((bank) => (
                            <button
                              key={bank.code}
                              type="button"
                              onClick={() => handleBankSelect(bank)}
                              className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center justify-between group ${
                                selectedBank?.code === bank.code ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 group-hover:text-blue-600">
                                  {bank.code} - {bank.name}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Código: {bank.code}
                                </div>
                              </div>
                              {selectedBank?.code === bank.code && (
                                <Check size={18} className="text-blue-600" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Agência */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Agência
                  </label>
                  <input
                    type="text"
                    value={formData.agency}
                    onChange={(e) =>
                      setFormData({ ...formData, agency: e.target.value })
                    }
                    placeholder="0000"
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Dígito
                  </label>
                  <input
                    type="text"
                    value={formData.agencyDv}
                    onChange={(e) =>
                      setFormData({ ...formData, agencyDv: e.target.value })
                    }
                    placeholder="0"
                    maxLength={1}
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-center"
                  />
                </div>
              </div>

              {/* Conta */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Conta
                  </label>
                  <input
                    type="text"
                    value={formData.account}
                    onChange={(e) =>
                      setFormData({ ...formData, account: e.target.value })
                    }
                    placeholder="00000000"
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Dígito
                  </label>
                  <input
                    type="text"
                    value={formData.accountDv}
                    onChange={(e) =>
                      setFormData({ ...formData, accountDv: e.target.value })
                    }
                    placeholder="0"
                    maxLength={2}
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-center"
                  />
                </div>
              </div>

              {/* Tipo de Conta */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Tipo de Conta
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, accountType: 'corrente' })}
                    className={`px-4 py-4 border-2 rounded-xl font-semibold transition-all ${
                      formData.accountType === 'corrente'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Conta Corrente
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, accountType: 'poupanca' })}
                    className={`px-4 py-4 border-2 rounded-xl font-semibold transition-all ${
                      formData.accountType === 'poupanca'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Conta Poupança
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {saveError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600 font-medium">{saveError}</p>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-sm text-green-600 font-medium">{successMessage}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    Salvando...
                  </span>
                ) : (
                  'Adicionar Conta Bancária'
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">💡 Dica:</span> Certifique-se de que os dados estão
            corretos antes de salvar. Os bancos são carregados automaticamente da API Lytex.
          </p>
        </div>

        {bankAccounts.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Minhas contas cadastradas
            </h2>
            <div className="space-y-3">
              {bankAccounts.map((conta) => (
                <div
                  key={conta._id || `${conta.bankCode}-${conta.agency}-${conta.account}`}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="text-blue-600" size={24} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          {conta.bankName}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Código: {conta.bankCode}
                        </p>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-700">
                            <span className="text-gray-500">Agência:</span> {conta.agency}
                            {conta.agencyDv && `-${conta.agencyDv}`}
                          </p>
                          <p className="text-sm text-gray-700">
                            <span className="text-gray-500">
                              Conta {conta.accountType}:
                            </span>{' '}
                            {conta.account}
                            {conta.accountDv && `-${conta.accountDv}`}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {conta.isDefault && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          Principal
                        </span>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(conta)}
                          className="px-3 py-1 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-1"
                        >
                          <Pencil size={14} />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(conta)}
                          className="px-3 py-1 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CarteiraBanco;
