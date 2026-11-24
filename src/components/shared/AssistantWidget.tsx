import {
  AlertCircle,
  AlertTriangle,
  Cpu,
  Info,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import { useMedAir } from '../../context/MedAirContext';
import {
  analyzeMissionForAssistant,
  ASSISTANT_DISCLAIMER,
} from '../../engine/rulesEngine';
import type { Missao } from '../../types/domain';

interface AssistantWidgetProps {
  mission?: Missao;
  onOpenConfig?: () => void;
  compact?: boolean;
}

export function AssistantWidget({
  mission,
  onOpenConfig,
  compact = false,
}: AssistantWidgetProps) {
  const { state, activeMission } = useMedAir();
  const targetMission = mission ?? activeMission;
  const recs = analyzeMissionForAssistant(state, targetMission);

  return (
    <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-[#F8FAFC] px-4 py-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#0F4C5C] shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-[#0B2545] leading-tight">
              Assistente Inteligente — Motor Determinístico (v01)
            </h3>
            <p className="text-[11px] text-slate-500">
              {targetMission
                ? `Analisando missão ${targetMission.codigo}`
                : 'Apoio à decisão baseado em regras determinísticas'}
            </p>
          </div>
        </div>
        {onOpenConfig && (
          <button
            type="button"
            onClick={onOpenConfig}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-[#0B2545] hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#0F4C5C]" />
            <span>Parâmetros</span>
          </button>
        )}
      </div>

      <div className={`divide-y divide-slate-100 ${compact ? 'max-h-[260px] overflow-y-auto' : ''}`}>
        {recs.map((rec) => {
          const toneStyle =
            rec.nivel === 'CRITICO' || rec.nivel === 'BLOQUEIO'
              ? 'text-red-700 bg-red-50/70'
              : rec.nivel === 'ATENCAO'
                ? 'text-amber-800 bg-amber-50/60'
                : 'text-[#0F4C5C] bg-white';
          const Icon =
            rec.nivel === 'BLOQUEIO'
              ? ShieldAlert
              : rec.nivel === 'CRITICO'
                ? AlertCircle
                : rec.nivel === 'ATENCAO'
                  ? AlertTriangle
                  : Info;

          return (
            <div key={rec.id} className={`px-4 py-3 ${toneStyle}`}>
              <div className="flex items-start gap-2.5">
                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-[#0B2545]">
                    {rec.titulo}
                  </div>
                  <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
                    {rec.motivo}
                  </p>
                  {rec.acaoSugerida && (
                    <p className="text-[11px] font-medium text-[#0F4C5C] mt-1">
                      Sugestão: {rec.acaoSugerida}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-[11px] font-medium text-amber-900 flex items-center justify-between gap-2">
        <span>{ASSISTANT_DISCLAIMER}</span>
      </div>
    </section>
  );
}
