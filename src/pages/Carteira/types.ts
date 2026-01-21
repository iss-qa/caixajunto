export type StatusTransacaoCarteira = 'em_dia' | 'atrasado';
export type TipoTransacaoCarteira = 'entrada' | 'saida';

export interface CaixaCarteiraApi {
    _id: string;
    nome: string;
    tipo?: 'mensal' | 'semanal';
    valorParcela?: number;
    valorTotal?: number;
    qtdParticipantes?: number;
    duracaoMeses?: number;
    taxaServico?: number;
    adminId?:
    | {
        _id?: string;
        nome?: string;
        email?: string;
    }
    | string;
}

export interface PagamentoCarteiraApi {
    _id: string;
    caixaId?:
    | string
    | {
        _id?: string;
    };
    pagadorId?:
    | {
        _id?: string;
        nome?: string;
    }
    | string;
    participanteNome?: string;
    valorParcela?: number;
    taxaServico?: number;
    status: string;
    dataPagamento?: string;
    diasAtraso?: number | string;
    mesReferencia?: number;
}

export interface TransacaoRecenteCarteira {
    id: string;
    caixaId: string;
    caixaNome: string;
    caixaAdminNome: string;
    participanteNome: string;
    dataPagamento: string;
    valorPago: number;
    status: StatusTransacaoCarteira;
    tipo: TipoTransacaoCarteira;
    mesReferencia?: number;
    tipoCaixa?: 'mensal' | 'semanal';
}

export interface TransacaoLytexCarteira {
    id: string;
    type: string;
    description: string;
    status: string;
    amount: number;
    createdAt: string;
}
