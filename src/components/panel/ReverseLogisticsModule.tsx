import {
  CheckCircle2,
  PackagePlus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { useMedAir } from '../../context/MedAirContext';
import {
  ASSISTANT_DISCLAIMER,
  evaluateReverseLogisticsCandidate,
} from '../../engine/rulesEngine';
import { canRolePerform } from '../../engine/stateMachine';
import {
  CARGO_TYPE_LABELS,
  formatKg,
  formatLiters,
  formatTemp,
  getMissionTone,
  MISSION_STATE_LABELS,
} from '../../utils/formatters';
import { StatusBadge } from '../shared/StatusBadge';
import type { PanelModule } from './PanelLayout';

export function ReverseLogisticsModule({
  onNavigate,
}: {
  onNavigate: (mod: PanelModule) => void;
}) {
  const {
    state,
    currentUser,
    activeMission,
    setActiveMission,
    startReverseLogisticsAnalysis,
    confirmQuickReturnSanitization,
    decideReverseLogistics,
    simulateReturnCargoAvailable,
  } = useMedAir();

  const permRev = currentUser
    ? canRolePerform(currentUser.perfil, 'REVERSE_LOGISTICS')
    : { allowed: false, reason: 'Somente leitura.' };
  const permSim = currentUser
    ? canRolePerform(currentUser.perfil, 'SIMULATE')
    : { allowed: false, reason: 'Somente leitura.' };

  const eligibleMissions = state.missoes.filter((m) =>
    [
      'ENTREGA_CONFIRMADA',
      'ENTREGA_COM_RESSALVA',
      'RECEBIMENTO_RECUSADO',
      'ANALISANDO_RETORNO',
      'RETORNO_PENDENTE',
    ].includes(m.estado)
  );

  const mission =
    eligibleMissions.find((m) => m.id === activeMission?.id) ?? eligibleMissions[0] ?? null;

  const [justification, setJustification] = useState('');
  const [sanNotes, setSanNotes] = useState(
    'Módulo térmico selado substituído/higienizado conforme protocolo demonstrativo.'
  );

  const candidates = state.solicitacoes.filter(
    (s) => s.status === 'DISPONIVEL_RETORNO'
  );
  const drone = state.drones.find((d) => d.id === mission?.droneId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B2545]">
            Logística Reversa — Aproveitamento do Trecho de Retorno
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Avaliação determinística em 10 critérios para aproveitamento do retorno com nova carga sem comprometer a missão principal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {eligibleMissions.length > 0 && (
            <select
              value={mission?.id ?? ''}
              onChange={(e) => setActiveMission(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono font-semibold text-[#0B2545]"
            >
              {eligibleMissions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.codigo} — {MISSION_STATE_LABELS[m.estado]}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            disabled={!permSim.allowed}
            title={!permSim.allowed ? permSim.reason : 'Gerar solicitação fictícia compatível próxima ao destino'}
            onClick={() => simulateReturnCargoAvailable(mission?.id)}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-45"
          >
            <PackagePlus className="w-3.5 h-3.5" />
            <span>Simular Carga para Retorno</span>
          </button>
        </div>
      </div>

      {!mission ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center space-y-3">
          <p className="text-sm text-slate-600">
            Nenhuma missão com entrega principal concluída aguardando avaliação de logística reversa.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('ENTREGA')}
            className="rounded-md bg-[#0F4C5C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B3B48]"
          >
            Ir para Chegada e Entrega
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Mission Context Bar */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-base font-bold text-[#0B2545]">
                  {mission.codigo}
                </span>
                <StatusBadge
                  label={MISSION_STATE_LABELS[mission.estado]}
                  tone={getMissionTone(mission.estado)}
                />
              </div>
              <div className="text-xs text-slate-600">
                Drone: <strong className="font-mono">{drone?.codigo ?? '—'}</strong> · Bateria sim.:{' '}
                <strong className="font-mono">{drone?.bateriaAtualPct ?? 0}%</strong> · Compartimento higienizado:{' '}
                <strong className={drone?.higienizacaoLiberada ? 'text-emerald-700' : 'text-amber-700'}>
                  {drone?.higienizacaoLiberada ? 'Sim (Liberado)' : 'Aguardando confirmação'}
                </strong>
              </div>
            </div>

            {mission.estado !== 'ANALISANDO_RETORNO' && (
              <button
                type="button"
                disabled={!permRev.allowed}
                onClick={() => startReverseLogisticsAnalysis(mission.id)}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#0F4C5C] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0B3B48] disabled:opacity-45"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Iniciar Análise Formal de Retorno</span>
              </button>
            )}
          </div>

          {/* Quick Compartment Sanitization / Sealed Module Swap Box */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px] space-y-1">
              <div className="text-xs font-bold text-[#0B2545] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#0F4C5C]" />
                <span>Validação de Higienização / Módulo Selado para Reuso no Retorno</span>
              </div>
              <input
                type="text"
                value={sanNotes}
                onChange={(e) => setSanNotes(e.target.value)}
                className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </div>
            <button
              type="button"
              disabled={!permRev.allowed}
              onClick={() => confirmQuickReturnSanitization(mission.id, sanNotes)}
              className="rounded-md border border-[#0F4C5C] bg-[#F0F6F8] px-3.5 py-2 text-xs font-semibold text-[#0F4C5C] hover:bg-[#E3F0F4] disabled:opacity-45 whitespace-nowrap"
            >
              Confirmar Higienização / Módulo Selado
            </button>
          </div>

          {/* Disclaimer */}
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900">
            {ASSISTANT_DISCLAIMER} — A decisão de aprovar retorno com carga ou retorno vazio pertence exclusivamente a operador humano autorizado.
          </div>

          {/* Candidate List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#0B2545]">
                Solicitações Fictícias Disponíveis Próximas ao Destino ({candidates.length})
              </h2>
            </div>

            {candidates.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                Nenhuma solicitação fictícia disponível para retorno no momento. Use <strong>&ldquo;Simular Carga para Retorno&rdquo;</strong> acima ou aprove o <strong>Retorno Vazio</strong> abaixo.
              </div>
            ) : (
              candidates.map((cand) => {
                const evalRes = evaluateReverseLogisticsCandidate(mission, cand, state);
                const orig = state.instituicoes.find((i) => i.id === cand.origemId);
                const dest = state.instituicoes.find((i) => i.id === cand.destinoId);
                const tone =
                  evalRes.classificacao === 'COMPATIVEL'
                    ? 'success'
                    : evalRes.classificacao === 'PENDENTE_VALIDACAO'
                      ? 'warning'
                      : 'danger';
                const label =
                  evalRes.classificacao === 'COMPATIVEL'
                    ? 'Compatível'
                    : evalRes.classificacao === 'PENDENTE_VALIDACAO'
                      ? 'Pendente de validação'
                      : 'Incompatível';

                return (
                  <div
                    key={cand.id}
                    className="rounded-lg border border-slate-200 bg-white p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-bold text-[#0B2545]">
                            {cand.codigo}
                          </span>
                          <StatusBadge label={label} tone={tone} compact />
                        </div>
                        <div className="text-xs font-semibold text-slate-800 mt-1">
                          {CARGO_TYPE_LABELS[cand.tipoCarga]} · {cand.descricaoCarga}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Rota de retorno: <strong>{orig?.nome}</strong> → <strong>{dest?.nome}</strong> ·{' '}
                          <span className="font-mono">
                            {formatKg(cand.pesoKg)} · {formatLiters(cand.volumeEstimadoL)} ·{' '}
                            {cand.requerControleTermico
                              ? `${formatTemp(cand.tempMinC)} – ${formatTemp(cand.tempMaxC)}`
                              : 'Ambiente'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!permRev.allowed || evalRes.classificacao === 'INCOMPATIVEL'}
                        title={
                          !permRev.allowed
                            ? permRev.reason
                            : evalRes.classificacao === 'INCOMPATIVEL'
                              ? 'Bloqueado: candidata incompatível'
                              : 'Aprovar retorno com esta carga (cria novo trecho e nova carga)'
                        }
                        onClick={() => {
                          const res = decideReverseLogistics({
                            missionId: mission.id,
                            decision: 'COM_CARGA',
                            candidateSolId: cand.id,
                            justification,
                          });
                          if (res.ok) onNavigate('RETORNO');
                        }}
                        className="rounded-md bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        Aprovar Retorno com esta Carga
                      </button>
                    </div>

                    {/* 10 Criteria Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                      {evalRes.criterios.map((c) => (
                        <div
                          key={c.criterio}
                          className={`flex items-start gap-2 rounded border p-2 ${
                            c.status === 'OK'
                              ? 'border-emerald-200 bg-emerald-50/40'
                              : c.status === 'ATENCAO'
                                ? 'border-amber-200 bg-amber-50/60'
                                : 'border-red-200 bg-red-50/70'
                          }`}
                        >
                          {c.status === 'OK' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                          ) : (
                            <ShieldAlert
                              className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                                c.status === 'BLOQUEIO' ? 'text-red-600' : 'text-amber-700'
                              }`}
                            />
                          )}
                          <div>
                            <div className="font-semibold text-[#0B2545]">{c.criterio}</div>
                            <div className="text-slate-600">{c.motivo}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Human Justification + Empty Return Option */}
          <section className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#0B2545]">
              Decisão Alternativa: Retorno Vazio à Base Operacional
            </h2>
            <input
              type="text"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Justificativa / parecer humano sobre o aproveitamento ou retorno vazio…"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={!permRev.allowed}
                title={!permRev.allowed ? permRev.reason : 'Aprovar retorno vazio até a Base Operacional'}
                onClick={() => {
                  const res = decideReverseLogistics({
                    missionId: mission.id,
                    decision: 'VAZIO',
                    justification,
                  });
                  if (res.ok) onNavigate('RETORNO');
                }}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#0B2545] hover:bg-slate-100 disabled:opacity-45"
              >
                Aprovar Retorno Vazio à Base
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
