import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import QRCode from 'react-qr-code'
import Barcode from 'react-barcode'
import { FileText, RefreshCw, ChevronRight, QrCode, Loader2, CheckCircle2, Copy, ExternalLink, Printer } from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { formatCurrency, formatDate, cn } from '../lib/utils'
import { cobrancasService } from '../lib/api'

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
  }
  posicao?: number
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
const POLLING_INTERVAL_MS = 30000 // Aumentado para 30s
const CACHE_VALIDITY_MS = 60000 // Cache de 1 minuto

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

  // 🔥 FUNÇÃO PRINCIPAL DE CARREGAMENTO - LEITURA APENAS LOCAL (SEM LYTEX)
  // Usa endpoint sync-status que consulta apenas o banco de dados local
  // Evita chamadas desnecessárias ao Lytex que poderiam gerar cobranças
  const loadPaymentDetails = useCallback(async (forceRefresh = false) => {
    // Verificações iniciais
    if (!caixaId || !participanteId || !mountedRef.current) {
      return
    }

    // Prevenir múltiplas chamadas simultâneas
    if (isLoadingRef.current) {
      logger.warn('Carregamento já em andamento')
      return
    }

    // Verificar cache
    const timeSinceLastLoad = Date.now() - lastLoadTimeRef.current
    if (!forceRefresh && timeSinceLastLoad < CACHE_VALIDITY_MS) {
      logger.log('Usando cache', { tempoDecorrido: `${Math.round(timeSinceLastLoad / 1000)}s` })
      return
    }

    // Iniciar carregamento
    setIsRefreshing(true)
    isLoadingRef.current = true

    // Cancelar requisições anteriores
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      logger.log('🔄 Carregando status local (sem consultar Lytex)...')

      // 1. Buscar status local usando sync-status (APENAS BANCO LOCAL, SEM LYTEX)
      const syncResponse = await cobrancasService.syncStatus(caixaId)

      if (!mountedRef.current) return

      if (!syncResponse.success || !syncResponse.cobrancas) {
        logger.warn('Falha ao sincronizar status local')
        return
      }

      logger.log(`📊 Encontradas ${syncResponse.cobrancas.length} cobranças no banco local (${syncResponse.pagos} pagas)`)

      // 2. Filtrar cobranças do participante específico
      const cobrancasParticipante = syncResponse.cobrancas.filter(
        (c: any) => String(c.participanteId) === String(participanteId)
      )

      logger.log(`👤 ${cobrancasParticipante.length} cobranças para o participante`)

      // 3. Normalizar e construir mapa de cobranças
      const novasCobrancas = new Map<number, CobrancaCompleta>()

      for (const c of cobrancasParticipante) {
        const mes = Number(c.mesReferencia)
        if (!mes || mes <= 0) continue

        const isPago = c.status === 'PAGO'

        // Construir objeto de cobrança usando dados locais
        const cobranca: CobrancaCompleta = {
          id: c.lytexId || '',
          mes,
          valor: Number(c.valor || 0),
          descricao: `Pagamento Mês ${mes}`,
          status: isPago ? 'pago' : 'pendente',
          dueDate: c.dataVencimento || undefined,
          paymentUrl: c.paymentUrl || undefined,
          // ✅ Usar dados de PIX e Boleto do backend (persistidos no MongoDB)
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

        // Adicionar detalhes de pagamento se estiver pago
        if (isPago && c.dataPagamento) {
          cobranca.detalhePagamento = {
            pagoEm: c.dataPagamento,
            metodo: c.metodoPagamento || undefined,
            creditoEm: undefined,
            valorPago: c.valor ? Math.round(c.valor * 100) : undefined,
            taxas: 0,
          }

          // Notificar callback de atualização
          if (mountedRef.current) {
            onPaidUpdate?.(mes, participanteId)
          }
        }

        novasCobrancas.set(mes, cobranca)
      }

      if (!mountedRef.current) return

      // 4. Atualizar estado
      setCobrancas(novasCobrancas)
      lastLoadTimeRef.current = Date.now()

      const pagasCount = Array.from(novasCobrancas.values()).filter(c => c.status === 'pago').length
      logger.log(`✅ Carregamento local completo: ${novasCobrancas.size} cobranças, ${pagasCount} pagas`)

    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        logger.error('Erro ao carregar status local', error)
      }
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false)
      }
      isLoadingRef.current = false
    }
  }, [caixaId, participanteId, onPaidUpdate, logger])

  // 🔥 EFFECT PRINCIPAL - CARREGA UMA VEZ AO ABRIR
  useEffect(() => {
    if (!isOpen || !participanteId) return

    mountedRef.current = true

    // Carregamento inicial
    loadPaymentDetails(true)

    // Cleanup
    return () => {
      mountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [isOpen, participanteId]) // Dependências mínimas estáveis

  // 🔥 POLLING OTIMIZADO - APENAS PARA MÊS EXPANDIDO E NÃO PAGO
  useEffect(() => {
    if (!isOpen || expandedMes === null) {
      // Limpar polling se não há mês expandido
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      return
    }

    const cobranca = cobrancas.get(expandedMes)

    // Não fazer polling se já está pago
    if (cobranca?.status === 'pago') {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      return
    }

    // Iniciar polling
    logger.log(`Iniciando polling para mês ${expandedMes}`)
    pollingIntervalRef.current = setInterval(() => {
      logger.log('Executando polling...')
      loadPaymentDetails(true)
    }, POLLING_INTERVAL_MS)

    // Cleanup
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [isOpen, expandedMes, cobrancas, loadPaymentDetails, logger])

  // Reset ao mudar participante
  useEffect(() => {
    setCobrancas(new Map())
    setExpandedMes(null)
    lastLoadTimeRef.current = 0
  }, [participanteId])

  // Cálculo de boletos
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

  // Handlers
  const handleCopyPix = useCallback(async (mes: number) => {
    const cobranca = cobrancas.get(mes)
    if (!cobranca?.pix?.copiaCola) return

    try {
      await navigator.clipboard.writeText(cobranca.pix.copiaCola)
      setCopiedPix(true)
      setTimeout(() => setCopiedPix(false), 2000)
    } catch (error) {
      logger.error('Erro ao copiar PIX', error)
      alert('Erro ao copiar código PIX')
    }
  }, [cobrancas, logger])

  const handleCopyBoleto = useCallback(async (mes: number) => {
    const cobranca = cobrancas.get(mes)
    if (!cobranca?.boleto?.linhaDigitavel) return

    try {
      await navigator.clipboard.writeText(cobranca.boleto.linhaDigitavel)
      setCopiedBoleto(true)
      setTimeout(() => setCopiedBoleto(false), 2000)
    } catch (error) {
      logger.error('Erro ao copiar boleto', error)
      alert('Erro ao copiar linha digitável')
    }
  }, [cobrancas, logger])

  const handlePrintPix = useCallback((mes: number) => {
    const cobranca = cobrancas.get(mes)
    const emv = cobranca?.pix?.copiaCola
    if (!emv) return

    const w = window.open('', 'PRINT', 'height=650,width=600,top=100,left=100')
    if (!w) return

    w.document.write(`
      <html>
        <head><title>PIX - ${caixa?.tipo === 'diario' ? 'Dia' : caixa?.tipo === 'semanal' ? 'Semana' : 'Mês'} ${mes}</title></head>
        <body style="font-family: system-ui;">
          <div style="padding:24px;">
            <h1 style="font-size:18px;margin:0 0 12px 0;color:#111;">Código PIX (EMV)</h1>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;">
              <div style="font-family: monospace;font-size:12px;color:#444;word-break:break-all;">${emv}</div>
            </div>
          </div>
        </body>
      </html>
    `)
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

    w.document.write(`
      <html>
        <head><title>Boleto - ${caixa?.tipo === 'diario' ? 'Dia' : caixa?.tipo === 'semanal' ? 'Semana' : 'Mês'} ${mes}</title></head>
        <body style="font-family: system-ui;">
          <div style="padding:24px;">
            <h1 style="font-size:18px;margin:0 0 12px 0;color:#111;">Boleto</h1>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;">
              <div style="font-family: monospace;font-size:12px;color:#444;word-break:break-all;">${linha}</div>
            </div>
          </div>
        </body>
      </html>
    `)
    w.document.close()
    w.focus()
    w.print()
    w.close()
  }, [cobrancas])

  const handleGerarCobranca = useCallback(async (boleto: Boleto) => {
    if (!participante || !caixa) return

    setGerandoCobranca(true)
    setBoletoSelecionado(boleto.mes)

    try {
      // Verificar se já existe cobrança válida no estado local
      let cobrancaExistente = cobrancas.get(boleto.mes)

      // Se não existe localmente, verificar no backend
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
              const normalizada = normalizarCobranca(
                invoice,
                boleto.mes,
                cobrancaDB.descricao || `Pagamento ${caixa?.tipo === 'diario' ? 'Dia' : caixa?.tipo === 'semanal' ? 'Semana' : 'Mês'} ${boleto.mes}`
              )

              if (normalizada) {
                setCobrancas(prev => new Map(prev).set(boleto.mes, normalizada))
                cobrancaExistente = normalizada
                logger.log(`Cobrança existente encontrada no backend para mês ${boleto.mes}`)
              }
            }
          }
        } catch (error) {
          logger.warn(`Erro ao verificar cobrança no backend:`, error)
        }
      }

      // Se existe cobrança válida (PIX não expirado), usar a existente
      if (cobrancaExistente && cobrancaExistente.pix && !isPixExpired(cobrancaExistente.pix)) {
        logger.log(`Cobrança válida encontrada para mês ${boleto.mes}. PIX ainda válido (<30min). Não gerando nova.`)
        setExpandedMes(boleto.mes)
        setPaymentTab('pix')
        return
      }

      // Se PIX expirado ou não existe cobrança, gerar nova
      if (cobrancaExistente?.pix && isPixExpired(cobrancaExistente.pix)) {
        logger.log(`PIX expirado para mês ${boleto.mes} (>30min). Gerando nova cobrança...`)
      }

      const payload = {
        participante: {
          nome: participante.usuarioId?.nome || 'Participante',
          cpf: participante.usuarioId?.cpf || '',
          email: participante.usuarioId?.email || '',
          telefone: participante.usuarioId?.telefone || '',
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
      }

      // ✅ VALIDAÇÃO: Verificar se o participante tem CPF cadastrado
      if (!payload.participante.cpf) {
        alert(`❌ Erro: O participante ${payload.participante.nome} não possui CPF cadastrado. Por favor, atualize o cadastro antes de gerar a cobrança.`)
        return
      }

      logger.log('Gerando nova cobrança', { mes: boleto.mes, valor: boleto.valorTotal, cpf: payload.participante.cpf })

      const response = await cobrancasService.gerar(payload)

      if (!response.success) {
        throw new Error(response.message || 'Erro ao gerar cobrança')
      }

      // Buscar detalhes completos
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
          `Pagamento ${caixa.tipo === 'diario' ? 'Dia' : caixa.tipo === 'semanal' ? 'Semana' : 'Mês'} ${boleto.mes}`
        )

        if (cobrancaNormalizada) {
          setCobrancas(prev => new Map(prev).set(boleto.mes, cobrancaNormalizada))
          setExpandedMes(boleto.mes)
          setPaymentTab('pix')
          onRefreshPagamentos?.()

          logger.log('Cobrança criada', { id: cobrancaNormalizada.id })
        }
      }

    } catch (error: any) {
      logger.error('Erro ao gerar cobrança', error)

      const mensagem = error?.response?.status === 401
        ? 'Credenciais inválidas para a API de pagamentos'
        : error.message || 'Erro ao gerar cobrança. Tente novamente.'

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
    // 🔴 NÃO expandir se já estiver pago
    if (boleto.status === 'pago') {
      logger.log(`⚠️ Cobrança do mês ${boleto.mes} já está PAGA. Não é possível expandir.`)
      return
    }

    // 🔴 NÃO expandir se caixa não está ativo
    if (caixa?.status !== 'ativo') return

    const novoMes = expandedMes === boleto.mes ? null : boleto.mes
    setExpandedMes(novoMes)

    // Se está fechando (novoMes === null), não faz nada
    if (!novoMes || !caixaId || !participanteId) return

    // ✅ VERIFICAR SE EXISTE COBRANÇA NO STATE OU BACKEND
    let cobrancaExistente = cobrancas.get(novoMes)

    // Se não existe no state, buscar no backend (APENAS dados locais)
    if (!cobrancaExistente) {
      logger.log(`🔍 Verificando cobrança no backend para mês ${novoMes}...`)
      try {
        const response = await cobrancasService.getByAssociacao({
          caixaId,
          participanteId,
          mes: novoMes
        })

        const cobrancaDB = response?.cobranca

        // 🆕 VALIDAR STATUS ANTES DE PROSSEGUIR
        if (cobrancaDB) {
          const statusLocal = String(cobrancaDB.status || '').toLowerCase()
          const estaPago = ['pago', 'paid', 'liquidated', 'settled', 'aprovado', 'inqueue'].includes(statusLocal)

          // Se já está pago, NÃO fazer nada
          if (estaPago) {
            logger.log(`✅ Cobrança mês ${novoMes} já está PAGA. Não gerando nova.`)
            // Fechar expansão
            setExpandedMes(null)
            return
          }

          // Se tem lytexId mas NÃO está pago, buscar detalhes SOMENTE para exibir
          if (cobrancaDB.lytexId) {
            logger.log(`📋 Buscando detalhes da cobrança existente (lytexId: ${cobrancaDB.lytexId})`)

            try {
              // Buscar invoice e detail do Lytex APENAS para obter PIX/Boleto
              const [invoiceResp, detailResp] = await Promise.all([
                cobrancasService.buscar(cobrancaDB.lytexId, {
                  caixaId,
                  participanteId,
                  mes: novoMes
                }),
                cobrancasService.paymentDetail(cobrancaDB.lytexId)
              ])

              const invoice = invoiceResp?.cobranca || invoiceResp || {}
              const detailWrapper = detailResp || {}
              const detail = detailWrapper?.paymentDetail || detailWrapper?.detail || detailWrapper

              const merged = {
                ...invoice,
                ...detail,
                local: detailWrapper?.local,
                lytexStatus: invoice?.status,
                detailStatus: detail?.status,
              }

              const normalizada = normalizarCobranca(
                merged,
                novoMes,
                cobrancaDB.descricao || `Pagamento ${caixa.tipo === 'diario' ? 'Dia' : caixa.tipo === 'semanal' ? 'Semana' : 'Mês'} ${novoMes}`
              )

              if (normalizada) {
                setCobrancas(prev => new Map(prev).set(novoMes, normalizada))
                cobrancaExistente = normalizada
                logger.log(`✅ Detalhes da cobrança existente carregados para mês ${novoMes}`)
              }
            } catch (error) {
              logger.error(`Erro ao buscar detalhes da cobrança existente:`, error)
              // Continua para gerar nova se falhou ao buscar detalhes
            }
          }
        }
      } catch (error) {
        logger.warn(`⚠️ Erro ao buscar cobrança no backend para mês ${novoMes}:`, error)
      }
    }

    // ✅ VERIFICAR SE PIX AINDA É VÁLIDO (< 30 minutos)
    const pixValido = cobrancaExistente?.pix && !isPixExpired(cobrancaExistente.pix)

    if (cobrancaExistente && pixValido) {
      // PIX ainda válido - reutilizar sem gerar nova
      logger.log(`✅ PIX válido para mês ${novoMes} (< 30min). Reutilizando cobrança existente.`)
      setPaymentTab('pix')
      return
    }

    // ✅ DECIDIR SE DEVE GERAR NOVA COBRANÇA
    let deveGerarNova = false
    let motivoGeracao = ''

    if (!cobrancaExistente) {
      // Não existe cobrança alguma
      deveGerarNova = true
      motivoGeracao = `Sem cobrança para mês ${novoMes}. Gerando automaticamente...`
    } else if (cobrancaExistente.pix && isPixExpired(cobrancaExistente.pix)) {
      // PIX expirado
      deveGerarNova = true
      motivoGeracao = `PIX expirado para mês ${novoMes} (> 30min). Gerando nova cobrança...`
    } else if (!cobrancaExistente.pix && !cobrancaExistente.boleto) {
      // Existe mas sem dados de pagamento
      deveGerarNova = true
      motivoGeracao = `Cobrança existe mas sem PIX/Boleto. Gerando nova...`
    }

    // 🆕 SÓ GERAR SE REALMENTE NECESSÁRIO
    if (deveGerarNova) {
      logger.log(`🆕 ${motivoGeracao}`)
      handleGerarCobranca(boleto)
    } else {
      // Tem cobrança com PIX/Boleto válido, apenas exibir
      logger.log(`ℹ️ Cobrança existe e é válida. Exibindo detalhes.`)
      setPaymentTab('pix')
    }
  }, [expandedMes, caixa, caixaId, participanteId, cobrancas, isPixExpired, normalizarCobranca, logger, handleGerarCobranca])

  if (!participante) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalhes de Pagamentos"
      size="full"
    >
      <div>
        {/* Header do Participante */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-4">
          <Avatar
            name={participante.usuarioId.nome}
            src={participante.usuarioId.fotoUrl}
            size="lg"
          />
          <div className="flex-1">
            <p className="font-bold text-gray-900">{participante.usuarioId.nome}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 mb-1">
              <span>ID: {participante._id}</span>
              <span>•</span>
              <span>Caixa: {caixa?.nome}</span>
            </div>
            <p className="text-sm text-gray-500">{participante.usuarioId.email}</p>
            <p className="text-sm text-gray-500">{participante.usuarioId.telefone}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Score</p>
            <p className={cn(
              'text-2xl font-bold',
              participante.usuarioId.score >= 80
                ? 'text-green-600'
                : participante.usuarioId.score >= 60
                  ? 'text-amber-600'
                  : 'text-red-600'
            )}>
              {participante.usuarioId.score}
            </p>
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

        {/* Header de Histórico */}
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Histórico de Pagamentos
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />}
            onClick={() => loadPaymentDetails(true)}
            disabled={isRefreshing}
            className="ml-auto"
          >
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </h4>

        {/* Lista de Boletos */}
        <div className="space-y-2 max-h-[70vh] overflow-y-auto">
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

            const now = new Date()
            const vencimentoOriginal = new Date(boleto.dataVencimento)
            const startOfDay = (d: Date) => {
              const copy = new Date(d)
              copy.setHours(0, 0, 0, 0)
              return copy
            }

            const daysLate =
              isAtrasado && !Number.isNaN(vencimentoOriginal.getTime())
                ? Math.max(
                  1,
                  Math.floor(
                    (startOfDay(now).getTime() -
                      startOfDay(vencimentoOriginal).getTime()) /
                    (24 * 60 * 60 * 1000),
                  ),
                )
                : 0

            const multaCents = 300
            const jurosCents =
              isAtrasado && daysLate > 0 ? Math.round(baseCents * 0.01 * daysLate) : 0
            const previewTotalCents =
              isAtrasado && daysLate > 0 ? baseCents + multaCents + jurosCents : baseCents

            const previewDueDateIso = (() => {
              if (!isAtrasado) return null
              const d = new Date()
              d.setDate(d.getDate() + 5)
              d.setHours(23, 59, 59, 999)
              return d.toISOString()
            })()

            const displayTotalCents =
              cobrancaTotalCents !== null
                ? cobrancaTotalCents
                : isAtrasado
                  ? previewTotalCents
                  : baseCents

            const extraCents = Math.max(0, displayTotalCents - baseCents)
            const displayDueDate =
              cobranca?.dueDate || (isAtrasado ? previewDueDateIso : boleto.dataVencimento)

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
                {isPago && cobranca?.detalhePagamento && (
                  <div className="mb-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-2">
                      {cobranca.detalhePagamento.pagoEm && (
                        <div className="text-green-700">
                          Pago em: <span className="font-medium">
                            {formatDate(cobranca.detalhePagamento.pagoEm)}
                          </span>
                        </div>
                      )}
                      {cobranca.detalhePagamento.metodo && (
                        <div className="text-gray-700">
                          Método: <span className="font-medium uppercase">
                            {cobranca.detalhePagamento.metodo}
                          </span>
                        </div>
                      )}
                      {cobranca.detalhePagamento.creditoEm && (
                        <div className="text-amber-700">
                          Crédito previsto: <span className="font-medium">
                            {formatDate(cobranca.detalhePagamento.creditoEm)}
                          </span>
                          {cobranca.detalhePagamento.valorPago &&
                            cobranca.detalhePagamento.taxas && (
                              <span className="font-bold ml-2 text-amber-700">
                                {formatCurrency(
                                  (cobranca.detalhePagamento.valorPago -
                                    cobranca.detalhePagamento.taxas) / 100
                                )}
                              </span>
                            )}
                        </div>
                      )}
                    </div>

                    {/* Composição do Valor */}
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <span className="text-blue-600">ℹ</span> Composição do Valor
                      </h4>
                      <div className="text-sm text-gray-700 space-y-1">
                        <div className="flex justify-between">
                          <span>Valor da parcela</span>
                          <span className="font-medium">
                            {formatCurrency(boleto.valorParcela)}
                          </span>
                        </div>
                        {boleto.fundoReserva > 0 && (
                          <div className="flex justify-between">
                            <span>Fundo de reserva</span>
                            <span className="font-medium">
                              {formatCurrency(boleto.fundoReserva)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Taxa de serviço</span>
                          <span className="font-medium">
                            {formatCurrency(TAXA_SERVICO)}
                          </span>
                        </div>
                        {isAtrasado && extraCents > 0 && (
                          <div className="flex justify-between">
                            <span className="text-red-700">Multa + juros</span>
                            <span className="font-medium text-red-700">
                              {formatCurrency(extraCents / 100)}
                            </span>
                          </div>
                        )}
                        {boleto.correcaoIPCA > 0 && (
                          <div className="flex justify-between">
                            <span>IPCA</span>
                            <span className="font-medium">
                              {formatCurrency(boleto.correcaoIPCA)}
                            </span>
                          </div>
                        )}
                        {boleto.comissaoAdmin > 0 && (
                          <div className="flex justify-between">
                            <span>Comissão do administrador (10%)</span>
                            <span className="font-medium">
                              {formatCurrency(boleto.comissaoAdmin)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1 border-t mt-2">
                          <span className="font-semibold">TOTAL</span>
                          <span className="font-bold text-green-700">
                            {formatCurrency(displayTotalCents / 100)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Data de Vencimento */}
                <div className="text-xs text-gray-600">
                  {isAtrasado ? (
                    <div className="space-y-0.5">
                      <div>Vencimento original: {formatDate(boleto.dataVencimento)}</div>
                      {displayDueDate && (
                        <div className="text-red-700 font-medium">
                          Novo vencimento: {formatDate(displayDueDate)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span>
                      Vencimento: {formatDate(displayDueDate || boleto.dataVencimento)}
                    </span>
                  )}
                </div>

                {/* Área Expandida - Pagamento */}
                {!isPago && caixa?.status === 'ativo' && isExpanded && (
                  <div className="mt-3">
                    {/* Composição do Valor */}
                    <div className="text-sm text-gray-700 space-y-1 mb-3">
                      <div className="flex justify-between">
                        <span>Valor da parcela</span>
                        <span className="font-medium">
                          {formatCurrency(boleto.valorParcela)}
                        </span>
                      </div>
                      {boleto.fundoReserva > 0 && (
                        <div className="flex justify-between">
                          <span>Fundo de reserva</span>
                          <span className="font-medium">
                            {formatCurrency(boleto.fundoReserva)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Taxa de serviço</span>
                        <span className="font-medium">
                          {formatCurrency(TAXA_SERVICO)}
                        </span>
                      </div>
                      {isAtrasado && extraCents > 0 && (
                        <div className="flex justify-between">
                          <span className="text-red-700">Multa + juros</span>
                          <span className="font-medium text-red-700">
                            {formatCurrency(extraCents / 100)}
                          </span>
                        </div>
                      )}
                      {boleto.correcaoIPCA > 0 && (
                        <div className="flex justify-between">
                          <span>IPCA</span>
                          <span className="font-medium">
                            {formatCurrency(boleto.correcaoIPCA)}
                          </span>
                        </div>
                      )}
                      {boleto.comissaoAdmin > 0 && (
                        <div className="flex justify-between">
                          <span>Comissão do administrador (10%)</span>
                          <span className="font-medium">
                            {formatCurrency(boleto.comissaoAdmin)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Tabs PIX/Boleto */}
                    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-3">
                      <button
                        onClick={() => setPaymentTab('pix')}
                        className={cn(
                          'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          paymentTab === 'pix'
                            ? 'bg-white text-green-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        )}
                      >
                        PIX
                      </button>
                      <button
                        onClick={() => setPaymentTab('boleto')}
                        className={cn(
                          'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          paymentTab === 'boleto'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        )}
                      >
                        Boleto
                      </button>
                    </div>

                    {/* Botão Gerar ou Conteúdo */}
                    {!cobranca ? (
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full"
                        onClick={() => handleGerarCobranca(boleto)}
                        disabled={gerandoCobranca}
                        leftIcon={
                          gerandoCobranca && boletoSelecionado === boleto.mes
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <QrCode className="w-4 h-4" />
                        }
                      >
                        {gerandoCobranca && boletoSelecionado === boleto.mes
                          ? 'Gerando...'
                          : 'Gerar cobrança'}
                      </Button>
                    ) : paymentTab === 'pix' ? (
                      <div className="space-y-3">
                        {/* Tempo desde geração */}
                        {cobranca.pix?.geradoEm && (
                          <div className="text-xs text-gray-500 text-center">
                            PIX gerado há {minutesSince(cobranca.pix.geradoEm)} min
                            {isPixExpired(cobranca.pix) && (
                              <span className="text-red-600 ml-2 font-medium">
                                (Expirado)
                              </span>
                            )}
                          </div>
                        )}

                        {/* Botão Regenerar se PIX expirado */}
                        {isPixExpired(cobranca.pix) && (
                          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-xs text-red-700 mb-2 font-medium">
                              ⚠️ Este PIX expirou. Gere uma nova cobrança para continuar.
                            </p>
                            <Button
                              variant="primary"
                              size="sm"
                              className="w-full bg-red-500 hover:bg-red-600"
                              onClick={() => handleGerarCobranca(boleto)}
                              disabled={gerandoCobranca}
                              leftIcon={
                                gerandoCobranca && boletoSelecionado === boleto.mes
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : <RefreshCw className="w-4 h-4" />
                              }
                            >
                              {gerandoCobranca && boletoSelecionado === boleto.mes
                                ? 'Gerando nova cobrança...'
                                : 'Gerar Nova Cobrança'}
                            </Button>
                          </div>
                        )}

                        {/* QR Code */}
                        <div className="flex justify-center">
                          {cobranca.pix?.qrCode ? (
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                              <QRCode
                                value={cobranca.pix.copiaCola}
                                size={176}
                              />
                            </div>
                          ) : (
                            <div className="w-44 h-44 bg-gray-100 rounded-lg flex items-center justify-center">
                              <QrCode className="w-20 h-20 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Código PIX e Ações */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            Código PIX
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value={cobranca.pix?.copiaCola || ''}
                              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-600 truncate"
                            />
                            <Button
                              variant={copiedPix ? 'primary' : 'secondary'}
                              size="sm"
                              onClick={() => handleCopyPix(boleto.mes)}
                              leftIcon={
                                copiedPix
                                  ? <CheckCircle2 className="w-4 h-4" />
                                  : <Copy className="w-4 h-4" />
                              }
                              className={copiedPix ? 'bg-green-500 hover:bg-green-600' : ''}
                            >
                              {copiedPix ? 'Copiado!' : 'Copiar'}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handlePrintPix(boleto.mes)}
                              leftIcon={<Printer className="w-4 h-4" />}
                            >
                              Imprimir
                            </Button>
                            {cobranca.paymentUrl && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => window.open(cobranca.paymentUrl!, '_blank')}
                                leftIcon={<ExternalLink className="w-4 h-4" />}
                              >
                                Checkout
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Linha Digitável */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            Linha Digitável
                          </label>
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <p className="text-sm font-mono text-gray-600 break-all">
                              {formatLinhaDigitavel(cobranca.boleto?.linhaDigitavel || '')}
                            </p>
                          </div>
                        </div>

                        {/* Código de Barras */}
                        {cobranca.boleto?.codigoBarras && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                              Código de Barras
                            </label>
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              <p className="text-sm font-mono text-gray-600 break-all">
                                {cobranca.boleto.codigoBarras}
                              </p>
                            </div>
                            <div className="flex justify-center mt-2">
                              <Barcode
                                value={cobranca.boleto.codigoBarras}
                                format="CODE128"
                                width={2}
                                height={50}
                              />
                            </div>
                          </div>
                        )}

                        {/* Ações do Boleto */}
                        <div className="flex gap-2">
                          <Button
                            variant={copiedBoleto ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => handleCopyBoleto(boleto.mes)}
                            leftIcon={
                              copiedBoleto
                                ? <CheckCircle2 className="w-4 h-4" />
                                : <Copy className="w-4 h-4" />
                            }
                            className={copiedBoleto ? 'bg-green-500 hover:bg-green-600' : ''}
                          >
                            {copiedBoleto ? 'Copiado!' : 'Copiar'}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handlePrintBoleto(boleto.mes)}
                            leftIcon={<Printer className="w-4 h-4" />}
                          >
                            Imprimir
                          </Button>
                          {cobranca.boleto?.url && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => window.open(cobranca.boleto!.url, '_blank')}
                              leftIcon={<ExternalLink className="w-4 h-4" />}
                            >
                              Ver boleto
                            </Button>
                          )}
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