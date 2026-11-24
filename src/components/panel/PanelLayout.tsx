import {
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  Compass,
  Cpu,
  LayoutDashboard,
  Package,
  PackageCheck,
  Radio,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Wrench,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useMedAir } from '../../context/MedAirContext';
import { ApprovalDispatchModule } from './ApprovalDispatchModule';
import { ArrivalDeliveryModule } from './ArrivalDeliveryModule';
import { AssistantConfigModule } from './AssistantConfigModule';
import { CollectionPrepModule } from './CollectionPrepModule';
import { IndicatorsReportsModule } from './IndicatorsReportsModule';
import { MonitoringCenter } from './MonitoringCenter';
import { OccurrencesModule } from './OccurrencesModule';
import { OpsDashboard } from './OpsDashboard';
import { PlanningModule } from './PlanningModule';
import { PostOpFleetModule } from './PostOpFleetModule';
import { ReturnLegModule } from './ReturnLegModule';
import { ReverseLogisticsModule } from './ReverseLogisticsModule';
import { TriageModule } from './TriageModule';

export type PanelModule =
  | 'DASHBOARD'
  | 'TRIAGEM'
  | 'PLANEJAMENTO'
  | 'APROVACAO_DESPACHO'
  | 'COLETA'
  | 'MONITORAMENTO'
  | 'OCORRENCIAS'
  | 'ENTREGA'
  | 'LOGISTICA_REVERSA'
  | 'RETORNO'
  | 'FROTA'
  | 'INDICADORES'
  | 'REGRAS_ASSISTENTE';

interface NavGroup {
  title: string;
  items: { id: PanelModule; label: string; icon: typeof LayoutDashboard }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Visão Geral',
    items: [
      { id: 'DASHBOARD', label: '1. Dashboard', icon: LayoutDashboard },
      { id: 'TRIAGEM', label: '2. Solicitações e Triagem', icon: ClipboardList },
      { id: 'PLANEJAMENTO', label: '3. Planejamento', icon: Compass },
      { id: 'APROVACAO_DESPACHO', label: '4. Aprovação e Despacho', icon: ClipboardCheck },
    ],
  },
  {
    title: 'Operação em Voo',
    items: [
      { id: 'COLETA', label: '5. Coleta e Preparação', icon: Package },
      { id: 'MONITORAMENTO', label: '6. Central de Monitoramento', icon: Radio },
      { id: 'OCORRENCIAS', label: '7. Ocorrências', icon: AlertTriangle },
      { id: 'ENTREGA', label: '8. Chegada e Entrega', icon: PackageCheck },
    ],
  },
  {
    title: 'Retorno, Frota e Análise',
    items: [
      { id: 'LOGISTICA_REVERSA', label: '9. Logística Reversa', icon: RefreshCw },
      { id: 'RETORNO', label: '10. Retorno', icon: RotateCcw },
      { id: 'FROTA', label: '11. Pós-operação e Frota', icon: Wrench },
      { id: 'INDICADORES', label: '12. Indicadores e Relatórios', icon: BarChart3 },
    ],
  },
  {
    title: 'Motor Determinístico',
    items: [
      { id: 'REGRAS_ASSISTENTE', label: 'Parâmetros do Assistente', icon: Cpu },
    ],
  },
];

interface PanelLayoutProps {
  mobileSidebarOpen: boolean;
  onCloseMobileSidebar: () => void;
  onOpenLimitations: () => void;
}

export function PanelLayout({
  mobileSidebarOpen,
  onCloseMobileSidebar,
  onOpenLimitations,
}: PanelLayoutProps) {
  const { state, currentUser } = useMedAir();
  const [activeMod, setActiveMod] = useState<PanelModule>(
    currentUser?.perfil === 'MANUTENCAO'
      ? 'FROTA'
      : currentUser?.perfil === 'AUDITOR'
        ? 'INDICADORES'
        : 'DASHBOARD'
  );

  const pendingTriage = state.solicitacoes.filter((s) => s.status === 'PENDENTE_TRIAGEM').length;
  const openOccs = state.ocorrencias.filter((o) => o.status !== 'ENCERRADA').length;

  const handleSelect = (mod: PanelModule) => {
    setActiveMod(mod);
    onCloseMobileSidebar();
  };

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col bg-white border-r border-slate-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 lg:hidden">
        <span className="text-sm font-bold text-[#0B2545]">Painel Operacional</span>
        <button
          type="button"
          onClick={onCloseMobileSidebar}
          aria-label="Fechar menu"
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Menu do Painel Operacional">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-2.5 text-[11px] font-semibold text-slate-400">
              {group.title}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = activeMod === item.id;
              const badgeCount =
                item.id === 'TRIAGEM'
                  ? pendingTriage
                  : item.id === 'OCORRENCIAS'
                    ? openOccs
                    : 0;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-xs font-medium transition-colors text-left ${
                    active
                      ? 'bg-[#0F4C5C] text-white font-semibold'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-[#0B2545]'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {badgeCount > 0 && (
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        active
                          ? 'bg-white/20 text-white'
                          : item.id === 'OCORRENCIAS'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={() => {
            onCloseMobileSidebar();
            onOpenLimitations();
          }}
          className="w-full flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
        >
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-700" />
          <span>Limitações da Versão 01</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-88px)]">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:block w-64 shrink-0 sticky top-[52px] h-[calc(100vh-52px)]">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#0B2545]/45"
            onClick={onCloseMobileSidebar}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10 shadow-xl">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Viewport */}
      <main className="flex-1 min-w-0 px-4 sm:px-6 py-6 max-w-[1440px] mx-auto w-full">
        {activeMod === 'DASHBOARD' && <OpsDashboard onNavigate={setActiveMod} />}
        {activeMod === 'TRIAGEM' && <TriageModule onNavigate={setActiveMod} />}
        {activeMod === 'PLANEJAMENTO' && <PlanningModule onNavigate={setActiveMod} />}
        {activeMod === 'APROVACAO_DESPACHO' && <ApprovalDispatchModule onNavigate={setActiveMod} />}
        {activeMod === 'COLETA' && <CollectionPrepModule onNavigate={setActiveMod} />}
        {activeMod === 'MONITORAMENTO' && <MonitoringCenter onNavigate={setActiveMod} />}
        {activeMod === 'OCORRENCIAS' && <OccurrencesModule />}
        {activeMod === 'ENTREGA' && <ArrivalDeliveryModule onNavigate={setActiveMod} />}
        {activeMod === 'LOGISTICA_REVERSA' && <ReverseLogisticsModule onNavigate={setActiveMod} />}
        {activeMod === 'RETORNO' && <ReturnLegModule onNavigate={setActiveMod} />}
        {activeMod === 'FROTA' && <PostOpFleetModule onNavigate={setActiveMod} />}
        {activeMod === 'INDICADORES' && <IndicatorsReportsModule />}
        {activeMod === 'REGRAS_ASSISTENTE' && <AssistantConfigModule />}
      </main>
    </div>
  );
}
