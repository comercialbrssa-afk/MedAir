import {
  ClipboardList,
  FileCheck2,
  Home,
  PackageCheck,
  PlusCircle,
  Radio,
} from 'lucide-react';
import { useState } from 'react';
import { CargoReceiving } from './CargoReceiving';
import { HistoryReceipts } from './HistoryReceipts';
import { MissionTracking } from './MissionTracking';
import { MyRequests } from './MyRequests';
import { NewRequestForm } from './NewRequestForm';
import { PortalHome } from './PortalHome';

export type PortalTab =
  | 'INICIO'
  | 'NOVA_SOLICITACAO'
  | 'MINHAS_SOLICITACOES'
  | 'ACOMPANHAMENTO'
  | 'RECEBIMENTO'
  | 'HISTORICO';

const PORTAL_NAV: { id: PortalTab; label: string; shortLabel: string; icon: typeof Home }[] = [
  { id: 'INICIO', label: 'Início', shortLabel: 'Início', icon: Home },
  { id: 'NOVA_SOLICITACAO', label: 'Nova Solicitação', shortLabel: 'Solicitar', icon: PlusCircle },
  { id: 'MINHAS_SOLICITACOES', label: 'Minhas Solicitações', shortLabel: 'Pedidos', icon: ClipboardList },
  { id: 'ACOMPANHAMENTO', label: 'Acompanhamento', shortLabel: 'Mapa', icon: Radio },
  { id: 'RECEBIMENTO', label: 'Recebimento', shortLabel: 'Receber', icon: PackageCheck },
  { id: 'HISTORICO', label: 'Histórico e Comprovantes', shortLabel: 'Histórico', icon: FileCheck2 },
];

export function PortalLayout() {
  const [activeTab, setActiveTab] = useState<PortalTab>('INICIO');

  return (
    <div className="min-h-[calc(100vh-88px)] flex flex-col pb-16 md:pb-6">
      {/* Desktop / Tablet Compact Sub-navigation Bar */}
      <nav
        aria-label="Navegação do Portal Hospitalar"
        className="no-print hidden md:block border-b border-slate-200 bg-white sticky top-[52px] z-30"
      >
        <div className="max-w-7xl mx-auto px-5 flex items-center gap-1 overflow-x-auto">
          {PORTAL_NAV.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-[#0F4C5C] text-[#0F4C5C]'
                    : 'border-transparent text-slate-600 hover:text-[#0B2545] hover:border-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'INICIO' && <PortalHome onNavigate={setActiveTab} />}
        {activeTab === 'NOVA_SOLICITACAO' && <NewRequestForm onSuccess={setActiveTab} />}
        {activeTab === 'MINHAS_SOLICITACOES' && <MyRequests onNavigate={setActiveTab} />}
        {activeTab === 'ACOMPANHAMENTO' && <MissionTracking />}
        {activeTab === 'RECEBIMENTO' && <CargoReceiving />}
        {activeTab === 'HISTORICO' && <HistoryReceipts />}
      </main>

      {/* Mobile Compact Bottom Nav */}
      <nav
        aria-label="Navegação inferior do Portal"
        className="no-print md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white grid grid-cols-6"
      >
        {PORTAL_NAV.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-2 text-[10px] font-medium transition-colors ${
                active ? 'text-[#0F4C5C] font-bold bg-[#F0F6F8]' : 'text-slate-500'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="truncate max-w-full px-1">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
