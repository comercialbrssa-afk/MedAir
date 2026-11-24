import { AlertTriangle, CheckCircle2, Send, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useMedAir } from '../../context/MedAirContext';
import { canRolePerform } from '../../engine/stateMachine';
import type { CargoType, PriorityLevel } from '../../types/domain';
import { CARGO_TYPE_LABELS, PRIORITY_LABELS } from '../../utils/formatters';
import type { PortalTab } from './PortalLayout';

interface NewRequestFormProps {
  onSuccess: (tab: PortalTab) => void;
}

export function NewRequestForm({ onSuccess }: NewRequestFormProps) {
  const { state, currentUser, createRequest } = useMedAir();
  const perm = currentUser
    ? canRolePerform(currentUser.perfil, 'CREATE_REQUEST')
    : { allowed: false, reason: 'Faça login demonstrativo.' };

  const hospitalsAndLabs = state.instituicoes.filter(
    (i) => i.tipo !== 'BASE_OPERACIONAL'
  );

  const defaultInstId =
    currentUser?.instituicaoId &&
    hospitalsAndLabs.some((h) => h.id === currentUser.instituicaoId)
      ? currentUser.instituicaoId
      : 'inst-hosp-a';

  const defaultDestId =
    defaultInstId === 'inst-hosp-b' ? 'inst-hosp-a' : 'inst-hosp-b';

  const defaultDeadline = new Date(Date.now() + 2 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  const [instituicaoSolicitanteId, setInstituicaoSolicitanteId] = useState(defaultInstId);
  const [responsavelInstitucional, setResponsavelInstitucional] = useState(
    currentUser?.nome ?? ''
  );
  const [origemId, setOrigemId] = useState(defaultInstId);
  const [destinoId, setDestinoId] = useState(defaultDestId);
  const [tipoCarga, setTipoCarga] = useState<CargoType>('ORGAO_TRANSPLANTE');
  const [descricaoCarga, setDescricaoCarga] = useState(
    'Recipiente térmico demonstrativo — Órgão fictício para transplante (sem dados reais)'
  );
  const [prioridade, setPrioridade] = useState<PriorityLevel>('CRITICA');
  const [pesoKg, setPesoKg] = useState('3.2');
  const [comprimentoCm, setComprimentoCm] = useState('32');
  const [larguraCm, setLarguraCm] = useState('24');
  const [alturaCm, setAlturaCm] = useState('20');
  const [volumeEstimadoL, setVolumeEstimadoL] = useState('11.5');
  const [requerControleTermico, setRequerControleTermico] = useState(true);
  const [tempMinC, setTempMinC] = useState('2.0');
  const [tempMaxC, setTempMaxC] = useState('8.0');
  const [requisitosConservacao, setRequisitosConservacao] = useState(
    'Manter cadeia fria controlada entre 2,0 °C e 8,0 °C com lacre de segurança.'
  );
  const [prazoDesejado, setPrazoDesejado] = useState(defaultDeadline);
  const [observacoesOperacionais, setObservacoesOperacionais] = useState(
    'Coleta prioritária no heliponto/pátio demonstrativo.'
  );
  const [confirmacaoDadosFicticios, setConfirmacaoDadosFicticios] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCargoTypeChange = (next: CargoType) => {
    setTipoCarga(next);
    if (next === 'ORGAO_TRANSPLANTE') {
      setPrioridade('CRITICA');
      setRequerControleTermico(true);
      setTempMinC('2.0');
      setTempMaxC('8.0');
      setDescricaoCarga('Recipiente térmico demonstrativo — Órgão fictício (sem identificação clínica)');
    } else if (next === 'AMOSTRA_LABORATORIAL') {
      setPrioridade('ALTA');
      setRequerControleTermico(true);
      setTempMinC('2.0');
      setTempMaxC('8.0');
      setDescricaoCarga('Kit de amostras laboratoriais fictícias em embalagem secundária selada');
    } else if (next === 'MEDICAMENTO') {
      setPrioridade('ALTA');
      setRequerControleTermico(true);
      setDescricaoCarga('Lote fictício de medicamentos hospitalares termolábeis');
    } else if (next === 'INSUMO_HOSPITALAR') {
      setPrioridade('NORMAL');
      setRequerControleTermico(false);
      setDescricaoCarga('Insumos hospitalares fictícios de reposição rápida');
    } else {
      setPrioridade('NORMAL');
      setRequerControleTermico(true);
      setDescricaoCarga('Material fictício disponível para aproveitamento em logística reversa');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const res = createRequest({
      instituicaoSolicitanteId,
      responsavelInstitucional,
      origemId,
      destinoId,
      tipoCarga,
      descricaoCarga,
      prioridade,
      pesoKg: Number(pesoKg.replace(',', '.')),
      comprimentoCm: Number(comprimentoCm.replace(',', '.')),
      larguraCm: Number(larguraCm.replace(',', '.')),
      alturaCm: Number(alturaCm.replace(',', '.')),
      volumeEstimadoL: Number(volumeEstimadoL.replace(',', '.')),
      requerControleTermico,
      tempMinC: requerControleTermico ? Number(tempMinC.replace(',', '.')) : undefined,
      tempMaxC: requerControleTermico ? Number(tempMaxC.replace(',', '.')) : undefined,
      requisitosConservacao,
      prazoDesejadoIso: new Date(prazoDesejado).toISOString(),
      observacoesOperacionais,
      confirmacaoDadosFicticios,
    });

    if (!res.ok) {
      setErrorMsg(res.message);
      return;
    }

    onSuccess('MINHAS_SOLICITACOES');
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B2545]">
          Nova Solicitação de Transporte Médico (Simulado)
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
          Registre uma solicitação fictícia para iniciar o fluxo completo de triagem, planejamento e custódia.
        </p>
      </div>

      {/* Mandatory Privacy & Academic Guardrail */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-xs text-amber-950">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold">Proteção de Dados e Escopo Acadêmico</div>
          <p className="leading-relaxed">
            <strong>NÃO informe nomes, CPFs, prontuários ou dados reais de pacientes, doadores ou receptores.</strong> Este formulário aceita apenas descrições logísticas fictícias para fins de demonstração acadêmica.
          </p>
        </div>
      </div>

      {!perm.allowed && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            <strong>Ação bloqueada:</strong> {perm.reason}
          </span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6 space-y-6"
      >
        {/* Section 1: Institutions & Route */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[#0B2545] border-b border-slate-100 pb-2">
            1. Identificação Institucional e Rota
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Instituição solicitante *
              </label>
              <select
                value={instituicaoSolicitanteId}
                onChange={(e) => setInstituicaoSolicitanteId(e.target.value)}
                required
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-[#0B2545] focus:border-[#0F4C5C] focus:outline-none"
              >
                {hospitalsAndLabs.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Responsável institucional (fictício) *
              </label>
              <input
                type="text"
                value={responsavelInstitucional}
                onChange={(e) => setResponsavelInstitucional(e.target.value)}
                required
                placeholder="Ex.: Dra. Camila Nogueira"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#0B2545] focus:border-[#0F4C5C] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Origem da coleta *
              </label>
              <select
                value={origemId}
                onChange={(e) => setOrigemId(e.target.value)}
                required
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-[#0B2545] focus:border-[#0F4C5C] focus:outline-none"
              >
                {hospitalsAndLabs.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destino da entrega *
              </label>
              <select
                value={destinoId}
                onChange={(e) => setDestinoId(e.target.value)}
                required
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-[#0B2545] focus:border-[#0F4C5C] focus:outline-none"
              >
                {hospitalsAndLabs.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Cargo Specifications */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[#0B2545] border-b border-slate-100 pb-2">
            2. Especificações da Carga e Prioridade
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de carga *
              </label>
              <select
                value={tipoCarga}
                onChange={(e) => handleCargoTypeChange(e.target.value as CargoType)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-[#0B2545] focus:border-[#0F4C5C] focus:outline-none"
              >
                {(Object.keys(CARGO_TYPE_LABELS) as CargoType[]).map((k) => (
                  <option key={k} value={k}>
                    {CARGO_TYPE_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prioridade operacional *
              </label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as PriorityLevel)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-[#0B2545] focus:border-[#0F4C5C] focus:outline-none"
              >
                {(Object.keys(PRIORITY_LABELS) as PriorityLevel[]).map((k) => (
                  <option key={k} value={k}>
                    {PRIORITY_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descrição logística da carga (sem dados pessoais ou clínicos) *
            </label>
            <input
              type="text"
              value={descricaoCarga}
              onChange={(e) => setDescricaoCarga(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#0B2545] focus:border-[#0F4C5C] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Peso (kg) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="20"
                value={pesoKg}
                onChange={(e) => setPesoKg(e.target.value)}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono text-[#0B2545]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Comp. (cm)
              </label>
              <input
                type="number"
                min="5"
                value={comprimentoCm}
                onChange={(e) => setComprimentoCm(e.target.value)}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono text-[#0B2545]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Larg. (cm)
              </label>
              <input
                type="number"
                min="5"
                value={larguraCm}
                onChange={(e) => setLarguraCm(e.target.value)}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono text-[#0B2545]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alt. (cm)
              </label>
              <input
                type="number"
                min="5"
                value={alturaCm}
                onChange={(e) => setAlturaCm(e.target.value)}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono text-[#0B2545]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Volume (L) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={volumeEstimadoL}
                onChange={(e) => setVolumeEstimadoL(e.target.value)}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono text-[#0B2545]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Conservation & Deadline */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[#0B2545] border-b border-slate-100 pb-2">
            3. Conservação, Prazo e Observações
          </h2>

          <div className="flex items-center gap-2.5">
            <input
              id="req-thermal"
              type="checkbox"
              checked={requerControleTermico}
              onChange={(e) => setRequerControleTermico(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#0F4C5C]"
            />
            <label htmlFor="req-thermal" className="text-xs font-semibold text-[#0B2545]">
              Requer compartimento com controle térmico monitorado (simulado)
            </label>
          </div>

          {requerControleTermico && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F4F7F9] p-3.5 rounded-md border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Temperatura mínima (°C)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={tempMinC}
                  onChange={(e) => setTempMinC(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Temperatura máxima (°C)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={tempMaxC}
                  onChange={(e) => setTempMaxC(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Requisitos de conservação *
              </label>
              <input
                type="text"
                value={requisitosConservacao}
                onChange={(e) => setRequisitosConservacao(e.target.value)}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prazo desejado *
              </label>
              <input
                type="datetime-local"
                value={prazoDesejado}
                onChange={(e) => setPrazoDesejado(e.target.value)}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações operacionais
            </label>
            <textarea
              rows={2}
              value={observacoesOperacionais}
              onChange={(e) => setObservacoesOperacionais(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Mandatory Fictitious Confirmation Checkbox */}
        <div className="rounded-md border border-[#0F4C5C]/30 bg-[#F0F6F8] p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmacaoDadosFicticios}
              onChange={(e) => setConfirmacaoDadosFicticios(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-400 text-[#0F4C5C]"
            />
            <span className="text-xs text-[#0B2545] leading-relaxed">
              <strong>Declaração obrigatória:</strong> Confirmo que todos os dados inseridos nesta solicitação são <strong>fictícios</strong> para uso no ambiente de demonstração acadêmica, sem qualquer dado identificável de pacientes, doadores ou receptores reais.
            </span>
          </label>
        </div>

        {errorMsg && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-800">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="submit"
            disabled={!perm.allowed}
            title={!perm.allowed ? perm.reason : 'Enviar solicitação para triagem'}
            className="inline-flex items-center gap-2 rounded-md bg-[#0F4C5C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0B3B48] disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
          >
            {confirmacaoDadosFicticios ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Registrar Solicitação Demonstrativa</span>
          </button>
        </div>
      </form>
    </div>
  );
}
