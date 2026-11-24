import {
  Building2,
  Database,
  LayoutDashboard,
  LogOut,
  Menu,
  PlayCircle,
  RotateCcw,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useMedAir } from '../context/MedAirContext';
import { ROLE_LABELS } from '../utils/formatters';
import { ConfirmDialog } from './shared/Modals';
import { PWAInstallButton } from './shared/PWAInstallButton';

interface TopBarProps {
  onOpenSimulator: () => void;
  onOpenLimitations: () => void;
  onToggleMobileSidebar?: () => void;
  showSidebarToggle?: boolean;
}

export function TopBar({
  onOpenSimulator,
  onOpenLimitations,
  onToggleMobileSidebar,
  showSidebarToggle = false,
}: TopBarProps) {
  const {
    state,
    currentUser,
    selectProfile,
    setInterfaceMode,
    logout,
    restoreDemoData,
  } = useMedAir();

  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  if (!currentUser) return null;

  const canSwitchMode = currentUser.acessoPainel && currentUser.acessoPortal;

  return (
    <>
      <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-[#0B2545] text-white">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-2.5">
          {/* Left: Mobile Sidebar Toggle + Brand + Academic Seal */}
          <div className="flex items-center gap-3 min-w-0">
            {showSidebarToggle && onToggleMobileSidebar && (
              <button
                type="button"
                onClick={onToggleMobileSidebar}
                aria-label="Abrir menu lateral"
                className="lg:hidden rounded-md p-1.5 text-slate-200 hover:bg-white/10 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/pwa-192x192.png"
                alt="Ícone MedAir Logistics"
                className="w-8 h-8 rounded-md object-cover shrink-0 shadow-sm"
              />
              <span className="font-bold text-sm sm:text-base tracking-tight whitespace-nowrap shrink-0">
                MedAir Logistics
              </span>
            </div>

            <span className="hidden xl:inline-flex items-center rounded border border-amber-400/40 bg-amber-400/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-200 whitespace-nowrap shrink-0">
              DADOS SIMULADOS — PROTÓTIPO ACADÊMICO
            </span>
          </div>

          {/* Center / Right Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Interface Switcher */}
            {canSwitchMode && (
              <div
                className="inline-flex items-center rounded-md bg-white/10 p-0.5 border border-white/15"
                role="group"
                aria-label="Alternar interface"
              >
                <button
                  type="button"
                  onClick={() => setInterfaceMode('PORTAL')}
                  className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    state.modoInterface === 'PORTAL'
                      ? 'bg-white text-[#0B2545] font-semibold'
                      : 'text-slate-200 hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Portal Hospitalar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInterfaceMode('PAINEL')}
                  className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    state.modoInterface === 'PAINEL'
                      ? 'bg-white text-[#0B2545] font-semibold'
                      : 'text-slate-200 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Painel Operacional</span>
                </button>
              </div>
            )}

            {/* Quick Demo Profile Switcher */}
            <div className="flex items-center gap-1.5 rounded-md bg-white/10 border border-white/15 px-2 py-1">
              <UserCheck className="w-3.5 h-3.5 text-teal-300 shrink-0" />
              <label htmlFor="quick-profile-select" className="sr-only">
                Trocar perfil demonstrativo
              </label>
              <select
                id="quick-profile-select"
                value={currentUser.id}
                onChange={(e) => selectProfile(e.target.value)}
                title="Trocar perfil demonstrativo sem perder o estado da simulação"
                className="bg-transparent text-xs font-medium text-white focus:outline-none max-w-[175px] sm:max-w-[210px] truncate cursor-pointer"
              >
                {state.usuarios.map((u) => (
                  <option key={u.id} value={u.id} className="text-[#0B2545] bg-white">
                    {ROLE_LABELS[u.perfil]} — {u.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* PWA In-App Install Button */}
            <PWAInstallButton />

            {/* Simulator Button */}
            <button
              type="button"
              onClick={onOpenSimulator}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0F4C5C] border border-teal-400/30 px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#166074] transition-colors whitespace-nowrap shrink-0"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>Simulador</span>
            </button>

            {/* Limitations v01 Button */}
            <button
              type="button"
              onClick={onOpenLimitations}
              title="Visualizar Limitações da Versão 01"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-amber-200 hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limitações v01</span>
            </button>

            {/* Reset Demo Data */}
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              title="Restaurar dados de demonstração"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Restaurar demo</span>
            </button>

            {/* Exit to Profile Selector */}
            <button
              type="button"
              onClick={logout}
              title="Voltar para a tela inicial de seleção de perfil demonstrativo"
              className="inline-flex items-center gap-1 rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Compact mobile seal strip */}
        <div className="xl:hidden border-t border-white/10 bg-[#081C35] px-3 py-1 text-center font-mono text-[10px] font-semibold text-amber-200">
          DADOS SIMULADOS — PROTÓTIPO ACADÊMICO · Acesso demonstrativo ({ROLE_LABELS[currentUser.perfil]})
        </div>
      </header>

      {/* LocalStorage Academic Persistence Banner */}
      {!bannerDismissed && (
        <div className="no-print border-b border-slate-200 bg-[#EBF3F7] px-4 py-1.5 text-[11px] text-[#0B2545] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Database className="w-3.5 h-3.5 text-[#0F4C5C] shrink-0" />
            <span className="truncate sm:whitespace-normal">
              <strong>Armazenamento local (localStorage):</strong> os registros ficam salvos apenas neste navegador para demonstração acadêmica e não constituem armazenamento institucional seguro.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label="Ocultar aviso de armazenamento local"
            className="rounded p-0.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmResetOpen}
        title="Restaurar dados de demonstração"
        description="Todos os registros fictícios salvos no navegador serão reiniciados para o cenário padrão inicial da MedAir Logistics. Confirmar restauração?"
        confirmLabel="Restaurar dados"
        tone="warning"
        onCancel={() => setConfirmResetOpen(false)}
        onConfirm={() => {
          setConfirmResetOpen(false);
          restoreDemoData();
        }}
      />
    </>
  );
}
