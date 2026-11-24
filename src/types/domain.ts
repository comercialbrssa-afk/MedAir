// MedAir Logistics — Domain Types & Entities (Academic Prototype)

export type UserRole =
  | 'ADMIN'
  | 'CENTRAL_OPERACIONAL'
  | 'PILOTO'
  | 'HOSPITAL_ORIGEM'
  | 'HOSPITAL_DESTINO'
  | 'LABORATORIO'
  | 'MANUTENCAO'
  | 'AUDITOR';

export type CargoType =
  | 'ORGAO_TRANSPLANTE'
  | 'AMOSTRA_LABORATORIAL'
  | 'MEDICAMENTO'
  | 'INSUMO_HOSPITALAR'
  | 'LOGISTICA_REVERSA';

export type PriorityLevel = 'CRITICA' | 'ALTA' | 'NORMAL' | 'PROGRAMADA';

// 25 rigorous mission states
export type MissionState =
  | 'SOLICITADA'
  | 'EM_TRIAGEM'
  | 'AGUARDANDO_COMPLEMENTACAO'
  | 'EM_PLANEJAMENTO'
  | 'AGUARDANDO_APROVACAO'
  | 'APROVADA'
  | 'CARGA_EM_PREPARACAO'
  | 'CARGA_VALIDADA'
  | 'DESPACHADA'
  | 'EM_TRANSPORTE'
  | 'CHEGOU_AO_DESTINO'
  | 'EM_CONFERENCIA'
  | 'ENTREGA_CONFIRMADA'
  | 'ENTREGA_COM_RESSALVA'
  | 'RECEBIMENTO_RECUSADO'
  | 'ANALISANDO_RETORNO'
  | 'RETORNO_PENDENTE'
  | 'RETORNO_APROVADO'
  | 'RETORNO_SEM_CARGA'
  | 'RETORNO_EM_ANDAMENTO'
  | 'EM_POS_OPERACAO'
  | 'ENCERRADA'
  | 'CANCELADA'
  | 'RECUSADA'
  | 'EM_CONTINGENCIA';

// Independent Leg (Trecho) states
export type LegState =
  | 'PLANEJADO'
  | 'EM_PREPARACAO'
  | 'PRONTO'
  | 'EM_VOO'
  | 'CHEGOU_AO_DESTINO'
  | 'CONCLUIDO'
  | 'CANCELADO'
  | 'EM_CONTINGENCIA';

export type LegType = 'IDA' | 'RETORNO_COM_CARGA' | 'RETORNO_VAZIO';

// Independent Cargo (Carga) states
export type CargoState =
  | 'SOLICITADA'
  | 'EM_PREPARACAO'
  | 'VALIDADA_LACRADA'
  | 'EM_TRANSPORTE'
  | 'AGUARDANDO_CONFERENCIA'
  | 'ENTREGUE'
  | 'ENTREGUE_COM_RESSALVA'
  | 'RECUSADA'
  | 'RETORNADA'
  | 'CANCELADA';

// 6 Fleet Drone states
export type DroneState =
  | 'DISPONIVEL'
  | 'EM_MISSAO'
  | 'EM_INSPECAO'
  | 'EM_HIGIENIZACAO'
  | 'EM_MANUTENCAO'
  | 'BLOQUEADO';

export type OccurrenceSeverity = 'INFORMATIVA' | 'ATENCAO' | 'CRITICA';

export type OccurrenceStatus =
  | 'ABERTA'
  | 'EM_AVALIACAO'
  | 'EM_TRATAMENTO'
  | 'ENCERRADA';

export type CommunicationStatus = 'ESTAVEL' | 'INSTAVEL' | 'PERDA_SINAL';

export type WeatherCondition = 'BOM' | 'VENTO_MODERADO' | 'CHUVA_LEVE' | 'ADVERSO';

export type RequestStatus =
  | 'PENDENTE_TRIAGEM'
  | 'AGUARDANDO_COMPLEMENTACAO'
  | 'APROVADA_MISSAO'
  | 'DISPONIVEL_RETORNO'
  | 'VINCULADA_RETORNO'
  | 'RECUSADA'
  | 'CANCELADA'
  | 'CONCLUIDA';

// 1. Usuário
export interface Usuario {
  id: string;
  nome: string;
  cargo: string;
  perfil: UserRole;
  instituicaoId?: string;
  emailFicticio: string;
  descricaoPermissoes: string;
  acessoPainel: boolean;
  acessoPortal: boolean;
}

// 2. Instituição
export interface Instituicao {
  id: string;
  nome: string;
  sigla: string;
  tipo: 'HOSPITAL' | 'LABORATORIO' | 'BASE_OPERACIONAL';
  cidadeRegiao: string;
  enderecoFicticio: string;
  // Coordinates on SVG schematic map (0..800 x 0..460)
  mapX: number;
  mapY: number;
  responsavelPadrao: string;
}

// 3. Solicitação
export interface Solicitacao {
  id: string;
  codigo: string;
  instituicaoSolicitanteId: string;
  responsavelInstitucional: string;
  origemId: string;
  destinoId: string;
  tipoCarga: CargoType;
  descricaoCarga: string;
  prioridade: PriorityLevel;
  pesoKg: number;
  dimensoesCm: {
    comprimento: number;
    largura: number;
    altura: number;
  };
  volumeEstimadoL: number;
  requerControleTermico: boolean;
  tempMinC?: number;
  tempMaxC?: number;
  requisitosConservacao: string;
  prazoDesejadoIso: string;
  observacoesOperacionais: string;
  confirmacaoDadosFicticios: boolean;
  status: RequestStatus;
  criadoEm: string;
  criadoPorId: string;
  missaoId?: string;
  justificativaTriagem?: string;
  complementacaoSolicitada?: string;
  elegivelLogisticaReversa?: boolean;
}

// 4. Missão
export interface Missao {
  id: string;
  codigo: string;
  solicitacaoPrincipalId: string;
  solicitacaoRetornoId?: string;
  estado: MissionState;
  estadoAnteriorContingencia?: MissionState;
  droneId?: string;
  pilotoResponsavelId?: string;
  operadorCentralId?: string;
  prioridade: PriorityLevel;
  criadoEm: string;
  atualizadoEm: string;
  encerradoEm?: string;
  aprovadaPorId?: string;
  aprovadaEm?: string;
  despachadaPorId?: string;
  despachadaEm?: string;
  climaSimulado: {
    condicao: WeatherCondition;
    ventoKmh: number;
    visibilidadeKm: number;
    temperaturaAmbienteC: number;
    simulado: true;
  };
  distanciaEstimadaKm: number;
  tempoEstimadoMin: number;
  custoEstimadoSimuladoBrl: number;
  trechoAtivoId?: string;
  retornoAvaliado: boolean;
  retornoTipoDecidido?: 'COM_CARGA' | 'VAZIO';
  retornoDecididoPorId?: string;
  retornoDecididoEm?: string;
  posOperacaoInspecaoId?: string;
  posOperacaoHigienizacaoId?: string;
  observacoesPlanejamento?: string;
  motivoCancelamentoOuRecusa?: string;
}

// 5. Trecho
export interface Trecho {
  id: string;
  codigo: string;
  missaoId: string;
  ordem: number;
  tipo: LegType;
  origemId: string;
  destinoId: string;
  cargaId?: string;
  estado: LegState;
  progressoPct: number;
  distanciaKm: number;
  tempoEstimadoMin: number;
  iniciadoEm?: string;
  chegadaEm?: string;
  concluidoEm?: string;
}

// 6. Carga
export interface Carga {
  id: string;
  codigo: string;
  solicitacaoId: string;
  missaoId: string;
  trechoId?: string;
  tipo: CargoType;
  descricao: string;
  pesoKg: number;
  dimensoesCm: {
    comprimento: number;
    largura: number;
    altura: number;
  };
  volumeEstimadoL: number;
  requerControleTermico: boolean;
  tempMinC?: number;
  tempMaxC?: number;
  requisitosConservacao: string;
  estado: CargoState;
  embalagem?: string;
  codigoLacre?: string;
  temperaturaInicialC?: number;
  temperaturaEntregaC?: number;
  documentacaoValidada: boolean;
  coletadaPorId?: string;
  coletadaEm?: string;
  conferidaPorId?: string;
  conferidaEm?: string;
  decisaoRecebimento?: 'ACEITA' | 'ACEITA_COM_RESSALVA' | 'RECUSADA';
  justificativaRecebimento?: string;
  integridadeEmbalagemEntrega?: 'INTEGRA' | 'AVARIA_LEVE' | 'VIOLADA';
  lacreConferidoEntrega?: boolean;
}

// 7. Drone
export interface Drone {
  id: string;
  codigo: string;
  modelo: string;
  estado: DroneState;
  capacidadePesoKg: number;
  capacidadeVolumeL: number;
  autonomiaKm: number;
  bateriaAtualPct: number;
  possuiCompartimentoTermico: boolean;
  faixaTermicaMinC: number;
  faixaTermicaMaxC: number;
  higienizacaoLiberada: boolean;
  ultimaInspecaoEm: string;
  ultimaHigienizacaoEm: string;
  horasVooSimuladas: number;
  localizacaoAtualId: string;
  observacoesTecnicas: string;
}

// 8. Evento (Immutable Audit Trail)
export interface Evento {
  id: string;
  entidade:
    | 'SOLICITACAO'
    | 'MISSAO'
    | 'TRECHO'
    | 'CARGA'
    | 'DRONE'
    | 'OCORRENCIA'
    | 'CUSTODIA'
    | 'CHECKLIST'
    | 'INSPECAO'
    | 'HIGIENIZACAO'
    | 'MANUTENCAO'
    | 'SISTEMA';
  entidadeId: string;
  missaoId?: string;
  estadoAnterior: string;
  novoEstado: string;
  dataHora: string;
  usuarioId: string;
  usuarioNome: string;
  usuarioPerfil: UserRole;
  justificativa: string;
  detalhes?: string;
}

// 9. Telemetria (Always marked simulated)
export interface Telemetria {
  id: string;
  missaoId: string;
  trechoId: string;
  droneId: string;
  dataHora: string;
  progressoPct: number;
  velocidadeKmh: number;
  altitudeM: number;
  bateriaPct: number;
  temperaturaCargaC: number;
  umidadePct: number;
  vibracaoG: number;
  ventoKmh: number;
  comunicacao: CommunicationStatus;
  simulado: true;
}

// 10. Ocorrência
export interface OcorrenciaHistoricoItem {
  id: string;
  dataHora: string;
  usuarioId: string;
  usuarioNome: string;
  statusAnterior: OccurrenceStatus;
  novoStatus: OccurrenceStatus;
  providencia: string;
}

export interface Ocorrencia {
  id: string;
  codigo: string;
  missaoId: string;
  trechoId?: string;
  gravidade: OccurrenceSeverity;
  status: OccurrenceStatus;
  tipoAlerta:
    | 'DESVIO_TERMICO'
    | 'BATERIA_BAIXA'
    | 'PERDA_COMUNICACAO'
    | 'VIBRACAO_ELEVADA'
    | 'VENTO_FORTE'
    | 'AVARIA_EMBALAGEM'
    | 'OPERACIONAL';
  titulo: string;
  descricao: string;
  leituraSensorSimulada: string;
  dataHoraAbertura: string;
  abertaPorId: string;
  abertaPorNome: string;
  responsavelId?: string;
  responsavelNome?: string;
  providenciaAtual?: string;
  justificativaEncerramento?: string;
  encerradaPorId?: string;
  encerradaPorNome?: string;
  dataHoraEncerramento?: string;
  historico: OcorrenciaHistoricoItem[];
}

// 11. Registro de custódia
export interface RegistroCustodia {
  id: string;
  codigo: string;
  cargaId: string;
  missaoId: string;
  trechoId: string;
  tipoTransferencia:
    | 'COLETA_ORIGEM'
    | 'ENTREGA_DESTINO'
    | 'COLETA_RETORNO'
    | 'ENTREGA_RETORNO'
    | 'DEVOLUCAO_RECUSA';
  deParte: string;
  paraParte: string;
  codigoLacre: string;
  condicaoEmbalagem: string;
  temperaturaRegistradaC?: number;
  dataHora: string;
  usuarioResponsavelId: string;
  usuarioResponsavelNome: string;
  observacoes: string;
}

// 12. Checklist
export interface ChecklistItem {
  id: string;
  label: string;
  categoria: 'AERONAVE' | 'CARGA' | 'ROTA_CLIMA' | 'DOCUMENTACAO';
  obrigatorio: boolean;
  verificado: boolean;
  verificadoPorId?: string;
  verificadoPorNome?: string;
  verificadoEm?: string;
}

export interface Checklist {
  id: string;
  missaoId: string;
  tipo: 'PRE_DESPACHO' | 'PRE_RETORNO';
  itens: ChecklistItem[];
  concluido: boolean;
  concluidoEm?: string;
}

// 13. Inspeção
export interface Inspecao {
  id: string;
  droneId: string;
  missaoId?: string;
  dataHora: string;
  responsavelId: string;
  responsavelNome: string;
  bateriaAvaliadaPct: number;
  integridadeCompartimentoOk: boolean;
  estruturaHelicesOk: boolean;
  sensoresSimuladosOk: boolean;
  aprovado: boolean;
  observacoes: string;
}

// 14. Higienização
export interface Higienizacao {
  id: string;
  droneId: string;
  missaoId?: string;
  dataHora: string;
  responsavelId: string;
  responsavelNome: string;
  protocoloAplicado: string;
  compartimentoTermicoHigienizado: boolean;
  liberadoParaReuso: boolean;
  observacoes: string;
}

// 15. Manutenção
export interface Manutencao {
  id: string;
  droneId: string;
  tipo: 'PREVENTIVA' | 'CORRETIVA';
  status: 'ABERTA' | 'CONCLUIDA';
  descricao: string;
  iniciadaEm: string;
  concluidaEm?: string;
  responsavelId: string;
  responsavelNome: string;
  parecerFinal?: string;
}

// 16. Indicador / Relatório
export interface IndicadorRelatorio {
  totalMissoes: number;
  missoesConcluidas: number;
  tempoMedioSolicitacaoEntregaMin: number;
  tempoMedioTransporteMin: number;
  entregasNoPrazoPct: number;
  conformidadeTermicaPct: number;
  taxaOcorrenciasPct: number;
  retornosComCarga: number;
  retornosElegiveis: number;
  aproveitamentoRetornoPct: number;
  utilizacaoFrotaPct: number;
  custoMedioSimuladoBrl: number;
  simulado: true;
}

// Deterministic Rule Engine Config
export interface RegrasConfig {
  bateriaMinimaDespachoPct: number;
  bateriaMinimaAlertaPct: number;
  ventoMaximoSimuladoKmh: number;
  margemAutonomiaSegurancaPct: number;
  vibracaoMaximaG: number;
  faixaTermicaPadraoMinC: number;
  faixaTermicaPadraoMaxC: number;
  distanciaMaximaDesvioRetornoKm: number;
}

export type CompatibilityClassification =
  | 'COMPATIVEL'
  | 'INCOMPATIVEL'
  | 'PENDENTE_VALIDACAO';

export interface CriterionEvaluation {
  criterio: string;
  status: 'OK' | 'ATENCAO' | 'BLOQUEIO';
  motivo: string;
}

export interface DroneCompatibilityResult {
  droneId: string;
  classificacao: CompatibilityClassification;
  criterios: CriterionEvaluation[];
  resumo: string;
}

export interface ReverseLogisticsEvaluation {
  solicitacaoId: string;
  classificacao: CompatibilityClassification;
  criterios: CriterionEvaluation[];
  resumo: string;
  requerHigienizacaoPrevio: boolean;
}

export interface AssistantRecommendation {
  id: string;
  nivel: 'INFO' | 'ATENCAO' | 'CRITICO' | 'BLOQUEIO';
  titulo: string;
  motivo: string;
  acaoSugerida?: string;
}

export interface AppState {
  schemaVersion: number;
  usuarioAtualId: string | null;
  modoInterface: 'PORTAL' | 'PAINEL';
  missaoAtivaId: string | null;
  usuarios: Usuario[];
  instituicoes: Instituicao[];
  solicitacoes: Solicitacao[];
  missoes: Missao[];
  trechos: Trecho[];
  cargas: Carga[];
  drones: Drone[];
  eventos: Evento[];
  telemetria: Telemetria[];
  ocorrencias: Ocorrencia[];
  custodias: RegistroCustodia[];
  checklists: Checklist[];
  inspecoes: Inspecao[];
  higienizacoes: Higienizacao[];
  manutencoes: Manutencao[];
  regrasConfig: RegrasConfig;
}
