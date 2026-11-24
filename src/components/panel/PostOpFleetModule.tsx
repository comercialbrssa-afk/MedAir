import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Lock,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { useMedAir } from '../../context/MedAirContext';
import {
  canRolePerform,
  validateMissionClosurePreconditions,
} from '../../engine/stateMachine';
import type { DroneState } from '../../types/domain';
import {
  DRONE_STATE_LABELS,
  formatDateTime,
  formatDecimal,
  formatKg,
  formatKm,
  formatLiters,
  formatPercent,
  getDroneTone,
} from '../../utils/formatters';
import { StatusBadge } from '../shared/StatusBadge';
import type { PanelModule } from './PanelLayout';

export function PostOpFleetModule({
  onNavigate,
}: {
  onNavigate: (mod: PanelModule) => void;
}) {
  const {
    state,
    currentUser,
    registerDroneInspection,
    registerDroneSanitization,
    openDroneMaintenance,
    completeDroneMaintenance,
    setDroneFleetState,
    closeMission,
  } = useMedAir();

  const permMaint = currentUser
    ? canRolePerform(currentUser.perfil, 'FLEET_MAINTENANCE')
    : { allowed: false, reason: 'Somente leitura.' };
  const permClose = currentUser
    ? canRolePerform(currentUser.perfil, 'CLOSE_MISSION')
    : { allowed: false, reason: 'Somente leitura.' };

  const postOpMissions = state.missoes.filter((m) => m.estado === 'EM_POS_OPERACAO');

  const [selectedDroneId, setSelectedDroneId] = useState<string>(
    postOpMissions[0]?.droneId ?? state.drones[0]?.id ?? ''
  );

  const drone = state.drones.find((d) => d.id === selectedDroneId) ?? state.drones[0];
  const linkedPostOpMission = postOpMissions.find((m) => m.droneId === drone?.id);

  // Inspection form
  const [batEval, setBatEval] = useState('94');
  const [compOk, setCompOk] = useState(true);
  const [frameOk, setFrameOk] = useState(true);
  const [sensOk, setSensOk] = useState(true);
  const [inspObs, setInspObs] = useState('Inspeção pós-voo sem avarias estruturais ou elétricas.');

  // Sanitization form
  const [sanProto, setSanProto] = useState(
    'Protocolo Demonstrativo Bio-Nível 2 (Desinfecção completa do compartimento térmico)'
  );
  const [sanObs, setSanObs] = useState('Compartimento seco, selado e apto para nova operação.');

  // Maintenance form
  const [maintType, setMaintType] = useState<'PREVENTIVA' | 'CORRETIVA'>('PREVENTIVA');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintParecer, setMaintParecer] = useState('');

  // Manual state justification
  const [stateJust, setStateJust] = useState('');
  const [closeJust, setCloseJust] = useState(
    'Operação encerrada após confirmação de trechos, cargas, inspeção e higienização.'
  );

  const openMaintForDrone = state.manutencoes.find(
    (m) => m.droneId === drone?.id && m.status === 'ABERTA'
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B2545]">
          Pós-operação, Higienização e Gestão da Frota
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
          Controle dos 6 estados da frota, inspeção técnica, higienização obrigatória do compartimento, manutenção e encerramento formal de missões.
        </p>
      </div>

      {/* Missions awaiting Post-Op Closure */}
      {postOpMissions.length > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
          <h2 className="text-sm font-bold text-amber-950">
            Missões em Pós-Operação Aguardando Inspeção, Higienização e Encerramento ({postOpMissions.length})
          </h2>
          <div className="space-y-3">
            {postOpMissions.map((m) => {
              const d = state.drones.find((x) => x.id === m.droneId);
              const check = validateMissionClosurePreconditions(state, m);

              return (
                <div
                  key={m.id}
                  className="rounded-md border border-amber-200 bg-white p-4 space-y-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-mono text-sm font-bold text-[#0B2545]">
                        {m.codigo}
                      </span>{' '}
                      · Drone <strong className="font-mono">{d?.codigo ?? '—'}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => d && setSelectedDroneId(d.id)}
                      className="text-[#0F4C5C] font-semibold hover:underline"
                    >
                      Selecionar drone {d?.codigo} abaixo
                    </button>
                  </div>

                  {!check.ok ? (
                    <div className="rounded border border-red-200 bg-red-50 p-2.5 text-red-900 space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Bloqueios para encerramento:</span>
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {check.blockers.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={closeJust}
                        onChange={(e) => setCloseJust(e.target.value)}
                        className="flex-1 min-w-[220px] rounded border border-slate-300 px-3 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        disabled={!permClose.allowed}
                        title={!permClose.allowed ? permClose.reason : 'Encerrar missão e atualizar indicadores'}
                        onClick={() => {
                          const res = closeMission(m.id, closeJust);
                          if (res.ok) onNavigate('INDICADORES');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-45"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Encerrar Missão ({m.codigo})</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Fleet Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {state.drones.map((d) => {
          const isSel = drone?.id === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelectedDroneId(d.id)}
              className={`text-left rounded-lg border p-4 space-y-2.5 transition-colors ${
                isSel
                  ? 'border-[#0F4C5C] bg-[#F0F6F8]'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-bold text-[#0B2545]">{d.codigo}</span>
                <StatusBadge
                  label={DRONE_STATE_LABELS[d.estado]}
                  tone={getDroneTone(d.estado)}
                  compact
                />
              </div>
              <div className="text-xs font-medium text-slate-700">{d.modelo}</div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono tabular-nums text-slate-600">
                <span>Bat.: {formatPercent(d.bateriaAtualPct, 0)}</span>
                <span>Auton.: {formatKm(d.autonomiaKm)}</span>
                <span>Cap.: {formatKg(d.capacidadePesoKg)}</span>
                <span>Vol.: {formatLiters(d.capacidadeVolumeL)}</span>
              </div>
              <div className="text-[11px] pt-1 border-t border-slate-100 flex items-center justify-between">
                <span className={d.higienizacaoLiberada ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                  {d.higienizacaoLiberada ? 'Higienização liberada' : 'Higienização pendente'}
                </span>
                <span className="font-mono text-slate-400">{formatDecimal(d.horasVooSimuladas, 1)}h</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Drone Operations */}
      {drone && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 1. Inspection */}
          <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 text-xs">
            <div className="font-bold text-[#0B2545] flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <ClipboardCheck className="w-4 h-4 text-[#0F4C5C]" />
              <span>Inspeção Pós-Operação — {drone.codigo}</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Bateria avaliada / recarregada (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={batEval}
                onChange={(e) => setBatEval(e.target.value)}
                className="w-full rounded border border-slate-300 px-2.5 py-1.5 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compOk}
                  onChange={(e) => setCompOk(e.target.checked)}
                />
                <span>Integridade do compartimento térmico/carga OK</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={frameOk}
                  onChange={(e) => setFrameOk(e.target.checked)}
                />
                <span>Estrutura, hélices e atuadores OK</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sensOk}
                  onChange={(e) => setSensOk(e.target.checked)}
                />
                <span>Sensores simulados e telemetria OK</span>
              </label>
            </div>

            <textarea
              rows={2}
              value={inspObs}
              onChange={(e) => setInspObs(e.target.value)}
              className="w-full rounded border border-slate-300 px-2.5 py-1.5"
            />

            <div className="flex gap-2">
              <button
                type="button"
                disabled={!permMaint.allowed || drone.estado === 'EM_MISSAO'}
                title={!permMaint.allowed ? permMaint.reason : 'Aprovar inspeção técnica'}
                onClick={() =>
                  registerDroneInspection({
                    droneId: drone.id,
                    missionId: linkedPostOpMission?.id,
                    bateriaAvaliadaPct: Number(batEval) || 95,
                    integridadeCompartimentoOk: compOk,
                    estruturaHelicesOk: frameOk,
                    sensoresSimuladosOk: sensOk,
                    aprovado: true,
                    observacoes: inspObs,
                  })
                }
                className="flex-1 rounded-md bg-[#0F4C5C] px-3 py-2 font-semibold text-white hover:bg-[#0B3B48] disabled:opacity-45"
              >
                Aprovar Inspeção
              </button>
              <button
                type="button"
                disabled={!permMaint.allowed || drone.estado === 'EM_MISSAO'}
                onClick={() =>
                  registerDroneInspection({
                    droneId: drone.id,
                    missionId: linkedPostOpMission?.id,
                    bateriaAvaliadaPct: Number(batEval) || 50,
                    integridadeCompartimentoOk: false,
                    estruturaHelicesOk: frameOk,
                    sensoresSimuladosOk: sensOk,
                    aprovado: false,
                    observacoes: inspObs || 'Reprovado na inspeção pós-operação.',
                  })
                }
                className="rounded-md bg-red-600 px-3 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-45"
              >
                Bloquear
              </button>
            </div>
          </section>

          {/* 2. Sanitization */}
          <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 text-xs">
            <div className="font-bold text-[#0B2545] flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>Higienização do Compartimento — {drone.codigo}</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Protocolo demonstrativo aplicado
              </label>
              <input
                type="text"
                value={sanProto}
                onChange={(e) => setSanProto(e.target.value)}
                className="w-full rounded border border-slate-300 px-2.5 py-1.5"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Observações sanitárias demonstrativas
              </label>
              <textarea
                rows={3}
                value={sanObs}
                onChange={(e) => setSanObs(e.target.value)}
                className="w-full rounded border border-slate-300 px-2.5 py-1.5"
              />
            </div>

            <div className="text-[11px] text-slate-500">
              Última higienização:{' '}
              <span className="font-mono">{formatDateTime(drone.ultimaHigienizacaoEm)}</span>
            </div>

            <button
              type="button"
              disabled={!permMaint.allowed || drone.estado === 'EM_MISSAO'}
              title={!permMaint.allowed ? permMaint.reason : 'Registrar higienização e liberar compartimento para reuso'}
              onClick={() =>
                registerDroneSanitization({
                  droneId: drone.id,
                  missionId: linkedPostOpMission?.id,
                  protocoloAplicado: sanProto,
                  compartimentoTermicoHigienizado: true,
                  liberadoParaReuso: true,
                  observacoes: sanObs,
                })
              }
              className="w-full rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-45"
            >
              Registrar Higienização e Liberar Drone
            </button>
          </section>

          {/* 3. Maintenance & Fleet State Control */}
          <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 text-xs">
            <div className="font-bold text-[#0B2545] flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Wrench className="w-4 h-4 text-amber-600" />
              <span>Manutenção e Estado da Frota — {drone.codigo}</span>
            </div>

            {openMaintForDrone ? (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 space-y-2">
                <div className="font-bold text-amber-950">
                  Manutenção {openMaintForDrone.tipo} em andamento
                </div>
                <p className="text-amber-900">{openMaintForDrone.descricao}</p>
                <input
                  type="text"
                  value={maintParecer}
                  onChange={(e) => setMaintParecer(e.target.value)}
                  placeholder="Parecer técnico final para conclusão *"
                  className="w-full rounded border border-amber-300 bg-white px-2.5 py-1.5"
                />
                <button
                  type="button"
                  disabled={!permMaint.allowed}
                  onClick={() => {
                    const res = completeDroneMaintenance(openMaintForDrone.id, maintParecer);
                    if (res.ok) setMaintParecer('');
                  }}
                  className="w-full rounded bg-emerald-700 px-3 py-1.5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-45"
                >
                  Concluir Manutenção
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={maintType}
                    onChange={(e) => setMaintType(e.target.value as 'PREVENTIVA' | 'CORRETIVA')}
                    className="rounded border border-slate-300 bg-white px-2 py-1.5"
                  >
                    <option value="PREVENTIVA">Preventiva</option>
                    <option value="CORRETIVA">Corretiva</option>
                  </select>
                  <button
                    type="button"
                    disabled={!permMaint.allowed || drone.estado === 'EM_MISSAO'}
                    onClick={() => {
                      const res = openDroneMaintenance(drone.id, maintType, maintDesc);
                      if (res.ok) setMaintDesc('');
                    }}
                    className="rounded bg-amber-600 px-2.5 py-1.5 font-semibold text-white hover:bg-amber-700 disabled:opacity-45"
                  >
                    Abrir Manutenção
                  </button>
                </div>
                <input
                  type="text"
                  value={maintDesc}
                  onChange={(e) => setMaintDesc(e.target.value)}
                  placeholder="Descrição da manutenção preventiva ou corretiva…"
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                />
              </div>
            )}

            {/* Direct Fleet State Override (Block / Release) */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="font-semibold text-[#0B2545] flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Alteração Formal de Estado da Frota</span>
              </div>
              <input
                type="text"
                value={stateJust}
                onChange={(e) => setStateJust(e.target.value)}
                placeholder="Justificativa obrigatória para bloqueio/liberação…"
                className="w-full rounded border border-slate-300 px-2.5 py-1.5"
              />
              <div className="flex flex-wrap gap-1.5">
                {(['DISPONIVEL', 'EM_INSPECAO', 'EM_HIGIENIZACAO', 'BLOQUEADO'] as DroneState[]).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={!permMaint.allowed || drone.estado === 'EM_MISSAO' || drone.estado === st}
                      onClick={() => {
                        const res = setDroneFleetState(drone.id, st, stateJust);
                        if (res.ok) setStateJust('');
                      }}
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-[#0B2545] hover:bg-slate-100 disabled:opacity-40"
                    >
                      {DRONE_STATE_LABELS[st]}
                    </button>
                  )
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
