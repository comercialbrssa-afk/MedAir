import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Plane,
  Radio,
  Wrench,
} from 'lucide-react';
import { useMedAir } from '../../context/MedAirContext';
import { computeSimulatedIndicators } from '../../engine/rulesEngine';
import {
  formatCurrency,
  formatDateTime,
  formatDecimal,
  formatPercent,
  getMissionTone,
  MISSION_STATE_LABELS,
} from '../../utils/formatters';
import { AssistantWidget } from '../shared/AssistantWidget';
import { StatusBadge } from '../shared/StatusBadge';
import type { PanelModule } from './PanelLayout';

export function OpsDashboard({
  onNavigate,
}: {
  onNavigate: (mod: PanelModule) => void;
}) {
  const { state, setActiveMission } = useMedAir();

  const pendingRequests = state.solicitacoes.filter((s) =>
    ['PENDENTE_TRIAGEM', 'AGUARDANDO_COMPLEMENTACAO'].includes(s.status)
  );
  const activeMissions = state.missoes.filter(
    (m) => !['ENCERRADA', 'CANCELADA', 'RECUSADA'].includes(m.estado)
  );
  const availableDrones = state.drones.filter((d) => d.estado === 'DISPONIVEL');
  const maintInspectDrones = state.drones.filter((d) =>
    ['EM_INSPECAO', 'EM_HIGIENIZACAO', 'EM_MANUTENCAO', 'BLOQUEADO'].includes(d.estado)
  );
  const openOccurrences = state.ocorrencias.filter((o) => o.status !== 'ENCERRADA');
  const completedDeliveries = state.cargas.filter((c) =>
    ['ENTREGUE', 'ENTREGUE_COM_RESSALVA'].includes(c.estado)
  );

  const kpis = computeSimulatedIndicators(state);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B2545]">
            Painel Operacional — Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Visão consolidada da Central Operacional MedAir Logistics · Todos os sensores e indicadores são DADOS SIMULADOS.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('MONITORAMENTO')}
          className="inline-flex items-center gap-2 rounded-md bg-[#0F4C5C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B3B48] transition-colors"
        >
          <Radio className="w-4 h-4" />
          <span>Central de Monitoramento</span>
        </button>
      </div>

      {/* 6 Operational Counters */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <button
          type="button"
          onClick={() => onNavigate('TRIAGEM')}
          className="text-left rounded-lg border border-slate-200 bg-white p-4 hover:border-[#0F4C5C] transition-colors"
        >
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>Solicitações pendentes</span>
            <ClipboardList className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#0B2545] tabular-nums">
            {pendingRequests.length}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('MONITORAMENTO')}
          className="text-left rounded-lg border border-slate-200 bg-white p-4 hover:border-[#0F4C5C] transition-colors"
        >
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>Missões em andamento</span>
            <Radio className="w-4 h-4 text-[#0F4C5C]" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#0B2545] tabular-nums">
            {activeMissions.length}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('FROTA')}
          className="text-left rounded-lg border border-slate-200 bg-white p-4 hover:border-[#0F4C5C] transition-colors"
        >
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>Drones disponíveis</span>
            <Plane className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#0B2545] tabular-nums">
            {availableDrones.length}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('FROTA')}
          className="text-left rounded-lg border border-slate-200 bg-white p-4 hover:border-[#0F4C5C] transition-colors"
        >
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>Em inspeção / manut.</span>
            <Wrench className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#0B2545] tabular-nums">
            {maintInspectDrones.length}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('OCORRENCIAS')}
          className="text-left rounded-lg border border-slate-200 bg-white p-4 hover:border-[#0F4C5C] transition-colors"
        >
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>Ocorrências abertas</span>
            <AlertTriangle className={`w-4 h-4 ${openOccurrences.length > 0 ? 'text-red-600' : 'text-slate-400'}`} />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#0B2545] tabular-nums">
            {openOccurrences.length}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('INDICADORES')}
          className="text-left rounded-lg border border-slate-200 bg-white p-4 hover:border-[#0F4C5C] transition-colors"
        >
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>Entregas concluídas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#0B2545] tabular-nums">
            {completedDeliveries.length}
          </div>
        </button>
      </div>

      {/* Main Grid: Active Missions Table + Intelligent Assistant */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* Active Missions */}
          <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#0B2545]">
                Missões Operacionais em Curso ({activeMissions.length})
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('TRIAGEM')}
                className="text-xs font-semibold text-[#0F4C5C] hover:underline inline-flex items-center gap-1"
              >
                <span>Triar pendentes ({pendingRequests.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeMissions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Nenhuma missão ativa. Aprove uma solicitação na Triagem para iniciar uma nova operação.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Missão</th>
                      <th className="px-4 py-2.5 font-semibold">Drone</th>
                      <th className="px-4 py-2.5 font-semibold">Estado</th>
                      <th className="px-4 py-2.5 font-semibold">Atualização</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Ir para etapa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeMissions.map((m) => {
                      const drone = state.drones.find((d) => d.id === m.droneId);
                      const nextMod: PanelModule =
                        m.estado === 'EM_PLANEJAMENTO'
                          ? 'PLANEJAMENTO'
                          : m.estado === 'AGUARDANDO_APROVACAO' || m.estado === 'CARGA_VALIDADA'
                            ? 'APROVACAO_DESPACHO'
                            : m.estado === 'APROVADA' || m.estado === 'CARGA_EM_PREPARACAO'
                              ? 'COLETA'
                              : m.estado === 'CHEGOU_AO_DESTINO' || m.estado === 'EM_CONFERENCIA'
                                ? 'ENTREGA'
                                : ['ENTREGA_CONFIRMADA', 'ENTREGA_COM_RESSALVA', 'RECEBIMENTO_RECUSADO', 'ANALISANDO_RETORNO'].includes(m.estado)
                                  ? 'LOGISTICA_REVERSA'
                                  : ['RETORNO_PENDENTE', 'RETORNO_APROVADO', 'RETORNO_SEM_CARGA', 'RETORNO_EM_ANDAMENTO'].includes(m.estado)
                                    ? 'RETORNO'
                                    : m.estado === 'EM_POS_OPERACAO'
                                      ? 'FROTA'
                                      : 'MONITORAMENTO';

                      return (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-bold text-[#0B2545]">
                            {m.codigo}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">
                            {drone?.codigo ?? 'A definir'}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge
                              label={MISSION_STATE_LABELS[m.estado]}
                              tone={getMissionTone(m.estado)}
                              compact
                            />
                          </td>
                          <td className="px-4 py-3 font-mono tabular-nums text-slate-500">
                            {formatDateTime(m.atualizadoEm)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMission(m.id);
                                onNavigate(nextMod);
                              }}
                              className="rounded-md bg-[#0F4C5C] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#0B3B48]"
                            >
                              Operar etapa
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Simulated KPI Summary */}
          <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#0B2545]">
                Resumo de Indicadores Operacionais
              </h2>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  DADOS SIMULADOS
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('INDICADORES')}
                  className="text-xs font-semibold text-[#0F4C5C] hover:underline"
                >
                  Relatório completo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
              <div className="rounded-md border border-slate-200 bg-[#F4F7F9] p-3">
                <div className="font-sans text-[11px] text-slate-500">Tempo médio transp.</div>
                <div className="text-lg font-bold text-[#0B2545] mt-1">
                  {formatDecimal(kpis.tempoMedioTransporteMin, 1)} min
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-[#F4F7F9] p-3">
                <div className="font-sans text-[11px] text-slate-500">Conformidade térmica</div>
                <div className="text-lg font-bold text-emerald-700 mt-1">
                  {formatPercent(kpis.conformidadeTermicaPct, 1)}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-[#F4F7F9] p-3">
                <div className="font-sans text-[11px] text-slate-500">Aproveit. de retorno</div>
                <div className="text-lg font-bold text-[#0F4C5C] mt-1">
                  {formatPercent(kpis.aproveitamentoRetornoPct, 1)}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-[#F4F7F9] p-3">
                <div className="font-sans text-[11px] text-slate-500">Custo médio est.</div>
                <div className="text-lg font-bold text-[#0B2545] mt-1">
                  {formatCurrency(kpis.custoMedioSimuladoBrl)}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right: Deterministic Intelligent Assistant */}
        <div>
          <AssistantWidget onOpenConfig={() => onNavigate('REGRAS_ASSISTENTE')} />
        </div>
      </div>
    </div>
  );
}
