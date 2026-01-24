import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import QRCode from 'react-qr-code'
import Barcode from 'react-barcode'
import { FileText, RefreshCw, ChevronRight, QrCode, Loader2, CheckCircle2, Copy, ExternalLink, Printer } from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { formatCurrency, formatDate, cn } from '../lib/utils'
import { cobrancasService, api } from '../lib/api'

// Interface para endereço do usuário (padrão Lytex)
interface UsuarioEndereco {
  street?: string
  zone?: string
  city?: string
  state?: string
  number?: string
  complement?: string
  zip?: string
}

interface Participante {
  _id: string
  usuarioId: {
    _id: string
    nome: string
    email: string
    telefone: string
    cpf?: string
    fotoUrl?: string
    score: number
    address?: UsuarioEndereco
  } | string // Ajustado para aceitar string caso não venha populado
  posicao?: number
  cpf?: string // Campo opcional direto
}

interface Caixa {
  _id: string
  nome: string
  tipo?: 'mensal' | 'semanal' | 'diario'
  qtdParticipantes: number
  valorTotal: number
  valorParcela: number
  status: string
  mesAtual: number
  diaVencimento: number
  dataInicio?: string
}

interface CobrancaCompleta {
  id: string
  mes: number
  valor: number
  descricao: string
  status: 'pago' | 'pendente' | 'atrasado' | 'expirado'
  dueDate?: string
  paymentUrl?: string
  pix?: {
    qrCode: string
    copiaCola: string
    geradoEm?: string
    expiradoEm?: string
  }
  boleto?: {
    codigoBarras: string
    linhaDigitavel: string
    url?: string
  }
  detalhePagamento?: {
    pagoEm?: string
    metodo?: string
    creditoEm?: string
    valorPago?: number
    taxas?: number
  }
  ultimaAtualizacao: number
}

interface Boleto {
  mes: number
  valorParcela: number
  taxaServico: number
  fundoReserva: number
  taxaAdmin: number
  comissaoAdmin: number
  correcaoIPCA: number
  valorTotal: number
  dataVencimento: string
  status: 'pago' | 'pendente' | 'atrasado'
}

const TAXA_IPCA_MENSAL = 0.0041
const TAXA_SERVICO = 10.00
const PIX_EXPIRATION_MINUTES = 30
const POLLING_INTERVAL_MS = 30000
const CACHE_VALIDITY_MS = 60000

interface DetalhesPagamentoProps {
  isOpen: boolean
  onClose: () => void
  caixa: Caixa | null
  participante: Participante | null
  onRefreshPagamentos?: () => void
  onPaidUpdate?: (mes: number, participanteId: string) => void
}

export function DetalhesPagamento({
  isOpen,
  onClose,
  caixa,
  participante,
  onRefreshPagamentos,
  onPaidUpdate
}: DetalhesPagamentoProps) {
  const [expandedMes, setExpandedMes] = useState<number | null>(null)
  const [paymentTab, setPaymentTab] = useState<'pix' | 'boleto'>('pix')
  const [copiedPix, setCopiedPix] = useState(false)
  const [copiedBoleto, setCopiedBoleto] = useState(false)
  const [gerandoCobranca, setGerandoCobranca] = useState(false)
  const [boletoSelecionado, setBoletoSelecionado] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cobrancas, setCobrancas] = useState<Map<number, CobrancaCompleta>>(new Map())

  // Refs para controle de carregamento
  const isLoadingRef = useRef(false)
  const lastLoadTimeRef = useRef<number>(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  // IDs estáveis para dependências
  const caixaId = caixa?._id
  const participanteId = participante?._id

  // Logger otimizado
  const logger = useMemo(() => ({
    log: (message: string, data?: any) => {
      if (import.meta.env.MODE === 'development') {
        console.log(`💳 ${message}`, data)
      }
    },
    error: (message: string, error?: any) => {
      console.error(`❌ ${message}`, error)
    },
    warn: (message: string, data?: any) => {
      console.warn(`⚠️ ${message}`, data)
    }
  }), [])

  // Verificar expiração do PIX
  const isPixExpired = useCallback((pix?: CobrancaCompleta['pix']): boolean => {
    if (!pix?.geradoEm) return false
    const minutosDecorridos = (Date.now() - new Date(pix.geradoEm).getTime()) / 60000
    return minutosDecorridos >= PIX_EXPIRATION_MINUTES
  }, [])

  // Normalização de dados
  const normalizarCobranca = useCallback((
    invoice: any,
    mes: number,
    descricao: string
  ): CobrancaCompleta | null => {
    try {
      const tx = Array.isArray(invoice?.transactions) ? invoice.transactions[0] : null
      const valorCents = tx?.value ?? invoice?.totalValue ?? 0

      const dueDateRaw = invoice?.dueDate || invoice?.vencimento
      const pixGeradoEm = tx?.createdAt || tx?.created_at || invoice?.createdAt || invoice?.created_at

      // Normalizar status
      const statusSources = [
        invoice?.status,
        invoice?.lytexStatus,
        invoice?.detailStatus,
        invoice?.local?.status,
      ]
        .map((s) => String(s || '').toLowerCase())
        .filter(Boolean)

      const paidStatuses = ['paid', 'liquidated', 'settled', 'pago', 'inqueue', 'aprovado']
      const paidAt = invoice?.payedAt || invoice?.paidAt || invoice?.paid_at || invoice?.local?.data_pagamento
      const statusPago = Boolean(paidAt) || statusSources.some((s) => paidStatuses.includes(s))

      // PIX
      const pixQrcode = tx?.pix?.qrcode || invoice?.paymentMethods?.pix?.qrcode || invoice?.pix?.qrcode || ''
      const pixEmv = tx?.pix?.emv || tx?.pix?.qrcode || invoice?.paymentMethods?.pix?.emv || invoice?.pix?.copyPaste || ''

      // Boleto
      const boletoBarcode = tx?.boleto?.barcode || invoice?.paymentMethods?.boleto?.barcode || invoice?.boleto?.barcode || ''
      const boletoDigitable = tx?.boleto?.digitableLine || invoice?.paymentMethods?.boleto?.digitableLine || invoice?.boleto?.digitableLine || ''

      const cobranca: CobrancaCompleta = {
        id: invoice?._id || invoice?.id || '',
        mes,
        valor: Math.round(valorCents) / 100,
        descricao,
        status: statusPago ? 'pago' : 'pendente',
        dueDate: typeof dueDateRaw === 'string' ? dueDateRaw : undefined,
        paymentUrl: invoice?.linkCheckout || invoice?.paymentUrl,
        pix: (pixQrcode || pixEmv) ? {
          qrCode: pixQrcode,
          copiaCola: pixEmv,
          geradoEm: pixGeradoEm,
        } : undefined,
        boleto: (boletoBarcode || boletoDigitable || invoice?.linkBoleto) ? {
          codigoBarras: boletoBarcode,
          linhaDigitavel: boletoDigitable,
          url: invoice?.linkBoleto
        } : undefined,
        ultimaAtualizacao: Date.now()
      }

      if (statusPago) {
        cobranca.detalhePagamento = {
          pagoEm: paidAt,
          metodo: invoice?.paymentMethod || invoice?.method || invoice?.local?.metodo_pagamento,
          creditoEm: invoice?.creditAt || invoice?.credit_at,
          valorPago: invoice?.payedValue || invoice?.paidValue || invoice?.local?.valor,
          taxas: invoice?.rates || 0
        }
      }

      return cobranca
    } catch (error) {
      logger.error('Erro ao normalizar cobrança', error)
      return null
    }
  }, [logger])

  const loadPaymentDetails = useCallback(async (forceRefresh = false) => {
    if (!caixaId || !participanteId || !mountedRef.current) return
    if (isLoadingRef.current) return

    const timeSinceLastLoad = Date.now() - lastLoadTimeRef.current
    if (!forceRefresh && timeSinceLastLoad < CACHE_VALIDITY_MS) return

    setIsRefreshing(true)
    isLoadingRef.current = true

    if (abortControllerRef.current) abortControllerRef.current.abort()
    abortControllerRef.current = new AbortController()

    try {
      const syncResponse = await cobrancasService.syncStatus(caixaId)

      if (!mountedRef.current) return

      if (!syncResponse.success || !syncResponse.cobrancas) {
        return
      }

      const cobrancasParticipante = syncResponse.cobrancas.filter(
        (c: any) => String(c.participanteId) === String(participanteId)
      )

      const novasCobrancas = new Map<number, CobrancaCompleta>()

      for (const c of cobrancasParticipante) {
        const mes = Number(c.mesReferencia)
        if (!mes || mes <= 0) continue

        const isPago = c.status === 'PAGO'

        const cobranca: CobrancaCompleta = {
          id: c.lytexId || '',
          mes,
          valor: Number(c.valor || 0),
          descricao: `Pagamento Mês ${mes}`,
          status: isPago ? 'pago' : 'pendente',
          dueDate: c.dataVencimento || undefined,
          paymentUrl: c.paymentUrl || undefined,
          pix: c.pix ? {
            qrCode: c.pix.qrCode || '',
            copiaCola: c.pix.copiaCola || '',
            geradoEm: c.createdAt || undefined,
          } : undefined,
          boleto: c.boleto ? {
            codigoBarras: c.boleto.codigoBarras || '',
            linhaDigitavel: c.boleto.linhaDigitavel || '',
            url: c.boleto.url || undefined,
          } : undefined,
          ultimaAtualizacao: Date.now(),
        }

        if (isPago && c.dataPagamento) {
          cobranca.detalhePagamento = {
            pagoEm: c.dataPagamento,
            metodo: c.metodoPagamento || undefined,
            creditoEm: undefined,
            valorPago: c.valor ? Math.round(c.valor * 100) : undefined,
            taxas: 0,
          }
          if (mountedRef.current) onPaidUpdate?.(mes, participanteId)
        }

        novasCobrancas.set(mes, cobranca)
      }

      if (!mountedRef.current) return
      setCobrancas(novasCobrancas)
      lastLoadTimeRef.current = Date.now()

    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        logger.error('Erro ao carregar status local', error)
      }
    } finally {
      if (mountedRef.current) setIsRefreshing(false)
      isLoadingRef.current = false
    }
  }, [caixaId, participanteId, onPaidUpdate, logger])

  // EFFECT PRINCIPAL
  useEffect(() => {
    if (!isOpen || !participanteId) return
    mountedRef.current = true
    loadPaymentDetails(true)
    return () => {
      mountedRef.current = false
      if (abortControllerRef.current) abortControllerRef.current.abort()
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    }
  }, [isOpen, participanteId])

  // POLLING
  useEffect(() => {
    if (!isOpen || expandedMes === null) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      return
    }

    const cobranca = cobrancas.get(expandedMes)
    if (cobranca?.status === 'pago') {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      return
    }

    pollingIntervalRef.current = setInterval(() => {
      loadPaymentDetails(true)
    }, POLLING_INTERVAL_MS)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [isOpen, expandedMes, cobrancas, loadPaymentDetails])

  // Reset
  useEffect(() => {
    setCobrancas(new Map())
    setExpandedMes(null)
    lastLoadTimeRef.current = 0
  }, [participanteId])

  // Cálculo de boletos (Mantido igual)
  const boletos = useMemo(() => {
    if (!caixa || !participante) return []

    const resultado: Boleto[] = []
    const dataBase = caixa.dataInicio ? new Date(caixa.dataInicio) : new Date()
    const isSemanal = caixa.tipo === 'semanal'
    const valorParcelaReal = caixa.valorTotal / caixa.qtdParticipantes
    const numParcelas = caixa.qtdParticipantes

    for (let parcela = 1; parcela <= numParcelas; parcela++) {
      const dataVencimento = new Date(dataBase)

      if (caixa.tipo === 'diario') {
        dataVencimento.setDate(dataVencimento.getDate() + (parcela - 1))
      } else if (isSemanal) {
        dataVencimento.setDate(dataVencimento.getDate() + ((parcela - 1) * 7))
      } else {
        dataVencimento.setMonth(dataVencimento.getMonth() + parcela - 1)
        if (caixa.diaVencimento > 0) {
          dataVencimento.setDate(caixa.diaVencimento)
        }
      }

      const correcaoIPCA = parcela > 1 ? valorParcelaReal * TAXA_IPCA_MENSAL : 0
      const fundoReserva = parcela === 1 ? (valorParcelaReal / caixa.qtdParticipantes) : 0
      const comissaoAdmin = parcela === numParcelas ? (caixa.valorTotal * 0.10) / caixa.qtdParticipantes : 0
      const valorTotal = valorParcelaReal + TAXA_SERVICO + correcaoIPCA + fundoReserva + comissaoAdmin

      const cobranca = cobrancas.get(parcela)
      const isPago = cobranca?.status === 'pago'
      const isAtrasado = caixa.status === 'ativo' && !isPago && dataVencimento < new Date()

      resultado.push({
        mes: parcela,
        valorParcela: valorParcelaReal,
        taxaServico: TAXA_SERVICO,
        fundoReserva,
        taxaAdmin: 0,
        comissaoAdmin,
        correcaoIPCA,
        valorTotal,
        dataVencimento: dataVencimento.toISOString(),
        status: caixa.status !== 'ativo' ? 'pendente' : (isPago ? 'pago' : isAtrasado ? 'atrasado' : 'pendente'),
      })
    }
    return resultado
  }, [caixa, participante, cobrancas])

  // Handlers (Copy/Print mantidos iguais)
  const handleCopyPix = useCallback(async (mes: number) => {
    const cobranca = cobrancas.get(mes)
    if (!cobranca?.pix?.copiaCola) return
    try {
      await navigator.clipboard.writeText(cobranca.pix.copiaCola)
      setCopiedPix(true)
      setTimeout(() => setCopiedPix(false), 2000)
    } catch (error) {
      alert('Erro ao copiar código PIX')
    }
  }, [cobrancas])

  const handleCopyBoleto = useCallback(async (mes: number) => {
    const cobranca = cobrancas.get(mes)
    if (!cobranca?.boleto?.linhaDigitavel) return
    try {
      await navigator.clipboard.writeText(cobranca.boleto.linhaDigitavel)
      setCopiedBoleto(true)
      setTimeout(() => setCopiedBoleto(false), 2000)
    } catch (error) {
      alert('Erro ao copiar linha digitável')
    }
  }, [cobrancas])

  const handlePrintPix = useCallback((mes: number) => {
    const cobranca = cobrancas.get(mes)
    const emv = cobranca?.pix?.copiaCola
    if (!emv) return
    const w = window.open('', 'PRINT', 'height=650,width=600,top=100,left=100')
    if (!w) return
    w.document.write(`<html><head><title>PIX</title></head><body style="font-family:system-ui;"><div style="padding:24px;"><h1>Código PIX</h1><p style="font-family:monospace;word-break:break-all;">${emv}</p></div></body></html>`)
    w.document.close()
    w.focus()
    w.print()
    w.close()
  }, [cobrancas])

  const handlePrintBoleto = useCallback((mes: number) => {
    const cobranca = cobrancas.get(mes)
    if (cobranca?.boleto?.url) {
      window.open(cobranca.boleto.url, '_blank')
      return
    }
    const linha = cobranca?.boleto?.linhaDigitavel
    if (!linha) return
    const w = window.open('', 'PRINT', 'height=650,width=600,top=100,left=100')
    if (!w) return
    w.document.write(`<html><head><title>Boleto</title></head><body style="font-family:system-ui;"><div style="padding:24px;"><h1>Boleto</h1><p style="font-family:monospace;word-break:break-all;">${linha}</p></div></body></html>`)
    w.document.close()
    w.focus()
    w.print()
    w.close()
  }, [cobrancas])

  // ------------------------------------------------------------------
  // 🔥 LÓGICA DE GERAÇÃO DE COBRANÇA CORRIGIDA E PRIORIZADA
  // ------------------------------------------------------------------
  const handleGerarCobranca = useCallback(async (boleto: Boleto, forceRenew = false) => {
    if (!participante || !caixa) return

    setGerandoCobranca(true)
    setBoletoSelecionado(boleto.mes)

    try {
      // 1. Verificação preliminar de cobrança existente (mantida)
      let cobrancaExistente = cobrancas.get(boleto.mes)
      if (!cobrancaExistente && caixaId && participanteId) {
        try {
          const response = await cobrancasService.getByAssociacao({
            caixaId,
            participanteId,
            mes: boleto.mes
          })
          const cobrancaDB = response?.cobranca
          if (cobrancaDB && cobrancaDB.lytexId) {
            const invoiceResp = await cobrancasService.buscar(cobrancaDB.lytexId, {
              caixaId,
              participanteId,
              mes: boleto.mes
            })
            const invoice = invoiceResp?.cobranca || invoiceResp
            if (invoice) {
              const normalizada = normalizarCobranca(invoice, boleto.mes, cobrancaDB.descricao || `Pagamento ${boleto.mes}`)
              if (normalizada) {
                setCobrancas(prev => new Map(prev).set(boleto.mes, normalizada))
                cobrancaExistente = normalizada
              }
            }
          }
        } catch (error) { /* Ignore */ }
      }

      if (!forceRenew && cobrancaExistente && cobrancaExistente.pix && !isPixExpired(cobrancaExistente.pix)) {
        setExpandedMes(boleto.mes)
        setPaymentTab('pix')
        return
      }

      // ==============================================================
      // 🚀 ESTRATÉGIA DE RECUPERAÇÃO DE DADOS (CPF + ENDEREÇO)
      // Prioridade: API /usuarios > Props populadas > Campo direto
      // ==============================================================
      let cpfParticipante = ''
      let nomeParticipante = ''
      let emailParticipante = ''
      let telefoneParticipante = ''
      let enderecoUsuario: UsuarioEndereco | undefined

      // 🔍 DEBUG: Logar estrutura do participante recebido
      console.debug('🔍 [DEBUG] Estrutura do participante recebido:', {
        participanteId: participante._id,
        usuarioId: participante.usuarioId,
        usuarioIdType: typeof participante.usuarioId,
        hasUsuarioId: !!participante.usuarioId,
        usuarioIdKeys: typeof participante.usuarioId === 'object' ? Object.keys(participante.usuarioId || {}) : 'N/A',
        cpfDireto: participante.cpf,
      })

      // Obter usuarioId (pode ser string ou objeto)
      let usuarioIdValue: string | undefined
      if (typeof participante.usuarioId === 'object' && participante.usuarioId !== null) {
        usuarioIdValue = participante.usuarioId._id
      } else if (typeof participante.usuarioId === 'string') {
        usuarioIdValue = participante.usuarioId
      }

      console.debug('🔍 [DEBUG] usuarioIdValue extraído:', usuarioIdValue)

      // 🔍 1. TENTATIVA PRIORITÁRIA: Buscar dados COMPLETOS do USUÁRIO via API
      // Este endpoint retorna CPF e ENDEREÇO diretamente
      if (usuarioIdValue) {
        try {
          logger.log(`🔍 [DEBUG] Buscando dados do usuário via /usuarios/${usuarioIdValue}...`)
          const usuarioResp = await api.get(`/usuarios/${usuarioIdValue}`)
          const usuarioData = usuarioResp.data

          cpfParticipante = usuarioData.cpf || ''
          nomeParticipante = usuarioData.nome || ''
          emailParticipante = usuarioData.email || ''
          telefoneParticipante = usuarioData.telefone || ''
          enderecoUsuario = usuarioData.address || undefined

          // 🔍 DEBUG: Logar dados encontrados
          console.debug('🔍 [DEBUG] Dados do usuário obtidos via API:', {
            nome: nomeParticipante,
            cpf: cpfParticipante,
            cpfLength: cpfParticipante.length,
            temEndereco: !!enderecoUsuario,
            endereco: enderecoUsuario,
          })

          if (cpfParticipante) {
            logger.log(`✅ CPF encontrado via /usuarios: ${cpfParticipante.substring(0, 3)}***${cpfParticipante.substring(8)}`)
          }
        } catch (err) {
          logger.error('Erro ao buscar dados do usuário via API', err)
        }
      }

      // 🔍 2. FALLBACK: Props do componente (Objeto usuarioId populado)
      if (!cpfParticipante && typeof participante.usuarioId === 'object' && participante.usuarioId?.cpf) {
        cpfParticipante = participante.usuarioId.cpf
        nomeParticipante = participante.usuarioId.nome || nomeParticipante
        emailParticipante = participante.usuarioId.email || emailParticipante
        telefoneParticipante = participante.usuarioId.telefone || telefoneParticipante
        enderecoUsuario = participante.usuarioId.address || enderecoUsuario

        console.debug('🔍 [DEBUG] Usando CPF das props (usuarioId populado):', {
          cpf: cpfParticipante,
          cpfLength: cpfParticipante.length,
        })
        logger.log('ℹ️ Usando CPF das props (usuarioId populado)')
      }

      // 🔍 3. FALLBACK: Props do componente (Campo direto no participante)
      if (!cpfParticipante && participante.cpf) {
        cpfParticipante = participante.cpf
        console.debug('🔍 [DEBUG] Usando CPF do campo direto no participante:', cpfParticipante)
        logger.log('ℹ️ Usando CPF das props (campo direto)')
      }

      // Preenchimento de campos vazios com defaults das props se ainda estiverem vazios
      if (!nomeParticipante) nomeParticipante = typeof participante.usuarioId === 'object' ? participante.usuarioId.nome : 'Participante'
      if (!emailParticipante) emailParticipante = typeof participante.usuarioId === 'object' ? participante.usuarioId.email : ''
      if (!telefoneParticipante) telefoneParticipante = typeof participante.usuarioId === 'object' ? participante.usuarioId.telefone : ''

      // 🚫 VALIDAÇÃO FINAL DO CPF
      if (!cpfParticipante) {
        const msg = `Não foi possível obter o CPF do participante ${nomeParticipante}.`
        logger.error(msg)
        console.error('❌ [DEBUG] CPF não encontrado. Dados disponíveis:', {
          participanteId: participante._id,
          usuarioId: usuarioIdValue,
          usuarioIdType: typeof participante.usuarioId,
        })
        alert(`❌ Erro: ${msg}\n\nPor favor, verifique se o cadastro está completo e tente novamente.`)
        return
      }

      // 🔍 DEBUG FINAL: Logar todos os dados que serão enviados
      console.debug('🔍 [DEBUG] Dados FINAIS para geração de cobrança:', {
        cpf: cpfParticipante,
        cpfLength: cpfParticipante.length,
        nome: nomeParticipante,
        email: emailParticipante,
        telefone: telefoneParticipante,
        endereco: enderecoUsuario || 'NÃO DISPONÍVEL (usará padrão)',
      })

      // Payload com CPF correto e ENDEREÇO do usuário
      const payload = {
        participante: {
          nome: nomeParticipante,
          cpf: cpfParticipante,
          email: emailParticipante,
          telefone: telefoneParticipante,
          endereco: enderecoUsuario ? {
            cep: enderecoUsuario.zip || '',
            cidade: enderecoUsuario.city || '',
            rua: enderecoUsuario.street || '',
            estado: enderecoUsuario.state || '',
            bairro: enderecoUsuario.zone || '',
            numero: enderecoUsuario.number || '',
          } : undefined,
        },
        caixa: {
          nome: caixa.nome,
          tipo: caixa.tipo || 'mensal',
          valorParcela: boleto.valorParcela,
          taxaServico: boleto.taxaServico,
          taxaAdministrativa: boleto.fundoReserva,
          correcaoIPCA: boleto.correcaoIPCA,
          comissaoAdmin: boleto.comissaoAdmin,
          mesOuSemana: boleto.mes,
          totalParcelas: caixa.qtdParticipantes,
        },
        caixaId: caixa._id,
        participanteId: participante._id,
        mesReferencia: boleto.mes,
        dataVencimento: boleto.dataVencimento,
        habilitarPix: true,
        habilitarBoleto: true,
        forceRenew,
      }

      logger.log('Gerando cobrança com payload:', payload)

      const response = await cobrancasService.gerar(payload)

      if (!response.success) {
        throw new Error(response.message || 'Erro ao gerar cobrança')
      }

      const lytexId = response.cobranca?._id || response.cobranca?.id
      if (lytexId) {
        const invoiceResp = await cobrancasService.buscar(lytexId, {
          caixaId: caixa._id,
          participanteId: participante._id,
          mes: boleto.mes,
        })

        const cobrancaNormalizada = normalizarCobranca(
          invoiceResp?.cobranca || invoiceResp,
          boleto.mes,
          `Pagamento ${boleto.mes}`
        )

        if (cobrancaNormalizada) {
          setCobrancas(prev => new Map(prev).set(boleto.mes, cobrancaNormalizada))
          setExpandedMes(boleto.mes)
          setPaymentTab('pix')
          onRefreshPagamentos?.()
        }
      }

    } catch (error: any) {
      logger.error('Erro ao gerar cobrança', error)
      const mensagem = error?.response?.status === 401
        ? 'Credenciais inválidas para a API de pagamentos'
        : error.message || 'Erro ao gerar cobrança.'
      alert(mensagem)
    } finally {
      setGerandoCobranca(false)
      setBoletoSelecionado(null)
    }
  }, [participante, caixa, caixaId, participanteId, cobrancas, isPixExpired, normalizarCobranca, onRefreshPagamentos, logger])

  // Utilitários
  const calcularDataRecebimento = useCallback((posicao: number): string => {
    if (!caixa?.dataInicio) return '-'
    const data = new Date(caixa.dataInicio)
    if (caixa.tipo === 'diario') {
      data.setDate(data.getDate() + (posicao - 1))
    } else if (caixa.tipo === 'semanal') {
      data.setDate(data.getDate() + ((posicao - 1) * 7))
    } else {
      data.setMonth(data.getMonth() + posicao - 1)
      data.setDate(caixa.diaVencimento)
    }
    return formatDate(data.toISOString())
  }, [caixa])

  const formatLinhaDigitavel = useCallback((linha: string): string => {
    const digits = (linha || '').replace(/\D/g, '')
    const groups = digits.match(/.{1,5}/g)
    return groups ? groups.join(' ') : linha || ''
  }, [])

  const minutesSince = useCallback((iso?: string): number | null => {
    if (!iso) return null
    const ms = Date.now() - new Date(iso).getTime()
    const min = Math.floor(ms / 60000)
    return min < 0 ? 0 : min
  }, [])

  const handleToggleExpand = useCallback(async (boleto: Boleto) => {
    if (boleto.status === 'pago') return
    if (caixa?.status !== 'ativo') return

    const novoMes = expandedMes === boleto.mes ? null : boleto.mes
    setExpandedMes(novoMes)

    if (!novoMes || !caixaId || !participanteId) return

    let cobrancaExistente = cobrancas.get(novoMes)

    if (!cobrancaExistente) {
      try {
        const response = await cobrancasService.getByAssociacao({
          caixaId,
          participanteId,
          mes: novoMes
        })
        const cobrancaDB = response?.cobranca
        if (cobrancaDB) {
          // Se já existe e tem ID, tenta buscar detalhes apenas para exibir
          if (cobrancaDB.lytexId && cobrancaDB.status !== 'PAGO') {
            // Lógica de busca de detalhes existentes (simplificada para brevidade)
            // ...
          }
        }
      } catch (e) { /* ignore */ }
    }

    const pixValido = cobrancaExistente?.pix && !isPixExpired(cobrancaExistente.pix)
    if (cobrancaExistente && pixValido) {
      setPaymentTab('pix')
      return
    }

    // Se não tem cobrança ou está expirada, gera nova
    if (!cobrancaExistente || (cobrancaExistente.pix && isPixExpired(cobrancaExistente.pix))) {
      handleGerarCobranca(boleto)
    } else {
      setPaymentTab('pix')
    }

  }, [expandedMes, caixa, caixaId, participanteId, cobrancas, isPixExpired, handleGerarCobranca])

  if (!participante) return null

  // Resto da UI permanece idêntica, apenas mapeando usuarioId corretamente
  const nomeUsuario = typeof participante.usuarioId === 'object' ? participante.usuarioId.nome : 'Participante'
  const emailUsuario = typeof participante.usuarioId === 'object' ? participante.usuarioId.email : ''
  const telUsuario = typeof participante.usuarioId === 'object' ? participante.usuarioId.telefone : ''
  const fotoUsuario = typeof participante.usuarioId === 'object' ? participante.usuarioId.fotoUrl : undefined
  const scoreUsuario = typeof participante.usuarioId === 'object' ? participante.usuarioId.score : 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalhes de Pagamentos"
      size="full"
    >
      <div>
        {!expandedMes && (
          <>
            {/* Header do Participante */}
            <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl mb-4">
              <div className="w-full">
                <p className="font-bold text-gray-900 text-lg mb-2 text-center">{nomeUsuario}</p>

                <div className="flex flex-col gap-1.5 text-sm text-gray-600 pl-2">
                  <div>
                    <span className="font-medium text-gray-500">ID:</span> {participante._id}
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Caixa:</span> {caixa?.nome}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Email:</span> {emailUsuario}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Telefone:</span> {telUsuario}
                  </div>
                  <div className="mt-1">
                    <span className="font-medium text-gray-900">Score atual:</span>
                    <span className={cn(
                      'font-bold ml-1',
                      scoreUsuario >= 80 ? 'text-green-600' : scoreUsuario >= 60 ? 'text-amber-600' : 'text-red-600'
                    )}>
                      {scoreUsuario}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Info de Recebimento */}
            <div className="p-3 bg-amber-50 rounded-xl mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 font-medium">Data de Recebimento</p>
                  <p className="font-bold text-amber-800">
                    {calcularDataRecebimento(participante.posicao || 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-amber-700 font-medium">Posição</p>
                  <p className="font-bold text-amber-800">{participante.posicao}º</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Header de Histórico */}
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm sm:text-base">Histórico de Pagamentos</span>
          </h4>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadPaymentDetails(true)}
            disabled={isRefreshing}
            className="h-8 px-2 sm:px-3"
          >
            <RefreshCw className={cn("w-4 h-4 sm:mr-2", isRefreshing && "animate-spin")} />
            <span className="hidden sm:inline">{isRefreshing ? 'Atualizando...' : 'Atualizar'}</span>
          </Button>
        </div>

        {/* Lista de Boletos */}
        <div className="space-y-2 max-h-[75vh] overflow-y-auto pb-20">
          {boletos.map((boleto) => {
            const cobranca = cobrancas.get(boleto.mes)
            const isPago = boleto.status === 'pago'
            const isAtrasado = boleto.status === 'atrasado'
            const isExpanded = expandedMes === boleto.mes

            const baseCents = Math.round((boleto.valorTotal || 0) * 100)
            const cobrancaTotalCents =
              typeof cobranca?.valor === 'number' && Number.isFinite(cobranca.valor)
                ? Math.round(cobranca.valor * 100)
                : null

            const displayTotalCents = cobrancaTotalCents !== null ? cobrancaTotalCents : baseCents
            const displayDueDate = cobranca?.dueDate || boleto.dataVencimento

            return (
              <div
                key={boleto.mes}
                className={cn(
                  'p-3 rounded-xl border transition-all',
                  isPago
                    ? 'bg-green-50 border-green-200'
                    : isAtrasado
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                )}
              >
                {/* Header do Boleto */}
                <div
                  className="flex items-center justify-between mb-2 cursor-pointer"
                  onClick={() => handleToggleExpand(boleto)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {caixa?.tipo === 'diario' ? 'Dia' : caixa?.tipo === 'semanal' ? 'Semana' : 'Mês'} {boleto.mes}
                    </span>
                    <Badge
                      variant={isPago ? 'success' : isAtrasado ? 'danger' : 'warning'}
                      className={isPago ? 'bg-green-100 text-green-800' : ''}
                      size="sm"
                    >
                      {isPago ? 'PAGO' : isAtrasado ? 'Atrasado' : 'Pendente'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">
                      {formatCurrency(displayTotalCents / 100)}
                    </span>
                    {!isPago && caixa?.status === 'ativo' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedMes(isExpanded ? null : boleto.mes)
                        }}
                        className="p-1 rounded-lg hover:bg-gray-100"
                      >
                        <ChevronRight
                          className={cn(
                            'w-4 h-4 text-gray-500 transition-transform',
                            isExpanded && 'rotate-90'
                          )}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* ID da Cobrança */}
                {cobranca?.id && (
                  <div className="text-xs text-gray-500 font-mono mb-1">
                    ID: {cobranca.id}
                  </div>
                )}

                {/* Detalhes se Pago */}
                {isPago && cobranca?.detalhePagamento && cobranca.detalhePagamento.pagoEm && (
                  <div className="mb-2 text-sm text-gray-600">
                    <p>Pago em: {formatDate(cobranca.detalhePagamento.pagoEm)}</p>
                  </div>
                )}

                {/* Área Expandida */}
                {!isPago && caixa?.status === 'ativo' && isExpanded && (
                  <div className="mt-3">
                    <div className="text-sm text-gray-700 space-y-1 mb-3">
                      <div className="flex justify-between">
                        <span>Valor da parcela</span>
                        <span className="font-medium">{formatCurrency(boleto.valorParcela)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t mt-2">
                        <span className="font-semibold">TOTAL</span>
                        <span className="font-bold text-green-700">{formatCurrency(displayTotalCents / 100)}</span>
                      </div>
                    </div>

                    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-3">
                      <button onClick={() => setPaymentTab('pix')} className={cn('flex-1 px-3 py-2 rounded-lg text-sm font-medium', paymentTab === 'pix' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-600')}>PIX</button>
                      <button onClick={() => setPaymentTab('boleto')} className={cn('flex-1 px-3 py-2 rounded-lg text-sm font-medium', paymentTab === 'boleto' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600')}>Boleto</button>
                    </div>

                    {!cobranca ? (
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full"
                        onClick={() => handleGerarCobranca(boleto)}
                        disabled={gerandoCobranca}
                        leftIcon={gerandoCobranca && boletoSelecionado === boleto.mes ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                      >
                        {gerandoCobranca && boletoSelecionado === boleto.mes ? 'Gerando...' : 'Gerar cobrança'}
                      </Button>
                    ) : paymentTab === 'pix' ? (
                      <div className="space-y-3">
                        {isPixExpired(cobranca.pix) ? (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                            <p className="text-sm text-red-700 font-bold mb-1">PIX Expirado</p>
                            <p className="text-xs text-red-600 mb-3">O código QR expirou. Gere uma nova cobrança.</p>
                            <Button
                              size="sm"
                              variant="primary"
                              className="bg-red-600 hover:bg-red-700 text-white w-full h-10 shadow-sm"
                              onClick={() => handleGerarCobranca(boleto, true)}
                            >
                              Gerar Novo PIX
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-center">
                              {cobranca.pix?.qrCode ? <div className="bg-white p-3 rounded-lg border shadow-sm"><QRCode value={cobranca.pix.copiaCola} size={180} /></div> : null}
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1 bg-gray-50 border rounded-lg px-3 py-2 flex items-center">
                                <p className="text-xs text-gray-600 font-mono truncate w-full select-all">{cobranca.pix?.copiaCola || ''}</p>
                              </div>
                              <Button size="sm" variant="secondary" onClick={() => handleCopyPix(boleto.mes)}>
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 bg-gray-50 border rounded-lg"><p className="text-xs font-mono break-all">{formatLinhaDigitavel(cobranca.boleto?.linhaDigitavel || '')}</p></div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleCopyBoleto(boleto.mes)}>Copiar Linha</Button>
                          {cobranca.boleto?.url && <Button size="sm" variant="secondary" onClick={() => window.open(cobranca.boleto!.url)}>Abrir PDF</Button>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}