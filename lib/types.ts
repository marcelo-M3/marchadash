export type GestorMetric = {
  nome: string;
  ativos?: number;
  clientes_com_status?: number;
  bons: number;
  alerta: number;
  critico: number;
  taxa_sucesso: number;
  ltv_medio: number;
  score_composto?: number;
};

export type EvolucaoMensal = {
  mes: string;
  base_inicio: number;
  entradas: number | null;
  saidas: number;
  churn: number | null;
  parcial: boolean;
};

export type SaidasPorMes = {
  mes: string;
  churn: number | null;
  parcial: boolean;
  clientes: string[];
};

export type ClienteDetalhado = {
  nome: string;
  gestor: string;
  origem: string | null;
  status: "bom" | "alerta" | "critico";
  status_label: string;
  data_inicio: string | null;
  ltv_meses: number | null;
};

export type BaseClienteDetalhado = {
  nome: string;
  ativo: string;
  gestor: string;
  origem: string | null;
  nicho: string | null;
  status: "bom" | "alerta" | "critico" | "sem_status";
  status_label: string | null;
  data_inicio: string | null;
  data_saida: string | null;
  ma_entrada: string | null;
  ma_saida: string | null;
  ltv_meses: number | null;
  motivo_saida: string | null;
};

export type ClientesDashboardData = {
  atualizado_em: string;
  clientes_ativos: number;
  clientes_bons: number;
  clientes_alerta: number;
  clientes_critico: number;
  perc_bons: number;
  perc_alerta: number;
  perc_critico: number;
  ltv_medio: number;
  ltv_mediana: number;
  taxa_sucesso: number;
  churn_medio: number;
  variacao_base: number;
  por_gestor: GestorMetric[];
  evolucao_mensal: EvolucaoMensal[];
  saidas_por_mes: SaidasPorMes[];
  clientes_detalhados?: ClienteDetalhado[];
  base_clientes_detalhada?: BaseClienteDetalhado[];
};
