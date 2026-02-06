export const formatCPF = (cpf: string): string => {
    return cpf.replace(/[^\d]/g, '');
};

export const maskCPF = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export const maskPhone = (value: string): string => {
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

export const anonymizeCPF = (cpf: string): string => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return cpf;
    return `${digits.slice(0, 3)}.***.**-${digits.slice(9)}`;
};

export const anonymizeEmail = (email: string): string => {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const visiblePart = local.slice(0, 2);
    const hiddenPart = '*'.repeat(Math.min(local.length - 2, 5));
    return `${visiblePart}${hiddenPart}@${domain}`;
};

export const anonymizePhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) return phone;
    const ddd = digits.slice(0, 2);
    const lastFour = digits.slice(-4);
    return `(${ddd}) *****-${lastFour}`;
};

export const anonymizePixKey = (key: string): string => {
    if (!key) return '';

    // Check if it's an email
    if (key.includes('@')) {
        return anonymizeEmail(key);
    }

    // Check if it's a CPF (11 digits) or CNPJ (14 digits)
    const digits = key.replace(/\D/g, '');
    if (digits.length === 11) {
        return anonymizeCPF(digits);
    }
    if (digits.length === 14) {
        // Mask CNPJ: XX.***.***/****-XX
        return `${digits.slice(0, 2)}.***.***/****-${digits.slice(12)}`;
    }

    // Check if it's a phone (10 or 11 digits)
    if (digits.length === 10 || digits.length === 11) {
        return anonymizePhone(digits);
    }

    // Random key (EVP) or other - show first 4 and last 4
    if (key.length > 8) {
        return `${key.slice(0, 4)}...${key.slice(-4)}`;
    }

    return key;
};

export const validarCPF = (cpf: string): boolean => {
    const digits = cpf.replace(/\D/g, '');

    if (digits.length !== 11) return false;

    if (/^(\d)\1+$/.test(digits)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(digits[i]) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(digits[9])) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(digits[i]) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(digits[10])) return false;

    return true;
};
