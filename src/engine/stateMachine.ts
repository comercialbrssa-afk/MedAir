import type {
  AppState,
  Checklist,
  Drone,
  Instituicao,
  Missao,
  MissionState,
  UserRole,
} from '../types/domain';

export const TERMINAL_MISSION_STATES: MissionState[] = [
  'ENCERRADA',
  'CANCELADA',
  'RECUSADA',
];

export const ALLOWED_MISSION_TRANSITIONS: Record<MissionState, MissionState[]> = {
  SOLICITADA: ['EM_TRIAGEM', 'CANCELADA'],
  EM_TRIAGEM: [
    'EM_PLANEJAMENTO',
    'AGUARDANDO_COMPLEMENTACAO',
    'RECUSADA',
    'CANCELADA',
  ],
  AGUARDANDO_COMPLEMENTACAO: ['EM_TRIAGEM', 'CANCELADA', 'RECUSADA'],
  EM_PLANEJAMENTO: ['AGUARDANDO_APROVACAO', 'CANCELADA'],
  AGUARDANDO_APROVACAO: ['APROVADA', 'EM_PLANEJAMENTO', 'RECUSADA', 'CANCELADA'],
  APROVADA: ['CARGA_EM_PREPARACAO', 'CANCELADA'],
  CARGA_EM_PREPARACAO: ['CARGA_VALIDADA', 'CANCELADA'],
  CARGA_VALIDADA: ['DESPACHADA', 'CARGA_EM_PREPARACAO', 'CANCELADA'],
  DESPACHADA: ['EM_TRANSPORTE', 'EM_CONTINGENCIA', 'CANCELADA'],
  EM_TRANSPORTE: ['CHEGOU_AO_DESTINO', 'EM_CONTINGENCIA'],
  CHEGOU_AO_DESTINO: ['EM_CONFERENCIA', 'EM_CONTINGENCIA'],
  EM_CONFERENCIA: [
    'ENTREGA_CONFIRMADA',
    'ENTREGA_COM_RESSALVA',
    'RECEBIMENTO_RECUSADO',
    'EM_CONTINGENCIA',
  ],
  ENTREGA_CONFIRMADA: ['ANALISANDO_RETORNO'],
  ENTREGA_COM_RESSALVA: ['ANALISANDO_RETORNO'],
  RECEBIMENTO_RECUSADO: ['ANALISANDO_RETORNO', 'RETORNO_SEM_CARGA'],
  ANALISANDO_RETORNO: [
    'RETORNO_PENDENTE',
    'RETORNO_APROVADO',
    'RETORNO_SEM_CARGA',
  ],
  RETORNO_PENDENTE: ['RETORNO_APROVADO', 'RETORNO_SEM_CARGA'],
  RETORNO_APROVADO: ['RETORNO_EM_ANDAMENTO', 'RETORNO_SEM_CARGA'],
  RETORNO_SEM_CARGA: ['RETORNO_EM_ANDAMENTO'],
  RETORNO_EM_ANDAMENTO: ['EM_POS_OPERACAO', 'EM_CONTINGENCIA'],
  EM_POS_OPERACAO: ['ENCERRADA'],
  ENCERRADA: [],
  CANCELADA: [],
  RECUSADA: [],
  EM_CONTINGENCIA: [
    'EM_TRANSPORTE',
    'CHEGOU_AO_DESTINO',
    'RETORNO_SEM_CARGA',
    'RETORNO_EM_ANDAMENTO',
    'EM_POS_OPERACAO',
    'CANCELADA',
  ],
};

export function canTransitionMission(
  current: MissionState,
  next: MissionState
): boolean {
  return ALLOWED_MISSION_TRANSITIONS[current]?.includes(next) ?? false;
}

export function isRoleReadOnly(role: UserRole): boolean {
  return role === 'AUDITOR';
}

export function canRolePerform(
  role: UserRole,
  action:
    | 'CREATE_REQUEST'
    | 'TRIAGE'
    | 'PLAN'
    | 'APPROVE_DISPATCH'
    | 'COLLECT_PREP'
    | 'MONITOR_FLIGHT'
    | 'MANAGE_OCCURRENCE'
    | 'RECEIVE_CARGO'
    | 'REVERSE_LOGISTICS'
    | 'FLEET_MAINTENANCE'
    | 'CLOSE_MISSION'
    | 'EDIT_RULES'
    | 'SIMULATE'
): { allowed: boolean; reason?: string } {
  if (role === 'AUDITOR') {
    return {
      allowed: false,
      reason: 'Perfil Auditor opera em modo somente leitura.',
    };
  }
  if (role === 'ADMIN') {
    return { allowed: true };
  }

  switch (action) {
    case 'CREATE_REQUEST':
      return ['HOSPITAL_ORIGEM', 'HOSPITAL_DESTINO', 'LABORATORIO', 'CENTRAL_OPERACIONAL'].includes(role)
        ? { allowed: true }
        : { allowed: false, reason: 'Apenas instituições de saúde, laboratórios ou central podem abrir solicitações.' };
    case 'TRIAGE':
    case 'PLAN':
    case 'APPROVE_DISPATCH':
    case 'REVERSE_LOGISTICS':
    case 'CLOSE_MISSION':
    case 'EDIT_RULES':
      return role === 'CENTRAL_OPERACIONAL'
        ? { allowed: true }
        : { allowed: false, reason: 'Ação restrita à Central Operacional ou Administrador.' };
    case 'COLLECT_PREP':
      return ['CENTRAL_OPERACIONAL', 'PILOTO', 'HOSPITAL_ORIGEM', 'LABORATORIO'].includes(role)
        ? { allowed: true }
        : { allowed: false, reason: 'Ação permitida ao Piloto, Central Operacional ou Instituição de Origem.' };
    case 'MONITOR_FLIGHT':
      return ['CENTRAL_OPERACIONAL', 'PILOTO'].includes(role)
        ? { allowed: true }
        : { allowed: false, reason: 'Apenas Central Operacional ou Piloto podem operar o voo simulado.' };
    case 'MANAGE_OCCURRENCE':
      return ['CENTRAL_OPERACIONAL', 'PILOTO', 'MANUTENCAO'].includes(role)
        ? { allowed: true }
        : { allowed: false, reason: 'Tratamento de ocorrências restrito à Central, Piloto ou Manutenção.' };
    case 'RECEIVE_CARGO':
      return ['HOSPITAL_DESTINO', 'LABORATORIO', 'HOSPITAL_ORIGEM', 'CENTRAL_OPERACIONAL'].includes(role)
        ? { allowed: true }
        : { allowed: false, reason: 'Conferência e recebimento restritos à instituição destinatária ou Central.' };
    case 'FLEET_MAINTENANCE':
      return ['MANUTENCAO', 'CENTRAL_OPERACIONAL', 'PILOTO'].includes(role)
        ? { allowed: true }
        : { allowed: false, reason: 'Inspeção, higienização e manutenção restritas à equipe de Manutenção ou Central.' };
    case 'SIMULATE':
      return ['CENTRAL_OPERACIONAL', 'PILOTO'].includes(role)
        ? { allowed: true }
        : { allowed: false, reason: 'Controles do Simulador disponíveis para Administrador, Central ou Piloto.' };
  }
}

export function isDroneAssignable(drone: Drone): { ok: boolean; reason?: string } {
  if (drone.estado !== 'DISPONIVEL') {
    return {
      ok: false,
      reason: `Drone ${drone.codigo} está em estado "${drone.estado}" e não pode ser atribuído.`,
    };
  }
  if (!drone.higienizacaoLiberada) {
    return {
      ok: false,
      reason: `Compartimento do drone ${drone.codigo} aguarda higienização liberada.`,
    };
  }
  return { ok: true };
}

export function validateDispatchPreconditions(
  state: AppState,
  mission: Missao
): { ok: boolean; blockers: string[] } {
  const blockers: string[] = [];

  if (!mission.aprovadaPorId || !mission.aprovadaEm) {
    blockers.push('Aprovação humana da missão ainda não foi registrada.');
  }

  if (mission.estado !== 'CARGA_VALIDADA') {
    blockers.push(
      `A missão precisa estar em "Carga validada" antes do despacho (estado atual: ${mission.estado}).`
    );
  }

  if (!mission.droneId) {
    blockers.push('Nenhum drone atribuído à missão.');
  }

  const primaryCargo = state.cargas.find(
    (c) => c.missaoId === mission.id && c.solicitacaoId === mission.solicitacaoPrincipalId
  );
  if (!primaryCargo) {
    blockers.push('Carga principal não localizada.');
  } else {
    if (primaryCargo.estado !== 'VALIDADA_LACRADA') {
      blockers.push('Carga principal não está validada e lacrada.');
    }
    if (!primaryCargo.codigoLacre) {
      blockers.push('Código do lacre não foi registrado na coleta.');
    }
    if (!primaryCargo.documentacaoValidada) {
      blockers.push('Documentação demonstrativa da carga não foi validada.');
    }
  }

  const checklist: Checklist | undefined = state.checklists.find(
    (cl) => cl.missaoId === mission.id && cl.tipo === 'PRE_DESPACHO'
  );
  if (!checklist) {
    blockers.push('Checklist pré-despacho não inicializado.');
  } else {
    const missing = checklist.itens.filter((i) => i.obrigatorio && !i.verificado);
    if (missing.length > 0) {
      blockers.push(
        `Checklist pré-despacho incompleto (${missing.length} item(ns) obrigatório(s) pendente(s)).`
      );
    }
  }

  return { ok: blockers.length === 0, blockers };
}

export function validateMissionClosurePreconditions(
  state: AppState,
  mission: Missao
): { ok: boolean; blockers: string[] } {
  const blockers: string[] = [];

  if (mission.estado !== 'EM_POS_OPERACAO') {
    blockers.push('A missão precisa estar em pós-operação para ser encerrada.');
  }

  const missionLegs = state.trechos.filter((t) => t.missaoId === mission.id);
  const pendingLegs = missionLegs.filter(
    (t) => t.estado !== 'CONCLUIDO' && t.estado !== 'CANCELADO'
  );
  if (pendingLegs.length > 0) {
    blockers.push(
      `Existem ${pendingLegs.length} trecho(s) pendente(s) ainda não concluídos.`
    );
  }

  const missionCargos = state.cargas.filter((c) => c.missaoId === mission.id);
  const unresolvedCargos = missionCargos.filter(
    (c) =>
      ![
        'ENTREGUE',
        'ENTREGUE_COM_RESSALVA',
        'RECUSADA',
        'RETORNADA',
        'CANCELADA',
      ].includes(c.estado)
  );
  if (unresolvedCargos.length > 0) {
    blockers.push(
      `Existem ${unresolvedCargos.length} carga(s) sem destinação final registrada.`
    );
  }

  const openCriticalOcc = state.ocorrencias.filter(
    (o) =>
      o.missaoId === mission.id &&
      o.gravidade === 'CRITICA' &&
      o.status !== 'ENCERRADA'
  );
  if (openCriticalOcc.length > 0) {
    blockers.push(
      `Existem ${openCriticalOcc.length} ocorrência(s) crítica(s) ainda não encerradas.`
    );
  }

  if (!mission.posOperacaoInspecaoId) {
    blockers.push('Inspeção pós-operação do drone ainda não registrada.');
  }

  if (!mission.posOperacaoHigienizacaoId) {
    blockers.push('Higienização pós-operação do compartimento ainda não registrada.');
  }

  return { ok: blockers.length === 0, blockers };
}

export function computeSimulatedDistanceKm(
  a?: Instituicao,
  b?: Instituicao
): number {
  if (!a || !b) return 14.0;
  if (a.id === b.id) return 1.5;
  const dx = a.mapX - b.mapX;
  const dy = a.mapY - b.mapY;
  // Scale schematic px to realistic Salvador/RMS simulated km (~18px = 1 km)
  const km = Math.sqrt(dx * dx + dy * dy) / 18;
  return Math.max(3.2, Number(km.toFixed(1)));
}

export function computeSimulatedMinutes(distanceKm: number): number {
  // Average simulated cruise speed ~48 km/h + 4 min takeoff/landing
  return Math.max(8, Math.round((distanceKm / 48) * 60 + 4));
}

export function computeSimulatedCostBrl(
  distanceKm: number,
  priority: string,
  hasReturnCargo: boolean
): number {
  const base = 180;
  const perKm = 14.5;
  const priorityMult = priority === 'CRITICA' ? 1.35 : priority === 'ALTA' ? 1.15 : 1.0;
  const reverseEfficiencyDiscount = hasReturnCargo ? 0.85 : 1.0;
  return Number((base + distanceKm * perKm * priorityMult * reverseEfficiencyDiscount).toFixed(2));
}
