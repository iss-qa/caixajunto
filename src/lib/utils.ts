import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateRelative(date: string | Date): string {
  const now = new Date();
  const target = new Date(date);
  const diff = target.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Hoje';
  if (days === 1) return 'Amanhã';
  if (days === -1) return 'Ontem';
  if (days > 0 && days <= 7) return `${days} dias`;
  if (days < 0 && days >= -7) return `${Math.abs(days)} dias atrás`;
  
  return formatDate(date);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    rascunho: 'badge-gray',
    aguardando: 'badge-warning',
    ativo: 'badge-success',
    finalizado: 'badge-info',
    cancelado: 'badge-danger',
    pendente: 'badge-warning',
    enviado: 'badge-info',
    aprovado: 'badge-success',
    rejeitado: 'badge-danger',
    convidado: 'badge-gray',
    inadimplente: 'badge-danger',
    bloqueado: 'badge-danger',
  };
  return colors[status] || 'badge-gray';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    rascunho: 'Rascunho',
    aguardando: 'Aguardando',
    ativo: 'Ativo',
    finalizado: 'Finalizado',
    cancelado: 'Cancelado',
    pendente: 'Pendente',
    enviado: 'Enviado',
    aprovado: 'Aprovado',
    rejeitado: 'Rejeitado',
    convidado: 'Convidado',
    inadimplente: 'Inadimplente',
    bloqueado: 'Bloqueado',
  };
  return labels[status] || status;
}

export function calculateProgress(current: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((current / total) * 100);
}

export function calculateCurrentPeriod(
  tipo: 'mensal' | 'semanal' | undefined,
  dataInicio: string | Date | undefined,
  duracaoMeses: number,
  mesAtual: number
): number {
  const base = Math.max(1, mesAtual || 1);
  const totalPeriodos = Math.max(1, duracaoMeses || 1);

  if (!dataInicio) return Math.min(base, totalPeriodos);

  const inicio = new Date(dataInicio);
  if (Number.isNaN(inicio.getTime())) return Math.min(base, totalPeriodos);

  const agora = new Date();
  if (agora <= inicio) return Math.min(base, totalPeriodos);

  let diff = 0;

  if (tipo === 'semanal') {
    const msDiff = agora.getTime() - inicio.getTime();
    diff = Math.floor(msDiff / (1000 * 60 * 60 * 24 * 7));
  } else {
    const anos = agora.getFullYear() - inicio.getFullYear();
    const meses = agora.getMonth() - inicio.getMonth();
    diff = anos * 12 + meses;

    if (agora.getDate() < inicio.getDate()) {
      diff -= 1;
    }
  }

  const calculado = 1 + Math.max(0, diff);
  const combinado = Math.max(base, calculado);

  return Math.min(totalPeriodos, combinado);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
