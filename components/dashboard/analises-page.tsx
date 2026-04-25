"use client";

import { useMemo } from "react";
import { DashboardDataPage } from "@/components/dashboard/dashboard-shell";
import {
  buildGestorMetricsFromBase,
  GestorMatrixChart,
  HealthByOriginChart,
  LtvDistributionChart,
  SummaryCard
} from "@/components/dashboard/dashboard-shared";
import type { BaseClienteDetalhado, ClientesDashboardData } from "@/lib/types";

export function AnalisesPage() {
  return (
    <DashboardDataPage
      title="Análises avançadas"
      description="Modelos avançados de LTV, saúde e performance derivados da BASE_CLIENTES."
    >
      {(data) => <AnalisesContent data={data} />}
    </DashboardDataPage>
  );
}

function AnalisesContent({ data }: { data: ClientesDashboardData }) {
  const base = data.base_clientes_detalhada ?? [];

  const prepared = useMemo(() => base.filter((record) => record.ativo === "Sim" || record.ativo !== ""), [base]);

  const ltvDistribution = useMemo(() => {
    const bins = [
      { faixa: "0–3", min: 0, max: 3 },
      { faixa: "4–6", min: 4, max: 6 },
      { faixa: "7–12", min: 7, max: 12 },
      { faixa: "13–18", min: 13, max: 18 },
      { faixa: "19+", min: 19, max: Number.POSITIVE_INFINITY }
    ];
    return bins.map((bin) => ({
      faixa: bin.faixa,
      quantidade: prepared.filter((record) => {
        const ltv = record.ltv_meses ?? 0;
        return ltv >= bin.min && ltv <= bin.max;
      }).length
    }));
  }, [prepared]);

  const healthByOrigin = useMemo(() => {
    const grouped = new Map<string, { origem: string; bom: number; alerta: number; critico: number }>();
    prepared
      .filter((record) => record.ativo === "Sim")
      .forEach((record) => {
        const origem = record.origem || "Sem origem";
        if (!grouped.has(origem)) {
          grouped.set(origem, { origem, bom: 0, alerta: 0, critico: 0 });
        }
        const item = grouped.get(origem)!;
        if (record.status === "bom") item.bom += 1;
        if (record.status === "alerta") item.alerta += 1;
        if (record.status === "critico") item.critico += 1;
      });

    return Array.from(grouped.values()).sort((a, b) => b.bom + b.alerta + b.critico - (a.bom + a.alerta + a.critico));
  }, [prepared]);

  const gestorMatrix = useMemo(() => {
    const gestores = buildGestorMetricsFromBase(prepared as BaseClienteDetalhado[]);
    return gestores.map((gestor) => ({
      gestor: gestor.nome,
      carteira: gestor.ativos,
      taxa_sucesso: Number(gestor.taxa_sucesso.toFixed(1)),
      ltv_medio: Number(gestor.ltv_medio.toFixed(1)),
      color:
        gestor.taxa_sucesso >= 65
          ? "var(--success-color)"
          : gestor.taxa_sucesso >= 45
            ? "var(--warning-color)"
            : "var(--danger-color)"
    }));
  }, [prepared]);

  const missingData = !data.base_clientes_detalhada?.length;

  return (
    <div className="space-y-8 pb-10">
      {missingData ? (
        <SummaryCard
          title="Republie o Apps Script"
          description="Para liberar estas análises, publique a versão do Apps Script que inclui base_clientes_detalhada no payload."
        >
          <p className="theme-muted text-sm">
            A página já está pronta no frontend, mas depende do campo `base_clientes_detalhada` para montar distribuição de LTV, saúde por origem e matriz de performance.
          </p>
        </SummaryCard>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <SummaryCard title="Distribuição de LTV" description="Mostra como a carteira se distribui entre faixas de permanência.">
          <LtvDistributionChart data={ltvDistribution} />
        </SummaryCard>
        <SummaryCard title="Saúde por origem de cliente" description="Cruza qualidade da carteira com a empresa de origem do lead.">
          <HealthByOriginChart data={healthByOrigin} />
        </SummaryCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-1">
        <SummaryCard title="Matriz de performance por gestor" description="Cruza tamanho da carteira, taxa de sucesso e LTV médio por mês em uma única leitura.">
          <GestorMatrixChart data={gestorMatrix} />
        </SummaryCard>
      </div>
    </div>
  );
}
