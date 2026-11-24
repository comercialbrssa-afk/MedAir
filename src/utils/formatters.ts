import type {
  CargoState,
  CargoType,
  CommunicationStatus,
  DroneState,
  LegState,
  LegType,
  MissionState,
  OccurrenceSeverity,
  OccurrenceStatus,
  PriorityLevel,
  RequestStatus,
  UserRole,
  WeatherCondition,
} from '../types/domain';

export function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mi}`;
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

export function formatDecimal(val: number, decimals = 1): string {
  if (!Number.isFinite(val)) return '0,0';
  return val.toFixed(decimals).replace('.', ',');
}

export function formatTemp(val?: number): string {
  if (val === undefined || val === null || !Number.isFinite(val)) return 'N/A';
  return `${formatDecimal(val, 1)} °C`;
}

export function formatKm(val: number): string {
  return `${formatDecimal(val, 1)} km`;
}

export function formatPercent(val: number, decimals = 1): string {
  return `${formatDecimal(val, decimals)}%`;
}

export function formatKg(val: number): string {
  return `${formatDecimal(val, 2)} kg`;
}

export function formatLiters(val: number): string {
  return `${formatDecimal(val, 1)} L`;
}

export function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  CENTRAL_OPERACIONAL: 'Central Operacional',
  PILOTO: 'Responsável Operacional / Piloto',
  HOSPITAL_ORIGEM: 'Hospital de Origem',
  HOSPITAL_DESTINO: 'Hospital de Destino',
  LABORATORIO: 'Laboratório',
  MANUTENCAO: 'Manutenção',
  AUDITOR: 'Auditor (Somente Leitura)',
};

export const CARGO_TYPE_LABELS: Record<CargoType, string> = {
  ORGAO_TRANSPLANTE: 'Órgão para Transplante',
  AMOSTRA_LABORATORIAL: 'Amostras Laboratoriais',
  MEDICAMENTO: 'Medicamentos',
  INSUMO_HOSPITALAR: 'Insumos Hospitalares',
  LOGISTICA_REVERSA: 'Material de Logística Reversa',
};

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  CRITICA: 'Crítica',
  ALTA: 'Alta',
  NORMAL: 'Normal',
  PROGRAMADA: 'Programada',
};

export const MISSION_STATE_LABELS: Record<MissionState, string> = {
  SOLICITADA: 'Solicitada',
  EM_TRIAGEM: 'Em triagem',
  AGUARDANDO_COMPLEMENTACAO: 'Aguardando complementação',
  EM_PLANEJAMENTO: 'Em planejamento',
  AGUARDANDO_APROVACAO: 'Aguardando aprovação',
  APROVADA: 'Aprovada',
  CARGA_EM_PREPARACAO: 'Carga em preparação',
  CARGA_VALIDADA: 'Carga validada',
  DESPACHADA: 'Despachada',
  EM_TRANSPORTE: 'Em transporte',
  CHEGOU_AO_DESTINO: 'Chegou ao destino',
  EM_CONFERENCIA: 'Em conferência',
  ENTREGA_CONFIRMADA: 'Entrega confirmada',
  ENTREGA_COM_RESSALVA: 'Entrega com ressalva',
  RECEBIMENTO_RECUSADO: 'Recebimento recusado',
  ANALISANDO_RETORNO: 'Analisando retorno',
  RETORNO_PENDENTE: 'Retorno pendente',
  RETORNO_APROVADO: 'Retorno aprovado',
  RETORNO_SEM_CARGA: 'Retorno sem carga',
  RETORNO_EM_ANDAMENTO: 'Retorno em andamento',
  EM_POS_OPERACAO: 'Em pós-operação',
  ENCERRADA: 'Encerrada',
  CANCELADA: 'Cancelada',
  RECUSADA: 'Recusada',
  EM_CONTINGENCIA: 'Em contingência',
};

export const LEG_STATE_LABELS: Record<LegState, string> = {
  PLANEJADO: 'Planejado',
  EM_PREPARACAO: 'Em preparação',
  PRONTO: 'Pronto',
  EM_VOO: 'Em voo simulado',
  CHEGOU_AO_DESTINO: 'Chegou ao destino',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
  EM_CONTINGENCIA: 'Em contingência',
};

export const LEG_TYPE_LABELS: Record<LegType, string> = {
  IDA: 'Trecho de Ida',
  RETORNO_COM_CARGA: 'Retorno com Carga',
  RETORNO_VAZIO: 'Retorno Vazio',
};

export const CARGO_STATE_LABELS: Record<CargoState, string> = {
  SOLICITADA: 'Solicitada',
  EM_PREPARACAO: 'Em preparação',
  VALIDADA_LACRADA: 'Validada e lacrada',
  EM_TRANSPORTE: 'Em transporte',
  AGUARDANDO_CONFERENCIA: 'Aguardando conferência',
  ENTREGUE: 'Entregue',
  ENTREGUE_COM_RESSALVA: 'Entregue com ressalva',
  RECUSADA: 'Recusada',
  RETORNADA: 'Retornada',
  CANCELADA: 'Cancelada',
};

export const DRONE_STATE_LABELS: Record<DroneState, string> = {
  DISPONIVEL: 'Disponível',
  EM_MISSAO: 'Em missão',
  EM_INSPECAO: 'Em inspeção',
  EM_HIGIENIZACAO: 'Em higienização',
  EM_MANUTENCAO: 'Em manutenção',
  BLOQUEADO: 'Bloqueado',
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  PENDENTE_TRIAGEM: 'Pendente de triagem',
  AGUARDANDO_COMPLEMENTACAO: 'Aguardando complementação',
  APROVADA_MISSAO: 'Convertida em missão',
  DISPONIVEL_RETORNO: 'Disponível para retorno',
  VINCULADA_RETORNO: 'Vinculada a retorno',
  RECUSADA: 'Recusada',
  CANCELADA: 'Cancelada',
  CONCLUIDA: 'Concluída',
};

export const OCCURRENCE_SEVERITY_LABELS: Record<OccurrenceSeverity, string> = {
  INFORMATIVA: 'Informativa',
  ATENCAO: 'Atenção',
  CRITICA: 'Crítica',
};

export const OCCURRENCE_STATUS_LABELS: Record<OccurrenceStatus, string> = {
  ABERTA: 'Aberta',
  EM_AVALIACAO: 'Em avaliação',
  EM_TRATAMENTO: 'Em tratamento',
  ENCERRADA: 'Encerrada',
};

export const COMM_STATUS_LABELS: Record<CommunicationStatus, string> = {
  ESTAVEL: 'Estável',
  INSTAVEL: 'Instável',
  PERDA_SINAL: 'Perda de sinal',
};

export const WEATHER_LABELS: Record<WeatherCondition, string> = {
  BOM: 'Céu claro / Favorável',
  VENTO_MODERADO: 'Vento moderado',
  CHUVA_LEVE: 'Chuva leve',
  ADVERSO: 'Condição adversa',
};

export type SemanticTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export function getMissionTone(state: MissionState): SemanticTone {
  switch (state) {
    case 'ENCERRADA':
    case 'ENTREGA_CONFIRMADA':
    case 'APROVADA':
    case 'CARGA_VALIDADA':
    case 'RETORNO_APROVADO':
      return 'success';
    case 'EM_CONTINGENCIA':
    case 'RECEBIMENTO_RECUSADO':
    case 'RECUSADA':
    case 'CANCELADA':
      return 'danger';
    case 'AGUARDANDO_COMPLEMENTACAO':
    case 'AGUARDANDO_APROVACAO':
    case 'ENTREGA_COM_RESSALVA':
    case 'CHEGOU_AO_DESTINO':
    case 'EM_CONFERENCIA':
    case 'RETORNO_PENDENTE':
    case 'EM_POS_OPERACAO':
      return 'warning';
    case 'EM_TRANSPORTE':
    case 'RETORNO_EM_ANDAMENTO':
    case 'DESPACHADA':
    case 'ANALISANDO_RETORNO':
    case 'RETORNO_SEM_CARGA':
    case 'EM_PLANEJAMENTO':
    case 'CARGA_EM_PREPARACAO':
      return 'info';
    default:
      return 'neutral';
  }
}

export function getDroneTone(state: DroneState): SemanticTone {
  switch (state) {
    case 'DISPONIVEL':
      return 'success';
    case 'EM_MISSAO':
      return 'info';
    case 'EM_INSPECAO':
    case 'EM_HIGIENIZACAO':
    case 'EM_MANUTENCAO':
      return 'warning';
    case 'BLOQUEADO':
      return 'danger';
  }
}

export function getPriorityTone(priority: PriorityLevel): SemanticTone {
  switch (priority) {
    case 'CRITICA':
      return 'danger';
    case 'ALTA':
      return 'warning';
    case 'NORMAL':
      return 'info';
    case 'PROGRAMADA':
      return 'neutral';
  }
}

export function getOccurrenceTone(severity: OccurrenceSeverity): SemanticTone {
  switch (severity) {
    case 'CRITICA':
      return 'danger';
    case 'ATENCAO':
      return 'warning';
    case 'INFORMATIVA':
      return 'info';
  }
}
