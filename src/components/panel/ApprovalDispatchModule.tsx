import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Send,
  ShieldAlert,
  Undo2,
} from 'lucide-react';
import { useState } from 'react';
import { useMedAir } from '../../context/MedAirContext';
import {
  canRolePerform,
  validateDispatchPreconditions,
} from '../../engine/stateMachine';
import {
  CARGO_STATE_LABELS,
  formatDateTime,
  formatKm,
  getMissionTone,
  MISSION_STATE_LABELS,
} from '../../utils/formatters';
import { StatusBadge } from '../shared/StatusBadge';
import type { PanelModule } from './PanelLayout';

export function ApprovalDispatchModule({
  onNavigate,
}: {
  onNavigate: (mod: PanelModule) => void;
}) {
  const {
    state,
    currentUser,
    activeMission,
    setActiveMission,
    approveMissionHuman,
    returnMissionToPlanning,
    toggleChecklistItem,
    dispatchMissionAdministrative,
  } = useMedAir();

  const permApprove = currentUser
    ? canRolePerform(currentUser.perfil, 'APPROVE_DISPATCH')
    : { allowed: false, reason: 'Somente leitura.' };
  const permCheck = currentUser
    ? canRolePerform(currentUser.perfil, 'COLLECT_PREP')
    : { allowed: false, reason: 'Somente leitura.' };

  const relevantMissions = state.missoes.filter((m) =>
    [
      'AGUARDANDO_APROVACAO',
      'APROVADA',
      'CARGA_EM_PREPARACAO',
      'CARGA_VALIDADA',
      'DESPACHADA',
    ].includes(m.estado)
  );

  const mission =
    relevantMissions.find((m) => m.id === activeMission?.id) ?? relevantMissions[0] ?? null;

  const [justification, setJustification] = useState('');

  const checklist = mission
    ? state.checklists.find((c) => c.missaoId === mission.id && c.tipo === 'PRE_DESPACHO')
    : undefined;
  const primaryCargo = mission
    ? state.cargas.find(
        (c) => c.missaoId === mission.id && c.solicitacaoId === mission.solicitacaoPrincipalId
      )
    : undefined;
  const drone = state.drones.find((d) => d.id === mission?.droneId);
  const pilot = state.usuarios.find((u) => u.id === mission?.pilotoResponsavelId);
  const leg = state.trechos.find((t) => t.id === mission?.trechoAtivoId);
  const orig = state.instituicoes.find((i) => i.id === leg?.origemId);
  const dest = state.instituicoes.find((i) => i.id === leg?.destinoId);

  const dispatchCheck = mission ? validateDispatchPreconditions(state, mission) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B2545]">
            Aprovação Humana e Despacho Administrativo
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Ordem de missão, aprovação formal, checklist obrigatório pré-despacho e liberação administrativa para voo simulado.
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

      {/* Mandatory Legal/Operational Disclaimer */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 flex items-start gap-3 text-xs text-amber-950">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold">
            AVISO REGULATÓRIO OBRIGATÓRIO — PROTÓTIPO ACADÊMICO
          </div>
          <p className="mt-0.5 leading-relaxed">
            O <strong>despacho administrativo demonstrativo NÃO equivale à autorização aeronáutica (ANAC / DECEA / ANATEL), sanitária (ANVISA) ou operacional real</strong>. Todas as validações têm finalidade exclusivamente didática e dependem de decisão humana.
          </p>
        </div>
      </div>

      {!mission ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center space-y-3">
          <p className="text-sm text-slate-600">
            Nenhuma missão aguardando aprovação ou despacho administrativo no momento.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('PLANEJAMENTO')}
            className="rounded-md bg-[#0F4C5C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B3B48]"
          >
            Ir para Planejamento
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Mission Order & Approval */}
          <div className="lg:col-span-2 space-y-5">
            <section className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-base font-bold text-[#0B2545]">
                    Ordem de Missão {mission.codigo}
                  </span>
                  <StatusBadge
                    label={MISSION_STATE_LABELS[mission.estado]}
                    tone={getMissionTone(mission.estado)}
                  />
                </div>
                <span className="font-mono text-xs text-slate-500">
                  Trecho: {leg?.codigo ?? '—'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <div><strong>Origem:</strong> {orig?.nome ?? '—'}</div>
                  <div><strong>Destino:</strong> {dest?.nome ?? '—'}</div>
                  <div><strong>Distância sim.:</strong> <span className="font-mono">{formatKm(mission.distanciaEstimadaKm)}</span></div>
                </div>
                <div className="space-y-1.5">
                  <div><strong>Drone atribuído:</strong> {drone ? `${drone.codigo} (${drone.modelo})` : '—'}</div>
                  <div><strong>Piloto / Resp.:</strong> {pilot?.nome ?? '—'}</div>
                  <div>
                    <strong>Carga principal:</strong>{' '}
                    {primaryCargo ? `${primaryCargo.codigo} (${CARGO_STATE_LABELS[primaryCargo.estado]})` : '—'}
                  </div>
                </div>
              </div>

              {/* Step 1: Human Approval */}
              {mission.estado === 'AGUARDANDO_APROVACAO' && (
                <div className="rounded-md border border-[#0F4C5C]/30 bg-[#F0F6F8] p-4 space-y-3">
                  <div className="text-xs font-bold text-[#0B2545]">
                    Etapa 1: Aprovação Humana da Ordem de Missão
                  </div>
                  <input
                    type="text"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Justificativa / parecer humano (obrigatório caso devolva ao planejamento)…"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs"
                  />
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      disabled={!permApprove.allowed}
                      title={!permApprove.allowed ? permApprove.reason : 'Aprovar ordem de missão'}
                      onClick={() => {
                        const res = approveMissionHuman(mission.id, justification);
                        if (res.ok) setJustification('');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-45"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Aprovar Missão (Decisão Humana)</span>
                    </button>
                    <button
                      type="button"
                      disabled={!permApprove.allowed}
                      onClick={() => {
                        const res = returnMissionToPlanning(mission.id, justification);
                        if (res.ok) setJustification('');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-45"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Devolver ao Planejamento</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2 Guidance: If approved but cargo not sealed yet */}
              {(mission.estado === 'APROVADA' || mission.estado === 'CARGA_EM_PREPARACAO') && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-amber-950">
                    <strong>Coleta pendente:</strong> a missão foi aprovada por pessoa autorizada em{' '}
                    <span className="font-mono">{formatDateTime(mission.aprovadaEm)}</span>. Antes do despacho, a carga precisa ser coletada, lacrada e ter custódia registrada.
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('COLETA')}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#0F4C5C] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0B3B48] whitespace-nowrap"
                  >
                    <span>Ir para Coleta e Preparação</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Step 3: Mandatory Pre-dispatch Checklist */}
              {checklist && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#0B2545] flex items-center gap-1.5">
                      <ClipboardCheck className="w-4 h-4 text-[#0F4C5C]" />
                      <span>Checklist Obrigatório Pré-Despacho</span>
                    </h3>
                    <span className="font-mono text-[11px] text-slate-600">
                      {checklist.itens.filter((i) => i.verificado).length}/{checklist.itens.length} concluídos
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                    {checklist.itens.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-start gap-3 p-3 hover:bg-slate-50 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={item.verificado}
                          disabled={!permCheck.allowed || mission.estado === 'DESPACHADA'}
                          onChange={() => toggleChecklistItem(checklist.id, item.id)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0F4C5C]"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-[#0B2545]">{item.label}</div>
                          {item.verificado && (
                            <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
                              Verificado por {item.verificadoPorNome} em {formatDateTime(item.verificadoEm)}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Right: Dispatch Gatekeeper */}
          <div className="space-y-4">
            <section className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
              <h2 className="text-sm font-bold text-[#0B2545]">
                Liberação de Despacho Administrativo
              </h2>

              {mission.estado === 'DESPACHADA' ? (
                <div className="space-y-3">
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                    <strong>Missão despachada</strong> em{' '}
                    <span className="font-mono">{formatDateTime(mission.despachadaEm)}</span>. Agora você pode iniciar o voo simulado na Central de Monitoramento ou pelo Simulador.
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('MONITORAMENTO')}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#0F4C5C] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0B3B48]"
                  >
                    <span>Ir para Central de Monitoramento</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  {dispatchCheck && !dispatchCheck.ok ? (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 space-y-1.5 text-xs text-red-900">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Regras impeditivas de despacho:</span>
                      </div>
                      <ul className="list-disc pl-4 space-y-1">
                        {dispatchCheck.blockers.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                      Todos os pré-requisitos obrigatórios (aprovação humana, carga lacrada e checklist) foram satisfeitos.
                    </div>
                  )}

                  <input
                    type="text"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Observação do despacho administrativo…"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                  />

                  <button
                    type="button"
                    disabled={!permApprove.allowed || !dispatchCheck?.ok}
                    title={
                      !permApprove.allowed
                        ? permApprove.reason
                        : !dispatchCheck?.ok
                          ? dispatchCheck?.blockers[0]
                          : 'Executar despacho administrativo demonstrativo'
                    }
                    onClick={() => {
                      const res = dispatchMissionAdministrative(mission.id, justification);
                      if (res.ok) {
                        setJustification('');
                        onNavigate('MONITORAMENTO');
                      }
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#0F4C5C] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0B3B48] disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    <span>Efetuar Despacho Administrativo</span>
                  </button>
                </>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
