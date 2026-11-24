import { FileText, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useMedAir } from '../../context/MedAirContext';
import type { Carga, Missao } from '../../types/domain';
import {
  CARGO_STATE_LABELS,
  CARGO_TYPE_LABELS,
  formatDateTime,
  formatTemp,
} from '../../utils/formatters';
import { ReceiptModal } from '../shared/Modals';
import { StatusBadge } from '../shared/StatusBadge';

export function HistoryReceipts() {
  const { state } = useMedAir();
  const [receiptTarget, setReceiptTarget] = useState<{
    mission: Missao;
    cargo: Carga;
  } | null>(null);

  const finalizedCargos = state.cargas.filter((c) =>
    ['ENTREGUE', 'ENTREGUE_COM_RESSALVA', 'RECUSADA', 'RETORNADA'].includes(c.estado)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B2545]">
          Histórico, Custódia e Comprovantes Demonstrativos
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
          Consulte entregas concluídas, cadeia formal de custódia e imprima comprovantes demonstrativos.
        </p>
      </div>

      {/* Completed Deliveries */}
      <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0B2545]">
            Entregas e Destinações Registradas ({finalizedCargos.length})
          </h2>
          <span className="font-mono text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            DADOS SIMULADOS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Carga / Missão</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Lacre</th>
                <th className="px-4 py-3 font-semibold">Temp. Entrega</th>
                <th className="px-4 py-3 font-semibold">Conferido em</th>
                <th className="px-4 py-3 font-semibold">Situação</th>
                <th className="px-4 py-3 font-semibold text-right">Comprovante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {finalizedCargos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Nenhuma entrega finalizada encontrada.
                  </td>
                </tr>
              ) : (
                finalizedCargos.map((cargo) => {
                  const mission = state.missoes.find((m) => m.id === cargo.missaoId);
                  const tone =
                    cargo.estado === 'ENTREGUE'
                      ? 'success'
                      : cargo.estado === 'ENTREGUE_COM_RESSALVA'
                        ? 'warning'
                        : 'danger';

                  return (
                    <tr key={cargo.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono">
                        <div className="font-bold text-[#0B2545]">{cargo.codigo}</div>
                        <div className="text-[11px] text-slate-500">{mission?.codigo}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {CARGO_TYPE_LABELS[cargo.tipo]}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {cargo.codigoLacre ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-700">
                        {formatTemp(cargo.temperaturaEntregaC)}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {formatDateTime(cargo.conferidaEm)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={CARGO_STATE_LABELS[cargo.estado]}
                          tone={tone}
                          compact
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {mission && (
                          <button
                            type="button"
                            onClick={() => setReceiptTarget({ mission, cargo })}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[#0F4C5C] bg-[#F0F6F8] px-3 py-1.5 text-[11px] font-semibold text-[#0F4C5C] hover:bg-[#E3F0F4]"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Ver / Imprimir</span>
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
      </section>

      {/* Custody Trail Table */}
      <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#0F4C5C]" />
          <h2 className="text-sm font-bold text-[#0B2545]">
            Registros de Transferência de Custódia ({state.custodias.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Código</th>
                <th className="px-4 py-2.5 font-semibold">Tipo</th>
                <th className="px-4 py-2.5 font-semibold">De → Para</th>
                <th className="px-4 py-2.5 font-semibold">Lacre / Temp.</th>
                <th className="px-4 py-2.5 font-semibold">Responsável</th>
                <th className="px-4 py-2.5 font-semibold">Data / Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.custodias.map((cus) => (
                <tr key={cus.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono font-semibold text-[#0B2545]">
                    {cus.codigo}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-[#0F4C5C]">
                    {cus.tipoTransferencia}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {cus.deParte} → {cus.paraParte}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                    {cus.codigoLacre} · {formatTemp(cus.temperaturaRegistradaC)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {cus.usuarioResponsavelNome}
                  </td>
                  <td className="px-4 py-2.5 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                    {formatDateTime(cus.dataHora)}
                  </td>
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
