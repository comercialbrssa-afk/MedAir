import { ArrowRight, CheckCircle2, Package, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useMedAir } from '../../context/MedAirContext';
import { canRolePerform } from '../../engine/stateMachine';
import {
  CARGO_STATE_LABELS,
  CARGO_TYPE_LABELS,
  formatDateTime,
  formatKg,
  formatLiters,
  formatTemp,
  MISSION_STATE_LABELS,
} from '../../utils/formatters';
import { StatusBadge } from '../shared/StatusBadge';
import type { PanelModule } from './PanelLayout';

export function CollectionPrepModule({
  onNavigate,
}: {
  onNavigate: (mod: PanelModule) => void;
}) {
  const {
    state,
    currentUser,
    activeMission,
    setActiveMission,
    startCargoPreparation,
    validateAndSealCargo,
  } = useMedAir();

  const perm = currentUser
    ? canRolePerform(currentUser.perfil, 'COLLECT_PREP')
    : { allowed: false, reason: 'Somente leitura.' };

  const prepCargos = state.cargas.filter((c) => {
    const m = state.missoes.find((mis) => mis.id === c.missaoId);
    if (!m) return false;
    return (
      ['APROVADA', 'CARGA_EM_PREPARACAO', 'CARGA_VALIDADA', 'RETORNO_APROVADO'].includes(
        m.estado
      ) && ['SOLICITADA', 'EM_PREPARACAO', 'VALIDADA_LACRADA'].includes(c.estado)
    );
  });

  const [selectedCargoId, setSelectedCargoId] = useState<string>(
    prepCargos.find((c) => c.missaoId === activeMission?.id)?.id ?? prepCargos[0]?.id ?? ''
  );

  const cargo = prepCargos.find((c) => c.id === selectedCargoId) ?? prepCargos[0] ?? null;
  const mission = cargo ? state.missoes.find((m) => m.id === cargo.missaoId) : undefined;
  const leg = cargo ? state.trechos.find((t) => t.id === cargo.trechoId) : undefined;
  const orig = state.instituicoes.find((i) => i.id === leg?.origemId);

  const [embalagem, setEmbalagem] = useState('Caixa isotérmica ativa com dupla vedação (Fictícia)');
  const [codigoLacre, setCodigoLacre] = useState(
    `LCR-MED-${Math.floor(10000 + Math.random() * 89999)}`
  );
  const [temperaturaInicial, setTemperaturaInicial] = useState('4.2');
  const [documentacaoValidada, setDocumentacaoValidada] = useState(true);
  const [observacoes, setObservacoes] = useState(
    'Coleta conferida na origem com transferência formal de custódia.'
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B2545]">
          Coleta, Preparação e Custódia Inicial
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
          Registre embalagem, lacre, temperatura inicial simulada, validação de documentação demonstrativa e transferência de custódia.
        </p>
      </div>

      {prepCargos.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center space-y-3">
          <p className="text-sm text-slate-600">
            Nenhuma carga aguardando coleta/preparação no momento. Aprove uma missão primeiro em <strong>Aprovação e Despacho</strong>.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('APROVACAO_DESPACHO')}
            className="rounded-md bg-[#0F4C5C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B3B48]"
          >
            Ir para Aprovação e Despacho
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left list */}
          <div className="lg:col-span-4 rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
            {prepCargos.map((c) => {
              const m = state.missoes.find((mis) => mis.id === c.missaoId);
              const isSel = cargo?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedCargoId(c.id);
                    if (m) setActiveMission(m.id);
                  }}
                  className={`w-full text-left p-4 space-y-1.5 transition-colors ${
                    isSel ? 'bg-[#F0F6F8]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[#0B2545]">
                      {c.codigo}
                    </span>
                    <StatusBadge
                      label={CARGO_STATE_LABELS[c.estado]}
                      tone={c.estado === 'VALIDADA_LACRADA' ? 'success' : 'warning'}
                      compact
                    />
                  </div>
                  <div className="text-xs font-medium text-slate-700">
                    {CARGO_TYPE_LABELS[c.tipo]}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {m?.codigo} · {m ? MISSION_STATE_LABELS[m.estado] : ''}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Form */}
          {cargo && mission && (
            <div className="lg:col-span-8 rounded-lg border border-slate-200 bg-white p-5 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#0F4C5C]" />
                    <h2 className="font-mono text-base font-bold text-[#0B2545]">
                      {cargo.codigo} · Missão {mission.codigo}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{cargo.descricao}</p>
                </div>
                <StatusBadge
                  label={CARGO_STATE_LABELS[cargo.estado]}
                  tone={cargo.estado === 'VALIDADA_LACRADA' ? 'success' : 'info'}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                  <div className="text-[10px] text-slate-500">Origem Coleta</div>
                  <div className="font-semibold text-[#0B2545] mt-0.5">{orig?.sigla ?? '—'}</div>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                  <div className="text-[10px] text-slate-500">Peso / Volume</div>
                  <div className="font-mono font-semibold text-[#0B2545] mt-0.5">
                    {formatKg(cargo.pesoKg)} · {formatLiters(cargo.volumeEstimadoL)}
                  </div>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                  <div className="text-[10px] text-slate-500">Dimensões</div>
                  <div className="font-mono font-semibold text-[#0B2545] mt-0.5">
                    {cargo.dimensoesCm.comprimento}×{cargo.dimensoesCm.largura}×{cargo.dimensoesCm.altura} cm
                  </div>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                  <div className="text-[10px] text-slate-500">Faixa Térmica</div>
                  <div className="font-mono font-semibold text-[#0B2545] mt-0.5">
                    {cargo.requerControleTermico
                      ? `${formatTemp(cargo.tempMinC)} – ${formatTemp(cargo.tempMaxC)}`
                      : 'Ambiente'}
                  </div>
                </div>
              </div>

              {cargo.estado === 'VALIDADA_LACRADA' ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Carga validada, lacrada e custódia inicial registrada!</span>
                  </div>
                  <div className="text-xs text-emerald-900 space-y-1">
                    <div><strong>Embalagem:</strong> {cargo.embalagem}</div>
                    <div><strong>Lacre:</strong> <span className="font-mono">{cargo.codigoLacre}</span></div>
                    <div><strong>Temperatura inicial:</strong> <span className="font-mono">{formatTemp(cargo.temperaturaInicialC)}</span></div>
                    <div><strong>Coletada em:</strong> <span className="font-mono">{formatDateTime(cargo.coletadaEm)}</span></div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate(
                        mission.estado === 'RETORNO_APROVADO' ? 'RETORNO' : 'APROVACAO_DESPACHO'
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-md bg-[#0F4C5C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B3B48]"
                  >
                    <span>
                      {mission.estado === 'RETORNO_APROVADO'
                        ? 'Prosseguir para Decolagem de Retorno'
                        : 'Prosseguir para Checklist e Despacho'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cargo.estado === 'SOLICITADA' && (
                    <div className="rounded-md border border-[#0F4C5C]/30 bg-[#F0F6F8] p-3.5 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-[#0B2545]">
                        Inicie a preparação física demonstrativa antes de lacrar a carga.
                      </span>
                      <button
                        type="button"
                        disabled={!perm.allowed}
                        title={!perm.allowed ? perm.reason : 'Iniciar preparação da carga'}
                        onClick={() => startCargoPreparation(mission.id, cargo.id)}
                        className="rounded-md bg-[#0F4C5C] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0B3B48] disabled:opacity-45"
                      >
                        Iniciar Preparação da Carga
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Embalagem utilizada *
                      </label>
                      <input
                        type="text"
                        value={embalagem}
                        onChange={(e) => setEmbalagem(e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Código do lacre inviolável *
                      </label>
                      <input
                        type="text"
                        value={codigoLacre}
                        onChange={(e) => setCodigoLacre(e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-mono"
                      />
                    </div>

                    {cargo.requerControleTermico && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Temperatura inicial registrada (°C) *
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={temperaturaInicial}
                          onChange={(e) => setTemperaturaInicial(e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-mono"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Responsável pela coleta
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={currentUser?.nome ?? ''}
                        className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Observações da transferência de custódia
                    </label>
                    <input
                      type="text"
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>

                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#0B2545] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={documentacaoValidada}
                      onChange={(e) => setDocumentacaoValidada(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#0F4C5C]"
                    />
                    <span>Documentação demonstrativa de coleta validada (sem dados reais de pacientes)</span>
                  </label>

                  {!perm.allowed && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                      {perm.reason}
                    </div>
                  )}

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={!perm.allowed || cargo.estado === 'SOLICITADA'}
                      title={
                        !perm.allowed
                          ? perm.reason
                          : cargo.estado === 'SOLICITADA'
                            ? 'Clique em "Iniciar Preparação da Carga" primeiro'
                            : 'Validar lacre e registrar transferência de custódia'
                      }
                      onClick={() => {
                        const res = validateAndSealCargo({
                          missionId: mission.id,
                          cargoId: cargo.id,
                          embalagem,
                          codigoLacre,
                          temperaturaInicialC: cargo.requerControleTermico
                            ? Number(temperaturaInicial.replace(',', '.'))
                            : undefined,
                          documentacaoValidada,
                          observacoes,
                        });
                        if (res.ok) {
                          setCodigoLacre(`LCR-MED-${Math.floor(10000 + Math.random() * 89999)}`);
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-45"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Validar Carga, Lacrar e Registrar Custódia</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
