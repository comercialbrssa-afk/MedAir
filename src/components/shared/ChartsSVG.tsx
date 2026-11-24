import type { Telemetria } from '../../types/domain';
import { formatDecimal, formatPercent, formatTemp, formatTime } from '../../utils/formatters';

interface BarChartItem {
  label: string;
  value: number;
  displayValue: string;
  color?: string;
}

export function BarChartSVG({
  title,
  subtitle,
  items,
  maxValue,
}: {
  title: string;
  subtitle?: string;
  items: BarChartItem[];
  maxValue?: number;
}) {
  const max = maxValue ?? Math.max(1, ...items.map((i) => i.value));
  const width = 460;
  const height = 210;
  const padL = 36;
  const padR = 16;
  const padT = 22;
  const padB = 42;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const barGap = 16;
  const barW = items.length > 0 ? Math.min(56, (plotW - barGap * (items.length + 1)) / items.length) : 32;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[#0B2545]">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <span className="font-mono text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded whitespace-nowrap">
          DADOS SIMULADOS
        </span>
      </div>

      {items.length === 0 ? (
        <div className="h-[180px] flex items-center justify-center text-xs text-slate-500">
          Sem dados no filtro selecionado.
        </div>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padT + plotH * (1 - t);
            return (
              <g key={t}>
                <line
                  x1={padL}
                  y1={y}
                  x2={width - padR}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                />
                <text
                  x={padL - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748B"
                  fontSize="9.5"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {formatDecimal(max * t, max <= 10 ? 1 : 0)}
                </text>
              </g>
            );
          })}

          {items.map((item, idx) => {
            const totalSlotsW = items.length * barW + (items.length - 1) * barGap;
            const startX = padL + (plotW - totalSlotsW) / 2;
            const x = startX + idx * (barW + barGap);
            const h = Math.max(2, (item.value / max) * plotH);
            const y = padT + plotH - h;
            return (
              <g key={item.label}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx="4"
                  fill={item.color ?? '#0F4C5C'}
                />
                <text
                  x={x + barW / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fill="#0B2545"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {item.displayValue}
                </text>
                <text
                  x={x + barW / 2}
                  y={padT + plotH + 16}
                  textAnchor="middle"
                  fill="#475569"
                  fontSize="9.5"
                  fontFamily="DM Sans, sans-serif"
                >
                  {item.label.length > 14 ? `${item.label.slice(0, 13)}…` : item.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

export function DonutChartSVG({
  title,
  subtitle,
  percentage,
  primaryLabel,
  secondaryLabel,
  color = '#0F4C5C',
}: {
  title: string;
  subtitle?: string;
  percentage: number;
  primaryLabel: string;
  secondaryLabel: string;
  color?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const r = 48;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[#0B2545]">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <span className="font-mono text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded whitespace-nowrap">
          DADOS SIMULADOS
        </span>
      </div>

      <div className="flex items-center gap-5">
        <svg viewBox="0 0 128 128" className="w-28 h-28 shrink-0">
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="12"
          />
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeLinecap="round"
            transform="rotate(-90 64 64)"
          />
          <text
            x="64"
            y="68"
            textAnchor="middle"
            fill="#0B2545"
            fontSize="16"
            fontWeight="700"
            fontFamily="IBM Plex Mono, monospace"
          >
            {formatPercent(clamped, 0)}
          </text>
        </svg>

        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
            <span className="text-slate-700 font-medium">{primaryLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 shrink-0" />
            <span className="text-slate-500">{secondaryLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TelemetryChartSVG({
  samples,
  tempMin = 2.0,
  tempMax = 8.0,
}: {
  samples: Telemetria[];
  tempMin?: number;
  tempMax?: number;
}) {
  const width = 520;
  const height = 165;
  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const sorted = [...samples].sort((a, b) => a.dataHora.localeCompare(b.dataHora)).slice(-12);
  const yMin = 0;
  const yMax = Math.max(12, ...sorted.map((s) => s.temperaturaCargaC + 1.5));

  const mapX = (i: number) =>
    sorted.length <= 1 ? padL + plotW / 2 : padL + (i / (sorted.length - 1)) * plotW;
  const mapY = (temp: number) =>
    padT + plotH - ((temp - yMin) / (yMax - yMin)) * plotH;

  const tempPoints = sorted.map((s, i) => `${mapX(i)},${mapY(s.temperaturaCargaC)}`).join(' ');

  const bandTop = mapY(tempMax);
  const bandBottom = mapY(tempMin);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3.5">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-xs font-semibold text-[#0B2545]">
          Curva Térmica Simulada do Compartimento ({formatTemp(tempMin)} – {formatTemp(tempMax)})
        </div>
        <span className="font-mono text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
          DADOS SIMULADOS
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="h-[130px] flex items-center justify-center text-xs text-slate-500">
          Aguardando amostras de telemetria simulada.
        </div>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block">
          {/* Safe thermal band */}
          <rect
            x={padL}
            y={bandTop}
            width={plotW}
            height={Math.max(2, bandBottom - bandTop)}
            fill="#16A34A"
            opacity="0.09"
          />
          <line x1={padL} y1={bandTop} x2={width - padR} y2={bandTop} stroke="#16A34A" strokeDasharray="4 4" strokeWidth="1" />
          <line x1={padL} y1={bandBottom} x2={width - padR} y2={bandBottom} stroke="#16A34A" strokeDasharray="4 4" strokeWidth="1" />

          {/* Y axis labels */}
          {[0, tempMin, tempMax, Math.round(yMax)].map((val, idx) => (
            <text
              key={`${val}-${idx}`}
              x={padL - 6}
              y={mapY(val) + 3}
              textAnchor="end"
              fill="#64748B"
              fontSize="9"
              fontFamily="IBM Plex Mono, monospace"
            >
              {formatDecimal(val, 0)}°
            </text>
          ))}

          {/* Polyline */}
          {sorted.length > 1 && (
            <polyline
              fill="none"
              stroke="#0F4C5C"
              strokeWidth="2.4"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={tempPoints}
            />
          )}

          {/* Data points */}
          {sorted.map((s, i) => {
            const outOfRange = s.temperaturaCargaC < tempMin || s.temperaturaCargaC > tempMax;
            return (
              <g key={s.id}>
                <circle
                  cx={mapX(i)}
                  cy={mapY(s.temperaturaCargaC)}
                  r="4"
                  fill={outOfRange ? '#DC2626' : '#0F4C5C'}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
                {(i === 0 || i === sorted.length - 1 || i % 2 === 0) && (
                  <text
                    x={mapX(i)}
                    y={height - 8}
                    textAnchor="middle"
                    fill="#64748B"
                    fontSize="8.5"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    {formatTime(s.dataHora)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
