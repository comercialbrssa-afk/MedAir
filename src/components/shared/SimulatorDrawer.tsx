import {
  BatteryWarning,
  FastForward,
  Flag,
  PackagePlus,
  Play,
  Radio,
  RotateCcw,
  StepForward,
  Thermometer,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useMedAir } from '../../context/MedAirContext';
import { canRolePerform } from '../../engine/stateMachine';
import {
  formatPercent,
  formatTemp,
  getMissionTone,
  MISSION_STATE_LABELS,
} from '../../utils/formatters';
import { ConfirmDialog } from './Modals';
import { StatusBadge } from './StatusBadge';

interface SimulatorDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SimulatorDrawer({ open, onClose }: SimulatorDrawerProps) {
  const {
    state,
    currentUser,
    activeMission,
    setActiveMission,
    startSimulatedFlight,
    advanceDemoStep,
    advanceFlightProgress,
    simulateAnomaly,
    simulateArrival,
    simulateReturnCargoAvailable,
    restoreDemoData,
  } = useMedAir();

  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  if (!open) return null;

  const canSimulate = currentUser ? canRolePerform(currentUser.perfil, 'SIMULATE') : { allowed: false, reason: 'Selecione um perfil.' };
  const canFlight = currentUser ? canRolePerform(currentUser.perfil, 'MONITOR_FLIGHT') : { allowed: false, reason: 'Selecione um perfil.' };

  const activeLeg = state.trechos.find((t) => t.id === activeMission?.trechoAtivoId);
  const lastTel = activeMission
    ? state.telemetria
        .filter((t) => t.missaoId === activeMission.id)
        .sort((a, b) => b.dataHora.localeCompare(a.dataHora))[0]
    : undefined;

  const selectableMissions = state.missoes.filter(
    (m) => !['CANCELADA', 'RECUSADA'].includes(m.estado)
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#0B2545]/40 backdrop-blur-[1px]">
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-[#0B2545] px-5 py-4 text-white">
          <div>
            <h2 className="text-base font-bold leading-tight">
              Simulador de Demonstração
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              DADOS SIMULADOS — Controle de cenários acadêmicos
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar Simulador"
            className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Active Mission Selector */}
          <div>
            <label
              htmlFor="sim-mission-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Missão alvo da simulação
            </label>
            <select
              id="sim-mission-select"
              value={activeMission?.id ?? ''}
              onChange={(e) => setActiveMission(e.target.value || null)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-[#0B2545] focus:border-[#0F4C5C] focus:outline-none"
            >
              <option value="">Selecione uma missão…</option>
              {selectableMissions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.codigo} — {MISSION_STATE_LABELS[m.estado]}
                </option>
              ))}
            </select>
          </div>

          {/* Active Mission Status Snapshot */}
          {activeMission ? (
            <div className="rounded-lg border border-slate-200 bg-[#F4F7F9] p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-[#0B2545]">
                  {activeMission.codigo}
                </span>
                <StatusBadge
                  label={MISSION_STATE_LABELS[activeMission.estado]}
                  tone={getMissionTone(activeMission.estado)}
                  compact
                />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-xs font-mono tabular-nums">
                <div className="rounded bg-white border border-slate-200 px-2.5 py-1.5">
                  <div className="text-[10px] text-slate-500 font-sans">Progresso</div>
                  <div className="font-semibold text-[#0B2545]">
                    {activeLeg?.progressoPct ?? 0}%
                  </div>
                </div>
                <div className="rounded bg-white border border-slate-200 px-2.5 py-1.5">
                  <div className="text-[10px] text-slate-500 font-sans">Bateria sim.</div>
                  <div className="font-semibold text-[#0B2545]">
                    {formatPercent(lastTel?.bateriaPct ?? 85, 0)}
                  </div>
                </div>
                <div className="rounded bg-white border border-slate-200 px-2.5 py-1.5">
                  <div className="text-[10px] text-slate-500 font-sans">Temp. sim.</div>
                  <div className="font-semibold text-[#0B2545]">
                    {formatTemp(lastTel?.temperaturaCargaC ?? 4.2)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Nenhuma missão selecionada. Selecione uma missão acima para utilizar os controles de voo e alertas.
            </div>
          )}

          {!canSimulate.allowed && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <strong>Perfil atual restrito:</strong> {canSimulate.reason} Use o seletor &ldquo;Trocar perfil demonstrativo&rdquo; no cabeçalho para alternar para Administrador, Central ou Piloto.
            </div>
          )}

          {/* Flight & Stage Controls */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-500">
              Progressão de Voo e Etapas
            </h3>

            <button
              type="button"
              disabled={!activeMission || !canFlight.allowed}
              title={!canFlight.allowed ? canFlight.reason : 'Inicia o voo simulado se a missão já estiver despachada ou com retorno aprovado'}
              onClick={() => activeMission && startSimulatedFlight(activeMission.id)}
              className="w-full flex items-center justify-between gap-2 rounded-md bg-[#0F4C5C] px-3.5 py-2.5 text-sm font-medium text-white hover:bg-[#0B3B48] disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
            >
              <span className="flex items-center gap-2">
                <Play className="w-4 h-4 shrink-0" />
                <span>Iniciar simulação</span>
              </span>
              <span className="text-[11px] text-white/80">Decolagem sim.</span>
            </button>

            <button
              type="button"
              disabled={!activeMission || !canSimulate.allowed}
              title={!canSimulate.allowed ? canSimulate.reason : 'Orienta ou executa o próximo passo válido da demonstração'}
              onClick={() => activeMission && advanceDemoStep(activeMission.id)}
              className="w-full flex items-center justify-between gap-2 rounded-md border border-[#0F4C5C] bg-[#F0F6F8] px-3.5 py-2.5 text-sm font-medium text-[#0F4C5C] hover:bg-[#E3F0F4] disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
            >
              <span className="flex items-center gap-2">
                <StepForward className="w-4 h-4 shrink-0" />
                <span>Avançar etapa</span>
              </span>
              <span className="text-[11px]">Próximo passo</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={!activeMission || !canFlight.allowed}
                title={!canFlight.allowed ? canFlight.reason : 'Incrementa progresso no mapa e gera nova amostra de telemetria'}
                onClick={() => activeMission && advanceFlightProgress(activeMission.id, 20)}
                className="flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-[#0B2545] hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
              >
                <FastForward className="w-4 h-4 text-[#0F4C5C] shrink-0" />
                <span>Avançar voo</span>
              </button>

              <button
                type="button"
                disabled={!activeMission || !canFlight.allowed}
                title={!canFlight.allowed ? canFlight.reason : 'Leva progresso a 100% e registra chegada ao destino'}
                onClick={() => activeMission && simulateArrival(activeMission.id)}
                className="flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-[#0B2545] hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
              >
                <Flag className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Simular chegada</span>
              </button>
            </div>
          </div>

          {/* Anomaly Simulation Controls */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-semibold text-slate-500">
              Injeção de Anormalidades (Gera Ocorrência Automática)
            </h3>

            <button
              type="button"
              disabled={!activeMission || !canSimulate.allowed}
              title={!canSimulate.allowed ? canSimulate.reason : 'Gera leitura térmica fora da faixa e abre ocorrência crítica'}
              onClick={() => activeMission && simulateAnomaly(activeMission.id, 'TEMPERATURA')}
              className="w-full flex items-center gap-2.5 rounded-md border border-red-200 bg-red-50/70 px-3.5 py-2.5 text-xs font-semibold text-red-800 hover:bg-red-100/70 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
            >
              <Thermometer className="w-4 h-4 shrink-0" />
              <span>Simular alerta de temperatura</span>
            </button>

            <button
              type="button"
              disabled={!activeMission || !canSimulate.allowed}
              title={!canSimulate.allowed ? canSimulate.reason : 'Reduz bateria simulada abaixo do limiar e abre alerta'}
              onClick={() => activeMission && simulateAnomaly(activeMission.id, 'BATERIA')}
              className="w-full flex items-center gap-2.5 rounded-md border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-xs font-semibold text-amber-900 hover:bg-amber-100/80 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
            >
              <BatteryWarning className="w-4 h-4 shrink-0" />
              <span>Simular bateria baixa</span>
            </button>

            <button
              type="button"
              disabled={!activeMission || !canSimulate.allowed}
              title={!canSimulate.allowed ? canSimulate.reason : 'Altera status de comunicação simulada para Perda de Sinal'}
              onClick={() => activeMission && simulateAnomaly(activeMission.id, 'COMUNICACAO')}
              className="w-full flex items-center gap-2.5 rounded-md border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-xs font-semibold text-amber-900 hover:bg-amber-100/80 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
            >
              <Radio className="w-4 h-4 shrink-0" />
              <span>Simular perda de comunicação</span>
            </button>
          </div>

          {/* Reverse Logistics & Reset */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-semibold text-slate-500">
              Logística Reversa e Ambiente
            </h3>

            <button
              type="button"
              disabled={!canSimulate.allowed}
              title={!canSimulate.allowed ? canSimulate.reason : 'Cria uma solicitação fictícia compatível próxima ao destino para demonstrar retorno'}
              onClick={() => simulateReturnCargoAvailable(activeMission?.id)}
              className="w-full flex items-center gap-2.5 rounded-md border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100/70 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
            >
              <PackagePlus className="w-4 h-4 shrink-0" />
              <span>Simular carga disponível para retorno</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              className="w-full flex items-center gap-2.5 rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Restaurar dados de demonstração</span>
            </button>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 leading-relaxed">
            <strong>Aviso acadêmico:</strong> Este simulador atua apenas sobre registros fictícios locais no navegador. Nenhum drone físico, sensor real ou serviço aeronáutico é acionado.
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmResetOpen}
        title="Restaurar dados de demonstração"
        description="Esta ação limpa o armazenamento local do navegador (localStorage) e recria o cenário inicial fictício da MedAir Logistics. Deseja continuar?"
        confirmLabel="Sim, restaurar cenário inicial"
        tone="warning"
        onCancel={() => setConfirmResetOpen(false)}
        onConfirm={() => {
          setConfirmResetOpen(false);
          restoreDemoData();
        }}
      />
    </div>
  );
}
