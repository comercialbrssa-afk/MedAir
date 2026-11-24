import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
} from 'lucide-react';
import type { SemanticTone } from '../../utils/formatters';

interface StatusBadgeProps {
  label: string;
  tone?: SemanticTone;
  compact?: boolean;
}

const TONE_STYLES: Record<SemanticTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  info: 'bg-[#E3F0F4] text-[#0F4C5C] border-[#BBD8E2]',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-red-50 text-red-800 border-red-200',
};

export function StatusBadge({
  label,
  tone = 'neutral',
  compact = false,
}: StatusBadgeProps) {
  const Icon =
    tone === 'success'
      ? CheckCircle2
      : tone === 'danger'
        ? AlertCircle
        : tone === 'warning'
          ? AlertTriangle
          : tone === 'info'
            ? Info
            : Clock;

  return (
    <span
      className={`inline-flex items-center gap-1.5 border font-medium whitespace-nowrap shrink-0 rounded-md ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } ${TONE_STYLES[tone]}`}
    >
      <Icon className={compact ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
