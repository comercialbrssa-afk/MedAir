import { Cpu, RotateCcw, Save } from 'lucide-react';
import { useState } from 'react';
import { useMedAir } from '../../context/MedAirContext';
import { ASSISTANT_DISCLAIMER } from '../../engine/rulesEngine';
import { canRolePerform } from '../../engine/stateMachine';
import type { RegrasConfig } from '../../types/domain';

export function AssistantConfigModule() {
  const { state, currentUser, updateRegrasConfig, resetRegrasConfig } = useMedAir();
  const perm = currentUser
    ? canRolePerform(currentUser.perfil, 'EDIT_RULES')
    : { allowed: false, reason: 'Somente leitura.' };

  const [form, setForm] = useState<RegrasConfig>({ ...state.regrasConfig });

  const handleNum = (key: keyof RegrasConfig, val: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: Number(val.replace(',', '.')),
    }));
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B2545] flex items-center gap-2">
          <Cpu className="w-6 h-6 text-[#0F4C5C]" />
          <span>Configuração do Assistente Inteligente (Motor Determinístico v01)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
          Ajuste os limiares simulados utilizados nas verificações de compatibilidade de frota, alertas de telemetria e avaliação de logística reversa.
        </p>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-900">
        {ASSISTANT_DISCLAIMER}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateRegrasConfig(form);
        }}
        className="rounded-lg border border-slate-200 bg-white p-5 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Bateria mínima para despacho (%)
            </label>
            <input
              type="number"
              min="20"
              max="100"
              value={form.bateriaMinimaDespachoPct}
              onChange={(e) => handleNum('bateriaMinimaDespachoPct', e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Bateria mínima de alerta em voo (%)
            </label>
            <input
              type="number"
              min="10"
              max="80"
              value={form.bateriaMinimaAlertaPct}
              onChange={(e) => handleNum('bateriaMinimaAlertaPct', e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Vento máximo simulado permitido (km/h)
            </label>
            <input
              type="number"
              step="0.5"
              value={form.ventoMaximoSimuladoKmh}
              onChange={(e) => handleNum('ventoMaximoSimuladoKmh', e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Margem de segurança de autonomia (%)
            </label>
            <input
              type="number"
              min="5"
              max="80"
              value={form.margemAutonomiaSegurancaPct}
              onChange={(e) => handleNum('margemAutonomiaSegurancaPct', e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Vibração máxima simulada (g)
            </label>
            <input
              type="number"
              step="0.05"
              value={form.vibracaoMaximaG}
              onChange={(e) => handleNum('vibracaoMaximaG', e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Desvio máximo para coleta de retorno (km)
            </label>
            <input
              type="number"
              step="0.5"
              value={form.distanciaMaximaDesvioRetornoKm}
              onChange={(e) => handleNum('distanciaMaximaDesvioRetornoKm', e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Faixa térmica padrão — Mínima (°C)
            </label>
            <input
              type="number"
              step="0.5"
              value={form.faixaTermicaPadraoMinC}
              onChange={(e) => handleNum('faixaTermicaPadraoMinC', e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Faixa térmica padrão — Máxima (°C)
            </label>
            <input
              type="number"
              step="0.5"
              value={form.faixaTermicaPadraoMaxC}
              onChange={(e) => handleNum('faixaTermicaPadraoMaxC', e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 font-mono"
            />
          </div>
        </div>

        {!perm.allowed && (
          <div className="rounded border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
            {perm.reason}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            disabled={!perm.allowed}
            onClick={() => {
              const res = resetRegrasConfig();
              if (res.ok) {
                setForm({
                  bateriaMinimaDespachoPct: 75,
                  bateriaMinimaAlertaPct: 30,
                  ventoMaximoSimuladoKmh: 38,
                  margemAutonomiaSegurancaPct: 25,
                  vibracaoMaximaG: 0.45,
                  faixaTermicaPadraoMinC: 2.0,
                  faixaTermicaPadraoMaxC: 8.0,
                  distanciaMaximaDesvioRetornoKm: 8.0,
                });
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-45"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão</span>
          </button>

          <button
            type="submit"
            disabled={!perm.allowed}
            title={!perm.allowed ? perm.reason : 'Salvar parâmetros do motor determinístico'}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0F4C5C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B3B48] disabled:opacity-45"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Parâmetros Simulados</span>
          </button>
        </div>
      </form>
    </div>
  );
}
