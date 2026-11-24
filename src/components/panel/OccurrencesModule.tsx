import { AlertTriangle, CheckCircle2, Plus, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useMedAir } from '../../context/MedAirContext';
import { canRolePerform } from '../../engine/stateMachine';
import type { OccurrenceSeverity, OccurrenceStatus } from '../../types/domain';
import {
  formatDateTime,
  getOccurrenceTone,
  OCCURRENCE_SEVERITY_LABELS,
  OCCURRENCE_STATUS_LABELS,
} from '../../utils/formatters';
import { StatusBadge } from '../shared/StatusBadge';

export function OccurrencesModule() {
  const {
    state,
    currentUser,
    activeMission,
    registerManualOccurrence,
    updateOccurrence,
  } = useMedAir();

  const perm = currentUser
    ? canRolePerform(currentUser.perfil, 'MANAGE_OCCURRENCE')
    : { allowed: false, reason: 'Somente leitura.' };

  const [sevFilter, setSevFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedId, setSelectedId] = useState<string>(state.ocorrencias[0]?.id ?? '');
  const [providencia, setProvidencia] = useState('');
  const [justificativaEncerramento, setJustificativaEncerramento] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  // Manual occurrence form
  const [newMissionId, setNewMissionId] = useState(
    activeMission?.id ?? state.missoes[0]?.id ?? ''
  );
  const [newSeverity, setNewSeverity] = useState<OccurrenceSeverity>('ATENCAO');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSensor, setNewSensor] = useState('Leitura simulada de verificação operacional');

  const filtered = state.ocorrencias.filter((o) => {
    if (sevFilter !== 'ALL' && o.gravidade !== sevFilter) return false;
    if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
    return true;
  });

  const selected =
    state.ocorrencias.find((o) => o.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B2545]">
            Gestão de Ocorrências e Alertas
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Ocorrências coexistem com o estado da missão sem apagar histórico. Encerramento exige responsável e justificativa formal.
          </p>
        </div>

        <button
          type="button"
          disabled={!perm.allowed}
          title={!perm.allowed ? perm.reason : 'Registrar ocorrência manual'}
          onClick={() => setShowNewForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#0F4C5C] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0B3B48] disabled:opacity-45"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Ocorrência</span>
        </button>
      </div>

      {/* New Manual Occurrence Form */}
      {showNewForm && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="text-sm font-bold text-[#0B2545]">
            Nova Ocorrência Operacional (Simulada)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <select
              value={newMissionId}
              onChange={(e) => setNewMissionId(e.target.value)}
              className="rounded border border-slate-300 bg-white px-2.5 py-2"
            >
              {state.missoes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.codigo}
                </option>
              ))}
            </select>
            <select
              value={newSeverity}
              onChange={(e) => setNewSeverity(e.target.value as OccurrenceSeverity)}
              className="rounded border border-slate-300 bg-white px-2.5 py-2"
            >
              {(Object.keys(OCCURRENCE_SEVERITY_LABELS) as OccurrenceSeverity[]).map((k) => (
                <option key={k} value={k}>
                  Gravidade: {OCCURRENCE_SEVERITY_LABELS[k]}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newSensor}
              onChange={(e) => setNewSensor(e.target.value)}
              placeholder="Leitura de sensor simulada"
              className="rounded border border-slate-300 px-2.5 py-2"
            />
          </div>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Título da ocorrência *"
            className="w-full rounded border border-slate-300 px-3 py-2 text-xs"
          />
          <textarea
            rows={2}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Descrição detalhada da anormalidade *"
            className="w-full rounded border border-slate-300 px-3 py-2 text-xs"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                const m = state.missoes.find((x) => x.id === newMissionId);
                const res = registerManualOccurrence({
                  missionId: newMissionId,
                  trechoId: m?.trechoAtivoId,
                  gravidade: newSeverity,
                  tipoAlerta: 'OPERACIONAL',
                  titulo: newTitle,
                  descricao: newDesc,
                  leituraSensorSimulada: newSensor,
                });
                if (res.ok) {
                  setNewTitle('');
                  setNewDesc('');
                  setShowNewForm(false);
                }
              }}
              className="rounded bg-[#0F4C5C] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0B3B48]"
            >
              Salvar Ocorrência
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-3.5 flex flex-wrap gap-3">
        <select
          value={sevFilter}
          onChange={(e) => setSevFilter(e.target.value)}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
        >
          <option value="ALL">Todas as gravidades</option>
          {(Object.keys(OCCURRENCE_SEVERITY_LABELS) as OccurrenceSeverity[]).map((k) => (
            <option key={k} value={k}>
              {OCCURRENCE_SEVERITY_LABELS[k]}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
        >
          <option value="ALL">Todos os status</option>
          {(Object.keys(OCCURRENCE_STATUS_LABELS) as OccurrenceStatus[]).map((k) => (
            <option key={k} value={k}>
              {OCCURRENCE_STATUS_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      {/* Master-Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Nenhuma ocorrência encontrada neste filtro.
            </div>
          ) : (
            filtered.map((occ) => {
              const m = state.missoes.find((x) => x.id === occ.missaoId);
              const isSel = selected?.id === occ.id;
              return (
                <button
                  key={occ.id}
                  type="button"
                  onClick={() => setSelectedId(occ.id)}
                  className={`w-full text-left p-4 space-y-1.5 transition-colors ${
                    isSel ? 'bg-[#F0F6F8]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[#0B2545]">
                      {occ.codigo} · {m?.codigo ?? '—'}
                    </span>
                    <StatusBadge
                      label={OCCURRENCE_SEVERITY_LABELS[occ.gravidade]}
                      tone={getOccurrenceTone(occ.gravidade)}
                      compact
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate-800">{occ.titulo}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{OCCURRENCE_STATUS_LABELS[occ.status]}</span>
                    <span className="font-mono">{formatDateTime(occ.dataHoraAbertura)}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="lg:col-span-7">
          {selected ? (
            <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-[#0B2545]">
                      {selected.codigo}
                    </span>
                    <StatusBadge
                      label={OCCURRENCE_SEVERITY_LABELS[selected.gravidade]}
                      tone={getOccurrenceTone(selected.gravidade)}
                      compact
                    />
                    <StatusBadge
                      label={OCCURRENCE_STATUS_LABELS[selected.status]}
                      tone={selected.status === 'ENCERRADA' ? 'success' : 'warning'}
                      compact
                    />
                  </div>
                  <h2 className="text-sm font-bold text-[#0B2545] mt-1">{selected.titulo}</h2>
                </div>
                <span className="font-mono text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  DADOS SIMULADOS
                </span>
              </div>

              <div className="text-xs text-slate-700 space-y-1.5">
                <p>{selected.descricao}</p>
                <div className="rounded border border-slate-200 bg-slate-50 p-2.5 font-mono text-[11px] text-[#0B2545]">
                  <strong>Leitura sensor simulada:</strong> {selected.leituraSensorSimulada}
                </div>
                <div className="text-slate-500">
                  Aberta por <strong>{selected.abertaPorNome}</strong> em{' '}
                  <span className="font-mono">{formatDateTime(selected.dataHoraAbertura)}</span>
                  {selected.responsavelNome && (
                    <> · Responsável designado: <strong>{selected.responsavelNome}</strong></>
                  )}
                </div>
              </div>

              {/* Treatment Controls */}
              {selected.status !== 'ENCERRADA' ? (
                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <div className="text-xs font-bold text-[#0B2545] flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-[#0F4C5C]" />
                    <span>Registrar Providência e Atualizar Status</span>
                  </div>

                  <textarea
                    rows={2}
                    value={providencia}
                    onChange={(e) => setProvidencia(e.target.value)}
                    placeholder="Descreva a providência operacional tomada *"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-xs"
                  />

                  <input
                    type="text"
                    value={justificativaEncerramento}
                    onChange={(e) => setJustificativaEncerramento(e.target.value)}
                    placeholder="Justificativa formal de encerramento (obrigatória ao clicar em Encerrar)…"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-xs"
                  />

                  {!perm.allowed && (
                    <div className="rounded border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                      {perm.reason}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!perm.allowed}
                      onClick={() => {
                        const res = updateOccurrence({
                          occId: selected.id,
                          novoStatus: 'EM_AVALIACAO',
                          providencia,
                          atribuirParaMim: true,
                        });
                        if (res.ok) setProvidencia('');
                      }}
                      className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#0B2545] hover:bg-slate-100 disabled:opacity-45"
                    >
                      Assumir / Em Avaliação
                    </button>

                    <button
                      type="button"
                      disabled={!perm.allowed}
                      onClick={() => {
                        const res = updateOccurrence({
                          occId: selected.id,
                          novoStatus: 'EM_TRATAMENTO',
                          providencia,
                          atribuirParaMim: true,
                        });
                        if (res.ok) setProvidencia('');
                      }}
                      className="rounded bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-45"
                    >
                      Colocar em Tratamento
                    </button>

                    <button
                      type="button"
                      disabled={!perm.allowed}
                      onClick={() => {
                        const res = updateOccurrence({
                          occId: selected.id,
                          novoStatus: 'ENCERRADA',
                          providencia: providencia || 'Anormalidade tratada e normalizada.',
                          atribuirParaMim: true,
                          justificativaEncerramento,
                        });
                        if (res.ok) {
                          setProvidencia('');
                          setJustificativaEncerramento('');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-45"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Encerrar Ocorrência</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                  <strong>Ocorrência encerrada</strong> por {selected.encerradaPorNome} em{' '}
                  <span className="font-mono">{formatDateTime(selected.dataHoraEncerramento)}</span>.
                  <div className="mt-1">
                    <strong>Justificativa:</strong> {selected.justificativaEncerramento}
                  </div>
                </div>
              )}

              {/* Immutable History */}
              <div className="border-t border-slate-200 pt-3 space-y-2">
                <h3 className="text-xs font-bold text-[#0B2545] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                  <span>Histórico Imutável de Tratamento ({selected.historico.length})</span>
                </h3>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                  {selected.historico.map((h) => (
                    <div key={h.id} className="p-2.5 text-xs space-y-0.5">
                      <div className="flex justify-between font-mono text-[10px] text-slate-500">
                        <span className="font-semibold text-[#0F4C5C]">
                          {h.statusAnterior} → {h.novoStatus}
                        </span>
                        <span>{formatDateTime(h.dataHora)}</span>
                      </div>
                      <div className="text-slate-700">{h.providencia}</div>
                      <div className="text-[10px] text-slate-500">Por {h.usuarioNome}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              Selecione uma ocorrência à esquerda para consultar histórico e registrar providências.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
