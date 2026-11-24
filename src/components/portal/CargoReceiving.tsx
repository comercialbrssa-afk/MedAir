import { AlertTriangle, CheckCircle2, PackageCheck, ShieldCheck, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useMedAir } from '../../context/MedAirContext';
import { canRolePerform } from '../../engine/stateMachine';
import {
  CARGO_STATE_LABELS,
  CARGO_TYPE_LABELS,
  formatDateTime,
  formatKg,
  formatTemp,
} from '../../utils/formatters';
import { StatusBadge } from '../shared/StatusBadge';

export function CargoReceiving() {
  const {
    state,
    currentUser,
    startDestinationConference,
    confirmCargoReceiving,
    startCargoPreparation,
    validateAndSealCargo,
  } = useMedAir();

  const permReceive = currentUser
    ? canRolePerform(currentUser.perfil, 'RECEIVE_CARGO')
    : { allowed: false, reason: 'Somente leitura.' };
  const permCollect = currentUser
    ? canRolePerform(currentUser.perfil, 'COLLECT_PREP')
    : { allowed: false, reason: 'Somente leitura.' };

  const [selectedCargoId, setSelectedCargoId] = useState<string | null>(null);
  const [integridade, setIntegridade] = useState<'INTEGRA' | 'AVARIA_LEVE' | 'VIOLADA'>('INTEGRA');
  const [lacreOk, setLacreOk] = useState(true);
  const [tempEntrega, setTempEntrega] = useState('4.5');
  const [justificativa, setJustificativa] = useState('');

  // Origin handoff state
  const [handoffCargoId, setHandoffCargoId] = useState<string | null>(null);
  const [embalagem, setEmbalagem] = useState('Caixa isotérmica selada hospitalar (Fictícia)');
  const [lacreCode, setLacreCode] = useState(`LCR-MED-${Math.floor(10000 + Math.random() * 89999)}`);
  const [tempInicial, setTempInicial] = useState('4.1');
  const [docOk, setDocOk] = useState(true);
  const [obsColeta, setObsColeta] = useState('Carga entregue pela equipe hospitalar à coleta MedAir.');

  const awaitingReceiving = state.cargas.filter((c) => {
    if (c.estado !== 'AGUARDANDO_CONFERENCIA') return false;
    if (
      currentUser &&
      ['HOSPITAL_DESTINO', 'LABORATORIO', 'HOSPITAL_ORIGEM'].includes(currentUser.perfil)
    ) {
      const leg = state.trechos.find((t) => t.id === c.trechoId);
      return leg?.destinoId === currentUser.instituicaoId;
    }
    return true;
  });

  const awaitingCollection = state.cargas.filter((c) => {
    const mission = state.missoes.find((m) => m.id === c.missaoId);
    if (!mission) return false;
    const readyPrimary =
      ['APROVADA', 'CARGA_EM_PREPARACAO'].includes(mission.estado) &&
      ['SOLICITADA', 'EM_PREPARACAO'].includes(c.estado);
    const readyReturn =
      mission.estado === 'RETORNO_APROVADO' && c.estado === 'EM_PREPARACAO';
    if (!readyPrimary && !readyReturn) return false;
    if (
      currentUser &&
      ['HOSPITAL_ORIGEM', 'LABORATORIO', 'HOSPITAL_DESTINO'].includes(currentUser.perfil)
    ) {
      const leg = state.trechos.find((t) => t.id === c.trechoId);
      return leg?.origemId === currentUser.instituicaoId;
    }
    return true;
  });

  const activeCargo =
    awaitingReceiving.find((c) => c.id === selectedCargoId) ?? awaitingReceiving[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B2545]">
          Recebimento, Conferência e Entrega na Coleta
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
          Nenhuma carga é marcada como entregue automaticamente. A conferência de lacre, embalagem e o registro de custódia exigem validação humana.
        </p>
      </div>

      {/* Section A: Destination Conference & Receiving */}
      <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 bg-[#F8FAFC] px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-[#0F4C5C]" />
            <h2 className="text-sm font-bold text-[#0B2545]">
              Cargas Aguardando Conferência no Destino ({awaitingReceiving.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">Registro automático de custódia</span>
        </div>

        {awaitingReceiving.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            Não há cargas aguardando conferência no destino para o perfil atual. Utilize o <strong>Simulador → Simular chegada</strong> quando uma missão estiver em transporte.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* List */}
            <div className="divide-y divide-slate-100">
              {awaitingReceiving.map((cargo) => {
                const mission = state.missoes.find((m) => m.id === cargo.missaoId);
                const leg = state.trechos.find((t) => t.id === cargo.trechoId);
                const orig = state.instituicoes.find((i) => i.id === leg?.origemId);
                const dest = state.instituicoes.find((i) => i.id === leg?.destinoId);
                const isSel = activeCargo?.id === cargo.id;

                return (
                  <button
                    key={cargo.id}
                    type="button"
                    onClick={() => setSelectedCargoId(cargo.id)}
                    className={`w-full text-left p-4 space-y-1.5 transition-colors ${
                      isSel ? 'bg-[#F0F6F8]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#0B2545]">
                        {cargo.codigo} · {mission?.codigo}
                      </span>
                      <StatusBadge label="Conferir" tone="warning" compact />
                    </div>
                    <div className="text-xs font-medium text-slate-700">
                      {CARGO_TYPE_LABELS[cargo.tipo]}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {orig?.sigla} → {dest?.sigla} · Lacre: <span className="font-mono">{cargo.codigoLacre ?? '—'}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Conference Form */}
            {activeCargo && (
              <div className="lg:col-span-2 p-5 space-y-4">
                {(() => {
                  const mission = state.missoes.find((m) => m.id === activeCargo.missaoId)!;
                  const lastTel = state.telemetria
                    .filter((t) => t.missaoId === mission.id)
                    .sort((a, b) => b.dataHora.localeCompare(a.dataHora))[0];

                  return (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div>
                          <div className="text-sm font-bold text-[#0B2545]">
                            Conferência da Carga {activeCargo.codigo}
                          </div>
                          <div className="text-xs text-slate-500">
                            {activeCargo.descricao} · {formatKg(activeCargo.pesoKg)}
                          </div>
                        </div>
                        {mission.estado === 'CHEGOU_AO_DESTINO' && (
                          <button
                            type="button"
                            disabled={!permReceive.allowed}
                            title={!permReceive.allowed ? permReceive.reason : 'Marcar início da conferência'}
                            onClick={() => startDestinationConference(mission.id, activeCargo.id)}
                            className="rounded-md border border-[#0F4C5C] bg-[#F0F6F8] px-3 py-1.5 text-xs font-semibold text-[#0F4C5C] hover:bg-[#E3F0F4] disabled:opacity-45"
                          >
                            Iniciar Conferência
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                          <div className="text-[10px] text-slate-500">Lacre esperado</div>
                          <div className="font-mono font-bold text-[#0B2545] mt-0.5">
                            {activeCargo.codigoLacre ?? '—'}
                          </div>
                        </div>
                        <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                          <div className="text-[10px] text-slate-500">Temp. Coleta</div>
                          <div className="font-mono font-bold text-[#0B2545] mt-0.5">
                            {formatTemp(activeCargo.temperaturaInicialC)}
                          </div>
                        </div>
                        <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                          <div className="text-[10px] text-slate-500">Última Temp. Sim.</div>
                          <div className="font-mono font-bold text-[#0B2545] mt-0.5">
                            {formatTemp(lastTel?.temperaturaCargaC)}
                          </div>
                        </div>
                        <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                          <div className="text-[10px] text-slate-500">Embalagem origem</div>
                          <div className="font-medium text-[#0B2545] mt-0.5 truncate">
                            {activeCargo.embalagem ?? '—'}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Condição da embalagem
                          </label>
                          <select
                            value={integridade}
                            onChange={(e) =>
                              setIntegridade(e.target.value as 'INTEGRA' | 'AVARIA_LEVE' | 'VIOLADA')
                            }
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs"
                          >
                            <option value="INTEGRA">Íntegra</option>
                            <option value="AVARIA_LEVE">Avaria leve externa</option>
                            <option value="VIOLADA">Violada / comprometida</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Temperatura conferida (°C)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={tempEntrega}
                            onChange={(e) => setTempEntrega(e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-mono"
                          />
                        </div>

                        <div className="flex items-end pb-2">
                          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#0B2545] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={lacreOk}
                              onChange={(e) => setLacreOk(e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-[#0F4C5C]"
                            />
                            <span>Lacre intacto e conferido</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Observações / Justificativa (obrigatória para Ressalva ou Recusa)
                        </label>
                        <textarea
                          rows={2}
                          value={justificativa}
                          onChange={(e) => setJustificativa(e.target.value)}
                          placeholder="Descreva eventuais ressalvas térmicas, avarias ou motivo de recusa…"
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                        />
                      </div>

                      {!permReceive.allowed && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                          {permReceive.reason}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={!permReceive.allowed}
                          title={!permReceive.allowed ? permReceive.reason : 'Aceitar carga e registrar custódia'}
                          onClick={() => {
                            const res = confirmCargoReceiving({
                              missionId: mission.id,
                              cargoId: activeCargo.id,
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
                          <span>Aceitar Entrega</span>
                        </button>

                        <button
                          type="button"
                          disabled={!permReceive.allowed}
                          title={!permReceive.allowed ? permReceive.reason : 'Exige justificativa preenchida'}
                          onClick={() => {
                            const res = confirmCargoReceiving({
                              missionId: mission.id,
                              cargoId: activeCargo.id,
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
                          <span>Aceitar com Ressalva</span>
                        </button>

                        <button
                          type="button"
                          disabled={!permReceive.allowed}
                          title={!permReceive.allowed ? permReceive.reason : 'Exige justificativa preenchida'}
                          onClick={() => {
                            const res = confirmCargoReceiving({
                              missionId: mission.id,
                              cargoId: activeCargo.id,
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
                          <span>Recusar Recebimento</span>
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Section B: Origin Handoff / Collection Registration for Hospital de Origem */}
      <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 bg-[#F8FAFC] px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0F4C5C]" />
            <h2 className="text-sm font-bold text-[#0B2545]">
              Entrega da Carga na Coleta (Origem) ({awaitingCollection.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">Transferência de custódia inicial</span>
        </div>

        {awaitingCollection.length === 0 ? (
          <div className="p-5 text-xs text-slate-500">
            Nenhuma missão aprovada aguardando entrega de carga na coleta neste momento.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {awaitingCollection.map((cargo) => {
              const mission = state.missoes.find((m) => m.id === cargo.missaoId)!;
              const isOpen = handoffCargoId === cargo.id;

              return (
                <div key={cargo.id} className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-mono text-xs font-bold text-[#0B2545]">
                        {cargo.codigo} · {mission.codigo} ({CARGO_STATE_LABELS[cargo.estado]})
                      </div>
                      <div className="text-xs text-slate-600">
                        {cargo.descricao} · {formatKg(cargo.pesoKg)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {cargo.estado === 'SOLICITADA' && (
                        <button
                          type="button"
                          disabled={!permCollect.allowed}
                          onClick={() => {
                            startCargoPreparation(mission.id, cargo.id);
                            setHandoffCargoId(cargo.id);
                          }}
                          className="rounded-md border border-[#0F4C5C] bg-[#F0F6F8] px-3 py-1.5 text-xs font-semibold text-[#0F4C5C] disabled:opacity-45"
                        >
                          Iniciar Preparação
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setHandoffCargoId(isOpen ? null : cargo.id)}
                        className="rounded-md bg-[#0F4C5C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0B3B48]"
                      >
                        {isOpen ? 'Ocultar formulário' : 'Registrar Lacre e Custódia'}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="rounded-md border border-slate-200 bg-[#F4F7F9] p-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Embalagem *
                          </label>
                          <input
                            type="text"
                            value={embalagem}
                            onChange={(e) => setEmbalagem(e.target.value)}
                            className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Código do Lacre *
                          </label>
                          <input
                            type="text"
                            value={lacreCode}
                            onChange={(e) => setLacreCode(e.target.value)}
                            className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Temperatura inicial (°C)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={tempInicial}
                            onChange={(e) => setTempInicial(e.target.value)}
                            className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="inline-flex items-center gap-2 text-xs font-medium text-[#0B2545]">
                          <input
                            type="checkbox"
                            checked={docOk}
                            onChange={(e) => setDocOk(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-[#0F4C5C]"
                          />
                          <span>Documentação demonstrativa conferida</span>
                        </label>
                        <button
                          type="button"
                          disabled={!permCollect.allowed}
                          onClick={() => {
                            const res = validateAndSealCargo({
                              missionId: mission.id,
                              cargoId: cargo.id,
                              embalagem,
                              codigoLacre: lacreCode,
                              temperaturaInicialC: cargo.requerControleTermico
                                ? Number(tempInicial.replace(',', '.'))
                                : undefined,
                              documentacaoValidada: docOk,
                              observacoes: obsColeta,
                            });
                            if (res.ok) {
                              setHandoffCargoId(null);
                              setLacreCode(`LCR-MED-${Math.floor(10000 + Math.random() * 89999)}`);
                            }
                          }}
                          className="rounded-md bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-45"
                        >
                          Confirmar Entrega na Coleta ({formatDateTime(new Date().toISOString())})
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
