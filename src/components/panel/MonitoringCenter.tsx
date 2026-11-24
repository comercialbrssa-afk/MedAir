import {
  Activity,
  AlertTriangle,
  Battery,
  BatteryWarning,
  Compass,
  Droplets,
  FastForward,
  Flag,
  Gauge,
  Play,
  Radio,
  ShieldAlert,
  Thermometer,
  Vibrate,
  Wind,
} from 'lucide-react';
import { useState } from 'react';
import { useMedAir } from '../../context/MedAirContext';
import { canRolePerform } from '../../engine/stateMachine';
import {
  COMM_STATUS_LABELS,
  formatDateTime,
  formatDecimal,
  formatPercent,
  formatTemp,
  getMissionTone,
  LEG_STATE_LABELS,
  LEG_TYPE_LABELS,
  MISSION_STATE_LABELS,
} from '../../utils/formatters';
import { AssistantWidget } from '../shared/AssistantWidget';
import { TelemetryChartSVG } from '../shared/ChartsSVG';
import { SchematicMapSVG } from '../shared/SchematicMapSVG';
import { StatusBadge } from '../shared/StatusBadge';
import type { PanelModule } from './PanelLayout';

export function MonitoringCenter({
  onNavigate,
}: {
  onNavigate: (mod: PanelModule) => void;
}) {
  const {
    state,
    currentUser,
    activeMission,
    setActiveMission,
    startSimulatedFlight,
    advanceFlightProgress,
    simulateArrival,
    simulateAnomaly,
    enterContingency,
    resolveContingency,
  } = useMedAir();

  const permFlight = currentUser
    ? canRolePerform(currentUser.perfil, 'MONITOR_FLIGHT')
    : { allowed: false, reason: 'Somente leitura.' };
  const permSim = currentUser
    ? canRolePerform(currentUser.perfil, 'SIMULATE')
    : { allowed: false, reason: 'Somente leitura.' };
  const permOcc = currentUser
    ? canRolePerform(currentUser.perfil, 'MANAGE_OCCURRENCE')
    : { allowed: false, reason: 'Somente leitura.' };

  const [contReason, setContReason] = useState('');

  const mission = activeMission ?? state.missoes[0];
  const missionLegs = mission ? state.trechos.filter((t) => t.missaoId === mission.id) : [];
  const activeLeg = missionLegs.find((t) => t.id === mission?.trechoAtivoId) ?? missionLegs[0];
  const drone = state.drones.find((d) => d.id === mission?.droneId);
  const samples = mission
    ? state.telemetria
        .filter((t) => t.missaoId === mission.id)
        .sort((a, b) => b.dataHora.localeCompare(a.dataHora))
    : [];
  const latest = samples[0];
  const missionEvents = mission
    ? state.eventos.filter((e) => e.missaoId === mission.id).slice(0, 12)
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B2545]">
            Central de Monitoramento de Voos Simulados
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Mapa esquemático Salvador/RMS, telemetria simulada de sensores, eventos cronológicos e controle de anormalidades.
          </p>
        </div>

        <select
          value={mission?.id ?? ''}
          onChange={(e) => setActiveMission(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono font-semibold text-[#0B2545]"
        >
          {state.missoes.map((m) => (
            <option key={m.id} value={m.id}>
              {m.codigo} — {MISSION_STATE_LABELS[m.estado]}
            </option>
          ))}
        </select>
      </div>

      {!mission ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Nenhuma missão disponível para monitoramento.
        </div>
      ) : (
        <>
          {/* Mission Action Bar */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-base font-bold text-[#0B2545]">
                  {mission.codigo}
                </span>
                <StatusBadge
                  label={MISSION_STATE_LABELS[mission.estado]}
                  tone={getMissionTone(mission.estado)}
                />
                {activeLeg && (
                  <span className="text-xs font-mono text-slate-600">
                    {activeLeg.codigo} · {LEG_TYPE_LABELS[activeLeg.tipo]} ({LEG_STATE_LABELS[activeLeg.estado]})
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(mission.estado === 'DESPACHADA' ||
                  mission.estado === 'RETORNO_APROVADO' ||
                  mission.estado === 'RETORNO_SEM_CARGA') && (
                  <button
                    type="button"
                    disabled={!permFlight.allowed}
                    title={!permFlight.allowed ? permFlight.reason : 'Iniciar voo simulado'}
                    onClick={() => startSimulatedFlight(mission.id)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#0F4C5C] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0B3B48] disabled:opacity-45"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Iniciar Voo Simulado</span>
                  </button>
                )}

                {['EM_TRANSPORTE', 'RETORNO_EM_ANDAMENTO'].includes(mission.estado) && (
                  <>
                    <button
                      type="button"
                      disabled={!permFlight.allowed}
                      title={!permFlight.allowed ? permFlight.reason : 'Avançar progresso do voo no mapa e atualizar telemetria'}
                      onClick={() => advanceFlightProgress(mission.id, 20)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#0F4C5C] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0B3B48] disabled:opacity-45"
                    >
                      <FastForward className="w-3.5 h-3.5" />
                      <span>Avançar Voo (+20%)</span>
                    </button>

                    <button
                      type="button"
                      disabled={!permFlight.allowed}
                      onClick={() => simulateArrival(mission.id)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-45"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Simular Chegada (100%)</span>
                    </button>
                  </>
                )}

                {mission.estado === 'CHEGOU_AO_DESTINO' && (
                  <button
                    type="button"
                    onClick={() => onNavigate('ENTREGA')}
                    className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    <span>Ir para Chegada e Conferência</span>
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {activeLeg && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-600">
                  <span>Progresso simulado do trecho ativo</span>
                  <span className="font-bold text-[#0B2545]">{activeLeg.progressoPct}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                  <div
                    className={`h-full transition-all duration-300 ${
                      mission.estado === 'EM_CONTINGENCIA' ? 'bg-red-600' : 'bg-[#0F4C5C]'
                    }`}
                    style={{ width: `${activeLeg.progressoPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Quick Anomaly Simulation Row */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">
                Simular anormalidades:
              </span>
              <button
                type="button"
                disabled={!permSim.allowed}
                title={!permSim.allowed ? permSim.reason : 'Simular desvio térmico e abrir ocorrência'}
                onClick={() => simulateAnomaly(mission.id, 'TEMPERATURA')}
                className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-800 hover:bg-red-100 disabled:opacity-45"
              >
                <Thermometer className="w-3 h-3" />
                <span>Alerta Temperatura</span>
              </button>
              <button
                type="button"
                disabled={!permSim.allowed}
                onClick={() => simulateAnomaly(mission.id, 'BATERIA')}
                className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-45"
              >
                <BatteryWarning className="w-3 h-3" />
                <span>Bateria Baixa</span>
              </button>
              <button
                type="button"
                disabled={!permSim.allowed}
                onClick={() => simulateAnomaly(mission.id, 'COMUNICACAO')}
                className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-45"
              >
                <Radio className="w-3 h-3" />
                <span>Perda Comunicação</span>
              </button>
            </div>
          </div>

          {/* Main Grid: Map + Telemetry + Assistant */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 space-y-5">
              <SchematicMapSVG
                instituicoes={state.instituicoes}
                trechos={missionLegs}
                mission={mission}
                drone={drone}
              />

              {/* 8 Simulated Telemetry Cards */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#0B2545]">
                    Leitura de Sensores e Telemetria
                  </h2>
                  <span className="font-mono text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                    DADOS SIMULADOS
                  </span>
                </div>

                {latest ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
                    <div className="rounded border border-slate-200 bg-[#F4F7F9] p-3">
                      <div className="font-sans text-[11px] text-slate-500 flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5 text-[#0F4C5C]" /> Velocidade
                      </div>
                      <div className="text-base font-bold text-[#0B2545] mt-1">
                        {formatDecimal(latest.velocidadeKmh, 1)} km/h
                      </div>
                    </div>

                    <div className="rounded border border-slate-200 bg-[#F4F7F9] p-3">
                      <div className="font-sans text-[11px] text-slate-500 flex items-center gap-1">
                        <Compass className="w-3.5 h-3.5 text-[#0F4C5C]" /> Altitude
                      </div>
                      <div className="text-base font-bold text-[#0B2545] mt-1">
                        {latest.altitudeM} m
                      </div>
                    </div>

                    <div
                      className={`rounded border p-3 ${
                        latest.bateriaPct <= state.regrasConfig.bateriaMinimaAlertaPct
                          ? 'border-red-300 bg-red-50'
                          : 'border-slate-200 bg-[#F4F7F9]'
                      }`}
                    >
                      <div className="font-sans text-[11px] text-slate-500 flex items-center gap-1">
                        <Battery className="w-3.5 h-3.5 text-[#0F4C5C]" /> Bateria
                      </div>
                      <div className="text-base font-bold text-[#0B2545] mt-1">
                        {formatPercent(latest.bateriaPct, 0)}
                      </div>
                    </div>

                    <div
                      className={`rounded border p-3 ${
                        latest.temperaturaCargaC > state.regrasConfig.faixaTermicaPadraoMaxC ||
                        latest.temperaturaCargaC < state.regrasConfig.faixaTermicaPadraoMinC
                          ? 'border-red-300 bg-red-50'
                          : 'border-slate-200 bg-[#F4F7F9]'
                      }`}
                    >
                      <div className="font-sans text-[11px] text-slate-500 flex items-center gap-1">
                        <Thermometer className="w-3.5 h-3.5 text-[#0F4C5C]" /> Temperatura
                      </div>
                      <div className="text-base font-bold text-[#0B2545] mt-1">
                        {formatTemp(latest.temperaturaCargaC)}
                      </div>
                    </div>

                    <div className="rounded border border-slate-200 bg-[#F4F7F9] p-3">
                      <div className="font-sans text-[11px] text-slate-500 flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5 text-[#0F4C5C]" /> Umidade
                      </div>
                      <div className="text-base font-bold text-[#0B2545] mt-1">
                        {formatPercent(latest.umidadePct, 0)}
                      </div>
                    </div>

                    <div className="rounded border border-slate-200 bg-[#F4F7F9] p-3">
                      <div className="font-sans text-[11px] text-slate-500 flex items-center gap-1">
                        <Vibrate className="w-3.5 h-3.5 text-[#0F4C5C]" /> Vibração
                      </div>
                      <div className="text-base font-bold text-[#0B2545] mt-1">
                        {formatDecimal(latest.vibracaoG, 2)} g
                      </div>
                    </div>

                    <div className="rounded border border-slate-200 bg-[#F4F7F9] p-3">
                      <div className="font-sans text-[11px] text-slate-500 flex items-center gap-1">
                        <Wind className="w-3.5 h-3.5 text-[#0F4C5C]" /> Vento
                      </div>
                      <div className="text-base font-bold text-[#0B2545] mt-1">
                        {formatDecimal(latest.ventoKmh, 1)} km/h
                      </div>
                    </div>

                    <div
                      className={`rounded border p-3 ${
                        latest.comunicacao !== 'ESTAVEL'
                          ? 'border-red-300 bg-red-50'
                          : 'border-slate-200 bg-[#F4F7F9]'
                      }`}
                    >
                      <div className="font-sans text-[11px] text-slate-500 flex items-center gap-1">
                        <Radio className="w-3.5 h-3.5 text-[#0F4C5C]" /> Comunicação
                      </div>
                      <div className="font-sans text-xs font-bold text-[#0B2545] mt-1.5">
                        {COMM_STATUS_LABELS[latest.comunicacao]}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Nenhuma amostra de telemetria simulada ainda para esta missão. Inicie o voo simulado para gerar leituras.
                  </p>
                )}
              </div>

              <TelemetryChartSVG samples={samples} />
            </div>

            {/* Right Column: Assistant + Contingency + Chronological Events */}
            <div className="space-y-5">
              <AssistantWidget
                mission={mission}
                onOpenConfig={() => onNavigate('REGRAS_ASSISTENTE')}
              />

              {/* Contingency Control */}
              {['EM_TRANSPORTE', 'RETORNO_EM_ANDAMENTO', 'EM_CONTINGENCIA'].includes(
                mission.estado
              ) && (
                <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2.5 text-xs">
                  <div className="font-bold text-[#0B2545] flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span>Protocolo de Contingência (Validação Humana)</span>
                  </div>
                  <input
                    type="text"
                    value={contReason}
                    onChange={(e) => setContReason(e.target.value)}
                    placeholder="Justificativa obrigatória para acionar/encerrar contingência…"
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                  />
                  {mission.estado === 'EM_CONTINGENCIA' ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={!permOcc.allowed}
                        onClick={() => {
                          const target =
                            mission.estadoAnteriorContingencia === 'RETORNO_EM_ANDAMENTO'
                              ? 'RETORNO_EM_ANDAMENTO'
                              : 'EM_TRANSPORTE';
                          const res = resolveContingency(mission.id, target, contReason);
                          if (res.ok) setContReason('');
                        }}
                        className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-45"
                      >
                        Retomar Voo Supervisionado
                      </button>
                      <button
                        type="button"
                        disabled={!permOcc.allowed}
                        onClick={() => {
                          const res = resolveContingency(mission.id, 'EM_POS_OPERACAO', contReason);
                          if (res.ok) setContReason('');
                        }}
                        className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-45"
                      >
                        Abortar para Pós-Operação
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!permOcc.allowed}
                      onClick={() => {
                        const res = enterContingency(mission.id, contReason);
                        if (res.ok) setContReason('');
                      }}
                      className="inline-flex items-center gap-1.5 rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-45"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Acionar Contingência</span>
                    </button>
                  )}
                </div>
              )}

              {/* Chronological Events */}
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-[#0B2545] flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-[#0F4C5C]" />
                    <span>Eventos Recentes</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('OCORRENCIAS')}
                    className="text-xs font-semibold text-[#0F4C5C] hover:underline"
                  >
                    Ver ocorrências
                  </button>
                </div>
                <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto">
                  {missionEvents.map((e) => (
                    <div key={e.id} className="p-3 text-xs space-y-0.5">
                      <div className="flex justify-between font-mono text-[10px] text-slate-500">
                        <span className="font-semibold text-[#0F4C5C]">{e.novoEstado}</span>
                        <span>{formatDateTime(e.dataHora)}</span>
                      </div>
                      <div className="text-slate-700">{e.justificativa}</div>
                      <div className="text-[10px] text-slate-500">{e.usuarioNome}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
