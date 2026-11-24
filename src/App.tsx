/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { PanelLayout } from './components/panel/PanelLayout';
import { PortalLayout } from './components/portal/PortalLayout';
import { LimitationsModal } from './components/shared/Modals';
import { OfflineIndicator } from './components/shared/OfflineIndicator';
import { SimulatorDrawer } from './components/shared/SimulatorDrawer';
import { TopBar } from './components/TopBar';
import { MedAirProvider, useMedAir } from './context/MedAirContext';

function ToastStack() {
  const { toasts, dismissToast } = useMedAir();
  if (toasts.length === 0) return null;

  return (
    <div
      className="no-print fixed bottom-4 right-4 z-[70] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)]"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const style =
          t.type === 'success'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
            : t.type === 'error'
              ? 'border-red-300 bg-red-50 text-red-950'
              : t.type === 'warning'
                ? 'border-amber-300 bg-amber-50 text-amber-950'
                : 'border-[#BBD8E2] bg-white text-[#0B2545]';
        const Icon =
          t.type === 'success'
            ? CheckCircle2
            : t.type === 'error' || t.type === 'warning'
              ? AlertCircle
              : Info;

        return (
          <div
            key={t.id}
            className={`rounded-lg border px-3.5 py-2.5 shadow-md flex items-start gap-2.5 text-xs ${style}`}
          >
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1 leading-snug font-medium">{t.text}</span>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Dispensar notificação"
              className="rounded p-0.5 hover:bg-black/5 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function MedAirShell() {
  const { state, currentUser } = useMedAir();
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [limitationsOpen, setLimitationsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (!currentUser) {
    return (
      <>
        <LoginScreen onOpenLimitations={() => setLimitationsOpen(true)} />
        <LimitationsModal
          open={limitationsOpen}
          onClose={() => setLimitationsOpen(false)}
        />
        <OfflineIndicator />
        <ToastStack />
      </>
    );
  }

  const showPanel = state.modoInterface === 'PAINEL' && currentUser.acessoPainel;

  return (
    <div className="min-h-screen bg-[#F4F7F9] text-[#0B2545]">
      <TopBar
        onOpenSimulator={() => setSimulatorOpen(true)}
        onOpenLimitations={() => setLimitationsOpen(true)}
        onToggleMobileSidebar={() => setMobileSidebarOpen((v) => !v)}
        showSidebarToggle={showPanel}
      />

      {showPanel ? (
        <PanelLayout
          mobileSidebarOpen={mobileSidebarOpen}
          onCloseMobileSidebar={() => setMobileSidebarOpen(false)}
          onOpenLimitations={() => setLimitationsOpen(true)}
        />
      ) : (
        <PortalLayout />
      )}

      <SimulatorDrawer
        open={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
      />

      <LimitationsModal
        open={limitationsOpen}
        onClose={() => setLimitationsOpen(false)}
      />

      <OfflineIndicator />
      <ToastStack />
    </div>
  );
}

export default function App() {
  return (
    <MedAirProvider>
      <MedAirShell />
    </MedAirProvider>
  );
}
