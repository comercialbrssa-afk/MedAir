import { CheckCircle2, CloudSun, Send, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useMedAir } from '../../context/MedAirContext';
import {
  ASSISTANT_DISCLAIMER,
  evaluateDroneCompatibility,
} from '../../engine/rulesEngine';
import { canRolePerform } from '../../engine/stateMachine';
import type { WeatherCondition } from '../../types/domain';
import {
  CARGO_TYPE_LABELS,
  DRONE_STATE_LABELS,
  formatCurrency,
  formatDecimal,
  formatKg,
  formatKm,
  formatLiters,
  formatPercent,
  formatTemp,
  getDroneTone,
  WEATHER_LABELS,
} from '../../utils/formatters';
import { SchematicMapSVG } from '../shared/SchematicMapSVG';
import { StatusBadge } from '../shared/StatusBadge';
import type { PanelModule } from './PanelLayout';

export function PlanningModule({
  onNavigate,
}: {
  onNavigate: (mod: PanelModule) => void;
}) {
  const { state, currentUser, activeMission, setActiveMission, submitMissionPlan } = useMedAir();
  const perm = currentUser
    ? canRolePerform(currentUser.perfil, 'PLAN')
    : { allowed: false, reason: 'Somente leitura.' };

  const planningMissions = state.missoes.filter((m) => m.estado === 'EM_PLANEJAMENTO');
  const mission =
    planningMissions.find((m) => m.id === activeMission?.id) ?? planningMissions[0] ?? null;

  const sol = mission
    ? state.solicitacoes.find((s) => s.id === mission.solicitacaoPrincipalId)
    : undefined;
  const missionLegs = mission ? state.trechos.filter((t) => t.missaoId === mission.id) : [];

  const pilots = state.usuarios.filter((u) =>
    ['PILOTO', 'CENTRAL_OPERACIONAL', 'ADMIN'].includes(u.perfil)
  );

  const [selectedDroneId, setSelectedDroneId] = useState<string>('');
  const [pilotId, setPilotId] = useState<string>(pilots[0]?.id ?? 'usr-piloto');
  const [weatherCond, setWeatherCond] = useState<WeatherCondition>('BOM');
  const [windKmh, setWindKmh] = useState<string>('17.5');
  const [notes, setNotes] = useState<string>(
    'Rota direta simulada Salvador -> RMS validada com margem de autonomia.'
  );

  const evaluations =
    mission && sol
      ? state.drones.map((d) => ({
          drone: d,
          evalRes: evaluateDroneCompatibility(d, sol, mission.distanciaEstimadaKm, state),
        }))
      : [];

  const effectiveDroneId =
    selectedDroneId ||
    evaluations.find((e) => e.evalRes.classificacao === 'COMPATIVEL')?.drone.id ||
    '';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B2545]">
            Planejamento de Missão e Comparação de Frota
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Compare drones compatíveis com critérios determinísticos, avalie rota e clima simulados e encaminhe para aprovação humana.
          </p>
        </div>

        {planningMissions.length > 0 && (
          <select
            value={mission?.id ?? ''}
            onChange={(e) => {
              setActiveMission(e.target.value);
              setSelectedDroneId('');
            }}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono font-semibold text-[#0B2545]"
          >
            {planningMissions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.codigo} (Em planejamento)
              </option>
            ))}
          </select>
        )}
      </div>

      {!mission || !sol ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center space-y-3">
          <p className="text-sm text-slate-600">
            Não há missões em estado <strong>EM_PLANEJAMENTO</strong> no momento.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('TRIAGEM')}
            className="rounded-md bg-[#0F4C5C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B3B48]"
          >
            Ir para Triagem aprovar uma solicitação
          </button>
        </div>
      ) : (
        <>
          {/* Request + Route Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <SchematicMapSVG
                instituicoes={state.instituicoes}
                trechos={missionLegs}
                mission={mission}
                compact
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-[#0B2545]">
                  {mission.codigo}
                </span>
                <span className="font-mono text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  DADOS SIMULADOS
                </span>
              </div>

              <div className="space-y-1.5 text-slate-700">
                <div>
                  <strong>Carga:</strong> {CARGO_TYPE_LABELS[sol.tipoCarga]} ({formatKg(sol.pesoKg)} · {formatLiters(sol.volumeEstimadoL)})
                </div>
                <div>
                  <strong>Faixa térmica:</strong>{' '}
                  {sol.requerControleTermico
                    ? `${formatTemp(sol.tempMinC)} a ${formatTemp(sol.tempMaxC)}`
                    : 'Não exigida'}
                </div>
                <div>
                  <strong>Distância fictícia:</strong>{' '}
                  <span className="font-mono">{formatKm(mission.distanciaEstimadaKm)}</span>
                </div>
                <div>
                  <strong>Tempo estimado:</strong>{' '}
                  <span className="font-mono">{mission.tempoEstimadoMin} min</span>
                </div>
                <div>
                  <strong>Custo estimado sim.:</strong>{' '}
                  <span className="font-mono">{formatCurrency(mission.custoEstimadoSimuladoBrl)}</span>
                </div>
              </div>

              {/* Weather Simulation Controls */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="font-semibold text-[#0B2545] flex items-center gap-1.5">
                  <CloudSun className="w-4 h-4 text-[#0F4C5C]" />
                  <span>Clima Simulado da Rota</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={weatherCond}
                    onChange={(e) => setWeatherCond(e.target.value as WeatherCondition)}
                    className="rounded border border-slate-300 bg-white px-2 py-1.5 text-xs"
                  >
                    {(Object.keys(WEATHER_LABELS) as WeatherCondition[]).map((k) => (
                      <option key={k} value={k}>
                        {WEATHER_LABELS[k]}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      value={windKmh}
                      onChange={(e) => setWindKmh(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs font-mono"
                    />
                    <span className="text-[10px] text-slate-500">km/h</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Drone Comparison Matrix (Deterministic Rules Engine) */}
          <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 bg-[#F8FAFC] px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-[#0B2545]">
                  Comparativo de Drones Compatíveis — Apoio Determinístico
                </h2>
                <p className="text-[11px] text-slate-500">{ASSISTANT_DISCLAIMER}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {evaluations.map(({ drone, evalRes }) => {
                const isSelected = effectiveDroneId === drone.id;
                const isBlocked = evalRes.classificacao === 'INCOMPATIVEL';
                const badgeTone =
                  evalRes.classificacao === 'COMPATIVEL'
                    ? 'success'
                    : evalRes.classificacao === 'PENDENTE_VALIDACAO'
                      ? 'warning'
                      : 'danger';

                return (
                  <div
                    key={drone.id}
                    className={`rounded-lg border p-4 space-y-3 transition-colors ${
                      isSelected
                        ? 'border-[#0F4C5C] bg-[#F0F6F8]'
                        : isBlocked
                          ? 'border-slate-200 bg-slate-50/70 opacity-85'
                          : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-mono text-sm font-bold text-[#0B2545]">
                          {drone.codigo} — {drone.modelo}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <StatusBadge
                            label={DRONE_STATE_LABELS[drone.estado]}
                            tone={getDroneTone(drone.estado)}
                            compact
                          />
                          <StatusBadge
                            label={
                              evalRes.classificacao === 'COMPATIVEL'
                                ? 'Compatível'
                                : evalRes.classificacao === 'PENDENTE_VALIDACAO'
                                  ? 'Pendente validação'
                                  : 'Incompatível'
                            }
                            tone={badgeTone}
                            compact
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isBlocked}
                        title={isBlocked ? evalRes.resumo : 'Selecionar este drone para a missão'}
                        onClick={() => setSelectedDroneId(drone.id)}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                          isSelected
                            ? 'bg-[#0F4C5C] text-white'
                            : 'border border-slate-300 bg-white text-[#0B2545] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed'
                        }`}
                      >
                        {isSelected ? 'Selecionado' : 'Selecionar'}
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-[11px] font-mono tabular-nums bg-white/80 rounded border border-slate-200 p-2">
                      <div>
                        <div className="font-sans text-[10px] text-slate-500">Carga</div>
                        <div className="font-semibold">{formatKg(drone.capacidadePesoKg)}</div>
                      </div>
                      <div>
                        <div className="font-sans text-[10px] text-slate-500">Volume</div>
                        <div className="font-semibold">{formatLiters(drone.capacidadeVolumeL)}</div>
                      </div>
                      <div>
                        <div className="font-sans text-[10px] text-slate-500">Autonomia</div>
                        <div className="font-semibold">{formatKm(drone.autonomiaKm)}</div>
                      </div>
                      <div>
                        <div className="font-sans text-[10px] text-slate-500">Bateria</div>
                        <div className="font-semibold">{formatPercent(drone.bateriaAtualPct, 0)}</div>
                      </div>
                    </div>

                    <ul className="space-y-1 text-[11px]">
                      {evalRes.criterios.map((c) => (
                        <li key={c.criterio} className="flex items-start gap-1.5">
                          {c.status === 'OK' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <ShieldAlert
                              className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                                c.status === 'BLOQUEIO' ? 'text-red-600' : 'text-amber-600'
                              }`}
                            />
                          )}
                          <span className="text-slate-700">
                            <strong>{c.criterio}:</strong> {c.motivo}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Submit for Human Approval */}
          <section className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-bold text-[#0B2545]">
              Finalizar Planejamento e Encaminhar para Aprovação Humana
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Responsável operacional / Piloto designado
                </label>
                <select
                  value={pilotId}
                  onChange={(e) => setPilotId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs"
                >
                  {pilots.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.cargo})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações do planejamento
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
            </div>

            {!perm.allowed && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                {perm.reason}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                disabled={!perm.allowed || !effectiveDroneId}
                title={!perm.allowed ? perm.reason : 'Submeter plano de missão para aprovação humana'}
                onClick={() => {
                  const res = submitMissionPlan({
                    missionId: mission.id,
                    droneId: effectiveDroneId,
                    pilotoResponsavelId: pilotId,
                    climaCondicao: weatherCond,
                    ventoKmh: Number(windKmh.replace(',', '.')) || 17.5,
                    observacoesPlanejamento: notes,
                  });
                  if (res.ok) onNavigate('APROVACAO_DESPACHO');
                }}
                className="inline-flex items-center gap-2 rounded-md bg-[#0F4C5C] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#0B3B48] disabled:opacity-45"
              >
                <Send className="w-4 h-4" />
                <span>Encaminhar para Aprovação Humana</span>
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
