/**
 * Formata um número de telefone brasileiro com máscara (11) 99999-9999
 * @param value - Valor do telefone (com ou sem máscara)
 * @returns Telefone formatado
 */
export function formatPhone(value: string): string {
    // Remove tudo que não é dígito
    const cleaned = value.replace(/\D/g, '');

    // Limita a 11 dígitos
    const limited = cleaned.substring(0, 11);

    // Aplica máscara
    if (limited.length <= 2) {
        return limited;
    } else if (limited.length <= 6) {
        return `(${limited.substring(0, 2)}) ${limited.substring(2)}`;
    } else if (limited.length <= 10) {
        return `(${limited.substring(0, 2)}) ${limited.substring(2, 6)}-${limited.substring(6)}`;
    } else {
        return `(${limited.substring(0, 2)}) ${limited.substring(2, 7)}-${limited.substring(7, 11)}`;
    }
}

/**
 * Remove a máscara do telefone, retornando apenas os dígitos
 * @param value - Telefone formatado
 * @returns Apenas os dígitos do telefone
 */
export function unformatPhone(value: string): string {
    return value.replace(/\D/g, '');
}

/**
 * Valida se um telefone brasileiro está completo
 * @param value - Telefone (com ou sem máscara)
 * @returns true se o telefone tem 10 ou 11 dígitos
 */
export function isValidPhone(value: string): boolean {
    const digits = unformatPhone(value);
    return digits.length === 10 || digits.length === 11;
}
