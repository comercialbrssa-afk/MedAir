import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Flag,
  PackageCheck,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useMedAir } from '../../context/MedAirContext';
import { canRolePerform } from '../../engine/stateMachine';
import type { Carga, Missao } from '../../types/domain';
import {
  CARGO_STATE_LABELS,
  formatDateTime,
  formatTemp,
  getMissionTone,
  MISSION_STATE_LABELS,
} from '../../utils/formatters';
import { ReceiptModal } from '../shared/Modals';
import { StatusBadge } from '../shared/StatusBadge';
import type { PanelModule } from './PanelLayout';

export function ArrivalDeliveryModule({
  onNavigate,
}: {
  onNavigate: (mod: PanelModule) => void;
}) {
  const {
    state,
    currentUser,
    activeMission,
    setActiveMission,
    simulateArrival,
    startDestinationConference,
    confirmCargoReceiving,
  } = useMedAir();

  const permFlight = currentUser
    ? canRolePerform(currentUser.perfil, 'MONITOR_FLIGHT')
    : { allowed: false, reason: 'Somente leitura.' };
  const permReceive = currentUser
    ? canRolePerform(currentUser.perfil, 'RECEIVE_CARGO')
    : { allowed: false, reason: 'Somente leitura.' };

  const relevantMissions = state.missoes.filter((m) =>
    [
      'EM_TRANSPORTE',
      'CHEGOU_AO_DESTINO',
      'EM_CONFERENCIA',
      'ENTREGA_CONFIRMADA',
      'ENTREGA_COM_RESSALVA',
      'RECEBIMENTO_RECUSADO',
    ].includes(m.estado)
  );

  const mission =
    relevantMissions.find((m) => m.id === activeMission?.id) ?? relevantMissions[0] ?? null;

  const primaryCargo = mission
    ? state.cargas.find(
        (c) => c.missaoId === mission.id && c.solicitacaoId === mission.solicitacaoPrincipalId
      )
    : undefined;
  const leg = mission ? state.trechos.find((t) => t.id === primaryCargo?.trechoId) : undefined;
  const destInst = state.instituicoes.find((i) => i.id === leg?.destinoId);

  const [integridade, setIntegridade] = useState<'INTEGRA' | 'AVARIA_LEVE' | 'VIOLADA'>('INTEGRA');
  const [lacreOk, setLacreOk] = useState(true);
  const [tempEntrega, setTempEntrega] = useState('4.4');
  const [justificativa, setJustificativa] = useState('');
  const [receiptTarget, setReceiptTarget] = useState<{ mission: Missao; cargo: Carga } | null>(
    null
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B2545]">
            Chegada ao Destino e Conferência de Entrega
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Registrar chegada NÃO confirma entrega automaticamente. Exige conferência de lacre, embalagem, responsável e comprovante demonstrativo.
          </p>
        </div>

        {relevantMissions.length > 0 && (
          <select
            value={mission?.id ?? ''}
            onChange={(e) => setActiveMission(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono font-semibold text-[#0B2545]"
          >
            {relevantMissions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.codigo} — {MISSION_STATE_LABELS[m.estado]}
              </option>
            ))}
          </select>
        )}
      </div>

      {!mission || !primaryCargo ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Nenhuma missão em transporte ou conferência de entrega no momento.
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <PackageCheck className="w-5 h-5 text-[#0F4C5C]" />
              <span className="font-mono text-base font-bold text-[#0B2545]">
                {mission.codigo} · Carga {primaryCargo.codigo}
              </span>
              <StatusBadge
                label={MISSION_STATE_LABELS[mission.estado]}
                tone={getMissionTone(mission.estado)}
              />
            </div>
            <div className="text-xs text-slate-600">
              Destino: <strong>{destInst?.nome ?? '—'}</strong>
            </div>
          </div>

          {/* Step A: In Flight -> Register Arrival */}
          {mission.estado === 'EM_TRANSPORTE' && (
            <div className="rounded-md border border-[#0F4C5C]/30 bg-[#F0F6F8] p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-[#0B2545]">
                <strong>Trecho de ida em andamento ({leg?.progressoPct ?? 0}%):</strong> registre a chegada do drone ao destino para notificar a instituição destinatária e liberar a conferência.
              </div>
              <button
                type="button"
                disabled={!permFlight.allowed}
                title={!permFlight.allowed ? permFlight.reason : 'Registrar chegada simulada ao destino'}
                onClick={() => simulateArrival(mission.id)}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#0F4C5C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B3B48] disabled:opacity-45"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Registrar Chegada ao Destino</span>
              </button>
            </div>
          )}

          {/* Step B: Arrived / In Conference */}
          {(mission.estado === 'CHEGOU_AO_DESTINO' || mission.estado === 'EM_CONFERENCIA') && (
            <div className="space-y-4">
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950">
                <div>
                  <strong>Instituição destinatária notificada:</strong> o drone pousou em{' '}
                  <span className="font-mono">{formatDateTime(leg?.chegadaEm)}</span>. A carga permanece em{' '}
                  <strong>{CARGO_STATE_LABELS[primaryCargo.estado]}</strong> até conferência formal.
                </div>
                {mission.estado === 'CHEGOU_AO_DESTINO' && (
                  <button
                    type="button"
                    disabled={!permReceive.allowed}
                    onClick={() => startDestinationConference(mission.id, primaryCargo.id)}
                    className="rounded-md bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-45"
                  >
                    Iniciar Conferência
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Integridade da embalagem
                  </label>
                  <select
                    value={integridade}
                    onChange={(e) =>
                      setIntegridade(e.target.value as 'INTEGRA' | 'AVARIA_LEVE' | 'VIOLADA')
                    }
                    className="w-full rounded border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="INTEGRA">Íntegra</option>
                    <option value="AVARIA_LEVE">Avaria leve</option>
                    <option value="VIOLADA">Violada</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Temperatura na entrega (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={tempEntrega}
                    onChange={(e) => setTempEntrega(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>

                <div className="flex items-end pb-2">
                  <label className="inline-flex items-center gap-2 font-semibold text-[#0B2545] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lacreOk}
                      onChange={(e) => setLacreOk(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#0F4C5C]"
                    />
                    <span>Lacre {primaryCargo.codigoLacre} conferido</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Justificativa / Ressalva (obrigatória para Ressalva ou Recusa)
                </label>
                <textarea
                  rows={2}
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder="Informe observações de conferência ou justificativa obrigatória…"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              {!permReceive.allowed && (
                <div className="rounded border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                  {permReceive.reason}
                </div>
              )}

              <div className="flex flex-wrap gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={!permReceive.allowed}
                  onClick={() => {
                    const res = confirmCargoReceiving({
                      missionId: mission.id,
                      cargoId: primaryCargo.id,
                      decision: 'ACEITA',
                      integridadeEmbalagem: integridade,
                      lacreConferido: lacreOk,
                      temperaturaEntregaC: Number(tempEntrega.replace(',', '.')),
                      justificativa,
                    });
                    if (res.ok) setJustificativa('');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-45"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Registrar Aceite</span>
                </button>

                <button
                  type="button"
                  disabled={!permReceive.allowed}
                  onClick={() => {
                    const res = confirmCargoReceiving({
                      missionId: mission.id,
                      cargoId: primaryCargo.id,
                      decision: 'ACEITA_COM_RESSALVA',
                      integridadeEmbalagem: integridade,
                      lacreConferido: lacreOk,
                      temperaturaEntregaC: Number(tempEntrega.replace(',', '.')),
                      justificativa,
                    });
                    if (res.ok) setJustificativa('');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-45"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Aceite com Ressalva</span>
                </button>

                <button
                  type="button"
                  disabled={!permReceive.allowed}
                  onClick={() => {
                    const res = confirmCargoReceiving({
                      missionId: mission.id,
                      cargoId: primaryCargo.id,
                      decision: 'RECUSADA',
                      integridadeEmbalagem: integridade,
                      lacreConferido: lacreOk,
                      temperaturaEntregaC: Number(tempEntrega.replace(',', '.')),
                      justificativa,
                    });
                    if (res.ok) setJustificativa('');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-45"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Registrar Recusa</span>
                </button>
              </div>
            </div>
          )}

          {/* Step C: Delivered -> Receipt + Next Step Reverse Logistics */}
          {['ENTREGA_CONFIRMADA', 'ENTREGA_COM_RESSALVA', 'RECEBIMENTO_RECUSADO'].includes(
            mission.estado
          ) && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 space-y-3 text-xs">
              <div className="font-bold text-emerald-900">
                Recebimento concluído ({CARGO_STATE_LABELS[primaryCargo.estado]}) em{' '}
                <span className="font-mono">{formatDateTime(primaryCargo.conferidaEm)}</span> · Temp.:{' '}
                <span className="font-mono">{formatTemp(primaryCargo.temperaturaEntregaC)}</span>
              </div>
              {primaryCargo.justificativaRecebimento && (
                <div className="text-amber-900">
                  <strong>Justificativa / Ressalva:</strong> {primaryCargo.justificativaRecebimento}
                </div>
              )}
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setReceiptTarget({ mission, cargo: primaryCargo })}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#0F4C5C] bg-white px-4 py-2 text-xs font-semibold text-[#0F4C5C] hover:bg-[#F0F6F8]"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Gerar / Imprimir Comprovante Demonstrativo</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('LOGISTICA_REVERSA')}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#0F4C5C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B3B48]"
                >
                  <span>Analisar Logística Reversa</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ReceiptModal
        mission={receiptTarget?.mission ?? null}
        cargo={receiptTarget?.cargo ?? null}
        onClose={() => setReceiptTarget(null)}
      />
    </div>
  );
}
