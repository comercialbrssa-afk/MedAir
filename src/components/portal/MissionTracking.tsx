import { Activity, Battery, Compass, Gauge, Radio, Thermometer, Wind } from 'lucide-react';
import { useMedAir } from '../../context/MedAirContext';
import type { MissionState } from '../../types/domain';
import {
  COMM_STATUS_LABELS,
  formatDateTime,
  formatDecimal,
  formatKm,
  formatPercent,
  formatTemp,
  getMissionTone,
  LEG_STATE_LABELS,
  LEG_TYPE_LABELS,
  MISSION_STATE_LABELS,
} from '../../utils/formatters';
import { TelemetryChartSVG } from '../shared/ChartsSVG';
import { SchematicMapSVG } from '../shared/SchematicMapSVG';
import { StatusBadge } from '../shared/StatusBadge';

const TIMELINE_STAGES: { label: string; states: MissionState[] }[] = [
  { label: 'Planejamento', states: ['SOLICITADA', 'EM_TRIAGEM', 'AGUARDANDO_COMPLEMENTACAO', 'EM_PLANEJAMENTO'] },
  { label: 'Aprovação & Coleta', states: ['AGUARDANDO_APROVACAO', 'APROVADA', 'CARGA_EM_PREPARACAO', 'CARGA_VALIDADA'] },
  { label: 'Despacho & Voo', states: ['DESPACHADA', 'EM_TRANSPORTE', 'EM_CONTINGENCIA'] },
  { label: 'Chegada & Conferência', states: ['CHEGOU_AO_DESTINO', 'EM_CONFERENCIA'] },
  { label: 'Entrega & Retorno', states: ['ENTREGA_CONFIRMADA', 'ENTREGA_COM_RESSALVA', 'RECEBIMENTO_RECUSADO', 'ANALISANDO_RETORNO', 'RETORNO_PENDENTE', 'RETORNO_APROVADO', 'RETORNO_SEM_CARGA', 'RETORNO_EM_ANDAMENTO'] },
  { label: 'Pós-op. & Encerrada', states: ['EM_POS_OPERACAO', 'ENCERRADA'] },
];

export function MissionTracking() {
  const { state, activeMission, setActiveMission } = useMedAir();

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
    ? state.eventos.filter((e) => e.missaoId === mission.id)
    : [];

  const activeStageIndex = mission
    ? TIMELINE_STAGES.findIndex((st) => st.states.includes(mission.estado))
    : -1;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B2545]">
            Acompanhamento de Missão
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Linha do tempo, trecho atual, mapa esquemático SVG e telemetria simulada em tempo real demonstrativo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="portal-track-mission" className="text-xs font-semibold text-slate-600">
            Missão:
          </label>
          <select
            id="portal-track-mission"
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
      </div>

      {!mission ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Nenhuma missão disponível para acompanhamento.
        </div>
      ) : (
        <>
          {/* Timeline */}
          <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-base font-bold text-[#0B2545]">
                  {mission.codigo}
                </span>
                <StatusBadge
                  label={MISSION_STATE_LABELS[mission.estado]}
                  tone={getMissionTone(mission.estado)}
                />
              </div>
              {activeLeg && (
                <div className="text-xs text-slate-600 font-mono tabular-nums">
                  Trecho atual: <strong>{activeLeg.codigo}</strong> ({LEG_TYPE_LABELS[activeLeg.tipo]} · {LEG_STATE_LABELS[activeLeg.estado]} · {activeLeg.progressoPct}%)
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              {TIMELINE_STAGES.map((stage, idx) => {
                const isDone = activeStageIndex > idx || mission.estado === 'ENCERRADA';
                const isCurrent = activeStageIndex === idx && mission.estado !== 'ENCERRADA';
                return (
                  <div
                    key={stage.label}
                    className={`rounded-md border px-2.5 py-2 text-center text-[11px] font-semibold ${
                      isCurrent
                        ? 'border-[#0F4C5C] bg-[#E3F0F4] text-[#0B2545]'
                        : isDone
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                    }`}
                  >
                    <div className="font-mono text-[10px] mb-0.5">0{idx + 1}</div>
                    <div>{stage.label}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Map + Simulated Telemetry */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-4">
              <SchematicMapSVG
                instituicoes={state.instituicoes}
                trechos={missionLegs}
                mission={mission}
                drone={drone}
              />

              <TelemetryChartSVG samples={samples} />
            </div>

            <div className="space-y-4">
              {/* Simulated Telemetry Panel */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-[#0B2545]">
                    Telemetria Simulada
                  </h2>
                  <span className="font-mono text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    DADOS SIMULADOS
                  </span>
                </div>

                {latest ? (
                  <div className="grid grid-cols-2 gap-2.5 text-xs font-mono tabular-nums">
                    <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                      <div className="flex items-center gap-1 font-sans text-[11px] text-slate-500">
                        <Thermometer className="w-3.5 h-3.5 text-[#0F4C5C]" />
                        <span>Temperatura</span>
                      </div>
                      <div className="text-sm font-bold text-[#0B2545] mt-1">
                        {formatTemp(latest.temperaturaCargaC)}
                      </div>
                    </div>

                    <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                      <div className="flex items-center gap-1 font-sans text-[11px] text-slate-500">
                        <Battery className="w-3.5 h-3.5 text-[#0F4C5C]" />
                        <span>Bateria</span>
                      </div>
                      <div className="text-sm font-bold text-[#0B2545] mt-1">
                        {formatPercent(latest.bateriaPct, 0)}
                      </div>
                    </div>

                    <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                      <div className="flex items-center gap-1 font-sans text-[11px] text-slate-500">
                        <Gauge className="w-3.5 h-3.5 text-[#0F4C5C]" />
                        <span>Velocidade</span>
                      </div>
                      <div className="text-sm font-bold text-[#0B2545] mt-1">
                        {formatDecimal(latest.velocidadeKmh, 1)} km/h
                      </div>
                    </div>

                    <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                      <div className="flex items-center gap-1 font-sans text-[11px] text-slate-500">
                        <Compass className="w-3.5 h-3.5 text-[#0F4C5C]" />
                        <span>Altitude</span>
                      </div>
                      <div className="text-sm font-bold text-[#0B2545] mt-1">
                        {latest.altitudeM} m
                      </div>
                    </div>

                    <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                      <div className="flex items-center gap-1 font-sans text-[11px] text-slate-500">
                        <Wind className="w-3.5 h-3.5 text-[#0F4C5C]" />
                        <span>Vento</span>
                      </div>
                      <div className="text-sm font-bold text-[#0B2545] mt-1">
                        {formatDecimal(latest.ventoKmh, 1)} km/h
                      </div>
                    </div>

                    <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                      <div className="flex items-center gap-1 font-sans text-[11px] text-slate-500">
                        <Radio className="w-3.5 h-3.5 text-[#0F4C5C]" />
                        <span>Sinal</span>
                      </div>
                      <div className="font-sans text-xs font-bold text-[#0B2545] mt-1">
                        {COMM_STATUS_LABELS[latest.comunicacao]}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Telemetria simulada será exibida após o início do voo.
                  </p>
                )}

                {activeLeg && (
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between font-mono">
                    <span>Distância estimada: {formatKm(activeLeg.distanciaKm)}</span>
                    <span>Drone: {drone?.codigo ?? '—'}</span>
                  </div>
                )}
              </div>

              {/* Chronological Audit Events */}
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <div className="border-b border-slate-200 px-4 py-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0F4C5C]" />
                  <h2 className="text-sm font-bold text-[#0B2545]">
                    Trilha de Eventos ({missionEvents.length})
                  </h2>
                </div>
                <div className="divide-y divide-slate-100 max-h-[290px] overflow-y-auto">
                  {missionEvents.length === 0 ? (
                    <div className="p-4 text-xs text-slate-500">Sem eventos registrados.</div>
                  ) : (
                    missionEvents.map((e) => (
                      <div key={e.id} className="p-3 space-y-1 text-xs">
                        <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
                          <span className="font-semibold text-[#0F4C5C]">{e.novoEstado}</span>
                          <span>{formatDateTime(e.dataHora)}</span>
                        </div>
                        <p className="text-slate-700 leading-snug">{e.justificativa}</p>
                        <div className="text-[10px] text-slate-500">
                          {e.usuarioNome}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
