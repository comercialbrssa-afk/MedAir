import { CheckCircle2, MessageSquareWarning, Search, XCircle } from 'lucide-react';
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
import type { PanelModule } from './PanelLayout';

export function TriageModule({
  onNavigate,
}: {
  onNavigate: (mod: PanelModule) => void;
}) {
  const { state, currentUser, triageRequest } = useMedAir();
  const perm = currentUser
    ? canRolePerform(currentUser.perfil, 'TRIAGE')
    : { allowed: false, reason: 'Somente leitura.' };

  const [statusFilter, setStatusFilter] = useState<string>('PENDENTE_TRIAGEM');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    state.solicitacoes.find((s) => s.status === 'PENDENTE_TRIAGEM')?.id ??
      state.solicitacoes[0]?.id ??
      null
  );
  const [justification, setJustification] = useState('');

  const filtered = state.solicitacoes.filter((s) => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
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

  const selected = state.solicitacoes.find((s) => s.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B2545]">
          Solicitações e Triagem Operacional
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
          Avalie solicitações recebidas do Portal Hospitalar: aprove para planejamento, solicite complementação ou recuse com justificativa auditável.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-3.5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por código ou descrição…"
            className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-1.5 text-xs"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs"
        >
          <option value="ALL">Todos os status ({state.solicitacoes.length})</option>
          {(Object.keys(REQUEST_STATUS_LABELS) as RequestStatus[]).map((k) => (
            <option key={k} value={k}>
              {REQUEST_STATUS_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      {/* Split Master-Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left List */}
        <div className="lg:col-span-5 rounded-lg border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Nenhuma solicitação encontrada neste filtro.
            </div>
          ) : (
            filtered.map((sol) => {
              const orig = state.instituicoes.find((i) => i.id === sol.origemId);
              const dest = state.instituicoes.find((i) => i.id === sol.destinoId);
              const isSelected = selected?.id === sol.id;

              return (
                <button
                  key={sol.id}
                  type="button"
                  onClick={() => setSelectedId(sol.id)}
                  className={`w-full text-left p-4 space-y-1.5 transition-colors ${
                    isSelected ? 'bg-[#F0F6F8]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[#0B2545]">
                      {sol.codigo}
                    </span>
                    <StatusBadge
                      label={PRIORITY_LABELS[sol.prioridade]}
                      tone={getPriorityTone(sol.prioridade)}
                      compact
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    {CARGO_TYPE_LABELS[sol.tipoCarga]}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between gap-2">
                    <span>
                      {orig?.sigla} → {dest?.sigla}
                    </span>
                    <span className="font-mono">{formatDateTime(sol.criadoEm)}</span>
                  </div>
                  <div className="text-[11px] font-medium text-[#0F4C5C]">
                    Status: {REQUEST_STATUS_LABELS[sol.status]}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right Detail & Triage Decision */}
        <div className="lg:col-span-7">
          {selected ? (
            <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-mono text-base font-bold text-[#0B2545]">
                      {selected.codigo}
                    </h2>
                    <StatusBadge
                      label={PRIORITY_LABELS[selected.prioridade]}
                      tone={getPriorityTone(selected.prioridade)}
                      compact
                    />
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {selected.descricaoCarga}
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#0F4C5C]">
                  {REQUEST_STATUS_LABELS[selected.status]}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="font-semibold text-[#0B2545]">Instituições e Responsável</div>
                  <div>
                    <strong>Solicitante:</strong>{' '}
                    {state.instituicoes.find((i) => i.id === selected.instituicaoSolicitanteId)?.nome}
                  </div>
                  <div>
                    <strong>Responsável:</strong> {selected.responsavelInstitucional}
                  </div>
                  <div>
                    <strong>Origem:</strong>{' '}
                    {state.instituicoes.find((i) => i.id === selected.origemId)?.nome}
                  </div>
                  <div>
                    <strong>Destino:</strong>{' '}
                    {state.instituicoes.find((i) => i.id === selected.destinoId)?.nome}
                  </div>
                </div>

                <div className="space-y-1.5 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="font-semibold text-[#0B2545]">Parâmetros Técnicos</div>
                  <div>
                    <strong>Peso / Volume:</strong>{' '}
                    <span className="font-mono">
                      {formatKg(selected.pesoKg)} / {formatLiters(selected.volumeEstimadoL)}
                    </span>
                  </div>
                  <div>
                    <strong>Dimensões:</strong>{' '}
                    <span className="font-mono">
                      {selected.dimensoesCm.comprimento}×{selected.dimensoesCm.largura}×{selected.dimensoesCm.altura} cm
                    </span>
                  </div>
                  <div>
                    <strong>Conservação:</strong>{' '}
                    {selected.requerControleTermico
                      ? `Térmica (${formatTemp(selected.tempMinC)} a ${formatTemp(selected.tempMaxC)})`
                      : 'Ambiente'}
                  </div>
                  <div>
                    <strong>Prazo desejado:</strong>{' '}
                    <span className="font-mono">{formatDateTime(selected.prazoDesejadoIso)}</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-700 space-y-1">
                <div>
                  <strong>Requisitos:</strong> {selected.requisitosConservacao}
                </div>
                <div>
                  <strong>Observações:</strong> {selected.observacoesOperacionais || '—'}
                </div>
              </div>

              {selected.justificativaTriagem && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  <strong>Histórico de triagem:</strong> {selected.justificativaTriagem}
                </div>
              )}

              {/* Triage Action Form */}
              {['PENDENTE_TRIAGEM', 'AGUARDANDO_COMPLEMENTACAO'].includes(selected.status) ? (
                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <label className="block text-xs font-semibold text-[#0B2545]">
                    Parecer / Justificativa da Triagem (obrigatória para complementação ou recusa)
                  </label>
                  <textarea
                    rows={2}
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Registre o parecer operacional da triagem…"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                  />

                  {!perm.allowed && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                      {perm.reason}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      disabled={!perm.allowed}
                      title={!perm.allowed ? perm.reason : 'Aprovar solicitação e abrir missão em Planejamento'}
                      onClick={() => {
                        const res = triageRequest(selected.id, 'APROVAR', justification);
                        if (res.ok) {
                          setJustification('');
                          onNavigate('PLANEJAMENTO');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#0F4C5C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B3B48] disabled:opacity-45"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Aprovar para Planejamento</span>
                    </button>

                    <button
                      type="button"
                      disabled={!perm.allowed}
                      title={!perm.allowed ? perm.reason : 'Solicitar complementação ao solicitante'}
                      onClick={() => {
                        const res = triageRequest(selected.id, 'COMPLEMENTACAO', justification);
                        if (res.ok) setJustification('');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-45"
                    >
                      <MessageSquareWarning className="w-3.5 h-3.5" />
                      <span>Solicitar Complementação</span>
                    </button>

                    <button
                      type="button"
                      disabled={!perm.allowed}
                      title={!perm.allowed ? perm.reason : 'Recusar solicitação com justificativa'}
                      onClick={() => {
                        const res = triageRequest(selected.id, 'RECUSAR', justification);
                        if (res.ok) setJustification('');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-45"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Recusar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                  Esta solicitação não está pendente de triagem (status atual: <strong>{REQUEST_STATUS_LABELS[selected.status]}</strong>).
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              Selecione uma solicitação à esquerda para visualizar detalhes e executar a triagem.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
