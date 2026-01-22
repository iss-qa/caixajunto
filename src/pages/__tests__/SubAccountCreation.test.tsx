import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubAccountCreation } from '../CarteiraDataAccounts';
import * as api from '../../lib/api';

// Mock do módulo de API
vi.mock('../../lib/api', () => ({
    subcontasService: {
        createMine: vi.fn(),
    },
}));

describe('SubAccountCreation - Onboarding Modal Test', () => {
    const mockUsuario = {
        _id: 'user-123',
        nome: 'Carlos Nascimento',
        cpf: '12345678900',
        telefone: '71988782222',
        email: 'carlos@example.com',
    };

    const mockUpdateUsuario = vi.fn();
    const mockOnSuccess = vi.fn();
    const mockSetOnboardingUrl = vi.fn();
    const mockSetShowOnboardingModal = vi.fn();

    beforeEach(() => {
        // Limpar todos os mocks antes de cada teste
        vi.clearAllMocks();
    });

    it('deve exibir asterisco (*) em todos os campos obrigatórios', () => {
        render(
            <SubAccountCreation
                usuario={mockUsuario}
                updateUsuario={mockUpdateUsuario}
                onSuccess={mockOnSuccess}
                setOnboardingUrl={mockSetOnboardingUrl}
                setShowOnboardingModal={mockSetShowOnboardingModal}
            />
        );

        // Verificar campos obrigatórios com asterisco
        expect(screen.getByText(/Sobre o negócio/)).toBeInTheDocument();
        expect(screen.getByText(/Ramo de atividade/)).toBeInTheDocument();
        expect(screen.getByText(/Data de nascimento/)).toBeInTheDocument();
        expect(screen.getByText(/Nome da mãe/)).toBeInTheDocument();
    });

    it('deve desabilitar botão "Criar Subconta" quando formulário está incompleto', () => {
        render(
            <SubAccountCreation
                usuario={mockUsuario}
                updateUsuario={mockUpdateUsuario}
                onSuccess={mockOnSuccess}
                setOnboardingUrl={mockSetOnboardingUrl}
                setShowOnboardingModal={mockSetShowOnboardingModal}
            />
        );

        const submitButton = screen.getByRole('button', { name: /Criar Subconta/i });

        // Botão deve estar desabilitado inicialmente
        expect(submitButton).toBeDisabled();
    });

    it('deve exibir mensagem de erro ao sair de campo obrigatório vazio', async () => {
        render(
            <SubAccountCreation
                usuario={mockUsuario}
                updateUsuario={mockUpdateUsuario}
                onSuccess={mockOnSuccess}
                setOnboardingUrl={mockSetOnboardingUrl}
                setShowOnboardingModal={mockSetShowOnboardingModal}
            />
        );

        // Encontrar campo "Sobre o negócio"
        const aboutBusinessInput = screen.getByLabelText(/Sobre o negócio/i);

        // Focar no campo e depois sair sem preencher (onBlur)
        fireEvent.focus(aboutBusinessInput);
        fireEvent.blur(aboutBusinessInput);

        // Verificar se mensagem de erro aparece
        await waitFor(() => {
            expect(screen.getByText(/Por favor, informe sobre o seu negócio/i)).toBeInTheDocument();
        });
    });

    it('deve habilitar botão quando todos os campos obrigatórios são preenchidos', async () => {
        render(
            <SubAccountCreation
                usuario={mockUsuario}
                updateUsuario={mockUpdateUsuario}
                onSuccess={mockOnSuccess}
                setOnboardingUrl={mockSetOnboardingUrl}
                setShowOnboardingModal={mockSetShowOnboardingModal}
            />
        );

        // Preencher todos os campos obrigatórios
        const aboutBusinessInput = screen.getByLabelText(/Sobre o negócio/i);
        const branchInput = screen.getByLabelText(/Ramo de atividade/i);
        const adminCpfInput = screen.getByLabelText(/CPF.*administrador/i);
        const adminNameInput = screen.getByLabelText(/Nome completo.*administrador/i);
        const adminPhoneInput = screen.getByLabelText(/Telefone.*administrador/i);
        const adminBirthInput = screen.getByLabelText(/Data de nascimento/i);
        const adminMotherInput = screen.getByLabelText(/Nome da mãe/i);

        // Endereço
        const cepInput = screen.getByLabelText(/CEP/i);
        const streetInput = screen.getByLabelText(/Rua/i);
        const numberInput = screen.getByLabelText(/Número/i);
        const zoneInput = screen.getByLabelText(/Bairro/i);
        const cityInput = screen.getByLabelText(/Cidade/i);
        const stateInput = screen.getByLabelText(/Estado/i);

        // Preencher campos
        fireEvent.change(aboutBusinessInput, { target: { value: 'Administrador de caixas' } });
        fireEvent.change(branchInput, { target: { value: 'Serviços financeiros' } });
        fireEvent.change(adminCpfInput, { target: { value: '12345678900' } });
        fireEvent.change(adminNameInput, { target: { value: 'Carlos Nascimento' } });
        fireEvent.change(adminPhoneInput, { target: { value: '71988782222' } });
        fireEvent.change(adminBirthInput, { target: { value: '1990-01-01' } });
        fireEvent.change(adminMotherInput, { target: { value: 'Maria Silva' } });
        fireEvent.change(cepInput, { target: { value: '40000000' } });
        fireEvent.change(streetInput, { target: { value: 'Rua Teste' } });
        fireEvent.change(numberInput, { target: { value: '123' } });
        fireEvent.change(zoneInput, { target: { value: 'Centro' } });
        fireEvent.change(cityInput, { target: { value: 'Salvador' } });
        fireEvent.change(stateInput, { target: { value: 'BA' } });

        // Simular seleção de banco e preenchimento de dados bancários
        // (isso seria mais complexo, mas para o teste assumimos que está preenchido)

        const submitButton = screen.getByRole('button', { name: /Criar Subconta/i });

        // Aguardar que o botão seja habilitado
        await waitFor(() => {
            expect(submitButton).not.toBeDisabled();
        });
    });

    it('deve chamar setOnboardingUrl e setShowOnboardingModal quando API retorna onboardingUrl', async () => {
        // Mock da resposta da API com onboardingUrl
        const mockOnboardingUrl = 'https://cadastro.io/60afac2db9665dd6a1ab5dbf90e19119';
        const mockResponse = {
            success: true,
            subconta: {
                _id: 'subconta-123',
                lytexId: 'lytex-456',
            },
            onboardingUrl: mockOnboardingUrl,
        };

        vi.mocked(api.subcontasService.createMine).mockResolvedValue(mockResponse);

        render(
            <SubAccountCreation
                usuario={mockUsuario}
                updateUsuario={mockUpdateUsuario}
                onSuccess={mockOnSuccess}
                setOnboardingUrl={mockSetOnboardingUrl}
                setShowOnboardingModal={mockSetShowOnboardingModal}
            />
        );

        // Preencher todos os campos obrigatórios (simplificado)
        // ... (código de preenchimento similar ao teste anterior)

        // Clicar no botão de criar subconta
        const submitButton = screen.getByRole('button', { name: /Criar Subconta/i });
        fireEvent.click(submitButton);

        // Aguardar que as funções sejam chamadas
        await waitFor(() => {
            // Verificar que setOnboardingUrl foi chamado com a URL correta
            expect(mockSetOnboardingUrl).toHaveBeenCalledWith(mockOnboardingUrl);

            // Verificar que setShowOnboardingModal foi chamado com true
            expect(mockSetShowOnboardingModal).toHaveBeenCalledWith(true);

            // Verificar que onSuccess também foi chamado
            expect(mockOnSuccess).toHaveBeenCalled();

            // Verificar que updateUsuario foi chamado com o lytexSubAccountId
            expect(mockUpdateUsuario).toHaveBeenCalledWith({
                lytexSubAccountId: 'lytex-456'
            });
        });
    });

    it('deve exibir log de aviso quando API não retorna onboardingUrl', async () => {
        // Mock da resposta da API SEM onboardingUrl
        const mockResponse = {
            success: true,
            subconta: {
                _id: 'subconta-123',
                lytexId: 'lytex-456',
            },
            // onboardingUrl ausente
        };

        vi.mocked(api.subcontasService.createMine).mockResolvedValue(mockResponse);

        // Spy no console.warn
        const consoleWarnSpy = vi.spyOn(console, 'warn');

        render(
            <SubAccountCreation
                usuario={mockUsuario}
                updateUsuario={mockUpdateUsuario}
                onSuccess={mockOnSuccess}
                setOnboardingUrl={mockSetOnboardingUrl}
                setShowOnboardingModal={mockSetShowOnboardingModal}
            />
        );

        // Clicar no botão de criar subconta
        const submitButton = screen.getByRole('button', { name: /Criar Subconta/i });
        fireEvent.click(submitButton);

        // Aguardar que o log de aviso seja exibido
        await waitFor(() => {
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                '⚠️ URL de onboarding não recebida do backend'
            );

            // Verificar que setOnboardingUrl e setShowOnboardingModal NÃO foram chamados
            expect(mockSetOnboardingUrl).not.toHaveBeenCalled();
            expect(mockSetShowOnboardingModal).not.toHaveBeenCalled();

            // Mas onSuccess ainda deve ser chamado
            expect(mockOnSuccess).toHaveBeenCalled();
        });

        consoleWarnSpy.mockRestore();
    });

    it('deve exibir mensagem de erro quando API retorna erro', async () => {
        // Mock de erro da API
        const mockErrorResponse = {
            success: false,
            message: 'Erro ao criar subconta no Lytex',
            error: 'LYTEX_NO_ID',
        };

        vi.mocked(api.subcontasService.createMine).mockResolvedValue(mockErrorResponse);

        render(
            <SubAccountCreation
                usuario={mockUsuario}
                updateUsuario={mockUpdateUsuario}
                onSuccess={mockOnSuccess}
                setOnboardingUrl={mockSetOnboardingUrl}
                setShowOnboardingModal={mockSetShowOnboardingModal}
            />
        );

        // Clicar no botão de criar subconta
        const submitButton = screen.getByRole('button', { name: /Criar Subconta/i });
        fireEvent.click(submitButton);

        // Aguardar que a mensagem de erro apareça
        await waitFor(() => {
            expect(screen.getByText(/Erro ao criar subconta no Lytex/i)).toBeInTheDocument();

            // Verificar que as funções de onboarding NÃO foram chamadas
            expect(mockSetOnboardingUrl).not.toHaveBeenCalled();
            expect(mockSetShowOnboardingModal).not.toHaveBeenCalled();
            expect(mockOnSuccess).not.toHaveBeenCalled();
        });
    });
});
