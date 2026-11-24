import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createDefaultPreDispatchChecklist,
  createInitialSeedState,
  DEFAULT_REGRAS_CONFIG,
} from '../data/seedData';
import { evaluateReverseLogisticsCandidate } from '../engine/rulesEngine';
import {
  canRolePerform,
  computeSimulatedCostBrl,
  computeSimulatedDistanceKm,
  computeSimulatedMinutes,
  isDroneAssignable,
  validateDispatchPreconditions,
  validateMissionClosurePreconditions,
} from '../engine/stateMachine';
import { appStorageAdapter } from '../services/storageAdapter';
import type {
  AppState,
  CargoType,
  DroneState,
  Evento,
  Missao,
  MissionState,
  OccurrenceSeverity,
  OccurrenceStatus,
  PriorityLevel,
  RegrasConfig,
  Solicitacao,
  Telemetria,
  Usuario,
  WeatherCondition,
} from '../types/domain';
import { formatDecimal, formatPercent, formatTemp } from '../utils/formatters';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  text: string;
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

interface MedAirContextValue {
  state: AppState;
  currentUser: Usuario | null;
  activeMission: Missao | undefined;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  pushToast: (type: ToastMessage['type'], text: string) => void;
  // Session & Navigation
  selectProfile: (userId: string) => void;
  logout: () => void;
  setInterfaceMode: (mode: 'PORTAL' | 'PAINEL') => void;
  setActiveMission: (missionId: string | null) => void;
  restoreDemoData: () => void;
  // Requests & Triage
  createRequest: (input: {
    instituicaoSolicitanteId: string;
    responsavelInstitucional: string;
    origemId: string;
    destinoId: string;
    tipoCarga: CargoType;
    descricaoCarga: string;
    prioridade: PriorityLevel;
    pesoKg: number;
    comprimentoCm: number;
    larguraCm: number;
    alturaCm: number;
    volumeEstimadoL: number;
    requerControleTermico: boolean;
    tempMinC?: number;
    tempMaxC?: number;
    requisitosConservacao: string;
    prazoDesejadoIso: string;
    observacoesOperacionais: string;
    confirmacaoDadosFicticios: boolean;
  }) => ActionResult;
  triageRequest: (
    solId: string,
    decision: 'APROVAR' | 'COMPLEMENTACAO' | 'RECUSAR',
    justification: string
  ) => ActionResult;
  respondComplementation: (solId: string, additionalInfo: string) => ActionResult;
  cancelRequest: (solId: string, reason: string) => ActionResult;
  cancelMission: (missionId: string, reason: string) => ActionResult;
  // Planning, Approval & Dispatch
  submitMissionPlan: (input: {
    missionId: string;
    droneId: string;
    pilotoResponsavelId: string;
    climaCondicao: WeatherCondition;
    ventoKmh: number;
    observacoesPlanejamento: string;
  }) => ActionResult;
  approveMissionHuman: (missionId: string, justification: string) => ActionResult;
  returnMissionToPlanning: (missionId: string, justification: string) => ActionResult;
  toggleChecklistItem: (checklistId: string, itemId: string) => ActionResult;
  dispatchMissionAdministrative: (missionId: string, justification: string) => ActionResult;
  // Collection & Prep
  startCargoPreparation: (missionId: string, cargoId: string) => ActionResult;
  validateAndSealCargo: (input: {
    missionId: string;
    cargoId: string;
    embalagem: string;
    codigoLacre: string;
    temperaturaInicialC?: number;
    documentacaoValidada: boolean;
    observacoes: string;
  }) => ActionResult;
  // Flight & Simulator
  startSimulatedFlight: (missionId: string) => ActionResult;
  advanceFlightProgress: (missionId: string, stepPct?: number) => ActionResult;
  simulateArrival: (missionId: string) => ActionResult;
  simulateAnomaly: (
    missionId: string,
    type: 'TEMPERATURA' | 'BATERIA' | 'COMUNICACAO'
  ) => ActionResult;
  enterContingency: (missionId: string, justification: string) => ActionResult;
  resolveContingency: (
    missionId: string,
    targetState: 'EM_TRANSPORTE' | 'RETORNO_SEM_CARGA' | 'RETORNO_EM_ANDAMENTO' | 'EM_POS_OPERACAO',
    justification: string
  ) => ActionResult;
  advanceDemoStep: (missionId: string) => ActionResult;
  simulateReturnCargoAvailable: (missionId?: string) => ActionResult;
  // Occurrences
  registerManualOccurrence: (input: {
    missionId: string;
    trechoId?: string;
    gravidade: OccurrenceSeverity;
    tipoAlerta:
      | 'DESVIO_TERMICO'
      | 'BATERIA_BAIXA'
      | 'PERDA_COMUNICACAO'
      | 'VIBRACAO_ELEVADA'
      | 'VENTO_FORTE'
      | 'AVARIA_EMBALAGEM'
      | 'OPERACIONAL';
    titulo: string;
    descricao: string;
    leituraSensorSimulada: string;
  }) => ActionResult;
  updateOccurrence: (input: {
    occId: string;
    novoStatus: OccurrenceStatus;
    providencia: string;
    atribuirParaMim?: boolean;
    justificativaEncerramento?: string;
  }) => ActionResult;
  // Receiving & Delivery
  startDestinationConference: (missionId: string, cargoId: string) => ActionResult;
  confirmCargoReceiving: (input: {
    missionId: string;
    cargoId: string;
    decision: 'ACEITA' | 'ACEITA_COM_RESSALVA' | 'RECUSADA';
    integridadeEmbalagem: 'INTEGRA' | 'AVARIA_LEVE' | 'VIOLADA';
    lacreConferido: boolean;
    temperaturaEntregaC?: number;
    justificativa: string;
  }) => ActionResult;
  // Reverse Logistics
  startReverseLogisticsAnalysis: (missionId: string) => ActionResult;
  confirmQuickReturnSanitization: (missionId: string, notes: string) => ActionResult;
  decideReverseLogistics: (input: {
    missionId: string;
    decision: 'COM_CARGA' | 'VAZIO';
    candidateSolId?: string;
    justification: string;
  }) => ActionResult;
  // Post-Op & Fleet
  registerDroneInspection: (input: {
    droneId: string;
    missionId?: string;
    bateriaAvaliadaPct: number;
    integridadeCompartimentoOk: boolean;
    estruturaHelicesOk: boolean;
    sensoresSimuladosOk: boolean;
    aprovado: boolean;
    observacoes: string;
  }) => ActionResult;
  registerDroneSanitization: (input: {
    droneId: string;
    missionId?: string;
    protocoloAplicado: string;
    compartimentoTermicoHigienizado: boolean;
    liberadoParaReuso: boolean;
    observacoes: string;
  }) => ActionResult;
  openDroneMaintenance: (
    droneId: string,
    tipo: 'PREVENTIVA' | 'CORRETIVA',
    descricao: string
  ) => ActionResult;
  completeDroneMaintenance: (
    manutencaoId: string,
    parecerFinal: string
  ) => ActionResult;
  setDroneFleetState: (
    droneId: string,
    newState: DroneState,
    justification: string
  ) => ActionResult;
  closeMission: (missionId: string, justification: string) => ActionResult;
  // Rules Config
  updateRegrasConfig: (config: RegrasConfig) => ActionResult;
  resetRegrasConfig: () => ActionResult;
}

const MedAirContext = createContext<MedAirContextValue | null>(null);

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildEvent(
  user: Usuario,
  entidade: Evento['entidade'],
  entidadeId: string,
  estadoAnterior: string,
  novoEstado: string,
  justificativa: string,
  missaoId?: string,
  detalhes?: string
): Evento {
  return {
    id: uid('evt'),
    entidade,
    entidadeId,
    missaoId,
    estadoAnterior,
    novoEstado,
    dataHora: nowIso(),
    usuarioId: user.id,
    usuarioNome: user.nome,
    usuarioPerfil: user.perfil,
    justificativa,
    detalhes,
  };
}

export function MedAirProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const loaded = appStorageAdapter.load();
    if (loaded && loaded.schemaVersion === 1 && Array.isArray(loaded.usuarios)) {
      return loaded;
    }
    const seed = createInitialSeedState();
    appStorageAdapter.save(seed);
    return seed;
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    appStorageAdapter.save(state);
  }, [state]);

  const pushToast = useCallback((type: ToastMessage['type'], text: string) => {
    const id = uid('toast');
    setToasts((prev) => [...prev.slice(-3), { id, type, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const currentUser = useMemo(
    () => state.usuarios.find((u) => u.id === state.usuarioAtualId) ?? null,
    [state.usuarios, state.usuarioAtualId]
  );

  const activeMission = useMemo(
    () => state.missoes.find((m) => m.id === state.missaoAtivaId),
    [state.missoes, state.missaoAtivaId]
  );

  const requireAuthAndRole = useCallback(
    (action: Parameters<typeof canRolePerform>[1]): { user: Usuario } | { error: ActionResult } => {
      if (!currentUser) {
        const res = { ok: false, message: 'Selecione um perfil demonstrativo antes de executar ações.' };
        pushToast('error', res.message);
        return { error: res };
      }
      const perm = canRolePerform(currentUser.perfil, action);
      if (!perm.allowed) {
        const res = { ok: false, message: perm.reason ?? 'Ação bloqueada para o perfil atual.' };
        pushToast('warning', res.message);
        return { error: res };
      }
      return { user: currentUser };
    },
    [currentUser, pushToast]
  );

  const selectProfile = useCallback(
    (userId: string) => {
      setState((prev) => {
        const user = prev.usuarios.find((u) => u.id === userId);
        if (!user) return prev;
        let nextMode = prev.modoInterface;
        if (nextMode === 'PAINEL' && !user.acessoPainel) nextMode = 'PORTAL';
        if (nextMode === 'PORTAL' && !user.acessoPortal) nextMode = 'PAINEL';
        // Prefer portal for hospital/lab users when switching into them
        if (['HOSPITAL_ORIGEM', 'HOSPITAL_DESTINO', 'LABORATORIO'].includes(user.perfil)) {
          nextMode = 'PORTAL';
        } else if (['PILOTO', 'MANUTENCAO'].includes(user.perfil)) {
          nextMode = 'PAINEL';
        }
        return {
          ...prev,
          usuarioAtualId: user.id,
          modoInterface: nextMode,
        };
      });
      const target = state.usuarios.find((u) => u.id === userId);
      if (target) {
        pushToast('info', `Perfil demonstrativo ativo: ${target.nome} (${target.cargo}).`);
      }
    },
    [state.usuarios, pushToast]
  );

  const logout = useCallback(() => {
    setState((prev) => ({ ...prev, usuarioAtualId: null }));
  }, []);

  const setInterfaceMode = useCallback(
    (mode: 'PORTAL' | 'PAINEL') => {
      if (!currentUser) return;
      if (mode === 'PAINEL' && !currentUser.acessoPainel) {
        pushToast('warning', 'Este perfil institucional acessa apenas o Portal Hospitalar.');
        return;
      }
      if (mode === 'PORTAL' && !currentUser.acessoPortal) {
        pushToast('warning', 'Este perfil operacional acessa apenas o Painel Operacional.');
        return;
      }
      setState((prev) => ({ ...prev, modoInterface: mode }));
    },
    [currentUser, pushToast]
  );

  const setActiveMission = useCallback((missionId: string | null) => {
    setState((prev) => ({ ...prev, missaoAtivaId: missionId }));
  }, []);

  const restoreDemoData = useCallback(() => {
    const keepUser = state.usuarioAtualId;
    const keepMode = state.modoInterface;
    appStorageAdapter.clear();
    const fresh = createInitialSeedState();
    fresh.usuarioAtualId = keepUser;
    fresh.modoInterface = keepMode;
    appStorageAdapter.save(fresh);
    setState(fresh);
    pushToast('success', 'Dados fictícios de demonstração restaurados para o estado inicial.');
  }, [state.usuarioAtualId, state.modoInterface, pushToast]);

  // 1. Create Request
  const createRequest: MedAirContextValue['createRequest'] = useCallback(
    (input) => {
      const check = requireAuthAndRole('CREATE_REQUEST');
      if ('error' in check) return check.error;
      const { user } = check;

      if (!input.confirmacaoDadosFicticios) {
        const res = { ok: false, message: 'É obrigatório confirmar que os dados inseridos são fictícios.' };
        pushToast('error', res.message);
        return res;
      }
      if (input.origemId === input.destinoId) {
        const res = { ok: false, message: 'Origem e destino devem ser instituições diferentes.' };
        pushToast('error', res.message);
        return res;
      }
      if (input.pesoKg <= 0 || input.volumeEstimadoL <= 0) {
        const res = { ok: false, message: 'Peso e volume estimado devem ser maiores que zero.' };
        pushToast('error', res.message);
        return res;
      }

      const seq = state.solicitacoes.length + 1;
      const codigo = `SOL-2026-${String(seq).padStart(3, '0')}`;
      const isReverse = input.tipoCarga === 'LOGISTICA_REVERSA';
      const solId = uid('sol');
      const newSol: Solicitacao = {
        id: solId,
        codigo,
        instituicaoSolicitanteId: input.instituicaoSolicitanteId,
        responsavelInstitucional: input.responsavelInstitucional.trim(),
        origemId: input.origemId,
        destinoId: input.destinoId,
        tipoCarga: input.tipoCarga,
        descricaoCarga: input.descricaoCarga.trim(),
        prioridade: input.prioridade,
        pesoKg: input.pesoKg,
        dimensoesCm: {
          comprimento: input.comprimentoCm,
          largura: input.larguraCm,
          altura: input.alturaCm,
        },
        volumeEstimadoL: input.volumeEstimadoL,
        requerControleTermico: input.requerControleTermico,
        tempMinC: input.requerControleTermico ? input.tempMinC : undefined,
        tempMaxC: input.requerControleTermico ? input.tempMaxC : undefined,
        requisitosConservacao: input.requisitosConservacao.trim(),
        prazoDesejadoIso: input.prazoDesejadoIso,
        observacoesOperacionais: input.observacoesOperacionais.trim(),
        confirmacaoDadosFicticios: true,
        status: isReverse ? 'DISPONIVEL_RETORNO' : 'PENDENTE_TRIAGEM',
        criadoEm: nowIso(),
        criadoPorId: user.id,
        elegivelLogisticaReversa: isReverse || input.tipoCarga === 'AMOSTRA_LABORATORIAL',
      };

      const evt = buildEvent(
        user,
        'SOLICITACAO',
        solId,
        'NOVO',
        newSol.status,
        `Solicitação ${codigo} registrada com dados fictícios.`
      );

      setState((prev) => ({
        ...prev,
        solicitacoes: [newSol, ...prev.solicitacoes],
        eventos: [evt, ...prev.eventos],
      }));

      const msg = isReverse
        ? `Solicitação ${codigo} cadastrada na fila de logística reversa.`
        : `Solicitação ${codigo} enviada para triagem na Central Operacional.`;
      pushToast('success', msg);
      return { ok: true, message: msg };
    },
    [requireAuthAndRole, state.solicitacoes.length, pushToast]
  );

  // 2. Triage Request
  const triageRequest: MedAirContextValue['triageRequest'] = useCallback(
    (solId, decision, justification) => {
      const check = requireAuthAndRole('TRIAGE');
      if ('error' in check) return check.error;
      const { user } = check;

      const sol = state.solicitacoes.find((s) => s.id === solId);
      if (!sol) return { ok: false, message: 'Solicitação não encontrada.' };
      if ((decision === 'COMPLEMENTACAO' || decision === 'RECUSAR') && !justification.trim()) {
        const res = { ok: false, message: 'Informe justificativa obrigatória para complementação ou recusa.' };
        pushToast('error', res.message);
        return res;
      }

      if (decision === 'APROVAR') {
        const seq = state.missoes.length + 1;
        const missionId = uid('mis');
        const missionCode = `MIS-2026-${String(seq).padStart(3, '0')}`;
        const legId = uid('trc');
        const cargoId = uid('crg');
        const checklistId = uid('cl');
        const orig = state.instituicoes.find((i) => i.id === sol.origemId);
        const dest = state.instituicoes.find((i) => i.id === sol.destinoId);
        const distKm = computeSimulatedDistanceKm(orig, dest);
        const estMin = computeSimulatedMinutes(distKm);
        const estCost = computeSimulatedCostBrl(distKm, sol.prioridade, false);
        const now = nowIso();

        const newMission: Missao = {
          id: missionId,
          codigo: missionCode,
          solicitacaoPrincipalId: sol.id,
          estado: 'EM_PLANEJAMENTO',
          operadorCentralId: user.id,
          prioridade: sol.prioridade,
          criadoEm: now,
          atualizadoEm: now,
          climaSimulado: {
            condicao: 'BOM',
            ventoKmh: 16.5,
            visibilidadeKm: 10.0,
            temperaturaAmbienteC: 27.4,
            simulado: true,
          },
          distanciaEstimadaKm: distKm,
          tempoEstimadoMin: estMin,
          custoEstimadoSimuladoBrl: estCost,
          trechoAtivoId: legId,
          retornoAvaliado: false,
        };

        const newLeg = {
          id: legId,
          codigo: `TRC-${String(seq).padStart(3, '0')}-IDA`,
          missaoId: missionId,
          ordem: 1,
          tipo: 'IDA' as const,
          origemId: sol.origemId,
          destinoId: sol.destinoId,
          cargaId: cargoId,
          estado: 'PLANEJADO' as const,
          progressoPct: 0,
          distanciaKm: distKm,
          tempoEstimadoMin: estMin,
        };

        const newCargo = {
          id: cargoId,
          codigo: `CRG-2026-${String(seq).padStart(3, '0')}`,
          solicitacaoId: sol.id,
          missaoId: missionId,
          trechoId: legId,
          tipo: sol.tipoCarga,
          descricao: sol.descricaoCarga,
          pesoKg: sol.pesoKg,
          dimensoesCm: { ...sol.dimensoesCm },
          volumeEstimadoL: sol.volumeEstimadoL,
          requerControleTermico: sol.requerControleTermico,
          tempMinC: sol.tempMinC,
          tempMaxC: sol.tempMaxC,
          requisitosConservacao: sol.requisitosConservacao,
          estado: 'SOLICITADA' as const,
          documentacaoValidada: false,
        };

        const newChecklist = {
          id: checklistId,
          missaoId: missionId,
          tipo: 'PRE_DESPACHO' as const,
          itens: createDefaultPreDispatchChecklist(false),
          concluido: false,
        };

        const evtSol = buildEvent(
          user,
          'SOLICITACAO',
          sol.id,
          sol.status,
          'APROVADA_MISSAO',
          justification.trim() || 'Triagem aprovada para planejamento operacional.',
          missionId
        );
        const evtMis = buildEvent(
          user,
          'MISSAO',
          missionId,
          'EM_TRIAGEM',
          'EM_PLANEJAMENTO',
          `Missão ${missionCode} criada a partir de ${sol.codigo}.`,
          missionId
        );

        setState((prev) => ({
          ...prev,
          missaoAtivaId: missionId,
          solicitacoes: prev.solicitacoes.map((s) =>
            s.id === sol.id
              ? {
                  ...s,
                  status: 'APROVADA_MISSAO',
                  missaoId: missionId,
                  justificativaTriagem: justification.trim() || 'Aprovada na triagem.',
                }
              : s
          ),
          missoes: [newMission, ...prev.missoes],
          trechos: [newLeg, ...prev.trechos],
          cargas: [newCargo, ...prev.cargas],
          checklists: [newChecklist, ...prev.checklists],
          eventos: [evtMis, evtSol, ...prev.eventos],
        }));

        const msg = `Solicitação ${sol.codigo} aprovada! Missão ${missionCode} criada em Planejamento.`;
        pushToast('success', msg);
        return { ok: true, message: msg };
      }

      const nextStatus =
        decision === 'COMPLEMENTACAO' ? 'AGUARDANDO_COMPLEMENTACAO' : 'RECUSADA';
      const evt = buildEvent(
        user,
        'SOLICITACAO',
        sol.id,
        sol.status,
        nextStatus,
        justification.trim()
      );

      setState((prev) => ({
        ...prev,
        solicitacoes: prev.solicitacoes.map((s) =>
          s.id === sol.id
            ? {
                ...s,
                status: nextStatus,
                justificativaTriagem: justification.trim(),
                complementacaoSolicitada:
                  decision === 'COMPLEMENTACAO' ? justification.trim() : s.complementacaoSolicitada,
              }
            : s
        ),
        eventos: [evt, ...prev.eventos],
      }));

      const msg =
        decision === 'COMPLEMENTACAO'
          ? `Complementação solicitada para ${sol.codigo}.`
          : `Solicitação ${sol.codigo} recusada com justificativa registrada.`;
      pushToast('info', msg);
      return { ok: true, message: msg };
    },
    [requireAuthAndRole, state.solicitacoes, state.missoes.length, state.instituicoes, pushToast]
  );

  const respondComplementation: MedAirContextValue['respondComplementation'] = useCallback(
    (solId, additionalInfo) => {
      const check = requireAuthAndRole('CREATE_REQUEST');
      if ('error' in check) return check.error;
      const { user } = check;
      if (!additionalInfo.trim()) {
        const res = { ok: false, message: 'Informe os dados complementares antes de reenviar.' };
        pushToast('error', res.message);
        return res;
      }
      const sol = state.solicitacoes.find((s) => s.id === solId);
      if (!sol) return { ok: false, message: 'Solicitação não encontrada.' };

      const evt = buildEvent(
        user,
        'SOLICITACAO',
        sol.id,
        sol.status,
        'PENDENTE_TRIAGEM',
        `Complementação enviada: ${additionalInfo.trim()}`
      );
      setState((prev) => ({
        ...prev,
        solicitacoes: prev.solicitacoes.map((s) =>
          s.id === sol.id
            ? {
                ...s,
                status: 'PENDENTE_TRIAGEM',
                observacoesOperacionais: `${s.observacoesOperacionais}\n[Complementação]: ${additionalInfo.trim()}`,
              }
            : s
        ),
        eventos: [evt, ...prev.eventos],
      }));
      pushToast('success', `Complementação registrada para ${sol.codigo}. Retornou à triagem.`);
      return { ok: true, message: 'Complementação enviada.' };
    },
    [requireAuthAndRole, state.solicitacoes, pushToast]
  );

  const cancelRequest: MedAirContextValue['cancelRequest'] = useCallback(
    (solId, reason) => {
      const check = requireAuthAndRole('CREATE_REQUEST');
      if ('error' in check) return check.error;
      const { user } = check;
      if (!reason.trim()) {
        const res = { ok: false, message: 'Cancelamento exige motivo obrigatório (registros não são excluídos).' };
        pushToast('error', res.message);
        return res;
      }
      const sol = state.solicitacoes.find((s) => s.id === solId);
      if (!sol) return { ok: false, message: 'Solicitação não encontrada.' };

      const evt = buildEvent(user, 'SOLICITACAO', sol.id, sol.status, 'CANCELADA', reason.trim());
      setState((prev) => ({
        ...prev,
        solicitacoes: prev.solicitacoes.map((s) =>
          s.id === sol.id ? { ...s, status: 'CANCELADA', justificativaTriagem: reason.trim() } : s
        ),
        eventos: [evt, ...prev.eventos],
      }));
      pushToast('warning', `Solicitação ${sol.codigo} cancelada (histórico preservado).`);
      return { ok: true, message: 'Solicitação cancelada.' };
    },
    [requireAuthAndRole, state.solicitacoes, pushToast]
  );

  const cancelMission: MedAirContextValue['cancelMission'] = useCallback(
    (missionId, reason) => {
      const check = requireAuthAndRole('TRIAGE');
      if ('error' in check) return check.error;
      const { user } = check;
      if (!reason.trim()) {
        const res = { ok: false, message: 'Motivo de cancelamento é obrigatório.' };
        pushToast('error', res.message);
        return res;
      }
      const mission = state.missoes.find((m) => m.id === missionId);
      if (!mission) return { ok: false, message: 'Missão não encontrada.' };
      if (['ENCERRADA', 'CANCELADA', 'RECUSADA'].includes(mission.estado)) {
        return { ok: false, message: 'Missão já se encontra em estado terminal.' };
      }

      const evt = buildEvent(
        user,
        'MISSAO',
        mission.id,
        mission.estado,
        'CANCELADA',
        reason.trim(),
        mission.id
      );

      setState((prev) => ({
        ...prev,
        missoes: prev.missoes.map((m) =>
          m.id === mission.id
            ? { ...m, estado: 'CANCELADA', motivoCancelamentoOuRecusa: reason.trim(), atualizadoEm: nowIso() }
            : m
        ),
        trechos: prev.trechos.map((t) =>
          t.missaoId === mission.id && t.estado !== 'CONCLUIDO' ? { ...t, estado: 'CANCELADO' } : t
        ),
        cargas: prev.cargas.map((c) =>
          c.missaoId === mission.id && !['ENTREGUE', 'ENTREGUE_COM_RESSALVA'].includes(c.estado)
            ? { ...c, estado: 'CANCELADA' }
            : c
        ),
        drones: prev.drones.map((d) =>
          d.id === mission.droneId && d.estado === 'EM_MISSAO'
            ? { ...d, estado: 'DISPONIVEL' }
            : d
        ),
        eventos: [evt, ...prev.eventos],
      }));
      pushToast('warning', `Missão ${mission.codigo} cancelada com histórico preservado.`);
      return { ok: true, message: 'Missão cancelada.' };
    },
    [requireAuthAndRole, state.missoes, pushToast]
  );

  // 3. Planning
  const submitMissionPlan: MedAirContextValue['submitMissionPlan'] = useCallback(
    ({ missionId, droneId, pilotoResponsavelId, climaCondicao, ventoKmh, observacoesPlanejamento }) => {
      const check = requireAuthAndRole('PLAN');
      if ('error' in check) return check.error;
      const { user } = check;

      const mission = state.missoes.find((m) => m.id === missionId);
      if (!mission) return { ok: false, message: 'Missão não encontrada.' };
      if (mission.estado !== 'EM_PLANEJAMENTO') {
        const res = { ok: false, message: `Missão precisa estar em EM_PLANEJAMENTO (atual: ${mission.estado}).` };
        pushToast('warning', res.message);
        return res;
      }

      const drone = state.drones.find((d) => d.id === droneId);
      if (!drone) return { ok: false, message: 'Drone não encontrado.' };

      const assignable = isDroneAssignable(drone);
      if (!assignable.ok && mission.droneId !== drone.id) {
        const res = { ok: false, message: assignable.reason ?? 'Drone indisponível.' };
        pushToast('error', res.message);
        return res;
      }

      const sol = state.solicitacoes.find((s) => s.id === mission.solicitacaoPrincipalId);
      if (sol) {
        if (sol.pesoKg > drone.capacidadePesoKg) {
          const res = { ok: false, message: 'Peso da carga excede a capacidade do drone selecionado.' };
          pushToast('error', res.message);
          return res;
        }
        if (sol.volumeEstimadoL > drone.capacidadeVolumeL) {
          const res = { ok: false, message: 'Volume da carga excede a capacidade do compartimento.' };
          pushToast('error', res.message);
          return res;
        }
        if (sol.requerControleTermico && !drone.possuiCompartimentoTermico) {
          const res = { ok: false, message: 'Carga exige controle térmico; selecione drone com compartimento térmico.' };
          pushToast('error', res.message);
          return res;
        }
      }

      const evt = buildEvent(
        user,
        'MISSAO',
        mission.id,
        mission.estado,
        'AGUARDANDO_APROVACAO',
        `Planejamento concluído com drone ${drone.codigo} (${drone.modelo}). Encaminhado para aprovação humana.`,
        mission.id
      );

      setState((prev) => ({
        ...prev,
        missaoAtivaId: mission.id,
        missoes: prev.missoes.map((m) =>
          m.id === mission.id
            ? {
                ...m,
                estado: 'AGUARDANDO_APROVACAO',
                droneId: drone.id,
                pilotoResponsavelId,
                climaSimulado: {
                  ...m.climaSimulado,
                  condicao: climaCondicao,
                  ventoKmh,
                  simulado: true,
                },
                observacoesPlanejamento: observacoesPlanejamento.trim(),
                atualizadoEm: nowIso(),
              }
            : m
        ),
        drones: prev.drones.map((d) => {
          if (d.id === drone.id) return { ...d, estado: 'EM_MISSAO' };
          if (mission.droneId && d.id === mission.droneId && d.id !== drone.id && d.estado === 'EM_MISSAO') {
            return { ...d, estado: 'DISPONIVEL' };
          }
          return d;
        }),
        eventos: [evt, ...prev.eventos],
      }));

      pushToast('success', `Planejamento de ${mission.codigo} enviado para aprovação humana.`);
      return { ok: true, message: 'Planejamento submetido.' };
    },
    [requireAuthAndRole, state.missoes, state.drones, state.solicitacoes, pushToast]
  );

  // 4. Human Approval
  const approveMissionHuman: MedAirContextValue['approveMissionHuman'] = useCallback(
    (missionId, justification) => {
      const check = requireAuthAndRole('APPROVE_DISPATCH');
      if ('error' in check) return check.error;
      const { user } = check;

      const mission = state.missoes.find((m) => m.id === missionId);
      if (!mission || mission.estado !== 'AGUARDANDO_APROVACAO') {
        const res = { ok: false, message: 'A missão precisa estar em "Aguardando aprovação".' };
        pushToast('warning', res.message);
        return res;
      }

      const now = nowIso();
      const evt = buildEvent(
        user,
        'MISSAO',
        mission.id,
        mission.estado,
        'APROVADA',
        justification.trim() || 'Aprovação humana registrada pela Central Operacional.',
        mission.id
      );

      setState((prev) => ({
        ...prev,
        missoes: prev.missoes.map((m) =>
          m.id === mission.id
            ? { ...m, estado: 'APROVADA', aprovadaPorId: user.id, aprovadaEm: now, atualizadoEm: now }
            : m
        ),
        eventos: [evt, ...prev.eventos],
      }));

      pushToast('success', `Missão ${mission.codigo} aprovada! Próxima etapa: Coleta e Preparação.`);
      return { ok: true, message: 'Missão aprovada.' };
    },
    [requireAuthAndRole, state.missoes, pushToast]
  );

  const returnMissionToPlanning: MedAirContextValue['returnMissionToPlanning'] = useCallback(
    (missionId, justification) => {
      const check = requireAuthAndRole('APPROVE_DISPATCH');
      if ('error' in check) return check.error;
      const { user } = check;
      if (!justification.trim()) {
        const res = { ok: false, message: 'Informe justificativa para retornar ao planejamento.' };
        pushToast('error', res.message);
        return res;
      }
      const mission = state.missoes.find((m) => m.id === missionId);
      if (!mission) return { ok: false, message: 'Missão não encontrada.' };

      const evt = buildEvent(
        user,
        'MISSAO',
        mission.id,
        mission.estado,
        'EM_PLANEJAMENTO',
        justification.trim(),
        mission.id
      );

      setState((prev) => ({
        ...prev,
        missoes: prev.missoes.map((m) =>
          m.id === mission.id ? { ...m, estado: 'EM_PLANEJAMENTO', atualizadoEm: nowIso() } : m
        ),
        eventos: [evt, ...prev.eventos],
      }));

      pushToast('info', `Missão ${mission.codigo} devolvida para ajustes de planejamento.`);
      return { ok: true, message: 'Retornou ao planejamento.' };
    },
    [requireAuthAndRole, state.missoes, pushToast]
  );

  // 5. Checklist Toggle
  const toggleChecklistItem: MedAirContextValue['toggleChecklistItem'] = useCallback(
    (checklistId, itemId) => {
      const check = requireAuthAndRole('COLLECT_PREP');
      if ('error' in check) return check.error;
      const { user } = check;
      const now = nowIso();

      setState((prev) => {
        const nextChecklists = prev.checklists.map((cl) => {
          if (cl.id !== checklistId) return cl;
          const nextItems = cl.itens.map((it) => {
            if (it.id !== itemId) return it;
            const nextVal = !it.verificado;
            return {
              ...it,
              verificado: nextVal,
              verificadoPorId: nextVal ? user.id : undefined,
              verificadoPorNome: nextVal ? user.nome : undefined,
              verificadoEm: nextVal ? now : undefined,
            };
          });
          const allMandatoryDone = nextItems
            .filter((i) => i.obrigatorio)
            .every((i) => i.verificado);
          return {
            ...cl,
            itens: nextItems,
            concluido: allMandatoryDone,
            concluidoEm: allMandatoryDone ? now : undefined,
          };
        });
        return { ...prev, checklists: nextChecklists };
      });

      return { ok: true, message: 'Item de checklist atualizado.' };
    },
    [requireAuthAndRole]
  );

  // 6. Collection & Preparation
  const startCargoPreparation: MedAirContextValue['startCargoPreparation'] = useCallback(
    (missionId, cargoId) => {
      const check = requireAuthAndRole('COLLECT_PREP');
      if ('error' in check) return check.error;
      const { user } = check;
      const mission = state.missoes.find((m) => m.id === missionId);
      const cargo = state.cargas.find((c) => c.id === cargoId);
      if (!mission || !cargo) return { ok: false, message: 'Missão ou carga não encontrada.' };

      const isPrimary = cargo.solicitacaoId === mission.solicitacaoPrincipalId;
      if (isPrimary && mission.estado !== 'APROVADA') {
        const res = { ok: false, message: 'A missão precisa estar APROVADA antes de iniciar a preparação.' };
        pushToast('warning', res.message);
        return res;
      }

      const evt = buildEvent(
        user,
        'CARGA',
        cargo.id,
        cargo.estado,
        'EM_PREPARACAO',
        `Preparação e conferência de coleta iniciada para ${cargo.codigo}.`,
        mission.id
      );

      setState((prev) => ({
        ...prev,
        missoes: isPrimary
          ? prev.missoes.map((m) =>
              m.id === mission.id ? { ...m, estado: 'CARGA_EM_PREPARACAO', atualizadoEm: nowIso() } : m
            )
          : prev.missoes,
        trechos: prev.trechos.map((t) =>
          t.cargaId === cargo.id && t.estado === 'PLANEJADO' ? { ...t, estado: 'EM_PREPARACAO' } : t
        ),
        cargas: prev.cargas.map((c) =>
          c.id === cargo.id ? { ...c, estado: 'EM_PREPARACAO' } : c
        ),
        eventos: [evt, ...prev.eventos],
      }));

      pushToast('info', `Coleta iniciada para carga ${cargo.codigo}.`);
      return { ok: true, message: 'Preparação iniciada.' };
    },
    [requireAuthAndRole, state.missoes, state.cargas, pushToast]
  );

  const validateAndSealCargo: MedAirContextValue['validateAndSealCargo'] = useCallback(
    ({ missionId, cargoId, embalagem, codigoLacre, temperaturaInicialC, documentacaoValidada, observacoes }) => {
      const check = requireAuthAndRole('COLLECT_PREP');
      if ('error' in check) return check.error;
      const { user } = check;

      const mission = state.missoes.find((m) => m.id === missionId);
      const cargo = state.cargas.find((c) => c.id === cargoId);
      if (!mission || !cargo) return { ok: false, message: 'Missão ou carga não encontrada.' };

      if (!embalagem.trim() || !codigoLacre.trim()) {
        const res = { ok: false, message: 'Embalagem e código do lacre são obrigatórios.' };
        pushToast('error', res.message);
        return res;
      }
      if (!documentacaoValidada) {
        const res = { ok: false, message: 'É obrigatório validar a documentação demonstrativa da carga.' };
        pushToast('error', res.message);
        return res;
      }
      if (cargo.requerControleTermico && (temperaturaInicialC === undefined || Number.isNaN(temperaturaInicialC))) {
        const res = { ok: false, message: 'Informe a temperatura inicial simulada para carga termolábil.' };
        pushToast('error', res.message);
        return res;
      }

      const leg = state.trechos.find((t) => t.cargaId === cargo.id);
      const originInst = state.instituicoes.find((i) => i.id === leg?.origemId);
      const isPrimary = cargo.solicitacaoId === mission.solicitacaoPrincipalId;
      const now = nowIso();

      const custodyId = uid('cus');
      const custodyCode = `CUST-2026-${String(state.custodias.length + 1).padStart(3, '0')}`;
      const newCustody = {
        id: custodyId,
        codigo: custodyCode,
        cargaId: cargo.id,
        missaoId: mission.id,
        trechoId: leg?.id ?? mission.trechoAtivoId ?? '',
        tipoTransferencia: isPrimary ? ('COLETA_ORIGEM' as const) : ('COLETA_RETORNO' as const),
        deParte: originInst?.nome ?? 'Instituição de Origem',
        paraParte: `MedAir Logistics (${user.nome})`,
        codigoLacre: codigoLacre.trim(),
        condicaoEmbalagem: embalagem.trim(),
        temperaturaRegistradaC: temperaturaInicialC,
        dataHora: now,
        usuarioResponsavelId: user.id,
        usuarioResponsavelNome: user.nome,
        observacoes: observacoes.trim() || 'Transferência de custódia inicial registrada na coleta.',
      };

      const evtCargo = buildEvent(
        user,
        'CARGA',
        cargo.id,
        cargo.estado,
        'VALIDADA_LACRADA',
        `Carga ${cargo.codigo} lacrada (${codigoLacre.trim()}) e custódia ${custodyCode} emitida.`,
        mission.id
      );

      const eventsToAdd: Evento[] = [evtCargo];
      if (isPrimary) {
        eventsToAdd.unshift(
          buildEvent(
            user,
            'MISSAO',
            mission.id,
            mission.estado,
            'CARGA_VALIDADA',
            'Carga validada, lacrada e custódia registrada. Apta para checklist e despacho.',
            mission.id
          )
        );
      }

      setState((prev) => ({
        ...prev,
        missoes: isPrimary
          ? prev.missoes.map((m) =>
              m.id === mission.id ? { ...m, estado: 'CARGA_VALIDADA', atualizadoEm: now } : m
            )
          : prev.missoes,
        trechos: prev.trechos.map((t) =>
          t.id === leg?.id ? { ...t, estado: isPrimary ? 'EM_PREPARACAO' : 'PRONTO' } : t
        ),
        cargas: prev.cargas.map((c) =>
          c.id === cargo.id
            ? {
                ...c,
                estado: 'VALIDADA_LACRADA',
                embalagem: embalagem.trim(),
                codigoLacre: codigoLacre.trim(),
                temperaturaInicialC,
                documentacaoValidada: true,
                coletadaPorId: user.id,
                coletadaEm: now,
              }
            : c
        ),
        custodias: [newCustody, ...prev.custodias],
        eventos: [...eventsToAdd, ...prev.eventos],
      }));

      pushToast(
        'success',
        isPrimary
          ? `Carga ${cargo.codigo} validada e lacrada! Prossiga para Checklist e Despacho.`
          : `Carga de retorno ${cargo.codigo} lacrada e pronta para decolagem de retorno!`
      );
      return { ok: true, message: 'Carga validada e custódia registrada.' };
    },
    [requireAuthAndRole, state.missoes, state.cargas, state.trechos, state.instituicoes, state.custodias.length, pushToast]
  );

  // 7. Administrative Dispatch
  const dispatchMissionAdministrative: MedAirContextValue['dispatchMissionAdministrative'] = useCallback(
    (missionId, justification) => {
      const check = requireAuthAndRole('APPROVE_DISPATCH');
      if ('error' in check) return check.error;
      const { user } = check;

      const mission = state.missoes.find((m) => m.id === missionId);
      if (!mission) return { ok: false, message: 'Missão não encontrada.' };

      const validation = validateDispatchPreconditions(state, mission);
      if (!validation.ok) {
        const res = { ok: false, message: `Despacho bloqueado: ${validation.blockers[0]}` };
        pushToast('error', res.message);
        return res;
      }

      const now = nowIso();
      const evt = buildEvent(
        user,
        'MISSAO',
        mission.id,
        mission.estado,
        'DESPACHADA',
        justification.trim() || 'Despacho administrativo demonstrativo liberado após checklist.',
        mission.id
      );

      setState((prev) => ({
        ...prev,
        missoes: prev.missoes.map((m) =>
          m.id === mission.id
            ? { ...m, estado: 'DESPACHADA', despachadaPorId: user.id, despachadaEm: now, atualizadoEm: now }
            : m
        ),
        trechos: prev.trechos.map((t) =>
          t.id === mission.trechoAtivoId ? { ...t, estado: 'PRONTO' } : t
        ),
        eventos: [evt, ...prev.eventos],
      }));

      pushToast('success', `Missão ${mission.codigo} despachada! Pronta para iniciar o voo simulado.`);
      return { ok: true, message: 'Despacho realizado.' };
    },
    [requireAuthAndRole, state, pushToast]
  );

  // 8. Start Simulated Flight (Outbound OR Return)
  const startSimulatedFlight: MedAirContextValue['startSimulatedFlight'] = useCallback(
    (missionId) => {
      const check = requireAuthAndRole('MONITOR_FLIGHT');
      if ('error' in check) return check.error;
      const { user } = check;

      const mission = state.missoes.find((m) => m.id === missionId);
      if (!mission) return { ok: false, message: 'Missão não encontrada.' };

      const activeLeg = state.trechos.find((t) => t.id === mission.trechoAtivoId);
      if (!activeLeg) return { ok: false, message: 'Trecho ativo não localizado.' };

      const isOutbound = activeLeg.tipo === 'IDA';
      if (isOutbound && mission.estado !== 'DESPACHADA') {
        const res = {
          ok: false,
          message: 'Regra impeditiva: não é permitido iniciar voo simulado antes do despacho administrativo.',
        };
        pushToast('error', res.message);
        return res;
      }

      if (!isOutbound) {
        if (!['RETORNO_APROVADO', 'RETORNO_SEM_CARGA'].includes(mission.estado)) {
          const res = {
            ok: false,
            message: 'O retorno precisa estar aprovado (com carga ou vazio) para iniciar o voo.',
          };
          pushToast('error', res.message);
          return res;
        }
        if (activeLeg.tipo === 'RETORNO_COM_CARGA' && activeLeg.cargaId) {
          const retCargo = state.cargas.find((c) => c.id === activeLeg.cargaId);
          if (!retCargo || retCargo.estado !== 'VALIDADA_LACRADA') {
            const res = {
              ok: false,
              message: 'A carga de retorno precisa ser coletada, lacrada e ter custódia registrada antes da decolagem.',
            };
            pushToast('error', res.message);
            return res;
          }
        }
      }

      const drone = state.drones.find((d) => d.id === mission.droneId);
      const cargo = state.cargas.find((c) => c.id === activeLeg.cargaId);
      const now = nowIso();
      const nextMissionState: MissionState = isOutbound ? 'EM_TRANSPORTE' : 'RETORNO_EM_ANDAMENTO';

      const initialTemp = cargo?.temperaturaInicialC ?? 4.2;
      const initialBat = drone?.bateriaAtualPct ?? 88;
      const tel = {
        id: uid('tel'),
        missaoId: mission.id,
        trechoId: activeLeg.id,
        droneId: drone?.id ?? '',
        dataHora: now,
        progressoPct: 10,
        velocidadeKmh: 47.0,
        altitudeM: 95,
        bateriaPct: Math.max(15, initialBat - 3),
        temperaturaCargaC: initialTemp,
        umidadePct: 58,
        vibracaoG: 0.19,
        ventoKmh: mission.climaSimulado.ventoKmh,
        comunicacao: 'ESTAVEL' as const,
        simulado: true as const,
      };

      const evt = buildEvent(
        user,
        'MISSAO',
        mission.id,
        mission.estado,
        nextMissionState,
        `Voo simulado iniciado no trecho ${activeLeg.codigo}.`,
        mission.id
      );

      setState((prev) => ({
        ...prev,
        missoes: prev.missoes.map((m) =>
          m.id === mission.id ? { ...m, estado: nextMissionState, atualizadoEm: now } : m
        ),
        trechos: prev.trechos.map((t) =>
          t.id === activeLeg.id ? { ...t, estado: 'EM_VOO', progressoPct: 10, iniciadoEm: now } : t
        ),
        cargas: activeLeg.cargaId
          ? prev.cargas.map((c) =>
              c.id === activeLeg.cargaId ? { ...c, estado: 'EM_TRANSPORTE' } : c
            )
          : prev.cargas,
        drones: prev.drones.map((d) =>
          d.id === mission.droneId ? { ...d, bateriaAtualPct: tel.bateriaPct } : d
        ),
        telemetria: [...prev.telemetria, tel],
        eventos: [evt, ...prev.eventos],
      }));

      pushToast('success', `Voo simulado iniciado no trecho ${activeLeg.codigo}.`);
      return { ok: true, message: 'Voo simulado iniciado.' };
    },
    [requireAuthAndRole, state.missoes, state.trechos, state.cargas, state.drones, pushToast]
  );

  // 9. Simulate Arrival
  const simulateArrival: MedAirContextValue['simulateArrival'] = useCallback(
    (missionId) => {
      const check = requireAuthAndRole('MONITOR_FLIGHT');
      if ('error' in check) return check.error;
      const { user } = check;

      const mission = state.missoes.find((m) => m.id === missionId);
      if (!mission) return { ok: false, message: 'Missão não encontrada.' };
      if (!['EM_TRANSPORTE', 'RETORNO_EM_ANDAMENTO'].includes(mission.estado)) {
        const res = { ok: false, message: 'O drone precisa estar em voo simulado para registrar chegada.' };
        pushToast('warning', res.message);
        return res;
      }

      const activeLeg = state.trechos.find((t) => t.id === mission.trechoAtivoId);
      if (!activeLeg) return { ok: false, message: 'Trecho ativo não encontrado.' };

      const lastTel = state.telemetria
        .filter((t) => t.trechoId === activeLeg.id)
        .sort((a, b) => b.dataHora.localeCompare(a.dataHora))[0];

      const now = nowIso();
      const arrivalTel = {
        id: uid('tel'),
        missaoId: mission.id,
        trechoId: activeLeg.id,
        droneId: mission.droneId ?? '',
        dataHora: now,
        progressoPct: 100,
        velocidadeKmh: 0,
        altitudeM: 0,
        bateriaPct: Math.max(12, (lastTel?.bateriaPct ?? 70) - 4),
        temperaturaCargaC: lastTel?.temperaturaCargaC ?? 4.3,
        umidadePct: lastTel?.umidadePct ?? 60,
        vibracaoG: 0.05,
        ventoKmh: mission.climaSimulado.ventoKmh,
        comunicacao: 'ESTAVEL' as const,
        simulado: true as const,
      };

      // Case A: Outbound leg arrives at destination (NEVER auto-delivered!)
      if (activeLeg.tipo === 'IDA') {
        const evt = buildEvent(
          user,
          'MISSAO',
          mission.id,
          mission.estado,
          'CHEGOU_AO_DESTINO',
          'Chegada simulada registrada no destino. Entrega aguarda conferência e confirmação humana.',
          mission.id
        );

        setState((prev) => ({
          ...prev,
          missoes: prev.missoes.map((m) =>
            m.id === mission.id ? { ...m, estado: 'CHEGOU_AO_DESTINO', atualizadoEm: now } : m
          ),
          trechos: prev.trechos.map((t) =>
            t.id === activeLeg.id
              ? { ...t, estado: 'CHEGOU_AO_DESTINO', progressoPct: 100, chegadaEm: now }
              : t
          ),
          cargas: activeLeg.cargaId
            ? prev.cargas.map((c) =>
                c.id === activeLeg.cargaId ? { ...c, estado: 'AGUARDANDO_CONFERENCIA' } : c
              )
            : prev.cargas,
          drones: prev.drones.map((d) =>
            d.id === mission.droneId
              ? {
                  ...d,
                  bateriaAtualPct: arrivalTel.bateriaPct,
                  localizacaoAtualId: activeLeg.destinoId,
                  horasVooSimuladas: Number((d.horasVooSimuladas + activeLeg.tempoEstimadoMin / 60).toFixed(1)),
                }
              : d
          ),
          telemetria: [...prev.telemetria, arrivalTel],
          eventos: [evt, ...prev.eventos],
        }));

        pushToast(
          'success',
          `Chegada simulada registrada para ${mission.codigo}. Instituição notificada para conferência (entrega NÃO marcada automaticamente).`
        );
        return { ok: true, message: 'Chegada ao destino registrada.' };
      }

      // Case B: Return with cargo arrives at return destination (awaits conference!)
      if (activeLeg.tipo === 'RETORNO_COM_CARGA') {
        const evt = buildEvent(
          user,
          'TRECHO',
          activeLeg.id,
          activeLeg.estado,
          'CHEGOU_AO_DESTINO',
          `Chegada do trecho de retorno ${activeLeg.codigo}. Aguardando conferência da carga de retorno.`,
          mission.id
        );

        setState((prev) => ({
          ...prev,
          trechos: prev.trechos.map((t) =>
            t.id === activeLeg.id
              ? { ...t, estado: 'CHEGOU_AO_DESTINO', progressoPct: 100, chegadaEm: now }
              : t
          ),
          cargas: activeLeg.cargaId
            ? prev.cargas.map((c) =>
                c.id === activeLeg.cargaId ? { ...c, estado: 'AGUARDANDO_CONFERENCIA' } : c
              )
            : prev.cargas,
          drones: prev.drones.map((d) =>
            d.id === mission.droneId
              ? {
                  ...d,
                  bateriaAtualPct: arrivalTel.bateriaPct,
                  localizacaoAtualId: activeLeg.destinoId,
                  horasVooSimuladas: Number((d.horasVooSimuladas + activeLeg.tempoEstimadoMin / 60).toFixed(1)),
                }
              : d
          ),
          telemetria: [...prev.telemetria, arrivalTel],
          eventos: [evt, ...prev.eventos],
        }));

        pushToast('success', 'Chegada do retorno com carga registrada! Realize a conferência e aceite da carga de retorno.');
        return { ok: true, message: 'Chegada de retorno registrada.' };
      }

      // Case C: Empty return arrives at base -> EM_POS_OPERACAO
      const baseOp = state.instituicoes.find((i) => i.tipo === 'BASE_OPERACIONAL');
      const evt = buildEvent(
        user,
        'MISSAO',
        mission.id,
        mission.estado,
        'EM_POS_OPERACAO',
        'Retorno vazio concluído na Base Operacional. Drone encaminhado para inspeção e higienização pós-operação.',
        mission.id
      );

      setState((prev) => ({
        ...prev,
        missoes: prev.missoes.map((m) =>
          m.id === mission.id ? { ...m, estado: 'EM_POS_OPERACAO', atualizadoEm: now } : m
        ),
        trechos: prev.trechos.map((t) =>
          t.id === activeLeg.id
            ? { ...t, estado: 'CONCLUIDO', progressoPct: 100, chegadaEm: now, concluidoEm: now }
            : t
        ),
        drones: prev.drones.map((d) =>
          d.id === mission.droneId
            ? {
                ...d,
                estado: 'EM_INSPECAO',
                higienizacaoLiberada: false,
                bateriaAtualPct: arrivalTel.bateriaPct,
                localizacaoAtualId: baseOp?.id ?? activeLeg.destinoId,
                horasVooSimuladas: Number((d.horasVooSimuladas + activeLeg.tempoEstimadoMin / 60).toFixed(1)),
              }
            : d
        ),
        telemetria: [...prev.telemetria, arrivalTel],
        eventos: [evt, ...prev.eventos],
      }));

      pushToast('success', 'Drone retornou à Base Operacional. Prossiga para Pós-operação (Inspeção e Higienização).');
      return { ok: true, message: 'Chegada à base registrada.' };
    },
    [requireAuthAndRole, state.missoes, state.trechos, state.telemetria, state.instituicoes, pushToast]
  );

  // 10. Advance Flight Progress
  const advanceFlightProgress: MedAirContextValue['advanceFlightProgress'] = useCallback(
    (missionId, stepPct = 20) => {
      const check = requireAuthAndRole('MONITOR_FLIGHT');
      if ('error' in check) return check.error;

      const mission = state.missoes.find((m) => m.id === missionId);
      if (!mission) return { ok: false, message: 'Missão não encontrada.' };
      if (!['EM_TRANSPORTE', 'RETORNO_EM_ANDAMENTO'].includes(mission.estado)) {
        const res = { ok: false, message: 'A missão precisa estar em voo simulado para avançar o trajeto.' };
        pushToast('warning', res.message);
        return res;
      }

      const activeLeg = state.trechos.find((t) => t.id === mission.trechoAtivoId);
      if (!activeLeg || activeLeg.estado !== 'EM_VOO') {
        const res = { ok: false, message: 'O trecho ativo não está em voo simulado.' };
        pushToast('warning', res.message);
        return res;
      }

      const nextPct = Math.min(100, activeLeg.progressoPct + stepPct);
      if (nextPct >= 100) {
        return simulateArrival(missionId);
      }

      const lastTel = state.telemetria
        .filter((t) => t.trechoId === activeLeg.id)
        .sort((a, b) => b.dataHora.localeCompare(a.dataHora))[0];

      const now = nowIso();
      const baseTemp = lastTel?.temperaturaCargaC ?? 4.2;
      const drift = (Math.random() - 0.48) * 0.25;
      const newBat = Math.max(14, (lastTel?.bateriaPct ?? 78) - 5);
      const tel = {
        id: uid('tel'),
        missaoId: mission.id,
        trechoId: activeLeg.id,
        droneId: mission.droneId ?? '',
        dataHora: now,
        progressoPct: nextPct,
        velocidadeKmh: Number((47 + Math.random() * 6).toFixed(1)),
        altitudeM: Math.round(98 + Math.random() * 14),
        bateriaPct: newBat,
        temperaturaCargaC: Number((baseTemp + drift).toFixed(1)),
        umidadePct: Math.round(56 + Math.random() * 7),
        vibracaoG: Number((0.18 + Math.random() * 0.08).toFixed(2)),
        ventoKmh: Number((mission.climaSimulado.ventoKmh + (Math.random() - 0.5) * 2).toFixed(1)),
        comunicacao: 'ESTAVEL' as const,
        simulado: true as const,
      };

      setState((prev) => ({
        ...prev,
        trechos: prev.trechos.map((t) =>
          t.id === activeLeg.id ? { ...t, progressoPct: nextPct } : t
        ),
        drones: prev.drones.map((d) =>
          d.id === mission.droneId ? { ...d, bateriaAtualPct: newBat } : d
        ),
        telemetria: [...prev.telemetria, tel],
      }));

      pushToast('info', `Voo simulado avançado para ${nextPct}% (${formatTemp(tel.temperaturaCargaC)} · Bateria ${formatPercent(newBat, 0)}).`);
      return { ok: true, message: `Progresso atualizado para ${nextPct}%.` };
    },
    [requireAuthAndRole, state.missoes, state.trechos, state.telemetria, simulateArrival, pushToast]
  );

  // 11. Simulate Anomaly (Temperature, Battery, Comm)
  const simulateAnomaly: MedAirContextValue['simulateAnomaly'] = useCallback(
    (missionId, type) => {
      const check = requireAuthAndRole('SIMULATE');
      if ('error' in check) return check.error;
      const { user } = check;

      const mission = state.missoes.find((m) => m.id === missionId);
      if (!mission) return { ok: false, message: 'Selecione uma missão ativa primeiro.' };

      const activeLeg = state.trechos.find((t) => t.id === mission.trechoAtivoId);
      const lastTel = state.telemetria
        .filter((t) => t.missaoId === mission.id)
        .sort((a, b) => b.dataHora.localeCompare(a.dataHora))[0];

      const now = nowIso();
      const occId = uid('occ');
      const occCode = `OCR-2026-${String(state.ocorrencias.length + 1).padStart(3, '0')}`;

      let telTemp = lastTel?.temperaturaCargaC ?? 4.3;
      let telBat = lastTel?.bateriaPct ?? 75;
      let telComm: 'ESTAVEL' | 'INSTAVEL' | 'PERDA_SINAL' = lastTel?.comunicacao ?? 'ESTAVEL';
      let gravidade: OccurrenceSeverity = 'CRITICA';
      let tipoAlerta: 'DESVIO_TERMICO' | 'BATERIA_BAIXA' | 'PERDA_COMUNICACAO' = 'DESVIO_TERMICO';
      let titulo = '';
      let descricao = '';
      let leitura = '';

      if (type === 'TEMPERATURA') {
        telTemp = 10.6;
        gravidade = 'CRITICA';
        tipoAlerta = 'DESVIO_TERMICO';
        titulo = 'Desvio térmico simulado acima da faixa permitida';
        descricao = 'Sensor térmico simulado do compartimento registrou elevação acima de 8,0 °C durante o transporte.';
        leitura = `Temperatura simulada: ${formatTemp(telTemp)} (Faixa: 2,0 °C – 8,0 °C)`;
      } else if (type === 'BATERIA') {
        telBat = 22;
        gravidade = 'CRITICA';
        tipoAlerta = 'BATERIA_BAIXA';
        titulo = 'Bateria simulada abaixo do limiar de alerta';
        descricao = 'Queda simulada de autonomia energética detectada abaixo do parâmetro de segurança configurado.';
        leitura = `Bateria simulada: ${formatPercent(telBat, 0)} (Alerta: ≤ ${formatPercent(state.regrasConfig.bateriaMinimaAlertaPct, 0)})`;
      } else {
        telComm = 'PERDA_SINAL';
        gravidade = 'CRITICA';
        tipoAlerta = 'PERDA_COMUNICACAO';
        titulo = 'Perda de comunicação simulada com o drone';
        descricao = 'Interrupção simulada no enlace de telemetria durante o trecho ativo. Requer avaliação humana.';
        leitura = 'Comunicação simulada: PERDA DE SINAL · Último pacote atrasado';
      }

      const newTel = {
        id: uid('tel'),
        missaoId: mission.id,
        trechoId: activeLeg?.id ?? '',
        droneId: mission.droneId ?? '',
        dataHora: now,
        progressoPct: activeLeg?.progressoPct ?? lastTel?.progressoPct ?? 50,
        velocidadeKmh: lastTel?.velocidadeKmh ?? 48.0,
        altitudeM: lastTel?.altitudeM ?? 102,
        bateriaPct: telBat,
        temperaturaCargaC: telTemp,
        umidadePct: lastTel?.umidadePct ?? 61,
        vibracaoG: type === 'BATERIA' ? 0.34 : lastTel?.vibracaoG ?? 0.24,
        ventoKmh: lastTel?.ventoKmh ?? mission.climaSimulado.ventoKmh,
        comunicacao: telComm,
        simulado: true as const,
      };

      const newOcc = {
        id: occId,
        codigo: occCode,
        missaoId: mission.id,
        trechoId: activeLeg?.id,
        gravidade,
        status: 'ABERTA' as const,
        tipoAlerta,
        titulo,
        descricao,
        leituraSensorSimulada: leitura,
        dataHoraAbertura: now,
        abertaPorId: user.id,
        abertaPorNome: user.nome,
        historico: [
          {
            id: uid('och'),
            dataHora: now,
            usuarioId: user.id,
            usuarioNome: user.nome,
            statusAnterior: 'ABERTA' as const,
            novoStatus: 'ABERTA' as const,
            providencia: `Alerta gerado via Simulador (${leitura}). Requer validação humana.`,
          },
        ],
      };

      const evt = buildEvent(
        user,
        'OCORRENCIA',
        occId,
        'SEM_OCORRENCIA',
        'ABERTA',
        `Ocorrência ${occCode} aberta automaticamente: ${titulo}.`,
        mission.id
      );

      setState((prev) => ({
        ...prev,
        telemetria: [...prev.telemetria, newTel],
        ocorrencias: [newOcc, ...prev.ocorrencias],
        drones:
          type === 'BATERIA' && mission.droneId
            ? prev.drones.map((d) =>
                d.id === mission.droneId ? { ...d, bateriaAtualPct: telBat } : d
              )
            : prev.drones,
        eventos: [evt, ...prev.eventos],
      }));

      pushToast('error', `Alerta simulado! Ocorrência ${occCode} aberta (${titulo}).`);
      return { ok: true, message: `Ocorrência ${occCode} registrada.` };
    },
    [requireAuthAndRole, state.missoes, state.trechos, state.telemetria, state.ocorrencias.length, state.regrasConfig.bateriaMinimaAlertaPct, pushToast]
  );

  // Contingency
  const enterContingency: MedAirContextValue['enterContingency'] = useCallback(
    (missionId, justification) => {
      const check = requireAuthAndRole('MANAGE_OCCURRENCE');
      if ('error' in check) return check.error;
      const { user } = check;
      if (!justification.trim()) {
        const res = { ok: false, message: 'Justificativa obrigatória para acionar contingência.' };
        pushToast('error', res.message);
        return res;
      }
      const mission = state.missoes.find((m) => m.id === missionId);
      if (!mission) return { ok: false, message: 'Missão não encontrada.' };

      const evt = buildEvent(
        user,
        'MISSAO',
        mission.id,
        mission.estado,
        'EM_CONTINGENCIA',
        justification.trim(),
        mission.id
      );

      setState((prev) => ({
        ...prev,
        missoes: prev.missoes.map((m) =>
          m.id === mission.id
            ? {
                ...m,
                estadoAnteriorContingencia: m.estado,
                estado: 'EM_CONTINGENCIA',
                atualizadoEm: nowIso(),
              }
            : m
        ),
        trechos: prev.trechos.map((t) =>
          t.id === mission.trechoAtivoId ? { ...t, estado: 'EM_CONTINGENCIA' } : t
        ),
        eventos: [evt, ...prev.eventos],
      }));

      pushToast('warning', `Missão ${mission.codigo} colocada em CONTINGÊNCIA.`);
      return { ok: true, message: 'Contingência acionada.' };
    },
    [requireAuthAndRole, state.missoes, pushToast]
  );

  const resolveContingency: MedAirContextValue['resolveContingency'] = useCallback(
    (missionId, targetState, justification) => {
      const check = requireAuthAndRole('MANAGE_OCCURRENCE');
      if ('error' in check) return check.error;
      const { user } = check;
      if (!justification.trim()) {
        const res = { ok: false, message: 'Informe justificativa para retomar a missão após contingência.' };
        pushToast('error', res.message);
        return res;
      }
      const mission = state.missoes.find((m) => m.id === missionId);
      if (!mission || mission.estado !== 'EM_CONTINGENCIA') {
        return { ok: false, message: 'Missão não está em contingência.' };
      }

      const evt = buildEvent(
        user,
        'MISSAO',
        mission.id,
        'EM_CONTINGENCIA',
        targetState,
        justification.trim(),
        mission.id
      );

      setState((prev) => ({
        ...prev,
        missoes: prev.missoes.map((m) =>
          m.id === mission.id ? { ...m, estado: targetState, atualizadoEm: nowIso() } : m
        ),
        trechos: prev.trechos.map((t) =>
          t.id === mission.trechoAtivoId
            ? { ...t, estado: targetState === 'EM_POS_OPERACAO' ? 'CONCLUIDO' : 'EM_VOO' }
            : t
        ),
        eventos: [evt, ...prev.eventos],
      }));

      pushToast('success', `Contingência resolvida: missão ${mission.codigo} em ${targetState}.`);
      return { ok: true, message: 'Contingência resolvida.' };
    },
    [requireAuthAndRole, state.missoes, pushToast]
  );

  // Occurrences
  const registerManualOccurrence: MedAirContextValue['registerManualOccurrence'] = useCallback(
    (input) => {
      const check = requireAuthAndRole('MANAGE_OCCURRENCE');
      if ('error' in check) return check.error;
      const { user } = check;
      if (!input.titulo.trim() || !input.descricao.trim()) {
        const res = { ok: false, message: 'Título e descrição da ocorrência são obrigatórios.' };
        pushToast('error', res.message);
        return res;
      }
      const now = nowIso();
      const occId = uid('occ');
      const occCode = `OCR-2026-${String(state.ocorrencias.length + 1).padStart(3, '0')}`;
      const newOcc = {
        id: occId,
        codigo: occCode,
        missaoId: input.missionId,
        trechoId: input.trechoId,
        gravidade: input.gravidade,
        status: 'ABERTA' as const,
        tipoAlerta: input.tipoAlerta,
        titulo: input.titulo.trim(),
        descricao: input.descricao.trim(),
        leituraSensorSimulada: input.leituraSensorSimulada.trim() || 'Registro manual do operador (simulado)',
        dataHoraAbertura: now,
        abertaPorId: user.id,
        abertaPorNome: user.nome,
        historico: [
          {
            id: uid('och'),
            dataHora: now,
            usuarioId: user.id,
            usuarioNome: user.nome,
            statusAnterior: 'ABERTA' as const,
            novoStatus: 'ABERTA' as const,
            providencia: 'Ocorrência registrada manualmente sem alterar histórico prévio.',
          },
        ],
      };

      const evt = buildEvent(
        user,
        'OCORRENCIA',
        occId,
        'NOVO',
        'ABERTA',
        `Ocorrência ${occCode} (${input.gravidade}) registrada: ${input.titulo.trim()}.`,
        input.missionId
      );

      setState((prev) => ({
        ...prev,
        ocorrencias: [newOcc, ...prev.ocorrencias],
        eventos: [evt, ...prev.eventos],
      }));

      pushToast('warning', `Ocorrência ${occCode} registrada.`);
      return { ok: true, message: `Ocorrência ${occCode} aberta.` };
    },
    [requireAuthAndRole, state.ocorrencias.length, pushToast]
  );

  const updateOccurrence: MedAirContextValue['updateOccurrence'] = useCallback(
    ({ occId, novoStatus, providencia, atribuirParaMim, justificativaEncerramento }) => {
      const check = requireAuthAndRole('MANAGE_OCCURRENCE');
      if ('error' in check) return check.error;
      const { user } = check;

      const occ = state.ocorrencias.find((o) => o.id === occId);
      if (!occ) return { ok: false, message: 'Ocorrência não encontrada.' };
      if (occ.status === 'ENCERRADA') {
        const res = { ok: false, message: 'Ocorrência encerrada não pode ser alterada (histórico imutável).' };
        pushToast('warning', res.message);
        return res;
      }
      if (!providencia.trim()) {
        const res = { ok: false, message: 'Registre a providência tomada.' };
        pushToast('error', res.message);
        return res;
      }
      if (novoStatus === 'ENCERRADA' && !justificativaEncerramento?.trim()) {
        const res = { ok: false, message: 'Encerramento exige justificativa formal obrigatória.' };
        pushToast('error', res.message);
        return res;
      }

      const now = nowIso();
      const histItem = {
        id: uid('och'),
        dataHora: now,
        usuarioId: user.id,
        usuarioNome: user.nome,
        statusAnterior: occ.status,
        novoStatus,
        providencia:
          novoStatus === 'ENCERRADA'
            ? `${providencia.trim()} | Encerramento: ${justificativaEncerramento?.trim()}`
            : providencia.trim(),
      };

      const evt = buildEvent(
        user,
        'OCORRENCIA',
        occ.id,
        occ.status,
        novoStatus,
        novoStatus === 'ENCERRADA'
          ? `Encerrada: ${justificativaEncerramento?.trim()}`
          : providencia.trim(),
        occ.missaoId
      );

      // If closing a thermal or comm alert, also append nominal recovery telemetry if mission is flying
      const mission = state.missoes.find((m) => m.id === occ.missaoId);
      const extraTel: Telemetria[] = [];
      if (
        novoStatus === 'ENCERRADA' &&
        mission &&
        ['EM_TRANSPORTE', 'RETORNO_EM_ANDAMENTO'].includes(mission.estado)
      ) {
        const lastTel = state.telemetria
          .filter((t) => t.missaoId === mission.id)
          .sort((a, b) => b.dataHora.localeCompare(a.dataHora))[0];
        if (lastTel) {
          extraTel.push({
            ...lastTel,
            id: uid('tel'),
            dataHora: now,
            temperaturaCargaC: occ.tipoAlerta === 'DESVIO_TERMICO' ? 4.6 : lastTel.temperaturaCargaC,
            comunicacao: occ.tipoAlerta === 'PERDA_COMUNICACAO' ? ('ESTAVEL' as const) : lastTel.comunicacao,
            bateriaPct: occ.tipoAlerta === 'BATERIA_BAIXA' ? Math.max(lastTel.bateriaPct, 42) : lastTel.bateriaPct,
          });
        }
      }

      setState((prev) => ({
        ...prev,
        ocorrencias: prev.ocorrencias.map((o) =>
          o.id === occ.id
            ? {
                ...o,
                status: novoStatus,
                responsavelId: atribuirParaMim || !o.responsavelId ? user.id : o.responsavelId,
                responsavelNome: atribuirParaMim || !o.responsavelNome ? user.nome : o.responsavelNome,
                providenciaAtual: providencia.trim(),
                justificativaEncerramento:
                  novoStatus === 'ENCERRADA' ? justificativaEncerramento?.trim() : o.justificativaEncerramento,
                encerradaPorId: novoStatus === 'ENCERRADA' ? user.id : o.encerradaPorId,
                encerradaPorNome: novoStatus === 'ENCERRADA' ? user.nome : o.encerradaPorNome,
                dataHoraEncerramento: novoStatus === 'ENCERRADA' ? now : o.dataHoraEncerramento,
                historico: [...o.historico, histItem],
              }
            : o
        ),
        telemetria: extraTel.length > 0 ? [...prev.telemetria, ...extraTel] : prev.telemetria,
        eventos: [evt, ...prev.eventos],
      }));

      pushToast('success', `Ocorrência ${occ.codigo} atualizada para ${novoStatus}.`);
      return { ok: true, message: 'Ocorrência atualizada.' };
    },
    [requireAuthAndRole, state.ocorrencias, state.missoes, state.telemetria, pushToast]
  );

  // 12. Receiving & Conference
  const startDestinationConference: MedAirContextValue['startDestinationConference'] = useCallback(
    (missionId, cargoId) => {
      const check = requireAuthAndRole('RECEIVE_CARGO');
      if ('error' in check) return check.error;
      const { user } = check;
      const mission = state.missoes.find((m) => m.id === missionId);
      const cargo = state.cargas.find((c) => c.id === cargoId);
      if (!mission || !cargo) return { ok: false, message: 'Missão ou carga não encontrada.' };

      const isPrimary = cargo.solicitacaoId === mission.solicitacaoPrincipalId;
      if (isPrimary && mission.estado !== 'CHEGOU_AO_DESTINO') {
        return { ok: false, message: 'A missão precisa ter chegada registrada ao destino.' };
      }

      const evt = buildEvent(
        user,
        'MISSAO',
        mission.id,
        mission.estado,
        isPrimary ? 'EM_CONFERENCIA' : mission.estado,
        `Conferência física demonstrativa iniciada para ${cargo.codigo}.`,
        mission.id
      );

      setState((prev) => ({
        ...prev,
        missoes: isPrimary
          ? prev.missoes.map((m) =>
              m.id === mission.id ? { ...m, estado: 'EM_CONFERENCIA', atualizadoEm: nowIso() } : m
            )
          : prev.missoes,
        eventos: [evt, ...prev.eventos],
      }));

      pushToast('info', `Conferência iniciada para carga ${cargo.codigo}.`);
      return { ok: true, message: 'Conferência iniciada.' };
    },
    [requireAuthAndRole, state.missoes, state.cargas, pushToast]
  );

  const confirmCargoReceiving: MedAirContextValue['confirmCargoReceiving'] = useCallback(
    ({ missionId, cargoId, decision, integridadeEmbalagem, lacreConferido, temperaturaEntregaC, justificativa }) => {
      const check = requireAuthAndRole('RECEIVE_CARGO');
      if ('error' in check) return check.error;
      const { user } = check;

      const mission = state.missoes.find((m) => m.id === missionId);
      const cargo = state.cargas.find((c) => c.id === cargoId);
      if (!mission || !cargo) return { ok: false, message: 'Missão ou carga não encontrada.' };

      if ((decision === 'ACEITA_COM_RESSALVA' || decision === 'RECUSADA') && !justificativa.trim()) {
        const res = {
          ok: false,
          message: 'Regra obrigatória: aceite com ressalva ou recusa exigem justificativa formal.',
        };
        pushToast('error', res.message);
        return res;
      }

      const leg = state.trechos.find((t) => t.cargaId === cargo.id);
      const destInst = state.instituicoes.find((i) => i.id === leg?.destinoId);
      const drone = state.drones.find((d) => d.id === mission.droneId);
      const baseOp = state.instituicoes.find((i) => i.tipo === 'BASE_OPERACIONAL');
      const isPrimary = cargo.solicitacaoId === mission.solicitacaoPrincipalId;
      const now = nowIso();

      const nextCargoState =
        decision === 'ACEITA'
          ? 'ENTREGUE'
          : decision === 'ACEITA_COM_RESSALVA'
            ? 'ENTREGUE_COM_RESSALVA'
            : 'RECUSADA';

      const nextMissionState: MissionState = isPrimary
        ? decision === 'ACEITA'
          ? 'ENTREGA_CONFIRMADA'
          : decision === 'ACEITA_COM_RESSALVA'
            ? 'ENTREGA_COM_RESSALVA'
            : 'RECEBIMENTO_RECUSADO'
        : 'EM_POS_OPERACAO';

      const custodyId = uid('cus');
      const custodyCode = `CUST-2026-${String(state.custodias.length + 1).padStart(3, '0')}`;
      const newCustody = {
        id: custodyId,
        codigo: custodyCode,
        cargaId: cargo.id,
        missaoId: mission.id,
        trechoId: leg?.id ?? '',
        tipoTransferencia:
          decision === 'RECUSADA'
            ? ('DEVOLUCAO_RECUSA' as const)
            : isPrimary
              ? ('ENTREGA_DESTINO' as const)
              : ('ENTREGA_RETORNO' as const),
        deParte: `MedAir Logistics (Drone ${drone?.codigo ?? '—'})`,
        paraParte: destInst?.nome ?? 'Instituição Destinatária',
        codigoLacre: cargo.codigoLacre ?? 'N/I',
        condicaoEmbalagem:
          integridadeEmbalagem === 'INTEGRA'
            ? 'Íntegra'
            : integridadeEmbalagem === 'AVARIA_LEVE'
              ? 'Avaria leve'
              : 'Violada',
        temperaturaRegistradaC: temperaturaEntregaC,
        dataHora: now,
        usuarioResponsavelId: user.id,
        usuarioResponsavelNome: user.nome,
        observacoes:
          justificativa.trim() ||
          `Recebimento confirmado (${decision}) com lacre ${lacreConferido ? 'conferido' : 'divergente'}.`,
      };

      const evt = buildEvent(
        user,
        'MISSAO',
        mission.id,
        mission.estado,
        nextMissionState,
        isPrimary
          ? `Recebimento da carga ${cargo.codigo}: ${decision}. Custódia ${custodyCode} gerada.`
          : `Entrega da carga de retorno ${cargo.codigo}: ${decision}. Drone encaminhado à base para pós-operação.`,
        mission.id
      );

      setState((prev) => ({
        ...prev,
        missoes: prev.missoes.map((m) =>
          m.id === mission.id ? { ...m, estado: nextMissionState, atualizadoEm: now } : m
        ),
        trechos: prev.trechos.map((t) =>
          t.id === leg?.id ? { ...t, estado: 'CONCLUIDO', concluidoEm: now } : t
        ),
        cargas: prev.cargas.map((c) =>
          c.id === cargo.id
            ? {
                ...c,
                estado: nextCargoState,
                temperaturaEntregaC,
                conferidaPorId: user.id,
                conferidaEm: now,
                decisaoRecebimento: decision,
                justificativaRecebimento: justificativa.trim() || undefined,
                integridadeEmbalagemEntrega: integridadeEmbalagem,
                lacreConferidoEntrega: lacreConferido,
              }
            : c
        ),
        drones: !isPrimary
          ? prev.drones.map((d) =>
              d.id === mission.droneId
                ? {
                    ...d,
                    estado: 'EM_INSPECAO',
                    higienizacaoLiberada: false,
                    localizacaoAtualId: baseOp?.id ?? d.localizacaoAtualId,
                  }
                : d
            )
          : prev.drones,
        custodias: [newCustody, ...prev.custodias],
        eventos: [evt, ...prev.eventos],
      }));

      pushToast(
        decision === 'RECUSADA' ? 'warning' : 'success',
        isPrimary
          ? `Conferência concluída (${nextCargoState}). Comprovante e custódia ${custodyCode} gerados!`
          : `Carga de retorno conferida (${nextCargoState}). Missão avançou para Pós-operação.`
      );
      return { ok: true, message: 'Recebimento registrado.' };
    },
    [requireAuthAndRole, state.missoes, state.cargas, state.trechos, state.instituicoes, state.drones, state.custodias.length, pushToast]
  );

  // 13. Reverse Logistics
  const startReverseLogisticsAnalysis: MedAirContextValue['startReverseLogisticsAnalysis'] = useCallback(
    (missionId) => {
      const check = requireAuthAndRole('REVERSE_LOGISTICS');
      if ('error' in check) return check.error;
      const { user } = check;
      const mission = state.missoes.find((m) => m.id === missionId);
      if (!mission) return { ok: false, message: 'Missão não encontrada.' };
      if (!['ENTREGA_CONFIRMADA', 'ENTREGA_COM_RESSALVA', 'RECEBIMENTO_RECUSADO'].includes(mission.estado)) {
        return { ok: false, message: 'A entrega principal precisa ser concluída antes da análise de retorno.' };
      }

      const evt = buildEvent(
        user,
        'MISSAO',
        mission.id,
        mission.estado,
        'ANALISANDO_RETORNO',
        'Análise de logística reversa iniciada após conclusão do trecho principal.',
        mission.id
      );

      setState((prev) => ({
        ...prev,
        missoes: prev.missoes.map((m) =>
          m.id === mission.id ? { ...m, estado: 'ANALISANDO_RETORNO', atualizadoEm: nowIso() } : m
        ),
        eventos: [evt, ...prev.eventos],
      }));
      pushToast('info', 'Análise de Logística Reversa iniciada.');
      return { ok: true, message: 'Análise iniciada.' };
    },
    [requireAuthAndRole, state.missoes, pushToast]
  );

  const confirmQuickReturnSanitization: MedAirContextValue['confirmQuickReturnSanitization'] = useCallback(
    (missionId, notes) => {
      const check = requireAuthAndRole('REVERSE_LOGISTICS');
      if ('error' in check) return check.error;
      const { user } = check;
      const mission = state.missoes.find((m) => m.id === missionId);
      if (!mission || !mission.droneId) return { ok: false, message: 'Missão ou drone não encontrado.' };

      const now = nowIso();
      const higId = uid('hig');
      const newHig = {
        id: higId,
        droneId: mission.droneId,
        missaoId: mission.id,
        dataHora: now,
        responsavelId: user.id,
        responsavelNome: user.nome,
        protocoloAplicado: 'Higienização rápida / troca de módulo térmico selado para logística reversa (Fictício)',
        compartimentoTermicoHigienizado: true,
        liberadoParaReuso: true,
        observacoes: notes.trim() || 'Compartimento validado para embarque de carga de retorno.',
      };

      const evt = buildEvent(
        user,
        'HIGIENIZACAO',
        higId,
        'PENDENTE',
        'LIBERADO_REUSO_RETORNO',
        'Higienização/módulo selado confirmado para viabilizar logística reversa.',
        mission.id
      );

      setState((prev) => ({
        ...prev,
        drones: prev.drones.map((d) =>
          d.id === mission.droneId
            ? { ...d, higienizacaoLiberada: true, ultimaHigienizacaoEm: now }
            : d
        ),
        higienizacoes: [newHig, ...prev.higienizacoes],
        eventos: [evt, ...prev.eventos],
      }));

      pushToast('success', 'Higienização / troca de módulo confirmada para o retorno.');
      return { ok: true, message: 'Higienização de retorno registrada.' };
    },
    [requireAuthAndRole, state.missoes, pushToast]
  );

  const decideReverseLogistics: MedAirContextValue['decideReverseLogistics'] = useCallback(
    ({ missionId, decision, candidateSolId, justification }) => {
      const check = requireAuthAndRole('REVERSE_LOGISTICS');
      if ('error' in check) return check.error;
      const { user } = check;

      const mission = state.missoes.find((m) => m.id === missionId);
      if (!mission) return { ok: false, message: 'Missão não encontrada.' };

      if (
        ![
          'ENTREGA_CONFIRMADA',
          'ENTREGA_COM_RESSALVA',
          'RECEBIMENTO_RECUSADO',
          'ANALISANDO_RETORNO',
          'RETORNO_PENDENTE',
        ].includes(mission.estado)
      ) {
        const res = { ok: false, message: 'Estado da missão não permite decisão de logística reversa agora.' };
        pushToast('warning', res.message);
        return res;
      }

      const now = nowIso();
      const baseOp = state.instituicoes.find((i) => i.tipo === 'BASE_OPERACIONAL');
      const primaryReq = state.solicitacoes.find((s) => s.id === mission.solicitacaoPrincipalId);

      if (decision === 'COM_CARGA') {
        const candidate = state.solicitacoes.find((s) => s.id === candidateSolId);
        if (!candidate) {
          const res = { ok: false, message: 'Selecione uma solicitação candidata para retorno com carga.' };
          pushToast('error', res.message);
          return res;
        }
        const evalRes = evaluateReverseLogisticsCandidate(mission, candidate, state);
        if (evalRes.classificacao === 'INCOMPATIVEL') {
          const res = {
            ok: false,
            message: 'Regra impeditiva: não é permitido aprovar carga de retorno classificada como INCOMPATÍVEL.',
          };
          pushToast('error', res.message);
          return res;
        }
        const drone = state.drones.find((d) => d.id === mission.droneId);
        if (drone && !drone.higienizacaoLiberada) {
          const res = {
            ok: false,
            message: 'Regra impeditiva: confirme a higienização do compartimento antes de reutilizá-lo no retorno.',
          };
          pushToast('error', res.message);
          return res;
        }

        const orig = state.instituicoes.find((i) => i.id === candidate.origemId);
        const dest = state.instituicoes.find((i) => i.id === candidate.destinoId);
        const distKm = computeSimulatedDistanceKm(orig, dest);
        const estMin = computeSimulatedMinutes(distKm);
        const legId = uid('trc');
        const cargoId = uid('crg');
        const seqCode = mission.codigo.replace('MIS-2026-', '');

        const newLeg = {
          id: legId,
          codigo: `TRC-${seqCode}-RET`,
          missaoId: mission.id,
          ordem: 2,
          tipo: 'RETORNO_COM_CARGA' as const,
          origemId: candidate.origemId,
          destinoId: candidate.destinoId,
          cargaId: cargoId,
          estado: 'EM_PREPARACAO' as const,
          progressoPct: 0,
          distanciaKm: distKm,
          tempoEstimadoMin: estMin,
        };

        const newCargo = {
          id: cargoId,
          codigo: `CRG-2026-${seqCode}R`,
          solicitacaoId: candidate.id,
          missaoId: mission.id,
          trechoId: legId,
          tipo: candidate.tipoCarga,
          descricao: candidate.descricaoCarga,
          pesoKg: candidate.pesoKg,
          dimensoesCm: { ...candidate.dimensoesCm },
          volumeEstimadoL: candidate.volumeEstimadoL,
          requerControleTermico: candidate.requerControleTermico,
          tempMinC: candidate.tempMinC,
          tempMaxC: candidate.tempMaxC,
          requisitosConservacao: candidate.requisitosConservacao,
          estado: 'EM_PREPARACAO' as const,
          documentacaoValidada: false,
        };

        const evt = buildEvent(
          user,
          'MISSAO',
          mission.id,
          mission.estado,
          'RETORNO_APROVADO',
          justification.trim() ||
            `Retorno com carga aprovado (${candidate.codigo}). Novo trecho ${newLeg.codigo} e carga ${newCargo.codigo} criados.`,
          mission.id
        );

        setState((prev) => ({
          ...prev,
          missoes: prev.missoes.map((m) =>
            m.id === mission.id
              ? {
                  ...m,
                  estado: 'RETORNO_APROVADO',
                  solicitacaoRetornoId: candidate.id,
                  trechoAtivoId: legId,
                  retornoAvaliado: true,
                  retornoTipoDecidido: 'COM_CARGA',
                  retornoDecididoPorId: user.id,
                  retornoDecididoEm: now,
                  custoEstimadoSimuladoBrl: computeSimulatedCostBrl(
                    m.distanciaEstimadaKm + distKm,
                    m.prioridade,
                    true
                  ),
                  atualizadoEm: now,
                }
              : m
          ),
          solicitacoes: prev.solicitacoes.map((s) =>
            s.id === candidate.id ? { ...s, status: 'VINCULADA_RETORNO', missaoId: mission.id } : s
          ),
          trechos: [...prev.trechos, newLeg],
          cargas: [...prev.cargas, newCargo],
          eventos: [evt, ...prev.eventos],
        }));

        pushToast('success', `Retorno com carga aprovado! Trecho ${newLeg.codigo} criado. Colete e lacre a nova carga no módulo Retorno.`);
        return { ok: true, message: 'Retorno com carga aprovado.' };
      }

      // Empty return
      const origInst = state.instituicoes.find((i) => i.id === primaryReq?.destinoId);
      const distKm = computeSimulatedDistanceKm(origInst, baseOp);
      const estMin = computeSimulatedMinutes(distKm);
      const legId = uid('trc');
      const seqCode = mission.codigo.replace('MIS-2026-', '');

      const emptyLeg = {
        id: legId,
        codigo: `TRC-${seqCode}-RET`,
        missaoId: mission.id,
        ordem: 2,
        tipo: 'RETORNO_VAZIO' as const,
        origemId: primaryReq?.destinoId ?? 'inst-hosp-b',
        destinoId: baseOp?.id ?? 'inst-base',
        estado: 'PRONTO' as const,
        progressoPct: 0,
        distanciaKm: distKm,
        tempoEstimadoMin: estMin,
      };

      const evt = buildEvent(
        user,
        'MISSAO',
        mission.id,
        mission.estado,
        'RETORNO_SEM_CARGA',
        justification.trim() || 'Aprovado retorno vazio até a Base Operacional.',
        mission.id
      );

      setState((prev) => ({
        ...prev,
        missoes: prev.missoes.map((m) =>
          m.id === mission.id
            ? {
                ...m,
                estado: 'RETORNO_SEM_CARGA',
                trechoAtivoId: legId,
                retornoAvaliado: true,
                retornoTipoDecidido: 'VAZIO',
                retornoDecididoPorId: user.id,
                retornoDecididoEm: now,
                atualizadoEm: now,
              }
            : m
        ),
        trechos: [...prev.trechos, emptyLeg],
        eventos: [evt, ...prev.eventos],
      }));

      pushToast('info', `Retorno vazio aprovado (${emptyLeg.codigo}). Inicie o voo de retorno à base.`);
      return { ok: true, message: 'Retorno vazio aprovado.' };
    },
    [requireAuthAndRole, state, pushToast]
  );

  // 14. Simulate Return Cargo Available
  const simulateReturnCargoAvailable: MedAirContextValue['simulateReturnCargoAvailable'] = useCallback(
    (missionId) => {
      const check = requireAuthAndRole('SIMULATE');
      if ('error' in check) return check.error;
      const { user } = check;

      const mission = state.missoes.find((m) => m.id === (missionId ?? state.missaoAtivaId));
      const primaryReq = state.solicitacoes.find((s) => s.id === mission?.solicitacaoPrincipalId);
      const originId =
        primaryReq?.destinoId === 'inst-hosp-b' ? 'inst-lab-b' : primaryReq?.destinoId ?? 'inst-lab-b';
      const destId = primaryReq?.origemId ?? 'inst-hosp-a';

      const seq = state.solicitacoes.length + 1;
      const solId = uid('sol');
      const codigo = `SOL-2026-${String(seq).padStart(3, '0')}R`;
      const newSol: Solicitacao = {
        id: solId,
        codigo,
        instituicaoSolicitanteId: originId,
        responsavelInstitucional: 'Bioméd. Fernanda Matos (Simulado)',
        origemId: originId,
        destinoId: destId,
        tipoCarga: 'AMOSTRA_LABORATORIAL',
        descricaoCarga: `Amostras laboratoriais fictícias geradas para retorno #${seq}`,
        prioridade: 'NORMAL',
        pesoKg: 1.3,
        dimensoesCm: { comprimento: 20, largura: 15, altura: 14 },
        volumeEstimadoL: 3.8,
        requerControleTermico: true,
        tempMinC: 2.0,
        tempMaxC: 8.0,
        requisitosConservacao: '2,0 °C a 8,0 °C — caixa selada pronta para logística reversa.',
        prazoDesejadoIso: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        observacoesOperacionais: 'Carga fictícia gerada pelo Simulador próxima ao destino da entrega.',
        confirmacaoDadosFicticios: true,
        status: 'DISPONIVEL_RETORNO',
        criadoEm: nowIso(),
        criadoPorId: user.id,
        elegivelLogisticaReversa: true,
      };

      const evt = buildEvent(
        user,
        'SOLICITACAO',
        solId,
        'SIMULADOR',
        'DISPONIVEL_RETORNO',
        `Solicitação fictícia ${codigo} gerada para demonstração de logística reversa.`,
        mission?.id
      );

      setState((prev) => ({
        ...prev,
        solicitacoes: [newSol, ...prev.solicitacoes],
        eventos: [evt, ...prev.eventos],
      }));

      pushToast('success', `Carga fictícia ${codigo} gerada e disponível no módulo Logística Reversa!`);
      return { ok: true, message: `Solicitação ${codigo} criada.` };
    },
    [requireAuthAndRole, state.missoes, state.missaoAtivaId, state.solicitacoes, pushToast]
  );

  // 15. Post-Op Inspection, Sanitization, Maintenance & Fleet
  const registerDroneInspection: MedAirContextValue['registerDroneInspection'] = useCallback(
    (input) => {
      const check = requireAuthAndRole('FLEET_MAINTENANCE');
      if ('error' in check) return check.error;
      const { user } = check;

      const drone = state.drones.find((d) => d.id === input.droneId);
      if (!drone) return { ok: false, message: 'Drone não encontrado.' };

      const now = nowIso();
      const inspId = uid('insp');
      const newInsp = {
        id: inspId,
        droneId: drone.id,
        missaoId: input.missionId,
        dataHora: now,
        responsavelId: user.id,
        responsavelNome: user.nome,
        bateriaAvaliadaPct: input.bateriaAvaliadaPct,
        integridadeCompartimentoOk: input.integridadeCompartimentoOk,
        estruturaHelicesOk: input.estruturaHelicesOk,
        sensoresSimuladosOk: input.sensoresSimuladosOk,
        aprovado: input.aprovado,
        observacoes: input.observacoes.trim() || 'Inspeção pós-operação registrada.',
      };

      const nextDroneState: DroneState = !input.aprovado
        ? 'BLOQUEADO'
        : drone.higienizacaoLiberada
          ? 'DISPONIVEL'
          : 'EM_HIGIENIZACAO';

      const evt = buildEvent(
        user,
        'INSPECAO',
        inspId,
        drone.estado,
        nextDroneState,
        `Inspeção do drone ${drone.codigo}: ${input.aprovado ? 'Aprovada' : 'Reprovada / Bloqueado'}. Bateria ${formatPercent(input.bateriaAvaliadaPct, 0)}.`,
        input.missionId
      );

      setState((prev) => ({
        ...prev,
        inspecoes: [newInsp, ...prev.inspecoes],
        drones: prev.drones.map((d) =>
          d.id === drone.id
            ? {
                ...d,
                estado: nextDroneState,
                bateriaAtualPct: input.bateriaAvaliadaPct,
                ultimaInspecaoEm: now,
              }
            : d
        ),
        missoes: input.missionId
          ? prev.missoes.map((m) =>
              m.id === input.missionId ? { ...m, posOperacaoInspecaoId: inspId, atualizadoEm: now } : m
            )
          : prev.missoes,
        eventos: [evt, ...prev.eventos],
      }));

      pushToast(
        input.aprovado ? 'success' : 'warning',
        input.aprovado
          ? `Inspeção de ${drone.codigo} aprovada! Estado: ${nextDroneState}.`
          : `Drone ${drone.codigo} bloqueado após reprovação na inspeção.`
      );
      return { ok: true, message: 'Inspeção registrada.' };
    },
    [requireAuthAndRole, state.drones, pushToast]
  );

  const registerDroneSanitization: MedAirContextValue['registerDroneSanitization'] = useCallback(
    (input) => {
      const check = requireAuthAndRole('FLEET_MAINTENANCE');
      if ('error' in check) return check.error;
      const { user } = check;

      const drone = state.drones.find((d) => d.id === input.droneId);
      if (!drone) return { ok: false, message: 'Drone não encontrado.' };

      const now = nowIso();
      const higId = uid('hig');
      const newHig = {
        id: higId,
        droneId: drone.id,
        missaoId: input.missionId,
        dataHora: now,
        responsavelId: user.id,
        responsavelNome: user.nome,
        protocoloAplicado: input.protocoloAplicado.trim() || 'Protocolo Demonstrativo de Higienização',
        compartimentoTermicoHigienizado: input.compartimentoTermicoHigienizado,
        liberadoParaReuso: input.liberadoParaReuso,
        observacoes: input.observacoes.trim() || 'Higienização registrada.',
      };

      const hasOpenMaint = state.manutencoes.some(
        (m) => m.droneId === drone.id && m.status === 'ABERTA'
      );
      const nextDroneState: DroneState =
        drone.estado === 'BLOQUEADO' || hasOpenMaint
          ? drone.estado
          : input.liberadoParaReuso
            ? 'DISPONIVEL'
            : 'EM_HIGIENIZACAO';

      const evt = buildEvent(
        user,
        'HIGIENIZACAO',
        higId,
        drone.estado,
        nextDroneState,
        `Higienização de ${drone.codigo}: ${input.liberadoParaReuso ? 'Liberado para reuso' : 'Pendente'}.`,
        input.missionId
      );

      setState((prev) => ({
        ...prev,
        higienizacoes: [newHig, ...prev.higienizacoes],
        drones: prev.drones.map((d) =>
          d.id === drone.id
            ? {
                ...d,
                estado: nextDroneState,
                higienizacaoLiberada: input.liberadoParaReuso,
                ultimaHigienizacaoEm: now,
              }
            : d
        ),
        missoes: input.missionId
          ? prev.missoes.map((m) =>
              m.id === input.missionId ? { ...m, posOperacaoHigienizacaoId: higId, atualizadoEm: now } : m
            )
          : prev.missoes,
        eventos: [evt, ...prev.eventos],
      }));

      pushToast(
        'success',
        input.liberadoParaReuso
          ? `Higienização de ${drone.codigo} concluída! Estado da frota: ${nextDroneState}.`
          : `Higienização registrada (ainda não liberado para reuso).`
      );
      return { ok: true, message: 'Higienização registrada.' };
    },
    [requireAuthAndRole, state.drones, state.manutencoes, pushToast]
  );

  const openDroneMaintenance: MedAirContextValue['openDroneMaintenance'] = useCallback(
    (droneId, tipo, descricao) => {
      const check = requireAuthAndRole('FLEET_MAINTENANCE');
      if ('error' in check) return check.error;
      const { user } = check;
      if (!descricao.trim()) {
        const res = { ok: false, message: 'Descreva o serviço de manutenção.' };
        pushToast('error', res.message);
        return res;
      }
      const drone = state.drones.find((d) => d.id === droneId);
      if (!drone) return { ok: false, message: 'Drone não encontrado.' };
      if (drone.estado === 'EM_MISSAO') {
        const res = { ok: false, message: 'Não é possível abrir manutenção enquanto o drone está em missão.' };
        pushToast('error', res.message);
        return res;
      }

      const now = nowIso();
      const mntId = uid('mnt');
      const newMnt = {
        id: mntId,
        droneId: drone.id,
        tipo,
        status: 'ABERTA' as const,
        descricao: descricao.trim(),
        iniciadaEm: now,
        responsavelId: user.id,
        responsavelNome: user.nome,
      };
      const evt = buildEvent(
        user,
        'MANUTENCAO',
        mntId,
        drone.estado,
        'EM_MANUTENCAO',
        `Manutenção ${tipo} aberta para ${drone.codigo}: ${descricao.trim()}.`
      );

      setState((prev) => ({
        ...prev,
        manutencoes: [newMnt, ...prev.manutencoes],
        drones: prev.drones.map((d) =>
          d.id === drone.id ? { ...d, estado: 'EM_MANUTENCAO' } : d
        ),
        eventos: [evt, ...prev.eventos],
      }));
      pushToast('warning', `Manutenção ${tipo} aberta para ${drone.codigo}.`);
      return { ok: true, message: 'Manutenção aberta.' };
    },
    [requireAuthAndRole, state.drones, pushToast]
  );

  const completeDroneMaintenance: MedAirContextValue['completeDroneMaintenance'] = useCallback(
    (manutencaoId, parecerFinal) => {
      const check = requireAuthAndRole('FLEET_MAINTENANCE');
      if ('error' in check) return check.error;
      const { user } = check;
      if (!parecerFinal.trim()) {
        const res = { ok: false, message: 'Informe o parecer técnico final da manutenção.' };
        pushToast('error', res.message);
        return res;
      }
      const mnt = state.manutencoes.find((m) => m.id === manutencaoId);
      if (!mnt) return { ok: false, message: 'Ordem de manutenção não encontrada.' };
      const drone = state.drones.find((d) => d.id === mnt.droneId);
      const now = nowIso();

      const nextDroneState: DroneState = drone?.higienizacaoLiberada ? 'DISPONIVEL' : 'EM_INSPECAO';
      const evt = buildEvent(
        user,
        'MANUTENCAO',
        mnt.id,
        'EM_MANUTENCAO',
        nextDroneState,
        `Manutenção concluída (${drone?.codigo}): ${parecerFinal.trim()}.`
      );

      setState((prev) => ({
        ...prev,
        manutencoes: prev.manutencoes.map((m) =>
          m.id === mnt.id
            ? { ...m, status: 'CONCLUIDA', concluidaEm: now, parecerFinal: parecerFinal.trim() }
            : m
        ),
        drones: prev.drones.map((d) =>
          d.id === mnt.droneId ? { ...d, estado: nextDroneState, bateriaAtualPct: 95 } : d
        ),
        eventos: [evt, ...prev.eventos],
      }));
      pushToast('success', `Manutenção concluída! Drone ${drone?.codigo} movido para ${nextDroneState}.`);
      return { ok: true, message: 'Manutenção concluída.' };
    },
    [requireAuthAndRole, state.manutencoes, state.drones, pushToast]
  );

  const setDroneFleetState: MedAirContextValue['setDroneFleetState'] = useCallback(
    (droneId, newState, justification) => {
      const check = requireAuthAndRole('FLEET_MAINTENANCE');
      if ('error' in check) return check.error;
      const { user } = check;
      if (!justification.trim()) {
        const res = { ok: false, message: 'Informe justificativa para alterar o estado da frota.' };
        pushToast('error', res.message);
        return res;
      }
      const drone = state.drones.find((d) => d.id === droneId);
      if (!drone) return { ok: false, message: 'Drone não encontrado.' };
      if (drone.estado === 'EM_MISSAO') {
        const res = { ok: false, message: 'Não é possível alterar manualmente o estado de um drone EM_MISSAO.' };
        pushToast('error', res.message);
        return res;
      }
      if (newState === 'DISPONIVEL' && !drone.higienizacaoLiberada) {
        const res = {
          ok: false,
          message: 'Regra impeditiva: não é permitido liberar drone para DISPONIVEL sem higienização aprovada.',
        };
        pushToast('error', res.message);
        return res;
      }

      const evt = buildEvent(
        user,
        'DRONE',
        drone.id,
        drone.estado,
        newState,
        justification.trim()
      );

      setState((prev) => ({
        ...prev,
        drones: prev.drones.map((d) => (d.id === drone.id ? { ...d, estado: newState } : d)),
        eventos: [evt, ...prev.eventos],
      }));
      pushToast('info', `Drone ${drone.codigo} alterado para ${newState}.`);
      return { ok: true, message: 'Estado do drone atualizado.' };
    },
    [requireAuthAndRole, state.drones, pushToast]
  );

  const closeMission: MedAirContextValue['closeMission'] = useCallback(
    (missionId, justification) => {
      const check = requireAuthAndRole('CLOSE_MISSION');
      if ('error' in check) return check.error;
      const { user } = check;

      const mission = state.missoes.find((m) => m.id === missionId);
      if (!mission) return { ok: false, message: 'Missão não encontrada.' };

      const validation = validateMissionClosurePreconditions(state, mission);
      if (!validation.ok) {
        const res = { ok: false, message: `Encerramento bloqueado: ${validation.blockers[0]}` };
        pushToast('error', res.message);
        return res;
      }

      const now = nowIso();
      const evt = buildEvent(
        user,
        'MISSAO',
        mission.id,
        mission.estado,
        'ENCERRADA',
        justification.trim() || 'Missão formalmente encerrada após inspeção, higienização e validações.',
        mission.id
      );

      setState((prev) => ({
        ...prev,
        missoes: prev.missoes.map((m) =>
          m.id === mission.id
            ? { ...m, estado: 'ENCERRADA', encerradoEm: now, atualizadoEm: now }
            : m
        ),
        solicitacoes: prev.solicitacoes.map((s) =>
          s.id === mission.solicitacaoPrincipalId || s.id === mission.solicitacaoRetornoId
            ? { ...s, status: 'CONCLUIDA' }
            : s
        ),
        eventos: [evt, ...prev.eventos],
      }));

      pushToast('success', `Missão ${mission.codigo} encerrada! Indicadores operacionais atualizados.`);
      return { ok: true, message: 'Missão encerrada.' };
    },
    [requireAuthAndRole, state, pushToast]
  );

  // Smart Demo Step Advancer for Simulator Panel
  const advanceDemoStep: MedAirContextValue['advanceDemoStep'] = useCallback(
    (missionId) => {
      const mission = state.missoes.find((m) => m.id === missionId);
      if (!mission) {
        const res = { ok: false, message: 'Selecione uma missão ativa no Simulador.' };
        pushToast('info', res.message);
        return res;
      }

      switch (mission.estado) {
        case 'DESPACHADA':
        case 'RETORNO_SEM_CARGA':
          return startSimulatedFlight(mission.id);
        case 'RETORNO_APROVADO': {
          const retLeg = state.trechos.find((t) => t.id === mission.trechoAtivoId);
          const retCargo = state.cargas.find((c) => c.id === retLeg?.cargaId);
          if (retCargo && retCargo.estado === 'VALIDADA_LACRADA') {
            return startSimulatedFlight(mission.id);
          }
          const msg = 'Próxima etapa humana: colete e lacre a carga de retorno no módulo "Retorno" antes de decolar.';
          pushToast('info', msg);
          return { ok: false, message: msg };
        }
        case 'EM_TRANSPORTE':
        case 'RETORNO_EM_ANDAMENTO': {
          const activeLeg = state.trechos.find((t) => t.id === mission.trechoAtivoId);
          if (activeLeg && activeLeg.estado === 'CHEGOU_AO_DESTINO') {
            const msg = 'O drone chegou ao destino. Realize a conferência e aceite da carga no módulo "Retorno" ou "Portal Hospitalar".';
            pushToast('info', msg);
            return { ok: false, message: msg };
          }
          return advanceFlightProgress(mission.id, 25);
        }
        case 'EM_PLANEJAMENTO': {
          const msg = 'Próxima etapa humana: acesse "Planejamento" para comparar drones e submeter à aprovação.';
          pushToast('info', msg);
          return { ok: false, message: msg };
        }
        case 'AGUARDANDO_APROVACAO': {
          const msg = 'Próxima etapa humana: acesse "Aprovação e Despacho" para registrar a aprovação humana.';
          pushToast('info', msg);
          return { ok: false, message: msg };
        }
        case 'APROVADA':
        case 'CARGA_EM_PREPARACAO': {
          const msg = 'Próxima etapa humana: acesse "Coleta e Preparação" para lacrar a carga e registrar custódia.';
          pushToast('info', msg);
          return { ok: false, message: msg };
        }
        case 'CARGA_VALIDADA': {
          const msg = 'Próxima etapa humana: conclua o checklist pré-despacho e realize o despacho em "Aprovação e Despacho".';
          pushToast('info', msg);
          return { ok: false, message: msg };
        }
        case 'CHEGOU_AO_DESTINO':
        case 'EM_CONFERENCIA': {
          const msg = 'Próxima etapa humana: realize a conferência e aceite da carga em "Chegada e Entrega" ou "Portal -> Recebimento".';
          pushToast('info', msg);
          return { ok: false, message: msg };
        }
        case 'ENTREGA_CONFIRMADA':
        case 'ENTREGA_COM_RESSALVA':
        case 'RECEBIMENTO_RECUSADO':
        case 'ANALISANDO_RETORNO': {
          const msg = 'Próxima etapa humana: acesse "Logística Reversa" para aprovar retorno com carga ou retorno vazio.';
          pushToast('info', msg);
          return { ok: false, message: msg };
        }
        case 'EM_POS_OPERACAO': {
          const msg = 'Próxima etapa humana: registre inspeção, higienização e encerre a missão em "Pós-operação e Frota".';
          pushToast('info', msg);
          return { ok: false, message: msg };
        }
        default: {
          const msg = `Missão ${mission.codigo} está em "${mission.estado}". Verifique o Assistente Inteligente para detalhes.`;
          pushToast('info', msg);
          return { ok: false, message: msg };
        }
      }
    },
    [state.missoes, state.trechos, state.cargas, startSimulatedFlight, advanceFlightProgress, pushToast]
  );

  // Rules Config
  const updateRegrasConfig: MedAirContextValue['updateRegrasConfig'] = useCallback(
    (config) => {
      const check = requireAuthAndRole('EDIT_RULES');
      if ('error' in check) return check.error;
      const { user } = check;
      const evt = buildEvent(
        user,
        'SISTEMA',
        'regras-v1',
        'CONFIG_ANTERIOR',
        'CONFIG_ATUALIZADA',
        `Parâmetros do motor determinístico atualizados (Bateria mín. ${formatPercent(config.bateriaMinimaDespachoPct, 0)}, Vento máx. ${formatDecimal(config.ventoMaximoSimuladoKmh, 1)} km/h).`
      );
      setState((prev) => ({
        ...prev,
        regrasConfig: config,
        eventos: [evt, ...prev.eventos],
      }));
      pushToast('success', 'Parâmetros simulados do Assistente Inteligente atualizados.');
      return { ok: true, message: 'Regras salvas.' };
    },
    [requireAuthAndRole, pushToast]
  );

  const resetRegrasConfig: MedAirContextValue['resetRegrasConfig'] = useCallback(() => {
    return updateRegrasConfig({ ...DEFAULT_REGRAS_CONFIG });
  }, [updateRegrasConfig]);

  const value: MedAirContextValue = {
    state,
    currentUser,
    activeMission,
    toasts,
    dismissToast,
    pushToast,
    selectProfile,
    logout,
    setInterfaceMode,
    setActiveMission,
    restoreDemoData,
    createRequest,
    triageRequest,
    respondComplementation,
    cancelRequest,
    cancelMission,
    submitMissionPlan,
    approveMissionHuman,
    returnMissionToPlanning,
    toggleChecklistItem,
    dispatchMissionAdministrative,
    startCargoPreparation,
    validateAndSealCargo,
    startSimulatedFlight,
    advanceFlightProgress,
    simulateArrival,
    simulateAnomaly,
    enterContingency,
    resolveContingency,
    advanceDemoStep,
    simulateReturnCargoAvailable,
    registerManualOccurrence,
    updateOccurrence,
    startDestinationConference,
    confirmCargoReceiving,
    startReverseLogisticsAnalysis,
    confirmQuickReturnSanitization,
    decideReverseLogistics,
    registerDroneInspection,
    registerDroneSanitization,
    openDroneMaintenance,
    completeDroneMaintenance,
    setDroneFleetState,
    closeMission,
    updateRegrasConfig,
    resetRegrasConfig,
  };

  return <MedAirContext.Provider value={value}>{children}</MedAirContext.Provider>;
}

export function useMedAir() {
  const ctx = useContext(MedAirContext);
  if (!ctx) {
    throw new Error('useMedAir must be used within MedAirProvider');
  }
  return ctx;
}
