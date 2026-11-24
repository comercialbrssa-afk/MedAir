import {
  ArrowRight,
  CheckCircle2,
  FastForward,
  Flag,
  Play,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { useMedAir } from '../../context/MedAirContext';
import { canRolePerform } from '../../engine/stateMachine';
import {
  CARGO_STATE_LABELS,
  formatTemp,
  getMissionTone,
  LEG_STATE_LABELS,
  LEG_TYPE_LABELS,
  MISSION_STATE_LABELS,
} from '../../utils/formatters';
import { SchematicMapSVG } from '../shared/SchematicMapSVG';
import { StatusBadge } from '../shared/StatusBadge';
import type { PanelModule } from './PanelLayout';

export function ReturnLegModule({
  onNavigate,
}: {
  onNavigate: (mod: PanelModule) => void;
}) {
  const {
    state,
    currentUser,
    activeMission,
    setActiveMission,
    validateAndSealCargo,
    startSimulatedFlight,
    advanceFlightProgress,
    simulateArrival,
    confirmCargoReceiving,
  } = useMedAir();

  const permCollect = currentUser
    ? canRolePerform(currentUser.perfil, 'COLLECT_PREP')
    : { allowed: false, reason: 'Somente leitura.' };
  const permFlight = currentUser
    ? canRolePerform(currentUser.perfil, 'MONITOR_FLIGHT')
    : { allowed: false, reason: 'Somente leitura.' };
  const permReceive = currentUser
    ? canRolePerform(currentUser.perfil, 'RECEIVE_CARGO')
    : { allowed: false, reason: 'Somente leitura.' };

  const returnMissions = state.missoes.filter((m) =>
    [
      'RETORNO_PENDENTE',
      'RETORNO_APROVADO',
      'RETORNO_SEM_CARGA',
      'RETORNO_EM_ANDAMENTO',
      'EM_POS_OPERACAO',
    ].includes(m.estado)
  );

  const mission =
    returnMissions.find((m) => m.id === activeMission?.id) ?? returnMissions[0] ?? null;

  const missionLegs = mission ? state.trechos.filter((t) => t.missaoId === mission.id) : [];
  const returnLeg = missionLegs.find((t) => t.tipo !== 'IDA');
  const returnCargo = returnLeg?.cargaId
    ? state.cargas.find((c) => c.id === returnLeg.cargaId)
    : undefined;
  const drone = state.drones.find((d) => d.id === mission?.droneId);

  // Return cargo prep inputs
  const [embalagem, setEmbalagem] = useState('Contêiner bioanalítico selado de retorno (Fictício)');
  const [lacre, setLacre] = useState(`LCR-REV-${Math.floor(10000 + Math.random() * 89999)}`);
  const [tempIni, setTempIni] = useState('4.5');
  const [tempEnt, setTempEnt] = useState('4.8');
  const [obsEntrega, setObsEntrega] = useState('');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B2545]">
            Operação do Trecho de Retorno
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Gerencie coleta/custódia de carga de retorno (quando aplicável), voo simulado de volta e chegada operacional à base.
          </p>
        </div>

        {returnMissions.length > 0 && (
          <select
            value={mission?.id ?? ''}
            onChange={(e) => setActiveMission(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono font-semibold text-[#0B2545]"
          >
            {returnMissions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.codigo} — {MISSION_STATE_LABELS[m.estado]}
              </option>
            ))}
          </select>
        )}
      </div>

      {!mission || !returnLeg ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center space-y-3">
          <p className="text-sm text-slate-600">
            Nenhuma missão com trecho de retorno aprovado no momento. Avalie uma entrega concluída em <strong>Logística Reversa</strong>.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('LOGISTICA_REVERSA')}
            className="rounded-md bg-[#0F4C5C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B3B48]"
          >
            Ir para Logística Reversa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Map + Leg Overview */}
          <div className="lg:col-span-2 space-y-4">
            <SchematicMapSVG
              instituicoes={state.instituicoes}
              trechos={missionLegs}
              mission={mission}
              drone={drone}
            />

            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[#0B2545]">
                    {returnLeg.codigo} · {LEG_TYPE_LABELS[returnLeg.tipo]}
                  </span>
                  <StatusBadge
                    label={LEG_STATE_LABELS[returnLeg.estado]}
                    tone={getMissionTone(mission.estado)}
                    compact
                  />
                </div>
                <span className="font-mono text-xs font-semibold text-[#0B2545]">
                  Progresso: {returnLeg.progressoPct}%
                </span>
              </div>

              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${returnLeg.progressoPct}%` }}
                />
              </div>

              <div className="text-xs text-slate-600 flex flex-wrap justify-between gap-2">
                <span>
                  Origem:{' '}
                  <strong>
                    {state.instituicoes.find((i) => i.id === returnLeg.origemId)?.nome}
                  </strong>
                </span>
                <span>
                  Destino:{' '}
                  <strong>
                    {state.instituicoes.find((i) => i.id === returnLeg.destinoId)?.nome}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Step-by-step Return Execution */}
          <div className="space-y-4">
            {/* Step 1: Collect & Seal Return Cargo (if RETORNO_COM_CARGA) */}
            {returnCargo && returnCargo.estado === 'EM_PREPARACAO' && (
              <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 text-xs">
                <div className="font-bold text-[#0B2545] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0F4C5C]" />
                  <span>1. Coleta e Lacre da Carga de Retorno ({returnCargo.codigo})</span>
                </div>
                <p className="text-slate-600">{returnCargo.descricao}</p>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Embalagem *</label>
                  <input
                    type="text"
                    value={embalagem}
                    onChange={(e) => setEmbalagem(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Lacre *</label>
                    <input
                      type="text"
                      value={lacre}
                      onChange={(e) => setLacre(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Temp. (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={tempIni}
                      onChange={(e) => setTempIni(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!permCollect.allowed}
                  onClick={() =>
                    validateAndSealCargo({
                      missionId: mission.id,
                      cargoId: returnCargo.id,
                      embalagem,
                      codigoLacre: lacre,
                      temperaturaInicialC: returnCargo.requerControleTermico
                        ? Number(tempIni.replace(',', '.'))
                        : undefined,
                      documentacaoValidada: true,
                      observacoes: 'Coleta de logística reversa lacrada com custódia registrada.',
                    })
                  }
                  className="w-full rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-45"
                >
                  Lacrar Carga de Retorno e Gerar Custódia
                </button>
              </section>
            )}

            {/* Step 2: Start & Simulate Return Flight */}
            {['RETORNO_APROVADO', 'RETORNO_SEM_CARGA', 'RETORNO_EM_ANDAMENTO'].includes(
              mission.estado
            ) &&
              returnLeg.estado !== 'CHEGOU_AO_DESTINO' && (
                <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 text-xs">
                  <div className="font-bold text-[#0B2545]">
                    Controle de Voo Simulado de Retorno
                  </div>

                  {['RETORNO_APROVADO', 'RETORNO_SEM_CARGA'].includes(mission.estado) ? (
                    <button
                      type="button"
                      disabled={
                        !permFlight.allowed ||
                        (returnLeg.tipo === 'RETORNO_COM_CARGA' &&
                          returnCargo?.estado !== 'VALIDADA_LACRADA')
                      }
                      title={
                        !permFlight.allowed
                          ? permFlight.reason
                          : returnLeg.tipo === 'RETORNO_COM_CARGA' &&
                              returnCargo?.estado !== 'VALIDADA_LACRADA'
                            ? 'Lacre a carga de retorno acima antes de decolar'
                            : 'Iniciar voo simulado de retorno'
                      }
                      onClick={() => startSimulatedFlight(mission.id)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#0F4C5C] px-4 py-2.5 font-semibold text-white hover:bg-[#0B3B48] disabled:opacity-45"
                    >
                      <Play className="w-4 h-4" />
                      <span>Iniciar Voo de Retorno</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled={!permFlight.allowed}
                        onClick={() => advanceFlightProgress(mission.id, 35)}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#0F4C5C] px-4 py-2 font-semibold text-white hover:bg-[#0B3B48] disabled:opacity-45"
                      >
                        <FastForward className="w-4 h-4" />
                        <span>Avançar Voo de Retorno (+35%)</span>
                      </button>
                      <button
                        type="button"
                        disabled={!permFlight.allowed}
                        onClick={() => simulateArrival(mission.id)}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-45"
                      >
                        <Flag className="w-4 h-4" />
                        <span>
                          {returnLeg.tipo === 'RETORNO_VAZIO'
                            ? 'Registrar Chegada à Base Operacional'
                            : 'Registrar Chegada da Carga de Retorno'}
                        </span>
                      </button>
                    </div>
                  )}
                </section>
              )}

            {/* Step 3: Confirm Return Cargo Delivery */}
            {returnCargo && returnCargo.estado === 'AGUARDANDO_CONFERENCIA' && (
              <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3 text-xs">
                <div className="font-bold text-amber-950">
                  Conferência da Carga de Retorno ({returnCargo.codigo})
                </div>
                <div className="text-amber-900">
                  Lacre: <strong className="font-mono">{returnCargo.codigoLacre}</strong> · Temp. coleta:{' '}
                  <strong className="font-mono">{formatTemp(returnCargo.temperaturaInicialC)}</strong>
                </div>

                <div>
                  <label className="block font-semibold text-amber-950 mb-1">
                    Temperatura na entrega (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={tempEnt}
                    onChange={(e) => setTempEnt(e.target.value)}
                    className="w-full rounded border border-amber-300 bg-white px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-amber-950 mb-1">
                    Observações / justificativa
                  </label>
                  <input
                    type="text"
                    value={obsEntrega}
                    onChange={(e) => setObsEntrega(e.target.value)}
                    placeholder="Opcional para aceite, obrigatório para ressalva…"
                    className="w-full rounded border border-amber-300 bg-white px-2.5 py-1.5"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={!permReceive.allowed}
                    onClick={() => {
                      const res = confirmCargoReceiving({
                        missionId: mission.id,
                        cargoId: returnCargo.id,
                        decision: 'ACEITA',
                        integridadeEmbalagem: 'INTEGRA',
                        lacreConferido: true,
                        temperaturaEntregaC: Number(tempEnt.replace(',', '.')),
                        justificativa: obsEntrega,
                      });
                      if (res.ok) onNavigate('FROTA');
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-45"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Entrega de Retorno e Ir para Pós-Op</span>
                  </button>
                  <button
                    type="button"
                    disabled={!permReceive.allowed}
                    onClick={() => {
                      const res = confirmCargoReceiving({
                        missionId: mission.id,
                        cargoId: returnCargo.id,
                        decision: 'ACEITA_COM_RESSALVA',
                        integridadeEmbalagem: 'AVARIA_LEVE',
                        lacreConferido: true,
                        temperaturaEntregaC: Number(tempEnt.replace(',', '.')),
                        justificativa: obsEntrega,
                      });
                      if (res.ok) onNavigate('FROTA');
                    }}
                    className="w-full rounded-md bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 disabled:opacity-45"
                  >
                    Aceitar com Ressalva
                  </button>
                </div>
              </section>
            )}

            {/* Step 4: Arrived at Post-Op */}
            {mission.estado === 'EM_POS_OPERACAO' && (
              <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3 text-xs">
                <div className="font-bold text-emerald-900">
                  Trecho de retorno concluído!
                </div>
                <p className="text-emerald-900">
                  {returnCargo
                    ? `Carga ${returnCargo.codigo}: ${CARGO_STATE_LABELS[returnCargo.estado]}. `
                    : 'Retorno vazio concluído na base. '}
                  Realize a inspeção, higienização do drone e encerramento formal da missão.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('FROTA')}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#0F4C5C] px-4 py-2 font-semibold text-white hover:bg-[#0B3B48]"
                >
                  <span>Ir para Pós-operação e Frota</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
