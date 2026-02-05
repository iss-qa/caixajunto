import { useState, useRef, useEffect } from 'react';
import { bancosService } from '../../../lib/api';
import { SearchableBankSelect } from '../../../components/ui/SearchableBankSelect';

interface BankAccountFormProps {
    bankCode?: string;
    bankName?: string;
    agency: string;
    agencyDv: string;
    account: string;
    accountDv: string;
    accountType: 'corrente' | 'poupanca';
    onChange: (data: {
        bankCode?: string;
        bankName?: string;
        agency?: string;
        agencyDv?: string;
        account?: string;
        accountDv?: string;
        accountType?: 'corrente' | 'poupanca';
    }) => void;
    error?: string | null;
    loadingBankData?: boolean;
}

export const BankAccountForm = ({
    bankCode,
    bankName,
    agency,
    agencyDv,
    account,
    accountDv,
    accountType,
    onChange,
    error,
    loadingBankData
}: BankAccountFormProps) => {
    const agencyRef = useRef<HTMLInputElement>(null);
    const agencyDvRef = useRef<HTMLInputElement>(null);
    const accountRef = useRef<HTMLInputElement>(null);
    const accountDvRef = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-4">
            {/* Banco - Full width em mobile */}
            <div>
                <SearchableBankSelect
                    value={bankCode}
                    onChange={(code, name) => onChange({ bankCode: code, bankName: name })}
                    disabled={loadingBankData}
                />
            </div>

            {/* Tipo de Conta */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Conta *</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => onChange({ accountType: 'corrente' })}
                        className={`p-3 text-sm rounded-xl border-2 transition-all ${accountType === 'corrente'
                            ? 'border-green-500 bg-green-50 text-green-700 font-semibold'
                            : 'border-gray-200 hover:border-gray-300'}`}
                    >
                        Corrente
                    </button>
                    <button
                        type="button"
                        onClick={() => onChange({ accountType: 'poupanca' })}
                        className={`p-3 text-sm rounded-xl border-2 transition-all ${accountType === 'poupanca'
                            ? 'border-green-500 bg-green-50 text-green-700 font-semibold'
                            : 'border-gray-200 hover:border-gray-300'}`}
                    >
                        Poupança
                    </button>
                </div>
            </div>

            {/* Agência - Layout mobile friendly */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                <div className="col-span-2 sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Agência *</label>
                    <input
                        ref={agencyRef}
                        type="text"
                        inputMode="numeric"
                        placeholder="0000"
                        value={agency}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                            onChange({ agency: val });
                        }}
                        maxLength={5}
                        className="w-full p-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dígito</label>
                    <input
                        ref={agencyDvRef}
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={agencyDv}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 1);
                            onChange({ agencyDv: val });
                            if (val.length === 1) {
                                accountRef.current?.focus();
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !agencyDv) {
                                agencyRef.current?.focus();
                            }
                        }}
                        maxLength={1}
                        className="w-full p-3 border-2 border-gray-200 rounded-xl text-base text-center focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                </div>
            </div>

            {/* Conta - Layout mobile friendly */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                <div className="col-span-2 sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conta *</label>
                    <input
                        ref={accountRef}
                        type="text"
                        inputMode="numeric"
                        placeholder="00000000"
                        value={account}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                            onChange({ account: val });
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !account) {
                                agencyDvRef.current?.focus();
                            }
                        }}
                        maxLength={12}
                        className="w-full p-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dígito *</label>
                    <input
                        ref={accountDvRef}
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={accountDv}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                            onChange({ accountDv: val });
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !accountDv) {
                                accountRef.current?.focus();
                            }
                        }}
                        maxLength={2}
                        className="w-full p-3 border-2 border-gray-200 rounded-xl text-base text-center focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                </div>
            </div>

            {error && (
                <p className="text-sm text-red-600">{error}</p>
            )}
        </div>
    );
};
