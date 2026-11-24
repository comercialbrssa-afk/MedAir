import type { Drone, Instituicao, Missao, Trecho } from '../../types/domain';
import { formatDecimal, formatKm } from '../../utils/formatters';

interface SchematicMapSVGProps {
  instituicoes: Instituicao[];
  trechos: Trecho[];
  mission?: Missao;
  drone?: Drone;
  compact?: boolean;
}

export function SchematicMapSVG({
  instituicoes,
  trechos,
  mission,
  drone,
  compact = false,
}: SchematicMapSVGProps) {
  const getInst = (id?: string) => instituicoes.find((i) => i.id === id);

  const outboundLeg = trechos.find((t) => t.tipo === 'IDA');
  const returnLeg = trechos.find((t) => t.tipo !== 'IDA');
  const activeLeg =
    trechos.find((t) => t.id === mission?.trechoAtivoId) ?? outboundLeg ?? trechos[0];

  // Compute simulated drone coordinates along active leg
  let dronePoint: { x: number; y: number; angleDeg: number } | null = null;
  if (activeLeg) {
    const orig = getInst(activeLeg.origemId);
    const dest = getInst(activeLeg.destinoId);
    if (orig && dest) {
      const ratio = Math.max(0, Math.min(1, activeLeg.progressoPct / 100));
      const x = orig.mapX + (dest.mapX - orig.mapX) * ratio;
      const y = orig.mapY + (dest.mapY - orig.mapY) * ratio;
      const angleDeg = (Math.atan2(dest.mapY - orig.mapY, dest.mapX - orig.mapX) * 180) / Math.PI;
      dronePoint = { x, y, angleDeg };
    }
  }

  const outOrig = getInst(outboundLeg?.origemId);
  const outDest = getInst(outboundLeg?.destinoId);
  const retOrig = getInst(returnLeg?.origemId);
  const retDest = getInst(returnLeg?.destinoId);

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-[#EAF2F6]">
      {/* Top simulated stamp bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3.5 py-2 text-xs">
        <div className="flex items-center gap-2 font-medium text-[#0B2545]">
          <span>Mapa Esquemático — Corredor Salvador / RMS (BA)</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="font-mono text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            DADOS SIMULADOS
          </span>
        </div>
        {mission && (
          <div className="flex items-center gap-3 text-[11px] text-slate-600 font-mono tabular-nums">
            <span>Vento: {formatDecimal(mission.climaSimulado.ventoKmh, 1)} km/h</span>
            <span>Dist.: {formatKm(activeLeg?.distanciaKm ?? mission.distanciaEstimadaKm)}</span>
          </div>
        )}
      </div>

      <svg
        viewBox="0 0 800 440"
        className={`w-full block ${compact ? 'max-h-[260px]' : 'max-h-[390px]'}`}
        role="img"
        aria-label="Mapa esquemático simulado de rotas aéreas médicas entre Salvador e Região Metropolitana"
      >
        <defs>
          <pattern id="medair-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#CBDCE6" strokeWidth="0.7" />
          </pattern>
          <marker
            id="arrow-outbound"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 8 5 L 0 9 z" fill="#0F4C5C" />
          </marker>
          <marker
            id="arrow-return"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 8 5 L 0 9 z" fill="#059669" />
          </marker>
        </defs>

        {/* Ocean / Baía de Todos-os-Santos base */}
        <rect x="0" y="0" width="800" height="440" fill="#DCEBF2" />
        <rect x="0" y="0" width="800" height="440" fill="url(#medair-grid)" />

        {/* Stylized Landmass: Salvador Peninsula + RMS Northeast Corridor */}
        <path
          d="M 110,440 L 145,355 Q 175,300 205,270 Q 225,215 280,175 Q 350,120 445,82 Q 560,42 710,32 L 800,32 L 800,440 L 420,440 Q 340,395 255,390 Q 185,395 145,440 Z"
          fill="#F6F9FB"
          stroke="#B8CEDB"
          strokeWidth="2"
        />

        {/* Subtle topographic corridor lines */}
        <path
          d="M 195,380 Q 320,275 470,210 Q 590,155 720,105"
          fill="none"
          stroke="#DCE6ED"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 195,380 Q 320,275 470,210 Q 590,155 720,105"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeDasharray="6 6"
        />

        {/* Geographic schematic labels */}
        <text
          x="52"
          y="215"
          fill="#5A8299"
          fontSize="12"
          fontWeight="600"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          Baía de Todos-os-Santos
        </text>
        <text
          x="52"
          y="231"
          fill="#789BB0"
          fontSize="10"
          fontFamily="DM Sans, sans-serif"
        >
          (Representação esquemática)
        </text>

        <text
          x="605"
          y="395"
          fill="#5A8299"
          fontSize="12"
          fontWeight="600"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          Oceano Atlântico
        </text>

        <text
          x="195"
          y="418"
          fill="#64748B"
          fontSize="11"
          fontWeight="600"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          SALVADOR / BA
        </text>

        <text
          x="545"
          y="74"
          fill="#64748B"
          fontSize="11"
          fontWeight="600"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          REGIÃO METROPOLITANA (RMS)
        </text>

        {/* Outbound Route Line */}
        {outOrig && outDest && (
          <g>
            <line
              x1={outOrig.mapX}
              y1={outOrig.mapY}
              x2={outDest.mapX}
              y2={outDest.mapY}
              stroke="#0F4C5C"
              strokeWidth={activeLeg?.id === outboundLeg?.id ? '3.5' : '2.2'}
              strokeDasharray="8 6"
              markerEnd="url(#arrow-outbound)"
              opacity={activeLeg?.id === outboundLeg?.id ? 0.95 : 0.45}
            />
            {/* Completed progress overlay on outbound */}
            {outboundLeg && outboundLeg.progressoPct > 0 && (
              <line
                x1={outOrig.mapX}
                y1={outOrig.mapY}
                x2={
                  outOrig.mapX +
                  ((outDest.mapX - outOrig.mapX) * outboundLeg.progressoPct) / 100
                }
                y2={
                  outOrig.mapY +
                  ((outDest.mapY - outOrig.mapY) * outboundLeg.progressoPct) / 100
                }
                stroke="#0F4C5C"
                strokeWidth="4"
                strokeLinecap="round"
              />
            )}
          </g>
        )}

        {/* Return Route Line */}
        {retOrig && retDest && (
          <g>
            <line
              x1={retOrig.mapX}
              y1={retOrig.mapY}
              x2={retDest.mapX}
              y2={retDest.mapY}
              stroke="#059669"
              strokeWidth={activeLeg?.id === returnLeg?.id ? '3.5' : '2.2'}
              strokeDasharray="6 5"
              markerEnd="url(#arrow-return)"
              opacity={activeLeg?.id === returnLeg?.id ? 0.95 : 0.65}
            />
            {returnLeg && returnLeg.progressoPct > 0 && (
              <line
                x1={retOrig.mapX}
                y1={retOrig.mapY}
                x2={
                  retOrig.mapX +
                  ((retDest.mapX - retOrig.mapX) * returnLeg.progressoPct) / 100
                }
                y2={
                  retOrig.mapY +
                  ((retDest.mapY - retOrig.mapY) * returnLeg.progressoPct) / 100
                }
                stroke="#059669"
                strokeWidth="4"
                strokeLinecap="round"
              />
            )}
          </g>
        )}

        {/* Institution Nodes */}
        {instituicoes.map((inst) => {
          const isBase = inst.tipo === 'BASE_OPERACIONAL';
          const isLab = inst.tipo === 'LABORATORIO';
          const fill = isBase ? '#0B2545' : isLab ? '#059669' : '#0F4C5C';
          const isEndpoint =
            activeLeg?.origemId === inst.id || activeLeg?.destinoId === inst.id;

          return (
            <g key={inst.id} transform={`translate(${inst.mapX}, ${inst.mapY})`}>
              {isEndpoint && (
                <circle r="16" fill={fill} opacity="0.14" />
              )}
              <circle
                r="8.5"
                fill="#FFFFFF"
                stroke={fill}
                strokeWidth="3"
              />
              <circle r="3" fill={fill} />
              <g transform="translate(14, -12)">
                <rect
                  x="0"
                  y="0"
                  width="118"
                  height="34"
                  rx="5"
                  fill="#FFFFFF"
                  stroke="#CBD5E1"
                  strokeWidth="1"
                  opacity="0.96"
                />
                <text
                  x="8"
                  y="14"
                  fill="#0B2545"
                  fontSize="10.5"
                  fontWeight="700"
                  fontFamily="Plus Jakarta Sans, sans-serif"
                >
                  {inst.sigla}
                </text>
                <text
                  x="8"
                  y="27"
                  fill="#475569"
                  fontSize="9"
                  fontFamily="DM Sans, sans-serif"
                >
                  {inst.tipo === 'BASE_OPERACIONAL'
                    ? 'Base MedAir'
                    : inst.tipo === 'LABORATORIO'
                      ? 'Laboratório RMS'
                      : inst.cidadeRegiao.includes('Metropolitana')
                        ? 'Hospital RMS'
                        : 'Hospital Salvador'}
                </text>
              </g>
            </g>
          );
        })}

        {/* Simulated Drone Marker */}
        {dronePoint && activeLeg && (
          <g transform={`translate(${dronePoint.x}, ${dronePoint.y})`}>
            <circle
              r="18"
              fill={mission?.estado === 'EM_CONTINGENCIA' ? '#DC2626' : '#0F4C5C'}
              opacity="0.16"
            />
            <g transform={`rotate(${dronePoint.angleDeg})`}>
              <polygon
                points="12,0 -8,-7 -4,0 -8,7"
                fill={mission?.estado === 'EM_CONTINGENCIA' ? '#DC2626' : '#0B2545'}
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            </g>
            <g transform="translate(-44, -36)">
              <rect
                x="0"
                y="0"
                width="88"
                height="20"
                rx="4"
                fill="#0B2545"
              />
              <text
                x="44"
                y="13.5"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="10"
                fontWeight="600"
                fontFamily="IBM Plex Mono, monospace"
              >
                {drone?.codigo ?? 'DRONE'} · {activeLeg.progressoPct}%
              </text>
            </g>
          </g>
        )}

        {/* Map Legend Box */}
        <g transform="translate(18, 18)">
          <rect
            x="0"
            y="0"
            width="215"
            height="72"
            rx="6"
            fill="#FFFFFF"
            stroke="#CBD5E1"
            strokeWidth="1"
            opacity="0.95"
          />
          <text
            x="10"
            y="18"
            fill="#0B2545"
            fontSize="10"
            fontWeight="700"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            Legenda da Rota Simulada
          </text>
          <line x1="10" y1="33" x2="36" y2="33" stroke="#0F4C5C" strokeWidth="3" strokeDasharray="5 3" />
          <text x="44" y="37" fill="#334155" fontSize="10" fontFamily="DM Sans, sans-serif">
            Trecho de Ida (Principal)
          </text>
          <line x1="10" y1="53" x2="36" y2="53" stroke="#059669" strokeWidth="3" strokeDasharray="5 3" />
          <text x="44" y="57" fill="#334155" fontSize="10" fontFamily="DM Sans, sans-serif">
            Trecho de Retorno / Reversa
          </text>
        </g>

        {/* Scale Bar */}
        <g transform="translate(18, 405)">
          <line x1="0" y1="10" x2="90" y2="10" stroke="#475569" strokeWidth="2" />
          <line x1="0" y1="5" x2="0" y2="15" stroke="#475569" strokeWidth="2" />
          <line x1="90" y1="5" x2="90" y2="15" stroke="#475569" strokeWidth="2" />
          <text x="45" y="4" textAnchor="middle" fill="#475569" fontSize="9.5" fontFamily="IBM Plex Mono, monospace">
            ~5,0 km (esquemático)
          </text>
        </g>
      </svg>
    </div>
  );
}
