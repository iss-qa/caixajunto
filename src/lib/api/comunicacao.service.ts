import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface MensagemHistorico {
    _id: string;
    caixaId: string;
    caixaNome: string;
    participanteId: string;
    participanteNome: string;
    participanteTelefone: string;
    tipo: 'boas_vindas' | 'lembrete_pagamento' | 'confirmacao_pagamento' | 'alerta_atraso' | 'manual' | 'cobranca';
    conteudo: string;
    status: 'pendente' | 'enviado' | 'falha';
    dataEnvio?: string;
    errorMessage?: string;
    metadata?: {
        escopo?: 'todos' | 'participante_especifico' | 'apenas_admins';
        manual?: boolean;
        [key: string]: any;
    };
    createdAt: string;
    updatedAt: string;
}

export interface HistoricoResponse {
    mensagens: MensagemHistorico[];
    total: number;
    page: number;
    pages: number;
}

class ComunicacaoService {
    private getAuthHeader() {
        const token = localStorage.getItem('token');
        return {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        };
    }

    async getHistorico(filtros?: {
        caixaId?: string;
        tipo?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<HistoricoResponse> {
        const params = new URLSearchParams();

        if (filtros?.caixaId) params.append('caixaId', filtros.caixaId);
        if (filtros?.tipo) params.append('tipo', filtros.tipo);
        if (filtros?.status) params.append('status', filtros.status);
        if (filtros?.page) params.append('page', filtros.page.toString());
        if (filtros?.limit) params.append('limit', filtros.limit.toString());

        const response = await axios.get(
            `${API_URL}/comunicacao/historico?${params.toString()}`,
            this.getAuthHeader(),
        );

        return response.data;
    }

    /**
     * Reenvia uma mensagem específica pelo ID
     */
    async resendMessage(mensagemId: string): Promise<{
        success: boolean;
        message: string;
        mensagemId: string;
        participante: string;
        tipo: string;
        status: string;
    }> {
        const response = await axios.post(
            `${API_URL}/comunicacao/resend/${mensagemId}`,
            {},
            this.getAuthHeader(),
        );

        return response.data;
    }

    /**
     * Envia mensagem manual para participantes de uma caixa
     */
    async enviarMensagemManual(data: {
        caixaId: string;
        mensagem: string;
        escopo: 'todos' | 'participante_especifico' | 'apenas_admins';
        participanteId?: string;
    }): Promise<{
        success: boolean;
        message: string;
        enviados?: number;
        participantes?: string[];
    }> {
        const response = await axios.post(
            `${API_URL}/comunicacao/enviar-manual`,
            data,
            this.getAuthHeader(),
        );

        return response.data;
    }
}

export const comunicacaoService = new ComunicacaoService();
