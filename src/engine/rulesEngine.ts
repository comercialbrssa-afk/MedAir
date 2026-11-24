import type {
  AppState,
  AssistantRecommendation,
  CriterionEvaluation,
  Drone,
  DroneCompatibilityResult,
  IndicadorRelatorio,
  Missao,
  ReverseLogisticsEvaluation,
  Solicitacao,
  Telemetria,
} from '../types/domain';
import {
  formatDecimal,
  formatKg,
  formatKm,
  formatLiters,
  formatPercent,
  formatTemp,
} from '../utils/formatters';
import {
  computeSimulatedDistanceKm,
  validateDispatchPreconditions,
  validateMissionClosurePreconditions,
} from './stateMachine';

export const ASSISTANT_DISCLAIMER =
  'Parâmetros fictícios de demonstração — Requer validação humana';

export function evaluateDroneCompatibility(
  drone: Drone,
  solicitacao: Solicitacao,
  distanceKm: number,
  state: AppState
): DroneCompatibilityResult {
  const cfg = state.regrasConfig;
  const criterios: CriterionEvaluation[] = [];

  // 1. Estado operacional da frota
  if (drone.estado === 'DISPONIVEL') {
    criterios.push({
      criterio: 'Disponibilidade da frota',
      status: 'OK',
      motivo: `Drone ${drone.codigo} encontra-se DISPONÍVEL para atribuição.`,
    });
  } else {
    criterios.push({
      criterio: 'Disponibilidade da frota',
      status: 'BLOQUEIO',
      motivo: `Drone em estado "${drone.estado}". Bloqueado para nova missão pela regra de frota.`,
    });
  }

  // 2. Higienização do compartimento
  if (drone.higienizacaoLiberada) {
    criterios.push({
      criterio: 'Higienização do compartimento',
      status: 'OK',
      motivo: 'Higienização liberada para uso hospitalar demonstrativo.',
    });
  } else {
    criterios.push({
      criterio: 'Higienização do compartimento',
      status: 'BLOQUEIO',
      motivo: 'Compartimento sem liberação formal de higienização pós-operação.',
    });
  }

  // 3. Peso
  if (solicitacao.pesoKg <= drone.capacidadePesoKg) {
    criterios.push({
      criterio: 'Capacidade de peso',
      status: 'OK',
      motivo: `Carga de ${formatKg(solicitacao.pesoKg)} compatível com limite de ${formatKg(drone.capacidadePesoKg)}.`,
    });
  } else {
    criterios.push({
      criterio: 'Capacidade de peso',
      status: 'BLOQUEIO',
      motivo: `Carga (${formatKg(solicitacao.pesoKg)}) excede capacidade máxima (${formatKg(drone.capacidadePesoKg)}).`,
    });
  }

  // 4. Volume
  if (solicitacao.volumeEstimadoL <= drone.capacidadeVolumeL) {
    criterios.push({
      criterio: 'Capacidade volumétrica',
      status: 'OK',
      motivo: `Volume de ${formatLiters(solicitacao.volumeEstimadoL)} dentro do compartimento de ${formatLiters(drone.capacidadeVolumeL)}.`,
    });
  } else {
    criterios.push({
      criterio: 'Capacidade volumétrica',
      status: 'BLOQUEIO',
      motivo: `Volume (${formatLiters(solicitacao.volumeEstimadoL)}) supera o compartimento (${formatLiters(drone.capacidadeVolumeL)}).`,
    });
  }

  // 5. Controle térmico
  if (solicitacao.requerControleTermico) {
    const minReq = solicitacao.tempMinC ?? cfg.faixaTermicaPadraoMinC;
    const maxReq = solicitacao.tempMaxC ?? cfg.faixaTermicaPadraoMaxC;
    if (!drone.possuiCompartimentoTermico) {
      criterios.push({
        criterio: 'Compartimento térmico',
        status: 'BLOQUEIO',
        motivo: 'Carga exige controle térmico, mas o drone não possui compartimento térmico ativo.',
      });
    } else if (drone.faixaTermicaMinC <= minReq && drone.faixaTermicaMaxC >= maxReq) {
      criterios.push({
        criterio: 'Compartimento térmico',
        status: 'OK',
        motivo: `Faixa exigida (${formatTemp(minReq)} a ${formatTemp(maxReq)}) atendida pelo compartimento (${formatTemp(drone.faixaTermicaMinC)} a ${formatTemp(drone.faixaTermicaMaxC)}).`,
      });
    } else {
      criterios.push({
        criterio: 'Compartimento térmico',
        status: 'BLOQUEIO',
        motivo: `Compartimento (${formatTemp(drone.faixaTermicaMinC)} a ${formatTemp(drone.faixaTermicaMaxC)}) não cobre integralmente ${formatTemp(minReq)} a ${formatTemp(maxReq)}.`,
      });
    }
  } else {
    criterios.push({
      criterio: 'Compartimento térmico',
      status: 'OK',
      motivo: 'Carga sem exigência de cadeia fria específica.',
    });
  }

  // 6. Autonomia com margem de segurança (ida + retorno estimado)
  const roundTripKm = distanceKm * 2;
  const requiredAutonomyKm = roundTripKm * (1 + cfg.margemAutonomiaSegurancaPct / 100);
  if (drone.autonomiaKm >= requiredAutonomyKm) {
    criterios.push({
      criterio: 'Autonomia estimada (ida/volta + margem)',
      status: 'OK',
      motivo: `Autonomia de ${formatKm(drone.autonomiaKm)} atende trajeto estimado de ${formatKm(roundTripKm)} com margem de ${formatPercent(cfg.margemAutonomiaSegurancaPct, 0)}.`,
    });
  } else if (drone.autonomiaKm >= distanceKm * 1.25) {
    criterios.push({
      criterio: 'Autonomia estimada (ida/volta + margem)',
      status: 'ATENCAO',
      motivo: `Autonomia (${formatKm(drone.autonomiaKm)}) cobre a ida, mas fica abaixo da margem recomendada para ida+volta (${formatKm(requiredAutonomyKm)}). Validar recarga no destino.`,
    });
  } else {
    criterios.push({
      criterio: 'Autonomia estimada (ida/volta + margem)',
      status: 'BLOQUEIO',
      motivo: `Autonomia insuficiente (${formatKm(drone.autonomiaKm)}) para a rota solicitada.`,
    });
  }

  // 7. Bateria atual
  if (drone.bateriaAtualPct >= cfg.bateriaMinimaDespachoPct) {
    criterios.push({
      criterio: 'Nível de bateria simulado',
      status: 'OK',
      motivo: `Bateria em ${formatPercent(drone.bateriaAtualPct, 0)} (mínimo configurado: ${formatPercent(cfg.bateriaMinimaDespachoPct, 0)}).`,
    });
  } else {
    criterios.push({
      criterio: 'Nível de bateria simulado',
      status: 'ATENCAO',
      motivo: `Bateria atual (${formatPercent(drone.bateriaAtualPct, 0)}) abaixo do limite mínimo de despacho (${formatPercent(cfg.bateriaMinimaDespachoPct, 0)}). Requer recarga/validação.`,
    });
  }

  const hasBlock = criterios.some((c) => c.status === 'BLOQUEIO');
  const hasWarn = criterios.some((c) => c.status === 'ATENCAO');

  const classificacao = hasBlock
    ? 'INCOMPATIVEL'
    : hasWarn
      ? 'PENDENTE_VALIDACAO'
      : 'COMPATIVEL';

  const resumo = hasBlock
    ? 'Incompatível por bloqueio operacional ou técnico.'
    : hasWarn
      ? 'Compatível com ressalvas — requer validação humana adicional.'
      : 'Compatível com todos os critérios determinísticos simulados.';

  return {
    droneId: drone.id,
    classificacao,
    criterios,
    resumo,
  };
}

export function evaluateReverseLogisticsCandidate(
  mission: Missao,
  candidate: Solicitacao,
  state: AppState
): ReverseLogisticsEvaluation {
  const cfg = state.regrasConfig;
  const criterios: CriterionEvaluation[] = [];
  const drone = state.drones.find((d) => d.id === mission.droneId);
  const primaryReq = state.solicitacoes.find(
    (s) => s.id === mission.solicitacaoPrincipalId
  );
  const primaryCargo = state.cargas.find(
    (c) => c.missaoId === mission.id && c.solicitacaoId === mission.solicitacaoPrincipalId
  );
  const primaryDest = state.instituicoes.find(
    (i) => i.id === primaryReq?.destinoId
  );
  const baseOp = state.instituicoes.find((i) => i.tipo === 'BASE_OPERACIONAL');
  const candOrigin = state.instituicoes.find((i) => i.id === candidate.origemId);
  const candDest = state.instituicoes.find((i) => i.id === candidate.destinoId);

  // 1. Origem / proximidade ao destino da ida
  const detourOriginKm = computeSimulatedDistanceKm(primaryDest, candOrigin);
  if (candidate.origemId === primaryReq?.destinoId || detourOriginKm <= cfg.distanciaMaximaDesvioRetornoKm) {
    criterios.push({
      criterio: 'Origem e proximidade',
      status: 'OK',
      motivo:
        candidate.origemId === primaryReq?.destinoId
          ? 'Origem coincide exatamente com o destino da entrega principal.'
          : `Origem (${candOrigin?.sigla}) a ${formatKm(detourOriginKm)} do destino atual (limite: ${formatKm(cfg.distanciaMaximaDesvioRetornoKm)}).`,
    });
  } else {
    criterios.push({
      criterio: 'Origem e proximidade',
      status: 'BLOQUEIO',
      motivo: `Desvio até a origem (${formatKm(detourOriginKm)}) excede o máximo configurado (${formatKm(cfg.distanciaMaximaDesvioRetornoKm)}).`,
    });
  }

  // 2. Destino no sentido do retorno
  const returnLegKm = computeSimulatedDistanceKm(candOrigin, candDest);
  const toBaseKm = computeSimulatedDistanceKm(candDest, baseOp);
  if (candDest && (candDest.cidadeRegiao.includes('Salvador') || toBaseKm <= 12)) {
    criterios.push({
      criterio: 'Destino no sentido de retorno',
      status: 'OK',
      motivo: `Destino (${candDest.sigla}) alinhado ao corredor de retorno para a base (+${formatKm(toBaseKm)} até a base).`,
    });
  } else {
    criterios.push({
      criterio: 'Destino no sentido de retorno',
      status: 'ATENCAO',
      motivo: `Destino fora do eixo direto da base (${formatKm(toBaseKm)} após entrega). Validar viabilidade.`,
    });
  }

  // 3. Peso
  if (drone && candidate.pesoKg <= drone.capacidadePesoKg) {
    criterios.push({
      criterio: 'Peso da carga de retorno',
      status: 'OK',
      motivo: `${formatKg(candidate.pesoKg)} suportados pelo drone ${drone.codigo} (máx. ${formatKg(drone.capacidadePesoKg)}).`,
    });
  } else {
    criterios.push({
      criterio: 'Peso da carga de retorno',
      status: 'BLOQUEIO',
      motivo: `Peso (${formatKg(candidate.pesoKg)}) excede a capacidade do drone atribuído.`,
    });
  }

  // 4. Volume
  if (drone && candidate.volumeEstimadoL <= drone.capacidadeVolumeL) {
    criterios.push({
      criterio: 'Volume estimado',
      status: 'OK',
      motivo: `${formatLiters(candidate.volumeEstimadoL)} compatível com o compartimento (${formatLiters(drone.capacidadeVolumeL)}).`,
    });
  } else {
    criterios.push({
      criterio: 'Volume estimado',
      status: 'BLOQUEIO',
      motivo: `Volume (${formatLiters(candidate.volumeEstimadoL)}) superior à capacidade disponível.`,
    });
  }

  // 5. Conservação e compartimento térmico
  if (!candidate.requerControleTermico) {
    criterios.push({
      criterio: 'Conservação e faixa térmica',
      status: 'OK',
      motivo: 'Carga de retorno sem exigência de cadeia fria.',
    });
  } else if (
    drone?.possuiCompartimentoTermico &&
    drone.faixaTermicaMinC <= (candidate.tempMinC ?? cfg.faixaTermicaPadraoMinC) &&
    drone.faixaTermicaMaxC >= (candidate.tempMaxC ?? cfg.faixaTermicaPadraoMaxC)
  ) {
    criterios.push({
      criterio: 'Conservação e faixa térmica',
      status: 'OK',
      motivo: `Compartimento térmico cobre ${formatTemp(candidate.tempMinC)} a ${formatTemp(candidate.tempMaxC)}.`,
    });
  } else {
    criterios.push({
      criterio: 'Conservação e faixa térmica',
      status: 'BLOQUEIO',
      motivo: 'Drone não atende à faixa térmica exigida pela carga de retorno.',
    });
  }

  // 6. Prazo desejado
  const deadlineMs = new Date(candidate.prazoDesejadoIso).getTime();
  const nowMs = Date.now();
  if (Number.isNaN(deadlineMs) || deadlineMs > nowMs - 1000 * 60 * 60 * 24) {
    criterios.push({
      criterio: 'Janela de prazo',
      status: 'OK',
      motivo: 'Prazo desejado compatível com o despacho imediato do trecho de retorno.',
    });
  } else {
    criterios.push({
      criterio: 'Janela de prazo',
      status: 'ATENCAO',
      motivo: 'Prazo desejado já ultrapassado ou muito curto — confirmar aceitação com o solicitante.',
    });
  }

  // 7. Compartimento & segregação biológica
  const primaryWasOrgan = primaryCargo?.tipo === 'ORGAO_TRANSPLANTE';
  const requerHigienizacaoPrevio = Boolean(drone && (!drone.higienizacaoLiberada || primaryWasOrgan));
  if (!requerHigienizacaoPrevio) {
    criterios.push({
      criterio: 'Compartimento e higienização',
      status: 'OK',
      motivo: 'Compartimento liberado para reuso no trecho de retorno.',
    });
  } else {
    criterios.push({
      criterio: 'Compartimento e higienização',
      status: 'ATENCAO',
      motivo:
        'Transporte anterior de material biológico/órgão exige confirmação de higienização rápida ou módulo selado independente antes do embarque de retorno.',
    });
  }

  // 8. Autonomia & bateria restante simulada
  const latestTelemetry = state.telemetria
    .filter((t) => t.missaoId === mission.id)
    .sort((a, b) => b.dataHora.localeCompare(a.dataHora))[0];
  const batteryNow = latestTelemetry?.bateriaPct ?? drone?.bateriaAtualPct ?? 70;
  const totalReturnDist = detourOriginKm + returnLegKm + toBaseKm;
  const availableRangeKm = drone ? (drone.autonomiaKm * batteryNow) / 100 : 0;

  if (availableRangeKm >= totalReturnDist * (1 + cfg.margemAutonomiaSegurancaPct / 100) && batteryNow >= cfg.bateriaMinimaAlertaPct + 10) {
    criterios.push({
      criterio: 'Autonomia e bateria restante',
      status: 'OK',
      motivo: `Bateria simulada em ${formatPercent(batteryNow, 0)} (alcance estimado ${formatKm(availableRangeKm)}) suficiente para retorno de ${formatKm(totalReturnDist)}.`,
    });
  } else if (availableRangeKm >= totalReturnDist) {
    criterios.push({
      criterio: 'Autonomia e bateria restante',
      status: 'ATENCAO',
      motivo: `Margem de bateria reduzida (${formatPercent(batteryNow, 0)} para ${formatKm(totalReturnDist)}). Recomenda-se recarga parcial no destino antes do retorno.`,
    });
  } else {
    criterios.push({
      criterio: 'Autonomia e bateria restante',
      status: 'BLOQUEIO',
      motivo: `Bateria simulada (${formatPercent(batteryNow, 0)}) insuficiente para o trecho de retorno (${formatKm(totalReturnDist)}).`,
    });
  }

  // 9. Documentação demonstrativa
  if (candidate.confirmacaoDadosFicticios && candidate.responsavelInstitucional.trim().length > 2) {
    criterios.push({
      criterio: 'Documentação demonstrativa',
      status: 'OK',
      motivo: 'Solicitação com responsável institucional e termo demonstrativo preenchidos.',
    });
  } else {
    criterios.push({
      criterio: 'Documentação demonstrativa',
      status: 'ATENCAO',
      motivo: 'Verificar dados do responsável institucional antes da coleta de retorno.',
    });
  }

  // 10. Proteção da missão principal
  const primaryDelivered =
    mission.estado === 'ENTREGA_CONFIRMADA' ||
    mission.estado === 'ENTREGA_COM_RESSALVA' ||
    mission.estado === 'ANALISANDO_RETORNO' ||
    mission.estado === 'RETORNO_PENDENTE';

  if (primaryDelivered) {
    criterios.push({
      criterio: 'Não comprometimento da missão principal',
      status: 'OK',
      motivo: 'Entrega principal já concluída; logística reversa não interfere no prazo primário.',
    });
  } else {
    criterios.push({
      criterio: 'Não comprometimento da missão principal',
      status: 'BLOQUEIO',
      motivo: 'A carga principal precisa ter sua destinação concluída antes de aprovar retorno com carga.',
    });
  }

  const hasBlock = criterios.some((c) => c.status === 'BLOQUEIO');
  const hasWarn = criterios.some((c) => c.status === 'ATENCAO');
  const classificacao = hasBlock
    ? 'INCOMPATIVEL'
    : hasWarn
      ? 'PENDENTE_VALIDACAO'
      : 'COMPATIVEL';

  const resumo = hasBlock
    ? 'Candidata incompatível com os limites operacionais atuais.'
    : hasWarn
      ? 'Elegível mediante validação humana e confirmação de higienização/bateria.'
      : 'Altamente compatível para aproveitamento do trecho de retorno.';

  return {
    solicitacaoId: candidate.id,
    classificacao,
    criterios,
    resumo,
    requerHigienizacaoPrevio,
  };
}

export function analyzeMissionForAssistant(
  state: AppState,
  mission: Missao | undefined
): AssistantRecommendation[] {
  const cfg = state.regrasConfig;
  const recs: AssistantRecommendation[] = [];

  if (!mission) {
    recs.push({
      id: 'no-mission',
      nivel: 'INFO',
      titulo: 'Nenhuma missão ativa selecionada',
      motivo: 'Selecione uma missão no painel ou crie uma nova solicitação para receber diagnósticos determinísticos.',
    });
    return recs;
  }

  const drone = state.drones.find((d) => d.id === mission.droneId);
  const activeLeg = state.trechos.find((t) => t.id === mission.trechoAtivoId);
  const activeCargo = state.cargas.find(
    (c) =>
      c.missaoId === mission.id &&
      (activeLeg?.cargaId ? c.id === activeLeg.cargaId : c.solicitacaoId === mission.solicitacaoPrincipalId)
  );
  const openOccs = state.ocorrencias.filter(
    (o) => o.missaoId === mission.id && o.status !== 'ENCERRADA'
  );
  const latestTel: Telemetria | undefined = state.telemetria
    .filter((t) => t.missaoId === mission.id)
    .sort((a, b) => b.dataHora.localeCompare(a.dataHora))[0];

  // Weather & route check
  if (mission.climaSimulado.ventoKmh > cfg.ventoMaximoSimuladoKmh) {
    recs.push({
      id: 'wind-limit',
      nivel: 'CRITICO',
      titulo: 'Vento simulado acima do limite operacional',
      motivo: `Vento atual de ${formatDecimal(mission.climaSimulado.ventoKmh, 1)} km/h excede o parâmetro configurado (${formatDecimal(cfg.ventoMaximoSimuladoKmh, 1)} km/h).`,
      acaoSugerida: 'Avaliar protocolo de contingência ou postergar decolagem simulada.',
    });
  } else if (mission.climaSimulado.condicao !== 'BOM') {
    recs.push({
      id: 'weather-warn',
      nivel: 'ATENCAO',
      titulo: 'Condição meteorológica simulada exige atenção',
      motivo: `Clima simulado indica "${mission.climaSimulado.condicao}" com vento de ${formatDecimal(mission.climaSimulado.ventoKmh, 1)} km/h.`,
      acaoSugerida: 'Confirmar margem de autonomia e visibilidade antes de avançar.',
    });
  }

  // Telemetry anomaly detection
  if (latestTel && (mission.estado === 'EM_TRANSPORTE' || mission.estado === 'RETORNO_EM_ANDAMENTO' || mission.estado === 'EM_CONTINGENCIA')) {
    if (activeCargo?.requerControleTermico) {
      const minC = activeCargo.tempMinC ?? cfg.faixaTermicaPadraoMinC;
      const maxC = activeCargo.tempMaxC ?? cfg.faixaTermicaPadraoMaxC;
      if (latestTel.temperaturaCargaC < minC || latestTel.temperaturaCargaC > maxC) {
        recs.push({
          id: 'temp-dev',
          nivel: 'CRITICO',
          titulo: 'Desvio térmico simulado detectado',
          motivo: `Temperatura simulada de ${formatTemp(latestTel.temperaturaCargaC)} está fora da faixa permitida (${formatTemp(minC)} a ${formatTemp(maxC)}).`,
          acaoSugerida: 'Tratar ocorrência térmica, notificar hospital de destino e avaliar contingência.',
        });
      }
    }

    if (latestTel.bateriaPct <= cfg.bateriaMinimaAlertaPct) {
      recs.push({
        id: 'bat-low',
        nivel: 'CRITICO',
        titulo: 'Bateria simulada em nível crítico',
        motivo: `Carga restante de ${formatPercent(latestTel.bateriaPct, 0)} está abaixo do alerta (${formatPercent(cfg.bateriaMinimaAlertaPct, 0)}).`,
        acaoSugerida: 'Priorizar pouso seguro simulado ou ativar contingência.',
      });
    }

    if (latestTel.comunicacao !== 'ESTAVEL') {
      recs.push({
        id: 'comm-loss',
        nivel: latestTel.comunicacao === 'PERDA_SINAL' ? 'CRITICO' : 'ATENCAO',
        titulo: `Comunicação simulada: ${latestTel.comunicacao === 'PERDA_SINAL' ? 'Perda de sinal' : 'Instável'}`,
        motivo: 'Degradação no enlace de telemetria simulada detectada durante o voo.',
        acaoSugerida: 'Registrar providência na ocorrência e aguardar restabelecimento supervisionado.',
      });
    }

    if (latestTel.vibracaoG > cfg.vibracaoMaximaG) {
      recs.push({
        id: 'vib-high',
        nivel: 'ATENCAO',
        titulo: 'Vibração estrutural simulada acima do limiar',
        motivo: `Leitura de ${formatDecimal(latestTel.vibracaoG, 2)} g ultrapassa o limite de ${formatDecimal(cfg.vibracaoMaximaG, 2)} g.`,
        acaoSugerida: 'Programar inspeção prioritária na pós-operação.',
      });
    }
  }

  // Open occurrences
  if (openOccs.length > 0) {
    const crit = openOccs.filter((o) => o.gravidade === 'CRITICA').length;
    recs.push({
      id: 'open-occs',
      nivel: crit > 0 ? 'CRITICO' : 'ATENCAO',
      titulo: `${openOccs.length} ocorrência(s) em aberto nesta missão`,
      motivo:
        crit > 0
          ? `${crit} ocorrência(s) crítica(s) bloqueiam o encerramento da missão até tratamento e justificativa formal.`
          : 'Existem ocorrências informativas/atenção aguardando acompanhamento.',
      acaoSugerida: 'Acessar o módulo Ocorrências para atribuir responsável e registrar providências.',
    });
  }

  // State-specific pending items & blockers
  if (mission.estado === 'EM_PLANEJAMENTO') {
    recs.push({
      id: 'plan-next',
      nivel: 'INFO',
      titulo: 'Pendência: seleção de drone e validação de rota',
      motivo: 'Compare os drones compatíveis e encaminhe a ordem de missão para aprovação humana.',
    });
  } else if (mission.estado === 'AGUARDANDO_APROVACAO') {
    recs.push({
      id: 'appr-next',
      nivel: 'ATENCAO',
      titulo: 'Pendência: aprovação humana da missão',
      motivo: 'A ordem de missão aguarda validação formal da Central Operacional antes da coleta.',
    });
  } else if (mission.estado === 'APROVADA' || mission.estado === 'CARGA_EM_PREPARACAO') {
    recs.push({
      id: 'prep-next',
      nivel: 'INFO',
      titulo: 'Pendência: coleta, lacre e custódia da carga',
      motivo: 'Registre embalagem, código do lacre, temperatura inicial e transferência de custódia.',
    });
  } else if (mission.estado === 'CARGA_VALIDADA') {
    const check = validateDispatchPreconditions(state, mission);
    if (!check.ok) {
      recs.push({
        id: 'disp-block',
        nivel: 'BLOQUEIO',
        titulo: 'Bloqueio de despacho administrativo',
        motivo: check.blockers.join(' '),
        acaoSugerida: 'Concluir todos os itens obrigatórios do checklist pré-despacho.',
      });
    } else {
      recs.push({
        id: 'disp-ready',
        nivel: 'INFO',
        titulo: 'Pré-requisitos de despacho satisfeitos',
        motivo: 'Carga lacrada, aprovação humana e checklist concluídos. Apto para despacho administrativo demonstrativo.',
      });
    }
  } else if (mission.estado === 'CHEGOU_AO_DESTINO') {
    recs.push({
      id: 'arr-conf',
      nivel: 'ATENCAO',
      titulo: 'Chegada registrada — entrega NÃO confirmada automaticamente',
      motivo: 'A regra operacional exige conferência de lacre, embalagem e confirmação por usuário autorizado no destino.',
    });
  } else if (
    mission.estado === 'ENTREGA_CONFIRMADA' ||
    mission.estado === 'ENTREGA_COM_RESSALVA' ||
    mission.estado === 'ANALISANDO_RETORNO'
  ) {
    const eligibleCount = state.solicitacoes.filter(
      (s) => s.status === 'DISPONIVEL_RETORNO'
    ).length;
    recs.push({
      id: 'rev-log',
      nivel: 'INFO',
      titulo: 'Análise de Logística Reversa disponível',
      motivo: `${eligibleCount} solicitação(ões) fictícia(s) disponível(is) para avaliação de aproveitamento do trecho de retorno.`,
      acaoSugerida: 'Acessar o módulo Logística Reversa para decisão humana (Retorno com carga ou Retorno vazio).',
    });
  } else if (mission.estado === 'EM_POS_OPERACAO') {
    const closeCheck = validateMissionClosurePreconditions(state, mission);
    if (!closeCheck.ok) {
      recs.push({
        id: 'close-block',
        nivel: 'BLOQUEIO',
        titulo: 'Pendências para encerramento da missão',
        motivo: closeCheck.blockers.join(' '),
        acaoSugerida: 'Registrar inspeção e higienização do drone no módulo Pós-operação e Frota.',
      });
    } else {
      recs.push({
        id: 'close-ready',
        nivel: 'INFO',
        titulo: 'Pronta para encerramento formal',
        motivo: 'Todos os trechos, cargas, ocorrências críticas, inspeção e higienização foram validados.',
      });
    }
  }

  if (drone && !drone.higienizacaoLiberada && mission.estado === 'EM_POS_OPERACAO') {
    recs.push({
      id: 'drone-san',
      nivel: 'ATENCAO',
      titulo: `Drone ${drone.codigo} bloqueado para reuso até higienização`,
      motivo: 'Regra sanitária demonstrativa impede atribuir o compartimento sem liberação formal.',
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: 'nominal',
      nivel: 'INFO',
      titulo: 'Parâmetros simulados dentro da faixa esperada',
      motivo: `Missão ${mission.codigo} operando conforme regras determinísticas da Versão 01.`,
    });
  }

  return recs;
}

export function computeSimulatedIndicators(
  state: AppState,
  filters?: {
    instituicaoId?: string;
    droneId?: string;
    tipoCarga?: string;
    periodoDias?: number;
  }
): IndicadorRelatorio {
  const now = Date.now();
  let missions = [...state.missoes];

  if (filters?.droneId && filters.droneId !== 'ALL') {
    missions = missions.filter((m) => m.droneId === filters.droneId);
  }
  if (filters?.instituicaoId && filters.instituicaoId !== 'ALL') {
    missions = missions.filter((m) => {
      const req = state.solicitacoes.find((s) => s.id === m.solicitacaoPrincipalId);
      return (
        req?.origemId === filters.instituicaoId ||
        req?.destinoId === filters.instituicaoId ||
        req?.instituicaoSolicitanteId === filters.instituicaoId
      );
    });
  }
  if (filters?.tipoCarga && filters.tipoCarga !== 'ALL') {
    missions = missions.filter((m) => {
      const req = state.solicitacoes.find((s) => s.id === m.solicitacaoPrincipalId);
      return req?.tipoCarga === filters.tipoCarga;
    });
  }
  if (filters?.periodoDias && filters.periodoDias > 0) {
    const cutoff = now - filters.periodoDias * 24 * 60 * 60 * 1000;
    missions = missions.filter((m) => new Date(m.criadoEm).getTime() >= cutoff);
  }

  const totalMissoes = missions.length;
  const concluidas = missions.filter((m) => m.estado === 'ENCERRADA');
  const missoesConcluidas = concluidas.length;

  // Simulated request-to-delivery and transport times
  const transportTimes = missions
    .map((m) => m.tempoEstimadoMin)
    .filter((v) => v > 0);
  const tempoMedioTransporteMin =
    transportTimes.length > 0
      ? Number(
          (
            transportTimes.reduce((acc, v) => acc + v, 0) / transportTimes.length
          ).toFixed(1)
        )
      : 0;

  const tempoMedioSolicitacaoEntregaMin =
    tempoMedioTransporteMin > 0
      ? Number((tempoMedioTransporteMin + 24.5).toFixed(1))
      : 0;

  // On-time delivery rate
  const deliveredMissions = missions.filter((m) =>
    [
      'ENTREGA_CONFIRMADA',
      'ENTREGA_COM_RESSALVA',
      'ANALISANDO_RETORNO',
      'RETORNO_PENDENTE',
      'RETORNO_APROVADO',
      'RETORNO_SEM_CARGA',
      'RETORNO_EM_ANDAMENTO',
      'EM_POS_OPERACAO',
      'ENCERRADA',
    ].includes(m.estado)
  );
  const onTimeCount = deliveredMissions.filter(
    (m) => m.estado !== 'ENTREGA_COM_RESSALVA'
  ).length;
  const entregasNoPrazoPct =
    deliveredMissions.length > 0
      ? Number(((onTimeCount / deliveredMissions.length) * 100).toFixed(1))
      : 100;

  // Thermal compliance
  const missionIds = new Set(missions.map((m) => m.id));
  const thermalCargos = state.cargas.filter(
    (c) => missionIds.has(c.missaoId) && c.requerControleTermico
  );
  const thermalDeviations = new Set(
    state.ocorrencias
      .filter((o) => missionIds.has(o.missaoId) && o.tipoAlerta === 'DESVIO_TERMICO')
      .map((o) => o.missaoId)
  );
  const compliantThermal = thermalCargos.filter(
    (c) => !thermalDeviations.has(c.missaoId)
  ).length;
  const conformidadeTermicaPct =
    thermalCargos.length > 0
      ? Number(((compliantThermal / thermalCargos.length) * 100).toFixed(1))
      : 100;

  // Occurrence rate
  const missionsWithOcc = new Set(
    state.ocorrencias
      .filter((o) => missionIds.has(o.missaoId))
      .map((o) => o.missaoId)
  );
  const taxaOcorrenciasPct =
    totalMissoes > 0
      ? Number(((missionsWithOcc.size / totalMissoes) * 100).toFixed(1))
      : 0;

  // Reverse logistics utilization
  const evaluatedReturns = missions.filter((m) => m.retornoAvaliado);
  const retornosElegiveis = evaluatedReturns.length;
  const retornosComCarga = evaluatedReturns.filter(
    (m) => m.retornoTipoDecidido === 'COM_CARGA'
  ).length;
  const aproveitamentoRetornoPct =
    retornosElegiveis > 0
      ? Number(((retornosComCarga / retornosElegiveis) * 100).toFixed(1))
      : 0;

  // Fleet utilization
  const activeDrones = state.drones.filter(
    (d) => d.estado === 'EM_MISSAO' || d.horasVooSimuladas > 15
  ).length;
  const utilizacaoFrotaPct =
    state.drones.length > 0
      ? Number(((activeDrones / state.drones.length) * 100).toFixed(1))
      : 0;

  const custoMedioSimuladoBrl =
    totalMissoes > 0
      ? Number(
          (
            missions.reduce((acc, m) => acc + m.custoEstimadoSimuladoBrl, 0) /
            totalMissoes
          ).toFixed(2)
        )
      : 0;

  return {
    totalMissoes,
    missoesConcluidas,
    tempoMedioSolicitacaoEntregaMin,
    tempoMedioTransporteMin,
    entregasNoPrazoPct,
    conformidadeTermicaPct,
    taxaOcorrenciasPct,
    retornosComCarga,
    retornosElegiveis,
    aproveitamentoRetornoPct,
    utilizacaoFrotaPct,
    custoMedioSimuladoBrl,
    simulado: true,
  };
}
