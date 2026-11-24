import { Eye, MessageSquarePlus, Search, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useMedAir } from '../../context/MedAirContext';
import { canRolePerform } from '../../engine/stateMachine';
import type { RequestStatus } from '../../types/domain';
import {
  CARGO_TYPE_LABELS,
  formatDateTime,
  formatKg,
  formatLiters,
  formatTemp,
  getPriorityTone,
  PRIORITY_LABELS,
  REQUEST_STATUS_LABELS,
} from '../../utils/formatters';
import { StatusBadge } from '../shared/StatusBadge';
import type { PortalTab } from './PortalLayout';

export function MyRequests({
  onNavigate,
}: {
  onNavigate: (tab: PortalTab) => void;
}) {
  const {
    state,
    currentUser,
    setActiveMission,
    respondComplementation,
    cancelRequest,
  } = useMedAir();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compText, setCompText] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const permEdit = currentUser
    ? canRolePerform(currentUser.perfil, 'CREATE_REQUEST')
    : { allowed: false, reason: 'Somente leitura.' };

  const isScopedInst =
    currentUser &&
    ['HOSPITAL_ORIGEM', 'HOSPITAL_DESTINO', 'LABORATORIO'].includes(currentUser.perfil);

  const cutoffMs = Date.now() - periodDays * 24 * 60 * 60 * 1000;

  const filtered = state.solicitacoes.filter((s) => {
    if (isScopedInst) {
      const matchInst =
        s.instituicaoSolicitanteId === currentUser.instituicaoId ||
        s.origemId === currentUser.instituicaoId ||
        s.destinoId === currentUser.instituicaoId;
      if (!matchInst) return false;
    }
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (periodDays > 0 && new Date(s.criadoEm).getTime() < cutoffMs) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !s.codigo.toLowerCase().includes(q) &&
        !s.descricaoCarga.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const selected = state.solicitacoes.find((s) => s.id === selectedId) ?? null;

  const getStatusTone = (st: RequestStatus) => {
    if (st === 'CONCLUIDA' || st === 'APROVADA_MISSAO') return 'success';
    if (st === 'RECUSADA' || st === 'CANCELADA') return 'danger';
    if (st === 'AGUARDANDO_COMPLEMENTACAO' || st === 'PENDENTE_TRIAGEM') return 'warning';
    return 'info';
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B2545]">
            Minhas Solicitações
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Consulte o andamento, responda pedidos de complementação ou acompanhe missões vinculadas.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código ou descrição…"
            className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-xs text-[#0B2545] focus:border-[#0F4C5C] focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-[#0B2545]"
        >
          <option value="ALL">Todos os status</option>
          {(Object.keys(REQUEST_STATUS_LABELS) as RequestStatus[]).map((k) => (
            <option key={k} value={k}>
              {REQUEST_STATUS_LABELS[k]}
            </option>
          ))}
        </select>

        <select
          value={periodDays}
          onChange={(e) => setPeriodDays(Number(e.target.value))}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-[#0B2545]"
        >
          <option value={1}>Últimas 24 horas</option>
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={0}>Todo o período</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Código</th>
                <th className="px-4 py-3 font-semibold">Tipo de Carga</th>
                <th className="px-4 py-3 font-semibold">Prioridade</th>
                <th className="px-4 py-3 font-semibold">Origem → Destino</th>
                <th className="px-4 py-3 font-semibold">Data / Hora</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Nenhuma solicitação encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map((sol) => {
                  const orig = state.instituicoes.find((i) => i.id === sol.origemId);
                  const dest = state.instituicoes.find((i) => i.id === sol.destinoId);
                  return (
                    <tr key={sol.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-[#0B2545]">
                        {sol.codigo}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#0B2545]">
                          {CARGO_TYPE_LABELS[sol.tipoCarga]}
                        </div>
                        <div className="text-[11px] text-slate-500 max-w-[240px] truncate">
                          {sol.descricaoCarga}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={PRIORITY_LABELS[sol.prioridade]}
                          tone={getPriorityTone(sol.prioridade)}
                          compact
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {orig?.sigla} → {dest?.sigla}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                        {formatDateTime(sol.criadoEm)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={REQUEST_STATUS_LABELS[sol.status]}
                          tone={getStatusTone(sol.status)}
                          compact
                        />
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => setSelectedId(sol.id)}
                          className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0B2545] hover:bg-slate-100"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Detalhes</span>
                        </button>
                        {sol.missaoId && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMission(sol.missaoId!);
                              onNavigate('ACOMPANHAMENTO');
                            }}
                            className="inline-flex items-center gap-1 rounded bg-[#0F4C5C] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#0B3B48]"
                          >
                            <span>Acompanhar</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Detail Panel */}
      {selected && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#0B2545]">
                Detalhes da Solicitação {selected.codigo}
              </h2>
              <p className="text-xs text-slate-500">
                Responsável: {selected.responsavelInstitucional} · Criada em {formatDateTime(selected.criadoEm)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-xs font-semibold text-slate-500 hover:text-[#0B2545]"
            >
              Fechar painel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <div className="text-slate-500">Peso e Volume</div>
              <div className="font-mono font-semibold text-[#0B2545]">
                {formatKg(selected.pesoKg)} · {formatLiters(selected.volumeEstimadoL)}
              </div>
              <div className="text-slate-500">
                Dimensões: {selected.dimensoesCm.comprimento}×{selected.dimensoesCm.largura}×{selected.dimensoesCm.altura} cm
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-slate-500">Conservação</div>
              <div className="font-semibold text-[#0B2545]">
                {selected.requerControleTermico
                  ? `Térmica: ${formatTemp(selected.tempMinC)} a ${formatTemp(selected.tempMaxC)}`
                  : 'Temperatura ambiente'}
              </div>
              <div className="text-slate-600">{selected.requisitosConservacao}</div>
            </div>
            <div className="space-y-1">
              <div className="text-slate-500">Prazo Desejado</div>
              <div className="font-mono font-semibold text-[#0B2545]">
                {formatDateTime(selected.prazoDesejadoIso)}
              </div>
              <div className="text-slate-600">{selected.observacoesOperacionais}</div>
            </div>
          </div>

          {selected.justificativaTriagem && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <strong>Registro da Central Operacional:</strong> {selected.justificativaTriagem}
            </div>
          )}

          {/* Respond Complementation */}
          {selected.status === 'AGUARDANDO_COMPLEMENTACAO' && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 space-y-2.5">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <MessageSquarePlus className="w-4 h-4" />
                <span>Complementação solicitada pela Central Operacional</span>
              </div>
              <p className="text-xs text-amber-900">{selected.complementacaoSolicitada}</p>
              <textarea
                rows={2}
                value={compText}
                onChange={(e) => setCompText(e.target.value)}
                placeholder="Informe os dados adicionais solicitados…"
                className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-xs"
              />
              <button
                type="button"
                disabled={!permEdit.allowed}
                title={!permEdit.allowed ? permEdit.reason : 'Reenviar solicitação para triagem'}
                onClick={() => {
                  const res = respondComplementation(selected.id, compText);
                  if (res.ok) setCompText('');
                }}
                className="rounded-md bg-[#0F4C5C] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0B3B48] disabled:opacity-45"
              >
                Enviar complementação e retornar à triagem
              </button>
            </div>
          )}

          {/* Cancel Request (Never delete!) */}
          {['PENDENTE_TRIAGEM', 'AGUARDANDO_COMPLEMENTACAO', 'DISPONIVEL_RETORNO'].includes(
            selected.status
          ) && (
            <div className="pt-2 border-t border-slate-100">
              {cancelingId === selected.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Motivo obrigatório do cancelamento (histórico será preservado)…"
                    className="w-full rounded-md border border-red-300 px-3 py-2 text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!permEdit.allowed}
                      onClick={() => {
                        const res = cancelRequest(selected.id, cancelReason);
                        if (res.ok) {
                          setCancelingId(null);
                          setCancelReason('');
                        }
                      }}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-45"
                    >
                      Confirmar cancelamento
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelingId(null)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!permEdit.allowed}
                  title={!permEdit.allowed ? permEdit.reason : 'Cancelar solicitação preservando histórico'}
                  onClick={() => setCancelingId(selected.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:underline disabled:opacity-45"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancelar solicitação (com motivo)</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
