import {
  Activity,
  ArrowRight,
  Building2,
  Eye,
  FlaskConical,
  Headset,
  Navigation,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { useMedAir } from '../context/MedAirContext';
import type { UserRole } from '../types/domain';
import { ROLE_LABELS } from '../utils/formatters';
import { PWAInstallButton } from './shared/PWAInstallButton';

interface LoginScreenProps {
  onOpenLimitations: () => void;
}

const ROLE_ICON: Record<UserRole, typeof Activity> = {
  ADMIN: ShieldCheck,
  CENTRAL_OPERACIONAL: Headset,
  PILOTO: Navigation,
  HOSPITAL_ORIGEM: Building2,
  HOSPITAL_DESTINO: Building2,
  LABORATORIO: FlaskConical,
  MANUTENCAO: Wrench,
  AUDITOR: Eye,
};

export function LoginScreen({ onOpenLimitations }: LoginScreenProps) {
  const { state, selectProfile } = useMedAir();

  return (
    <div className="min-h-screen bg-[#F4F7F9] flex flex-col">
      {/* Top Academic Bar */}
      <header className="border-b border-slate-200 bg-[#0B2545] text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/pwa-192x192.png"
              alt="Ícone MedAir Logistics"
              className="w-10 h-10 rounded-lg object-cover shrink-0 shadow-sm"
            />
            <div>
              <h1 className="text-lg font-extrabold tracking-tight leading-none">
                MedAir Logistics
              </h1>
              <p className="text-xs text-slate-300 mt-1">
                Plataforma Acadêmica de Gestão Logística Médico-Hospitalar por Drones
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded border border-amber-400/40 bg-amber-400/15 px-2.5 py-1 font-mono text-[11px] font-semibold text-amber-200">
              DADOS SIMULADOS — PROTÓTIPO ACADÊMICO
            </span>
            <PWAInstallButton />
            <button
              type="button"
              onClick={onOpenLimitations}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
              <span>Limitações da Versão 01</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Intro Banner */}
        <section className="rounded-lg border border-slate-200 bg-white p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-3">
            <div className="text-xs font-semibold text-[#0F4C5C]">
              Acesso demonstrativo · Ambiente de simulação acadêmica (Salvador / RMS — BA)
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] tracking-tight">
              Rastreabilidade, controle térmico simulado e logística reversa ponta a ponta
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
              Selecione abaixo um dos <strong>8 perfis demonstrativos</strong> para explorar o Portal Hospitalar e o Painel Operacional. Você poderá alternar entre perfis a qualquer momento no cabeçalho sem perder o estado da operação.
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2 text-xs text-amber-950">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Escopo e Limites do Protótipo (v01)</span>
            </div>
            <p className="leading-relaxed">
              Empresa fictícia em simulação acadêmica. <strong>Não controla drones reais</strong>, não emite autorização aeronáutica ou sanitária e não utiliza dados reais de pacientes, doadores ou receptores.
            </p>
            <p className="text-[11px] text-amber-900/90">
              Persistência local no navegador via <code>StorageAdapter</code> (localStorage) exclusivamente para demonstração.
            </p>
          </div>
        </section>

        {/* 8 Demo Profiles Grid */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-[#0B2545]">
                Selecione um Perfil Demonstrativo
              </h3>
              <p className="text-xs text-slate-600">
                Cada perfil respeita regras de acesso e permissões específicas no Portal e no Painel.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              8 perfis configurados · Acesso demonstrativo
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {state.usuarios.map((user) => {
              const Icon = ROLE_ICON[user.perfil];
              const inst = state.instituicoes.find((i) => i.id === user.instituicaoId);
              const accessScope =
                user.acessoPainel && user.acessoPortal
                  ? 'Portal + Painel'
                  : user.acessoPainel
                    ? 'Painel Operacional'
                    : 'Portal Hospitalar';

              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => selectProfile(user.id)}
                  className="group text-left rounded-lg border border-slate-200 bg-white p-4 hover:border-[#0F4C5C] hover:bg-[#F8FBFC] transition-all flex flex-col justify-between gap-4 focus-visible:outline-2 focus-visible:outline-[#0F4C5C]"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-9 h-9 rounded-md bg-[#E3F0F4] text-[#0F4C5C] flex items-center justify-center shrink-0 group-hover:bg-[#0F4C5C] group-hover:text-white transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">
                        {accessScope}
                      </span>
                    </div>

                    <div>
                      <div className="text-sm font-bold text-[#0B2545]">
                        {ROLE_LABELS[user.perfil]}
                      </div>
                      <div className="text-xs font-medium text-[#0F4C5C] mt-0.5">
                        {user.nome}
                      </div>
                      {inst && (
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {inst.nome}
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {user.descricaoPermissoes}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#0F4C5C]">
                    <span>Entrar como demonstrativo</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
        MedAir Logistics — Protótipo Acadêmico v01 · Todos os mapas, rotas, sensores, telemetrias e indicadores são DADOS SIMULADOS.
      </footer>
    </div>
  );
}
