import { Activity, Download, FileText } from 'lucide-react';
import { useState } from 'react';
import { useMedAir } from '../../context/MedAirContext';
import { computeSimulatedIndicators } from '../../engine/rulesEngine';
import type { Carga, CargoType, Missao } from '../../types/domain';
import {
  CARGO_TYPE_LABELS,
  formatCurrency,
  formatDateTime,
  formatDecimal,
  formatPercent,
  MISSION_STATE_LABELS,
} from '../../utils/formatters';
import { BarChartSVG, DonutChartSVG } from '../shared/ChartsSVG';
import { ReceiptModal } from '../shared/Modals';

export function IndicatorsReportsModule() {
  const { state } = useMedAir();

  const [periodDays, setPeriodDays] = useState<number>(30);
  const [instId, setInstId] = useState<string>('ALL');
  const [droneId, setDroneId] = useState<string>('ALL');
  const [cargoType, setCargoType] = useState<string>('ALL');
  const [receiptTarget, setReceiptTarget] = useState<{ mission: Missao; cargo: Carga } | null>(
    null
  );

  const kpis = computeSimulatedIndicators(state, {
    periodoDias: periodDays,
    instituicaoId: instId,
    droneId,
    tipoCarga: cargoType,
  });

  // Breakdown by cargo type for SVG bar chart
  const cargoTypeCounts = (Object.keys(CARGO_TYPE_LABELS) as CargoType[])
    .map((type) => {
      const count = state.cargas.filter((c) => c.tipo === type).length;
      return {
        label: CARGO_TYPE_LABELS[type].split(' ')[0],
        value: count,
        displayValue: String(count),
        color: type === 'ORGAO_TRANSPLANTE' ? '#0B2545' : '#0F4C5C',
      };
    })
    .filter((i) => i.value > 0);

  // Breakdown of fleet flight hours (simulated)
  const fleetHoursItems = state.drones.map((d) => ({
    label: d.codigo,
    value: d.horasVooSimuladas,
    displayValue: `${formatDecimal(d.horasVooSimuladas, 1)}h`,
    color: d.estado === 'DISPONIVEL' ? '#059669' : d.estado === 'EM_MISSAO' ? '#0F4C5C' : '#D97706',
  }));

  const exportAuditCsv = () => {
    const header = [
      'DataHora',
      'Entidade',
      'EntidadeID',
      'MissaoID',
      'EstadoAnterior',
      'NovoEstado',
      'Usuario',
      'Perfil',
      'Justificativa',
    ].join(';');
    const rows = state.eventos.map((e) =>
      [
        formatDateTime(e.dataHora),
        e.entidade,
        e.entidadeId,
        e.missaoId ?? '',
        e.estadoAnterior,
        e.novoEstado,
        `"${e.usuarioNome}"`,
        e.usuarioPerfil,
        `"${e.justificativa.replace(/"/g, '""')}"`,
      ].join(';')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'medair_trilha_auditoria_simulada.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B2545]">
            Indicadores Operacionais e Relatórios (Dados Fictícios)
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Todos os números, custos estimados, tempos e taxas abaixo são <strong>DADOS SIMULADOS</strong> para demonstração acadêmica.
          </p>
        </div>

        <button
          type="button"
          onClick={exportAuditCsv}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#0B2545] hover:bg-slate-50"
        >
          <Download className="w-3.5 h-3.5 text-[#0F4C5C]" />
          <span>Exportar Trilha de Auditoria (CSV)</span>
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <select
          value={periodDays}
          onChange={(e) => setPeriodDays(Number(e.target.value))}
          className="rounded border border-slate-300 bg-white px-3 py-2"
        >
          <option value={1}>Período: Últimas 24h</option>
          <option value={7}>Período: Últimos 7 dias</option>
          <option value={30}>Período: Últimos 30 dias</option>
          <option value={0}>Período: Todo o histórico</option>
        </select>

        <select
          value={instId}
          onChange={(e) => setInstId(e.target.value)}
          className="rounded border border-slate-300 bg-white px-3 py-2"
        >
          <option value="ALL">Todas as instituições</option>
          {state.instituicoes.map((i) => (
            <option key={i.id} value={i.id}>
              {i.sigla} — {i.cidadeRegiao}
            </option>
          ))}
        </select>

        <select
          value={droneId}
          onChange={(e) => setDroneId(e.target.value)}
          className="rounded border border-slate-300 bg-white px-3 py-2"
        >
          <option value="ALL">Todos os drones</option>
          {state.drones.map((d) => (
            <option key={d.id} value={d.id}>
              {d.codigo} — {d.modelo}
            </option>
          ))}
        </select>

        <select
          value={cargoType}
          onChange={(e) => setCargoType(e.target.value)}
          className="rounded border border-slate-300 bg-white px-3 py-2"
        >
          <option value="ALL">Todos os tipos de carga</option>
          {(Object.keys(CARGO_TYPE_LABELS) as CargoType[]).map((k) => (
            <option key={k} value={k}>
              {CARGO_TYPE_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      {/* 8 Simulated KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono tabular-nums">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="font-sans text-[11px] text-slate-500">Solicitação → Entrega (médio)</div>
          <div className="text-xl font-bold text-[#0B2545] mt-1">
            {formatDecimal(kpis.tempoMedioSolicitacaoEntregaMin, 1)} min
          </div>
          <div className="font-sans text-[10px] text-amber-800 mt-1">Simulado</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="font-sans text-[11px] text-slate-500">Tempo médio de transporte</div>
          <div className="text-xl font-bold text-[#0B2545] mt-1">
            {formatDecimal(kpis.tempoMedioTransporteMin, 1)} min
          </div>
          <div className="font-sans text-[10px] text-amber-800 mt-1">Simulado</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="font-sans text-[11px] text-slate-500">Entregas dentro do prazo</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">
            {formatPercent(kpis.entregasNoPrazoPct, 1)}
          </div>
          <div className="font-sans text-[10px] text-slate-500 mt-1">
            {kpis.missoesConcluidas}/{kpis.totalMissoes} missões encerradas
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="font-sans text-[11px] text-slate-500">Conformidade térmica</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">
            {formatPercent(kpis.conformidadeTermicaPct, 1)}
          </div>
          <div className="font-sans text-[10px] text-amber-800 mt-1">Sensores simulados</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="font-sans text-[11px] text-slate-500">Taxa de ocorrências</div>
          <div className="text-xl font-bold text-amber-700 mt-1">
            {formatPercent(kpis.taxaOcorrenciasPct, 1)}
          </div>
          <div className="font-sans text-[10px] text-slate-500 mt-1">
            {state.ocorrencias.length} registro(s) total
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="font-sans text-[11px] text-slate-500">Aproveitamento de retorno</div>
          <div className="text-xl font-bold text-[#0F4C5C] mt-1">
            {formatPercent(kpis.aproveitamentoRetornoPct, 1)}
          </div>
          <div className="font-sans text-[10px] text-slate-500 mt-1">
            {kpis.retornosComCarga} com carga / {kpis.retornosElegiveis} elegíveis
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="font-sans text-[11px] text-slate-500">Utilização da frota</div>
          <div className="text-xl font-bold text-[#0B2545] mt-1">
            {formatPercent(kpis.utilizacaoFrotaPct, 1)}
          </div>
          <div className="font-sans text-[10px] text-slate-500 mt-1">
            {state.drones.length} aeronaves fictícias
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="font-sans text-[11px] text-slate-500">Custo médio est. / missão</div>
          <div className="text-xl font-bold text-[#0B2545] mt-1">
            {formatCurrency(kpis.custoMedioSimuladoBrl)}
          </div>
          <div className="font-sans text-[10px] text-amber-800 mt-1">Estimativa fictícia</div>
        </div>
      </div>

      {/* Native SVG Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DonutChartSVG
          title="Aproveitamento de Logística Reversa"
          subtitle="Retornos com carga aproveitada sobre retornos avaliados"
          percentage={kpis.aproveitamentoRetornoPct}
          primaryLabel={`Retornos com carga (${kpis.retornosComCarga})`}
          secondaryLabel={`Retornos vazios (${Math.max(0, kpis.retornosElegiveis - kpis.retornosComCarga)})`}
          color="#0F4C5C"
        />

        <DonutChartSVG
          title="Conformidade Térmica Simulada"
          subtitle="Cargas termolábeis sem desvio fora da faixa"
          percentage={kpis.conformidadeTermicaPct}
          primaryLabel="Dentro da faixa térmica"
          secondaryLabel="Com desvio simulado"
          color="#16A34A"
        />

        <BarChartSVG
          title="Cargas Transportadas por Categoria"
          subtitle="Distribuição fictícia das cargas registradas no ambiente"
          items={cargoTypeCounts}
        />

        <BarChartSVG
          title="Horas de Voo Simuladas por Aeronave"
          subtitle="Acumulado demonstrativo da frota cadastrada"
          items={fleetHoursItems}
        />
      </div>

      {/* Completed Missions & Receipts */}
      <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0B2545]">
            Histórico de Missões e Comprovantes Demonstrativos ({state.missoes.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Missão</th>
                <th className="px-4 py-2.5 font-semibold">Estado</th>
                <th className="px-4 py-2.5 font-semibold">Retorno</th>
                <th className="px-4 py-2.5 font-semibold">Custo Sim.</th>
                <th className="px-4 py-2.5 font-semibold text-right">Comprovante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.missoes.map((m) => {
                const cargo = state.cargas.find(
                  (c) => c.missaoId === m.id && c.solicitacaoId === m.solicitacaoPrincipalId
                );
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono font-bold text-[#0B2545]">{m.codigo}</td>
                    <td className="px-4 py-2.5 text-slate-700">{MISSION_STATE_LABELS[m.estado]}</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {m.retornoTipoDecidido === 'COM_CARGA'
                        ? 'Aproveitado (com carga)'
                        : m.retornoTipoDecidido === 'VAZIO'
                          ? 'Retorno vazio'
                          : 'Não avaliado'}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-slate-700">
                      {formatCurrency(m.custoEstimadoSimuladoBrl)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {cargo && (
                        <button
                          type="button"
                          onClick={() => setReceiptTarget({ mission: m, cargo })}
                          className="inline-flex items-center gap-1 rounded border border-[#0F4C5C] bg-[#F0F6F8] px-2.5 py-1 text-[11px] font-semibold text-[#0F4C5C] hover:bg-[#E3F0F4]"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Comprovante</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Immutable Audit Trail */}
      <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#0F4C5C]" />
          <h2 className="text-sm font-bold text-[#0B2545]">
            Trilha Cronológica Imutável de Auditoria ({state.eventos.length} eventos)
          </h2>
        </div>
        <div className="overflow-x-auto max-h-[340px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Data / Hora</th>
                <th className="px-4 py-2.5 font-semibold">Entidade</th>
                <th className="px-4 py-2.5 font-semibold">Transição</th>
                <th className="px-4 py-2.5 font-semibold">Usuário</th>
                <th className="px-4 py-2.5 font-semibold">Justificativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.eventos.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                    {formatDateTime(e.dataHora)}
                  </td>
                  <td className="px-4 py-2 font-mono font-semibold text-[#0F4C5C]">
                    {e.entidade}
                  </td>
                  <td className="px-4 py-2 font-mono text-[11px] text-[#0B2545] whitespace-nowrap">
                    {e.estadoAnterior} → {e.novoEstado}
                  </td>
                  <td className="px-4 py-2 text-slate-700 whitespace-nowrap">
                    {e.usuarioNome}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{e.justificativa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ReceiptModal
        mission={receiptTarget?.mission ?? null}
        cargo={receiptTarget?.cargo ?? null}
        onClose={() => setReceiptTarget(null)}
      />
    </div>
  );
}
