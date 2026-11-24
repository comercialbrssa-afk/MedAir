import { AlertTriangle, FileCheck2, Printer, ShieldAlert, X } from 'lucide-react';
import { useMedAir } from '../../context/MedAirContext';
import type { Carga, Missao } from '../../types/domain';
import {
  CARGO_STATE_LABELS,
  CARGO_TYPE_LABELS,
  formatDateTime,
  formatKg,
  formatLiters,
  formatTemp,
  MISSION_STATE_LABELS,
} from '../../utils/formatters';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'warning',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'warning' | 'danger' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0B2545]/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2.5">
          <AlertTriangle
            className={`w-5 h-5 shrink-0 ${
              tone === 'danger' ? 'text-red-600' : tone === 'warning' ? 'text-amber-600' : 'text-[#0F4C5C]'
            }`}
          />
          <h3 className="text-base font-bold text-[#0B2545]">{title}</h3>
        </div>
        <div className="px-5 py-4 text-sm text-slate-600 leading-relaxed">
          {description}
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-xs font-semibold text-white transition-colors ${
              tone === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : tone === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-[#0F4C5C] hover:bg-[#0B3B48]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LimitationsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B2545]/50 p-4">
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-[#0B2545] px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-300 shrink-0" />
            <div>
              <h2 className="text-base font-bold">Limitações da Versão 01 — Protótipo Acadêmico</h2>
              <p className="text-xs text-slate-300">Escopo demonstrativo da plataforma MedAir Logistics</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm text-slate-700 leading-relaxed">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">
            <strong>Declaração Fundamental:</strong> A MedAir Logistics é uma <strong>empresa fictícia</strong> criada para fins exclusivamente acadêmicos. Esta Versão 01 <strong>NÃO está apta</strong> a transportar órgãos, amostras biológicas, medicamentos ou insumos na vida real, nem substitui protocolos clínicos, sanitários ou aeronáuticos.
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#0B2545] mb-2">
              1. O que é simulado nesta Versão 01
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
              <li>
                <strong>Telemetria, sensores e mapa:</strong> coordenadas no mapa esquemático SVG de Salvador/RMS, velocidade, altitude, bateria, temperatura do compartimento, umidade, vibração, vento e comunicação são integralmente <strong>DADOS SIMULADOS</strong>.
              </li>
              <li>
                <strong>Persistência local:</strong> todos os dados são gravados localmente no navegador (<code>localStorage</code> via <code>StorageAdapter</code>) apenas para demonstração contínua, sem constituir banco institucional seguro, criptografado ou em conformidade com LGPD em produção.
              </li>
              <li>
                <strong>Acesso demonstrativo:</strong> os 8 perfis de usuário permitem alternância rápida para fins de avaliação ponta a ponta, sem autenticação corporativa real.
              </li>
              <li>
                <strong>Assistente Inteligente (Motor Determinístico):</strong> utiliza parâmetros fictícios editáveis para apoio à decisão. Todas as saídas exibem o aviso <em>&ldquo;Requer validação humana&rdquo;</em>.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#0B2545] mb-2">
              2. O que esta versão NÃO executa
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
              <li>Não controla drones físicos, motores, pilotos automáticos, links de rádio ou sensores IoT reais.</li>
              <li>Não emite autorização aeronáutica (ANAC, DECEA, ANATEL), sanitária (ANVISA) ou clínica. O despacho administrativo demonstrativo não equivale à autorização real de voo.</li>
              <li>Não armazena nem solicita dados identificáveis de pacientes, doadores ou receptores reais.</li>
              <li>Não possui integração real com prontuários hospitalares, APIs externas de mapas ou serviços meteorológicos oficiais.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#0B2545] mb-2">
              3. Etapas futuras previstas em evoluções acadêmicas/técnicas
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
              <li>Arquitetura backend com autenticação forte (OAuth2/OIDC), controle de sessão e banco de dados auditável em nuvem.</li>
              <li>Integração com adaptadores certificados de telemetria IoT/MAVLink, cadeia fria validada e estações meteorológicas reais.</li>
              <li>Adequação regulatória aeronáutica (RBAC-E nº 94 / DECEA SARPAS) e sanitária (RDCs de transporte de material biológico).</li>
              <li>Assinatura digital qualificada nos registros de custódia e integração padronizada (HL7/FHIR) com sistemas hospitalares.</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-[#0F4C5C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B3B48]"
          >
            Entendi as limitações da Versão 01
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReceiptModal({
  mission,
  cargo,
  onClose,
}: {
  mission: Missao | null;
  cargo: Carga | null;
  onClose: () => void;
}) {
  const { state } = useMedAir();
  if (!mission || !cargo) return null;

  const leg = state.trechos.find((t) => t.id === cargo.trechoId);
  const origin = state.instituicoes.find((i) => i.id === leg?.origemId);
  const dest = state.instituicoes.find((i) => i.id === leg?.destinoId);
  const drone = state.drones.find((d) => d.id === mission.droneId);
  const custodies = state.custodias.filter((c) => c.cargaId === cargo.id);
  const sol = state.solicitacoes.find((s) => s.id === cargo.solicitacaoId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B2545]/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden">
        <div className="no-print flex items-center justify-between gap-3 border-b border-slate-200 bg-[#0B2545] px-5 py-3.5 text-white">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-300" />
            <h2 className="text-sm font-bold">
              Comprovante Demonstrativo de Transporte e Custódia
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-700">
          {/* Demonstrative Stamp */}
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-center font-mono text-[11px] font-bold text-amber-900">
            DOCUMENTO DEMONSTRATIVO — DADOS SIMULADOS — SEM VALIDADE JURÍDICA, SANITÁRIA OU AERONÁUTICA
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="text-lg font-extrabold text-[#0B2545]">MedAir Logistics</div>
              <div className="text-slate-500">Protótipo Acadêmico de Logística Aérea Médica — Salvador/BA</div>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className="font-bold text-[#0B2545]">Missão: {mission.codigo}</div>
              <div>Carga: {cargo.codigo}</div>
              <div>Solicitação: {sol?.codigo ?? '—'}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-md border border-slate-200 p-3 space-y-1">
              <div className="font-semibold text-[#0B2545]">Origem e Destino do Trecho</div>
              <div><strong>Trecho:</strong> {leg?.codigo ?? '—'} ({leg?.tipo ?? '—'})</div>
              <div><strong>Origem:</strong> {origin?.nome ?? '—'}</div>
              <div><strong>Destino:</strong> {dest?.nome ?? '—'}</div>
              <div><strong>Drone (simulado):</strong> {drone ? `${drone.codigo} — ${drone.modelo}` : '—'}</div>
            </div>
            <div className="rounded-md border border-slate-200 p-3 space-y-1">
              <div className="font-semibold text-[#0B2545]">Dados da Carga (Fictícios)</div>
              <div><strong>Tipo:</strong> {CARGO_TYPE_LABELS[cargo.tipo]}</div>
              <div><strong>Peso / Volume:</strong> {formatKg(cargo.pesoKg)} / {formatLiters(cargo.volumeEstimadoL)}</div>
              <div><strong>Lacre:</strong> <span className="font-mono">{cargo.codigoLacre ?? '—'}</span></div>
              <div><strong>Situação final:</strong> {CARGO_STATE_LABELS[cargo.estado]}</div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-3 space-y-1.5">
            <div className="font-semibold text-[#0B2545]">Conferência e Condições Registradas</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono tabular-nums">
              <div>
                <div className="font-sans text-[10px] text-slate-500">Temp. Coleta</div>
                <div className="font-semibold">{formatTemp(cargo.temperaturaInicialC)}</div>
              </div>
              <div>
                <div className="font-sans text-[10px] text-slate-500">Temp. Entrega</div>
                <div className="font-semibold">{formatTemp(cargo.temperaturaEntregaC)}</div>
              </div>
              <div>
                <div className="font-sans text-[10px] text-slate-500">Embalagem</div>
                <div className="font-sans font-semibold">{cargo.integridadeEmbalagemEntrega ?? '—'}</div>
              </div>
              <div>
                <div className="font-sans text-[10px] text-slate-500">Estado Missão</div>
                <div className="font-sans font-semibold">{MISSION_STATE_LABELS[mission.estado]}</div>
              </div>
            </div>
            {cargo.justificativaRecebimento && (
              <div className="pt-1 text-amber-900 bg-amber-50 rounded px-2.5 py-1.5 border border-amber-200">
                <strong>Ressalva / Justificativa registrada:</strong> {cargo.justificativaRecebimento}
              </div>
            )}
          </div>

          <div>
            <div className="font-semibold text-[#0B2545] mb-2">
              Registros Formais de Cadeia de Custódia ({custodies.length})
            </div>
            <div className="border border-slate-200 rounded-md divide-y divide-slate-200">
              {custodies.length === 0 ? (
                <div className="p-3 text-slate-500">Nenhum registro de custódia vinculado.</div>
              ) : (
                custodies.map((c) => (
                  <div key={c.id} className="p-3 space-y-1">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="font-semibold text-[#0B2545]">{c.codigo} · {c.tipoTransferencia}</span>
                      <span className="text-slate-500">{formatDateTime(c.dataHora)}</span>
                    </div>
                    <div>
                      <strong>De:</strong> {c.deParte} <strong>→ Para:</strong> {c.paraParte}
                    </div>
                    <div>
                      <strong>Responsável:</strong> {c.usuarioResponsavelNome} · <strong>Lacre:</strong> {c.codigoLacre} · <strong>Temp.:</strong> {formatTemp(c.temperaturaRegistradaC)}
                    </div>
                    <div className="text-slate-500">{c.observacoes}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
