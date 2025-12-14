import { useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import Barcode from 'react-barcode'
import { FileText, RefreshCw, ChevronRight, QrCode, Loader2, CheckCircle2, Copy, ExternalLink, Printer } from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { formatCurrency, formatDate, cn } from '../lib/utils'
import { cobrancasService, pagamentosService } from '../lib/api'

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
  tipo?: 'mensal' | 'semanal'
  qtdParticipantes: number
  valorTotal: number
  valorParcela: number
  status: string
  mesAtual: number
  diaVencimento: number
  dataInicio?: string
}

type CobrancaInfo = {
  id: string
  valor: number
  descricao: string
  paymentUrl?: string
  pixGeneratedAt?: string
  pix?: { qrCode: string; copiaCola: string }
  boleto?: { codigoBarras: string; linhaDigitavel: string; url: string }
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
const TAXA_SERVICO = 5
const PIX_EXPIRATION_MINUTES = 30

interface DetalhesPagamentoProps {
  isOpen: boolean
  onClose: () => void
  caixa: Caixa | null
  participante: Participante | null
  onRefreshPagamentos?: () => void
  onPaidUpdate?: (mes: number, participanteId: string) => void
}

export function DetalhesPagamento({ isOpen, onClose, caixa, participante, onRefreshPagamentos, onPaidUpdate }: DetalhesPagamentoProps) {
  const [expandedMes, setExpandedMes] = useState<number | null>(null)
  const [paymentTab, setPaymentTab] = useState<'pix' | 'boleto'>('pix')
  const [copiedPix, setCopiedPix] = useState(false)
  const [copiedBoleto, setCopiedBoleto] = useState(false)
  const [gerandoCobranca, setGerandoCobranca] = useState(false)
  const [boletoSelecionado, setBoletoSelecionado] = useState<number | null>(null)
  const [cobrancasPorMes, setCobrancasPorMes] = useState<Record<number, CobrancaInfo>>({})
  const [lytexPaymentDetails, setLytexPaymentDetails] = useState<Record<string, any>>({})
  const [refreshTick, setRefreshTick] = useState(0)
  const logGroup = (title: string, data: Record<string, any>) => {
    try { console.group(title); Object.entries(data).forEach(([k, v]) => console.log(k, v)); console.groupEnd() } catch {}
  }
  const isPixExpired = (detail: any): boolean => {
    const created = detail?.createdAt || detail?.created_at || detail?.pixCreatedAt || detail?.pixGeneratedAt
    if (!created) return false
    const ms = Date.now() - new Date(created).getTime()
    const min = Math.floor(ms / 60000)
    return min >= PIX_EXPIRATION_MINUTES
  }

  const mapCobrancaInfo = (inv: any, descricao: string, valorDefault: number): CobrancaInfo => {
    const tx = Array.isArray(inv?.transactions) ? inv.transactions[0] : undefined
    const valorCents = tx?.value ?? inv?.totalValue
    const pixCreated = tx?.createdAt || tx?.created_at || inv?.createdAt || inv?.created_at
    const pixQrcode = tx?.pix?.qrcode || inv?.paymentMethods?.pix?.qrcode || inv?.pix?.qrcode || inv?.pix?.qrCode || ''
    const pixEmv = tx?.pix?.emv || tx?.pix?.qrcode || inv?.paymentMethods?.pix?.emv || inv?.pix?.copyPaste || ''
    const boletoBarcode = tx?.boleto?.barcode || inv?.paymentMethods?.boleto?.barcode || inv?.boleto?.barcode || ''
    const boletoDigitable = tx?.boleto?.digitableLine || inv?.paymentMethods?.boleto?.digitableLine || inv?.boleto?.digitableLine || ''
    return {
      id: inv?._id || inv?.id || '',
      valor: typeof valorCents === 'number' ? Math.round(valorCents) / 100 : valorDefault,
      descricao,
      paymentUrl: inv?.linkCheckout || inv?.paymentUrl,
      pixGeneratedAt: pixCreated,
      pix: (pixQrcode || pixEmv) ? { qrCode: pixQrcode, copiaCola: pixEmv } : undefined,
      boleto: (boletoBarcode || boletoDigitable || inv?.linkBoleto) ? { codigoBarras: boletoBarcode, linhaDigitavel: boletoDigitable, url: inv?.linkBoleto } : undefined,
    }
  }

  useEffect(() => {
    setCobrancasPorMes({})
    setLytexPaymentDetails({})
    setExpandedMes(null)
  }, [participante?._id])

    useEffect(() => {
    const loadPaymentDetails = async () => {
      if (!caixa?._id || !participante?._id) return
      try {
        const response = await cobrancasService.getAllByAssociacao({
          caixaId: caixa._id,
          participanteId: participante._id,
        })
        const cobrancas = response.cobrancas || []
        const cobrancasByMes = new Map<number, any[]>()
        for (const c of cobrancas) {
          const list = cobrancasByMes.get(c.mesReferencia) || []
          list.push(c)
          cobrancasByMes.set(c.mesReferencia, list)
        }
        const updatesCobrancas: Record<number, CobrancaInfo> = {}
        const updatesLytex: Record<string, any> = {}
        await Promise.all(Array.from(cobrancasByMes.entries()).map(async ([mes, candidates]) => {
          const candidatesWithStatus = await Promise.all(candidates.map(async (c) => {
            if (!c.lytexId) return { ...c, isPaid: false, lytexDetail: null }
            try {
              const invoiceResp = await cobrancasService.buscar(c.lytexId, {
                caixaId: caixa._id,
                participanteId: participante._id,
                mes
              })
              const pd = await cobrancasService.paymentDetail(c.lytexId)
              const detail = pd?.paymentDetail || pd?.detail || pd
              const invoice = invoiceResp?.cobranca || {}
              const status = invoice.status || detail?.status || c.status
              const statusNormalized = String(status || '').toLowerCase()
              const isPaid = ['paid', 'liquidated', 'settled', 'pago', 'inqueue'].includes(statusNormalized)
              const dbStatusPaid = String(c.status || '').toUpperCase() === 'PAGO'
              const finalPaid = isPaid || dbStatusPaid
              const fullDetail = { ...detail, ...invoice, status: finalPaid ? 'PAGO' : (isPaid ? 'PAGO' : status) }
              logGroup('Pagamento: detalhe carregado', {
                clienteId: participante._id,
                mes,
                faturaId: c.lytexId,
                valorCentavos: invoice?.totalValue ?? (fullDetail as any)?.totalValue,
                status: (fullDetail as any)?.status,
                expirado: isPixExpired(fullDetail)
              })
              updatesLytex[c.lytexId] = fullDetail
              return { ...c, isPaid: finalPaid, lytexDetail: fullDetail, rawInvoice: invoice }
            } catch {
              return { ...c, isPaid: false, lytexDetail: null }
            }
          }))
          const paidCandidate = candidatesWithStatus.find(c => c.isPaid)
          const notExpired = candidatesWithStatus.find(c => c.lytexDetail && !isPixExpired(c.lytexDetail))
          const winner = paidCandidate || notExpired || candidatesWithStatus[0]
          if (winner) {
            const inv = winner.rawInvoice || {}
            updatesCobrancas[mes] = mapCobrancaInfo(inv, winner.descricao || '', winner.valor || 0)
            if (paidCandidate && participante?._id) {
              try { onPaidUpdate?.(mes, participante._id) } catch {}
            }
          }
        }))
        setCobrancasPorMes(prev => ({ ...prev, ...updatesCobrancas }))
        setLytexPaymentDetails(prev => ({ ...prev, ...updatesLytex }))
      } catch {}
    }
    let intervalId: any
    if (isOpen && participante) {
      loadPaymentDetails()
      intervalId = setInterval(() => { loadPaymentDetails() }, 10000)
    }
    return () => { if (intervalId) clearInterval(intervalId) }
  }, [isOpen, participante?._id, caixa?._id, expandedMes, refreshTick])

  const minutesSince = (iso?: string) => {
    if (!iso) return null
    const ms = Date.now() - new Date(iso).getTime()
    const min = Math.floor(ms / 60000)
    return min < 0 ? 0 : min
  }

  const calcularDataRecebimento = (posicao: number): string => {
    if (!caixa?.dataInicio) return '-'
    const data = new Date(caixa.dataInicio)
    if (caixa.tipo === 'semanal') {
      data.setDate(data.getDate() + ((posicao - 1) * 7))
    } else {
      data.setMonth(data.getMonth() + posicao - 1)
      data.setDate(caixa.diaVencimento)
    }
    return formatDate(data.toISOString())
  }

  const calcularBoletos = (p: Participante): Boleto[] => {
    if (!caixa) return []
    const boletos: Boleto[] = []
    const dataBase = caixa.dataInicio ? new Date(caixa.dataInicio) : new Date()
    const isSemanal = caixa.tipo === 'semanal'
    const valorParcelaReal = caixa.valorTotal / caixa.qtdParticipantes
    const numParcelas = caixa.qtdParticipantes
    for (let parcela = 1; parcela <= numParcelas; parcela++) {
      const dataVencimento = new Date(dataBase)
      if (isSemanal) dataVencimento.setDate(dataVencimento.getDate() + ((parcela - 1) * 7))
      else dataVencimento.setMonth(dataVencimento.getMonth() + parcela - 1)
      if (!isSemanal && caixa.diaVencimento > 0) dataVencimento.setDate(caixa.diaVencimento)
      const correcaoIPCA = parcela > 1 ? valorParcelaReal * TAXA_IPCA_MENSAL : 0
      const fundoReserva = parcela === 1 ? (valorParcelaReal / caixa.qtdParticipantes) : 0
      const comissaoAdmin = parcela === numParcelas ? caixa.valorTotal * 0.10 : 0
      const valorTotal = valorParcelaReal + TAXA_SERVICO + correcaoIPCA + fundoReserva + comissaoAdmin
      const cobrancaInfo = cobrancasPorMes[parcela]
      const lytexDetail = cobrancaInfo ? lytexPaymentDetails[cobrancaInfo.id] : null
      const statusLytex = String(lytexDetail?.status || '').toLowerCase()
      const isLytexPaid = ['paid', 'liquidated', 'settled', 'pago', 'inqueue', 'aprovado'].includes(statusLytex)
      const isPago = isLytexPaid
      const isAtrasado = caixa.status === 'ativo' && !isPago && dataVencimento < new Date()
      boletos.push({
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
    return boletos
  }

  const formatLinhaDigitavel = (linha: string): string => {
    const digits = (linha || '').replace(/\D/g, '')
    const groups = digits.match(/.{1,5}/g)
    return groups ? groups.join(' ') : (linha || '')
  }

  const handleCopyPixMes = async (mes: number) => {
    const c = cobrancasPorMes[mes]
    if (!c?.pix?.copiaCola) return
    await navigator.clipboard.writeText(c.pix.copiaCola)
    setCopiedPix(true)
    setTimeout(() => setCopiedPix(false), 2000)
  }

  const handlePrintPixMes = (mes: number) => {
    const c = cobrancasPorMes[mes]
    const emv = c?.pix?.copiaCola || ''
    if (!emv) return
    const w = window.open('', 'PRINT', 'height=650,width=600,top=100,left=100')
    if (!w) return
    w.document.write('<html><head><title>PIX</title></head><body style="font-family: system-ui;">')
    w.document.write(`<div style="padding:24px;">
      <h1 style="font-size:18px;margin:0 0 12px 0;color:#111;">Código PIX (EMV)</h1>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;">
        <div style="font-family: monospace;font-size:12px;color:#444;word-break:break-all;">${emv}</div>
      </div>
    </div>`)
    w.document.write('</body></html>')
    w.document.close()
    w.focus()
    w.print()
    w.close()
  }

  const handleCopyBoletoMes = async (mes: number) => {
    const c = cobrancasPorMes[mes]
    if (!c?.boleto?.linhaDigitavel) return
    await navigator.clipboard.writeText(c.boleto.linhaDigitavel)
    setCopiedBoleto(true)
    setTimeout(() => setCopiedBoleto(false), 2000)
  }

  const handlePrintBoletoMes = (mes: number) => {
    const c = cobrancasPorMes[mes]
    const url = c?.boleto?.url
    if (url) { window.open(url, '_blank'); return }
    const linha = c?.boleto?.linhaDigitavel || ''
    if (!linha) return
    const w = window.open('', 'PRINT', 'height=650,width=600,top=100,left=100')
    if (!w) return
    w.document.write('<html><head><title>Boleto</title></head><body style="font-family: system-ui;">')
    w.document.write(`<div style="padding:24px;">
      <h1 style="font-size:18px;margin:0 0 12px 0;color:#111;">Boleto</h1>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;">
        <div style="font-family: monospace;font-size:12px;color:#444;word-break:break-all;">${linha}</div>
      </div>
    </div>`)
    w.document.write('</body></html>')
    w.document.close()
    w.focus()
    w.print()
    w.close()
  }

  const handleGerarCobranca = async (boleto: any) => {
    if (!participante || !caixa) return
    try {
      const assoc = await cobrancasService.getAllByAssociacao({ caixaId: caixa._id, participanteId: participante._id })
      const candidatos = (assoc.cobrancas || []).filter((c: any) => Number(c.mesReferencia) === Number(boleto.mes))
      for (const c of candidatos) {
        if (!c.lytexId) continue
        const invoiceResp = await cobrancasService.buscar(c.lytexId, { caixaId: caixa._id, participanteId: participante._id, mes: boleto.mes })
        const inv = invoiceResp?.cobranca || {}
        const statusNorm = String(inv?.status || '').toLowerCase()
        const isPaid = ['paid', 'liquidated', 'settled', 'pago', 'inqueue'].includes(statusNorm)
        const pd = await cobrancasService.paymentDetail(c.lytexId)
        const detail = pd?.paymentDetail || pd?.detail || pd
        const tx = Array.isArray(inv?.transactions) ? inv.transactions[0] : undefined
        const expired = isPixExpired({ ...detail, ...inv, createdAt: tx?.createdAt })
        if (!isPaid && !expired) {
          const valorCents = inv?.totalValue
          const pixCreated = detail?.createdAt || detail?.created_at || tx?.createdAt
          const info: CobrancaInfo = {
            id: c.lytexId,
            valor: typeof valorCents === 'number' ? Math.round(valorCents) / 100 : boleto.valorTotal,
            descricao: c.descricao || '',
            paymentUrl: inv?.linkCheckout || inv?.paymentUrl,
            pixGeneratedAt: pixCreated,
            pix: inv?.pix || detail?.pix ? { qrCode: detail?.pix?.qrcode || inv?.pix?.qrcode || '', copiaCola: detail?.pix?.emv || inv?.pix?.copyPaste || '' } : undefined,
            boleto: inv?.boleto || detail?.boleto ? { codigoBarras: detail?.boleto?.barcode || inv?.boleto?.barcode || '', linhaDigitavel: detail?.boleto?.digitableLine || inv?.boleto?.digitableLine || '', url: inv?.linkBoleto } : undefined,
          }
          setLytexPaymentDetails((prev) => ({ ...prev, [c.lytexId]: { ...detail, ...inv } }))
          setCobrancasPorMes((prev) => ({ ...prev, [boleto.mes]: info }))
          setExpandedMes(boleto.mes)
          setPaymentTab('pix')
          logGroup('Pagamento: reutilizado ao gerar', { clienteId: participante._id, mes: boleto.mes, faturaId: c.lytexId })
          return
        }
      }
    } catch {}
    if (cobrancasPorMes[boleto.mes]) {
      setExpandedMes(boleto.mes)
      setPaymentTab('pix')
      try {
        const existing = cobrancasPorMes[boleto.mes]
        if (existing?.id) {
          const resp = await cobrancasService.buscar(existing.id, {
            caixaId: caixa._id,
            participanteId: participante._id,
            mes: boleto.mes,
          })
          const invoice = resp?.cobranca || {}
          const status = String(invoice.status || '').toLowerCase()
          const isPaid = ['paid', 'liquidated', 'settled', 'pago', 'inqueue'].includes(status)
          setLytexPaymentDetails((prev) => ({ ...prev, [existing.id]: { ...invoice, status: isPaid ? 'PAGO' : invoice.status } }))
          setCobrancasPorMes((prev) => ({
            ...prev,
            [boleto.mes]: mapCobrancaInfo(invoice, prev[boleto.mes]?.descricao || `Pagamento ${caixa.tipo === 'semanal' ? 'Semana' : 'Mês'} ${boleto.mes}`, prev[boleto.mes]?.valor || boleto.valorTotal)
          }))
          logGroup('Pagamento: reutilizando cobrança existente', {
            clienteId: participante._id,
            mes: boleto.mes,
            faturaId: existing.id,
            status: invoice?.status,
            valorCentavos: invoice?.totalValue
          })
        }
      } catch {}
      return
    }
    if (Object.values(lytexPaymentDetails).some((d: any) => d.mesReferencia === boleto.mes && (d.participanteId === participante._id || d.participante?.cpf === participante.usuarioId?.cpf))) {
      alert('Já existe uma cobrança para este mês. Aguarde o carregamento.')
      return
    }
    setGerandoCobranca(true)
    setBoletoSelecionado(boleto.mes)
    try {
      const payload = {
        participante: {
          nome: participante.usuarioId?.nome || 'Participante',
          cpf: participante.usuarioId?.cpf || '96050176876',
          email: participante.usuarioId?.email || 'sandbox@example.com',
          telefone: participante.usuarioId?.telefone || '71999999999',
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
        participanteId: participante.usuarioId?._id || (participante as any).usuarioId,
        mesReferencia: boleto.mes,
        dataVencimento: boleto.dataVencimento,
        habilitarPix: true,
        habilitarBoleto: true,
      }
      logGroup('Pagamento: gerar cobrança', {
        clienteId: participante._id,
        caixaId: caixa._id,
        mes: boleto.mes,
        valorParcela: boleto.valorParcela,
        valorTotal: boleto.valorTotal
      })
      const response = await cobrancasService.gerar(payload)
      if (response.success) {
        const d = response.cobranca
        const mapped: CobrancaInfo = {
          id: d?.id || d?._id || `${participante._id}-${boleto.mes}`,
          valor: typeof d?.valorCentavos === 'number' ? d.valorCentavos / 100 : (typeof d?.totalValue === 'number' ? d.totalValue / 100 : boleto.valorTotal),
          descricao: `Pagamento ${caixa.tipo === 'semanal' ? 'Semana' : 'Mês'} ${boleto.mes} - ${participante.usuarioId?.nome || 'Participante'}`,
          paymentUrl: d?.linkCheckout || d?.paymentUrl,
          pixGeneratedAt: undefined,
          pix: d?.pix ? { qrCode: d.pix.qrCode || '', copiaCola: d.pix.copyPaste || '' } : undefined,
          boleto: d?.boleto ? { codigoBarras: d.boleto.barCode || '', linhaDigitavel: d.boleto.digitableLine || '', url: d.boleto.url } : undefined,
        }
        let enriched = mapped
        const lytexId = d?._id || d?.id
        if (lytexId) {
          try {
            const buscarResp = await cobrancasService.buscar(lytexId)
            const inv = buscarResp?.cobranca || buscarResp?.invoice || buscarResp
            if (inv) {
              const tx = Array.isArray(inv.transactions) ? inv.transactions[0] : undefined
              const valorCents = tx?.value ?? inv?.totalValue
              const pixCreated = tx?.createdAt || tx?.created_at || inv?.createdAt || inv?.created_at
              enriched = {
                id: inv?._id || lytexId,
                valor: typeof valorCents === 'number' ? Math.round(valorCents) / 100 : mapped.valor,
                descricao: mapped.descricao,
                paymentUrl: inv?.linkCheckout || mapped.paymentUrl,
                pixGeneratedAt: pixCreated,
                pix: (tx?.pix || inv?.paymentMethods?.pix || inv?.pix) ? {
                  qrCode: tx?.pix?.qrcode || inv?.paymentMethods?.pix?.qrcode || mapped.pix?.qrCode || '',
                  copiaCola: tx?.pix?.emv || tx?.pix?.qrcode || inv?.paymentMethods?.pix?.emv || inv?.pix?.copyPaste || mapped.pix?.copiaCola || '',
                } : mapped.pix,
                boleto: tx?.boleto || inv?.boleto || inv?.paymentMethods?.boleto ? {
                  codigoBarras: tx?.boleto?.barcode || inv?.paymentMethods?.boleto?.barcode || mapped.boleto?.codigoBarras || '',
                  linhaDigitavel: tx?.boleto?.digitableLine || inv?.paymentMethods?.boleto?.digitableLine || mapped.boleto?.linhaDigitavel || '',
                  url: inv?.linkBoleto || mapped.boleto?.url,
                } : mapped.boleto,
              }
              logGroup('Pagamento: cobrança criada', {
                clienteId: participante._id,
                mes: boleto.mes,
                faturaId: enriched.id,
                valor: enriched.valor,
                status: inv?.status
              })
            }
          } catch {}
        }
        setCobrancasPorMes((prev) => ({ ...prev, [boleto.mes]: enriched }))
        setExpandedMes(boleto.mes)
        setPaymentTab('pix')
        onRefreshPagamentos?.()
        try {
          const interval = setInterval(async () => {
            try {
              const lista = await pagamentosService.getByCaixaMes(caixa._id, Math.max(1, caixa.mesAtual))
              void lista
            } catch {}
          }, 4000)
          setTimeout(() => clearInterval(interval), 20000)
        } catch {}
      } else {
        alert(response.message || 'Erro ao gerar cobrança')
      }
    } catch (error: any) {
      if (String(error?.response?.status) === '401') {
        try { console.error({ message: 'Credenciais inválidas', error: 'Unauthorized', statusCode: 401 }) } catch {}
      }
      const msg = error?.response?.status === 401 ? 'Credenciais inválidas para a API de pagamentos' : 'Erro ao gerar cobrança. Tente novamente.'
      alert(msg)
    } finally {
      setGerandoCobranca(false)
      setBoletoSelecionado(null)
    }
  }

  const ensureCobrancaFor = async (boleto: any) => {
    if (!participante || !caixa) return
    const cached = cobrancasPorMes[boleto.mes]
    if (cached && lytexPaymentDetails[cached.id] && !isPixExpired(lytexPaymentDetails[cached.id])) {
      setExpandedMes(boleto.mes)
      setPaymentTab('pix')
      logGroup('Pagamento: usando cache válido', { clienteId: participante._id, mes: boleto.mes, faturaId: cached.id })
      return
    }
    try {
      const response = await cobrancasService.getAllByAssociacao({ caixaId: caixa._id, participanteId: participante._id })
      const candidatos = (response.cobrancas || []).filter((c: any) => Number(c.mesReferencia) === Number(boleto.mes))
      for (const c of candidatos) {
        if (!c.lytexId) continue
        const invoiceResp = await cobrancasService.buscar(c.lytexId, { caixaId: caixa._id, participanteId: participante._id, mes: boleto.mes })
        const inv = invoiceResp?.cobranca || {}
        const statusNorm = String(inv?.status || '').toLowerCase()
        const isPaid = ['paid', 'liquidated', 'settled', 'pago', 'inqueue'].includes(statusNorm)
        const pd = await cobrancasService.paymentDetail(c.lytexId)
        const detail = pd?.paymentDetail || pd?.detail || pd
        const tx = Array.isArray(inv?.transactions) ? inv.transactions[0] : undefined
        const expired = isPixExpired({ ...detail, ...inv, createdAt: tx?.createdAt })
        logGroup('Pagamento: candidato existente', { faturaId: c.lytexId, status: inv?.status, expired })
        if (isPaid && participante?._id) {
          try { onPaidUpdate?.(boleto.mes, participante._id) } catch {}
        }
        if (!isPaid && !expired) {
          const valorCents = inv?.totalValue
          const pixCreated = detail?.createdAt || detail?.created_at || inv?.createdAt || inv?.created_at
          const info: CobrancaInfo = {
            id: c.lytexId,
            valor: typeof valorCents === 'number' ? Math.round(valorCents) / 100 : boleto.valorTotal,
            descricao: c.descricao || '',
            paymentUrl: inv?.linkCheckout || inv?.paymentUrl,
            pixGeneratedAt: pixCreated,
            pix: inv?.pix || detail?.pix ? { qrCode: detail?.pix?.qrcode || inv?.pix?.qrcode || '', copiaCola: detail?.pix?.emv || inv?.pix?.copyPaste || '' } : undefined,
            boleto: inv?.boleto || detail?.boleto ? { codigoBarras: detail?.boleto?.barcode || inv?.boleto?.barcode || '', linhaDigitavel: detail?.boleto?.digitableLine || inv?.boleto?.digitableLine || '', url: inv?.linkBoleto } : undefined,
          }
          setLytexPaymentDetails((prev) => ({ ...prev, [c.lytexId]: { ...detail, ...inv } }))
          setCobrancasPorMes((prev) => ({ ...prev, [boleto.mes]: info }))
          setExpandedMes(boleto.mes)
          setPaymentTab('pix')
          onRefreshPagamentos?.()
          return
        }
      }
    } catch {}
    await handleGerarCobranca(boleto)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalhes de Pagamentos dos Participantes"
      size="full"
    >
      {participante && (
        <div>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-4">
            <Avatar name={participante.usuarioId.nome} src={participante.usuarioId.fotoUrl} size="lg" />
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
                participante.usuarioId.score >= 80 ? 'text-green-600' : participante.usuarioId.score >= 60 ? 'text-amber-600' : 'text-red-600'
              )}>{participante.usuarioId.score}</p>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 font-medium">Data de Recebimento</p>
                <p className="font-bold text-amber-800">{calcularDataRecebimento(participante.posicao || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-amber-700 font-medium">Posição</p>
                <p className="font-bold text-amber-800">{participante.posicao}º</p>
              </div>
            </div>
          </div>

          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Boletos / Pagamentos
            <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={() => { setRefreshTick((t) => t + 1); onRefreshPagamentos?.() }} className="ml-auto">Atualizar</Button>
          </h4>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {calcularBoletos(participante).map((boleto) => {
              const cobranca = cobrancasPorMes[boleto.mes]
              const lytexDetail = cobranca ? lytexPaymentDetails[cobranca.id] : null
              const statusNormalized = String(lytexDetail?.status || '').toLowerCase()
              const isLytexPaid = ['paid', 'liquidated', 'settled', 'pago', 'inqueue'].includes(statusNormalized)
              const finalStatus = isLytexPaid ? 'pago' : boleto.status
              const isPago = finalStatus === 'pago'
              return (
                <div key={boleto.mes} className={cn('p-3 rounded-xl border', isPago ? 'bg-green-50 border-green-200' : finalStatus === 'atrasado' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200')}>
                  <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={async () => {
                    if (!isPago && caixa?.status === 'ativo') {
                      const open = expandedMes === boleto.mes ? null : boleto.mes
                      setExpandedMes(open)
                      if (open) await ensureCobrancaFor(boleto)
                    }
                  }}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{caixa?.tipo === 'semanal' ? 'Semana' : 'Mês'} {boleto.mes}</span>
                      <Badge variant={isPago ? 'success' : finalStatus === 'atrasado' ? 'danger' : 'warning'} className={isPago ? 'bg-green-100 text-green-800' : ''} size="sm">
                        {isPago ? 'PAGO' : finalStatus === 'atrasado' ? 'Atrasado' : 'Aguardando Pagamento'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{formatCurrency(boleto.valorTotal)}</span>
                      {!isPago && caixa?.status === 'ativo' && (
                        <button onClick={(e) => { e.stopPropagation(); setExpandedMes(expandedMes === boleto.mes ? null : boleto.mes) }} className="p-1 rounded-lg hover:bg-gray-100">
                          <ChevronRight className={cn('w-4 h-4 text-gray-500 transition-transform', expandedMes === boleto.mes && 'rotate-90')} />
                        </button>
                      )}
                    </div>
                  </div>
                  {cobranca?.id && (
                    <div className="text-xs text-gray-500 font-mono mb-1">ID: {cobranca.id}</div>
                  )}
                  <div className="text-xs text-gray-600">Vencimento: {formatDate(boleto.dataVencimento)}</div>

                  {!isPago && caixa?.status === 'ativo' && expandedMes === boleto.mes && (
                    <div className="mt-3">
                      <div className="text-sm text-gray-700 space-y-1 mb-3">
                        <div className="flex justify-between"><span>Valor da parcela</span><span className="font-medium">{formatCurrency(boleto.valorParcela)}</span></div>
                        {boleto.fundoReserva > 0 && (<div className="flex justify-between"><span>Fundo de reserva</span><span className="font-medium">{formatCurrency(boleto.fundoReserva)}</span></div>)}
                        <div className="flex justify-between"><span>Taxa de serviço</span><span className="font-medium">{formatCurrency(TAXA_SERVICO)}</span></div>
                        {boleto.correcaoIPCA > 0 && (<div className="flex justify-between"><span>IPCA</span><span className="font-medium">{formatCurrency(boleto.correcaoIPCA)}</span></div>)}
                        {boleto.comissaoAdmin > 0 && (<div className="flex justify-between"><span>Comissão do administrador (10%)</span><span className="font-medium">{formatCurrency(boleto.comissaoAdmin)}</span></div>)}
                      </div>
                      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-3">
                        <button onClick={() => setPaymentTab('pix')} className={cn('flex-1 px-3 py-2 rounded-lg text-sm font-medium', paymentTab === 'pix' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-600 hover:text-gray-800')}>PIX</button>
                        <button onClick={() => setPaymentTab('boleto')} className={cn('flex-1 px-3 py-2 rounded-lg text-sm font-medium', paymentTab === 'boleto' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800')}>Boleto</button>
                      </div>

                      {!cobrancasPorMes[boleto.mes] ? (
                        <Button variant="primary" size="sm" className="w-full" onClick={() => handleGerarCobranca(boleto)} disabled={gerandoCobranca} leftIcon={gerandoCobranca && boletoSelecionado === boleto.mes ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" /> }>
                          {gerandoCobranca && boletoSelecionado === boleto.mes ? 'Gerando...' : 'Gerar cobrança'}
                        </Button>
                      ) : paymentTab === 'pix' ? (
                        <div className="space-y-3">
                          {cobrancasPorMes[boleto.mes].pixGeneratedAt && (
                            <div className="text-xs text-gray-500 text-center">PIX gerado há {minutesSince(cobrancasPorMes[boleto.mes].pixGeneratedAt)} min</div>
                          )}
                          <div className="flex justify-center">
                            {cobrancasPorMes[boleto.mes].pix?.copiaCola ? (
                              <div className="bg-white p-3 rounded-lg border border-gray-200">
                                <QRCode value={cobrancasPorMes[boleto.mes].pix!.copiaCola} size={176} />
                              </div>
                            ) : (
                              <div className="w-44 h-44 bg-gray-100 rounded-lg flex items-center justify-center">
                                <QrCode className="w-20 h-20 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Código PIX</label>
                            <div className="flex gap-2">
                              <input type="text" readOnly value={cobrancasPorMes[boleto.mes].pix?.copiaCola || ''} className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-600 truncate" />
                              <Button variant={copiedPix ? 'primary' : 'secondary'} size="sm" onClick={() => handleCopyPixMes(boleto.mes)} leftIcon={copiedPix ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />} className={copiedPix ? 'bg-green-500 hover:bg-green-600' : ''}>
                                {copiedPix ? 'Copiado!' : 'Copiar'}
                              </Button>
                              <Button variant="secondary" size="sm" onClick={() => handlePrintPixMes(boleto.mes)} leftIcon={<Printer className="w-4 h-4" />}>Imprimir</Button>
                              {cobrancasPorMes[boleto.mes].paymentUrl && (
                                <Button variant="secondary" size="sm" onClick={() => window.open(cobrancasPorMes[boleto.mes].paymentUrl!, '_blank')} leftIcon={<ExternalLink className="w-4 h-4" />}>Abrir Checkout</Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Linha Digitável</label>
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              <p className="text-sm font-mono text-gray-600 break-all">{formatLinhaDigitavel(cobrancasPorMes[boleto.mes].boleto?.linhaDigitavel || '')}</p>
                            </div>
                          </div>
                          {cobrancasPorMes[boleto.mes].boleto?.codigoBarras && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">Código de Barras</label>
                              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                <p className="text-sm font-mono text-gray-600 break-all">{cobrancasPorMes[boleto.mes].boleto?.codigoBarras}</p>
                              </div>
                              <div className="flex justify-center mt-2">
                                <Barcode value={cobrancasPorMes[boleto.mes].boleto?.codigoBarras || ''} format="CODE128" width={2} height={50} />
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button variant={copiedBoleto ? 'primary' : 'secondary'} size="sm" onClick={() => handleCopyBoletoMes(boleto.mes)} leftIcon={copiedBoleto ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />} className={copiedBoleto ? 'bg-green-500 hover:bg-green-600' : ''}>
                              {copiedBoleto ? 'Copiado!' : 'Copiar linha'}
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => handlePrintBoletoMes(boleto.mes)} leftIcon={<Printer className="w-4 h-4" />}>Imprimir</Button>
                            {cobrancasPorMes[boleto.mes].boleto?.url && (
                              <Button variant="primary" size="sm" onClick={() => window.open(cobrancasPorMes[boleto.mes].boleto!.url, '_blank')} leftIcon={<ExternalLink className="w-4 h-4" />}>Ver boleto</Button>
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
          {/* Histórico de Pagamentos */}
          {Object.keys(cobrancasPorMes).length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Histórico de Pagamentos</h3>
                <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={() => setRefreshTick((t) => t + 1)}>Atualizar</Button>
              </div>
              <div className="space-y-3">
                {calcularBoletos(participante!).map((b) => {
                  const c = cobrancasPorMes[b.mes]
                  if (!c) return null
                  const d = c.id ? lytexPaymentDetails[c.id] : null
                  const statusNorm = String(d?.status || '').toLowerCase()
                  const isPaid = ['paid','liquidated','settled','pago'].includes(statusNorm)
                  const payedAt = d?.payedAt || d?.paidAt || d?.paid_at
                  const paymentMethod = d?.paymentMethod || d?.method
                  const creditAt = d?.creditAt || d?.credit_at
                  const payedValueCents = d?.payedValue || d?.paidValue || d?.invoiceValue
                  const ratesCents = d?.rates || 0
                  const creditoValor = typeof payedValueCents === 'number' ? Math.max(0, (payedValueCents - ratesCents)) / 100 : undefined

                  return (
                    <div key={b.mes} className={cn('p-3 rounded-xl border', isPaid ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200')}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{caixa?.tipo === 'semanal' ? 'Mês' : 'Mês'} {b.mes}</span>
                          {isPaid && (<Badge variant="success" size="sm">✓ PAGO</Badge>)}
                          {paymentMethod && (<Badge variant="info" size="sm" className="bg-blue-100 text-blue-700">{String(paymentMethod).toUpperCase()}</Badge>)}
                        </div>
                        <span className="font-bold text-gray-900">{formatCurrency(b.valorTotal)}</span>
                      </div>
                      {c?.id && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-2">
                          <div className="text-gray-700">Invoice ID: <span className="font-mono text-gray-600">{c.id}</span></div>
                          {payedAt && (<div className="text-green-700">Pago em: <span className="font-medium">{formatDate(new Date(payedAt).toISOString())}</span></div>)}
                          {creditAt && (
                            <div className="text-amber-700">Crédito previsto: <span className="font-medium">{formatDate(new Date(creditAt).toISOString())}</span>{typeof creditoValor === 'number' && (<span className="font-bold ml-2 text-amber-700">{formatCurrency(creditoValor)}</span>)}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-gray-600 mb-2">Vencimento: {formatDate(b.dataVencimento)}</div>
                      <div className="mt-2">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2"><span className="text-blue-600">i</span> Composição do Valor</h4>
                        <div className="text-sm text-gray-700 space-y-1">
                          <div className="flex justify-between"><span>Valor da parcela</span><span className="font-medium">{formatCurrency(b.valorParcela)}</span></div>
                          {b.fundoReserva > 0 && (<div className="flex justify-between"><span>Fundo de reserva</span><span className="font-medium">{formatCurrency(b.fundoReserva)}</span></div>)}
                          <div className="flex justify-between"><span>Taxa de serviço</span><span className="font-medium">{formatCurrency(TAXA_SERVICO)}</span></div>
                          {b.correcaoIPCA > 0 && (<div className="flex justify-between"><span>IPCA</span><span className="font-medium">{formatCurrency(b.correcaoIPCA)}</span></div>)}
                          {b.comissaoAdmin > 0 && (<div className="flex justify-between"><span>Comissão do administrador (10%)</span><span className="font-medium">{formatCurrency(b.comissaoAdmin)}</span></div>)}
                          <div className="flex justify-between pt-1 border-t mt-2"><span className="font-semibold">TOTAL</span><span className="font-bold text-green-700">{formatCurrency(b.valorTotal)}</span></div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          </div>
        )}
      </Modal>
  )
}
