/**
 * CEP Utility - ViaCEP Integration
 * Provides address lookup functionality using the ViaCEP API
 */

export interface AddressData {
    street: string;
    zone: string;
    city: string;
    state: string;
    zip: string;
}

export interface ViaCEPResponse {
    cep: string;
    logradouro: string;
    complemento: string;
    bairro: string;
    localidade: string;
    uf: string;
    erro?: boolean;
}

/**
 * Fetches address data from ViaCEP API
 * @param cep - Brazilian postal code (with or without formatting)
 * @returns Promise with address data or null if not found
 */
export async function fetchAddressByCEP(cep: string): Promise<AddressData | null> {
    try {
        // Remove formatting from CEP
        const cleanCEP = cep.replace(/\D/g, '');

        // Validate CEP length
        if (cleanCEP.length !== 8) {
            throw new Error('CEP deve conter 8 dígitos');
        }

        // Fetch from ViaCEP API with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`, {
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error('Erro ao buscar CEP');
        }

        const data: ViaCEPResponse = await response.json();

        // Check if CEP was not found (ViaCEP returns erro: true)
        if (data.erro) {
            return null;
        }

        // Return formatted address data
        return {
            street: data.logradouro || '',
            zone: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || '',
            zip: cep, // Keep the formatted CEP that was passed in
        };
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                throw new Error('Tempo limite excedido ao buscar CEP');
            }
            throw error;
        }
        throw new Error('Erro ao buscar CEP');
    }
}

/**
 * Formats CEP string to Brazilian format (00000-000)
 * @param value - Raw CEP string
 * @returns Formatted CEP string
 */
export function formatCEP(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    return digits.replace(/(\d{5})(\d)/, '$1-$2');
}
