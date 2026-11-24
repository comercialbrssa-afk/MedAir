import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ClipboardList,
  Clock,
  PackageCheck,
  PlusCircle,
  Radio,
} from 'lucide-react';
import { useMedAir } from '../../context/MedAirContext';
import {
  CARGO_TYPE_LABELS,
  formatDateTime,
  getMissionTone,
  MISSION_STATE_LABELS,
  REQUEST_STATUS_LABELS,
} from '../../utils/formatters';
import { StatusBadge } from '../shared/StatusBadge';
import type { PortalTab } from './PortalLayout';

interface PortalHomeProps {
  onNavigate: (tab: PortalTab) => void;
}

export function PortalHome({ onNavigate }: PortalHomeProps) {
  const { state, currentUser, setActiveMission } = useMedAir();
  const userInst = state.instituicoes.find((i) => i.id === currentUser?.instituicaoId);

  const isScopedInst =
    currentUser &&
    ['HOSPITAL_ORIGEM', 'HOSPITAL_DESTINO', 'LABORATORIO'].includes(currentUser.perfil);

  const relevantRequests = isScopedInst
    ? state.solicitacoes.filter(
        (s) =>
          s.instituicaoSolicitanteId === currentUser.instituicaoId ||
          s.origemId === currentUser.instituicaoId ||
          s.destinoId === currentUser.instituicaoId
      )
    : state.solicitacoes;

  const activeMissions = state.missoes.filter((m) => {
    if (['ENCERRADA', 'CANCELADA', 'RECUSADA'].includes(m.estado)) return false;
    if (!isScopedInst) return true;
    const req = state.solicitacoes.find((s) => s.id === m.solicitacaoPrincipalId);
    const retReq = state.solicitacoes.find((s) => s.id === m.solicitacaoRetornoId);
    return (
      req?.origemId === currentUser.instituicaoId ||
      req?.destinoId === currentUser.instituicaoId ||
      retReq?.origemId === currentUser.instituicaoId ||
      retReq?.destinoId === currentUser.instituicaoId
    );
  });

  const awaitingConference = state.cargas.filter((c) => {
    if (c.estado !== 'AGUARDANDO_CONFERENCIA') return false;
    if (!isScopedInst) return true;
    const leg = state.trechos.find((t) => t.id === c.trechoId);
    return leg?.destinoId === currentUser.instituicaoId;
  });

  const completedDeliveries = state.cargas.filter((c) =>
    ['ENTREGUE', 'ENTREGUE_COM_RESSALVA'].includes(c.estado)
  );

  const recentEvents = state.eventos.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B2545]">
            Portal Hospitalar — Início
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            {userInst ? userInst.nome : 'Visão consolidada institucional'} · {currentUser?.nome}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('NOVA_SOLICITACAO')}
            className="inline-flex items-center gap-2 rounded-md bg-[#0F4C5C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B3B48] transition-colors whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nova Solicitação</span>
          </button>
          {awaitingConference.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('RECEBIMENTO')}
              className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors whitespace-nowrap"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Conferir Recebimento ({awaitingConference.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Solicitações registradas</span>
            <ClipboardList className="w-4 h-4 text-[#0F4C5C]" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#0B2545] tabular-nums">
            {relevantRequests.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {relevantRequests.filter((r) => r.status === 'PENDENTE_TRIAGEM').length} aguardando triagem
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Missões em andamento</span>
            <Radio className="w-4 h-4 text-[#0F4C5C]" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#0B2545] tabular-nums">
            {activeMissions.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Telemetria e mapa simulados
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Aguardando conferência</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#0B2545] tabular-nums">
            {awaitingConference.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Exige aceite ou ressalva formal
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Entregas concluídas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#0B2545] tabular-nums">
            {completedDeliveries.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Com comprovante e custódia
          </div>
        </div>
      </div>

      {/* Two Column Content: Active Missions + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-bold text-[#0B2545]">
              Missões Ativas Relacionadas
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('ACOMPANHAMENTO')}
              className="text-xs font-semibold text-[#0F4C5C] hover:underline inline-flex items-center gap-1"
            >
              <span>Ver acompanhamento</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeMissions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 space-y-2">
              <p>Não há missões ativas no momento para o escopo selecionado.</p>
              <button
                type="button"
                onClick={() => onNavigate('NOVA_SOLICITACAO')}
                className="text-[#0F4C5C] font-semibold hover:underline"
              >
                Abrir nova solicitação demonstrativa
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeMissions.map((m) => {
                const req = state.solicitacoes.find((s) => s.id === m.solicitacaoPrincipalId);
                const orig = state.instituicoes.find((i) => i.id === req?.origemId);
                const dest = state.instituicoes.find((i) => i.id === req?.destinoId);
                const activeLeg = state.trechos.find((t) => t.id === m.trechoAtivoId);

                return (
                  <div
                    key={m.id}
                    className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#0B2545]">
                          {m.codigo}
                        </span>
                        <StatusBadge
                          label={MISSION_STATE_LABELS[m.estado]}
                          tone={getMissionTone(m.estado)}
                          compact
                        />
                      </div>
                      <div className="text-xs text-slate-700 font-medium">
                        {req ? CARGO_TYPE_LABELS[req.tipoCarga] : 'Carga'} · {orig?.sigla} → {dest?.sigla}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                        Progresso simulado do trecho: {activeLeg?.progressoPct ?? 0}% · Atualizado em {formatDateTime(m.atualizadoEm)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveMission(m.id);
                        onNavigate('ACOMPANHAMENTO');
                      }}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#0B2545] hover:bg-slate-100 transition-colors whitespace-nowrap"
                    >
                      Acompanhar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Notifications / Recent Events */}
        <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-bold text-[#0B2545] flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#0F4C5C]" />
              <span>Notificações Recentes</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-400">Auditoria</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto">
            {recentEvents.map((evt) => (
              <div key={evt.id} className="p-3.5 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span className="font-semibold text-[#0F4C5C]">{evt.entidade}</span>
                  <span>{formatDateTime(evt.dataHora)}</span>
                </div>
                <p className="text-xs text-slate-700 leading-snug">{evt.justificativa}</p>
                <div className="text-[11px] text-slate-500">
                  Por {evt.usuarioNome}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Recent Requests Quick Table */}
      <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-[#0B2545]">Últimas Solicitações</h2>
          <button
            type="button"
            onClick={() => onNavigate('MINHAS_SOLICITACOES')}
            className="text-xs font-semibold text-[#0F4C5C] hover:underline"
          >
            Ver todas ({relevantRequests.length})
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Código</th>
                <th className="px-4 py-2.5 font-semibold">Carga</th>
                <th className="px-4 py-2.5 font-semibold">Rota</th>
                <th className="px-4 py-2.5 font-semibold">Data/Hora</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {relevantRequests.slice(0, 4).map((sol) => {
                const orig = state.instituicoes.find((i) => i.id === sol.origemId);
                const dest = state.instituicoes.find((i) => i.id === sol.destinoId);
                return (
                  <tr key={sol.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono font-semibold text-[#0B2545]">{sol.codigo}</td>
                    <td className="px-4 py-2.5 text-slate-700">{CARGO_TYPE_LABELS[sol.tipoCarga]}</td>
                    <td className="px-4 py-2.5 text-slate-600">{orig?.sigla} → {dest?.sigla}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-500 tabular-nums">{formatDateTime(sol.criadoEm)}</td>
                    <td className="px-4 py-2.5 text-slate-700 font-medium">{REQUEST_STATUS_LABELS[sol.status]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
