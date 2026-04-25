"use client";

import type { Route } from "next";
import { AlertTriangle, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { DashboardDataPage } from "@/components/dashboard/dashboard-shell";
import {
  GestorCrossMetricSummary,
  HealthDonut,
  InsightChip,
  MetricCard,
  OrigemMixCard,
  SummaryCard,
  statusColors
} from "@/components/dashboard/dashboard-shared";
import { formatMonths, formatPercent, formatSignedPercent } from "@/lib/utils";

export function DashboardPage() {
  return (
    <DashboardDataPage
      title="Visão geral"
      description="Resumo da saúde da carteira, retenção e churn."
    >
      {(data) => {
        const healthPieData = [
          { name: "Bom", value: data.clientes_bons, percent: data.perc_bons, color: statusColors.bom },
          { name: "Alerta", value: data.clientes_alerta, percent: data.perc_alerta, color: statusColors.alerta },
          { name: "Crítico", value: data.clientes_critico, percent: data.perc_critico, color: statusColors.critico }
        ];
        const origemPalette = ["var(--primary-color)", "#64a7fe", "#c9cfe5", "#a8b2d2"];
        const origemSource = data.base_clientes_detalhada?.filter((cliente) => cliente.ativo === "Sim") ?? data.clientes_detalhados ?? [];
        const origemCounts = origemSource.reduce<Record<string, number>>((acc, cliente) => {
          const origem = (cliente.origem ?? "Sem origem").trim() || "Sem origem";
          acc[origem] = (acc[origem] ?? 0) + 1;
          return acc;
        }, {});
        const origemData = Object.entries(origemCounts)
          .map(([name, value], index) => ({
            name,
            value,
            percent: data.clientes_ativos ? (value / data.clientes_ativos) * 100 : 0,
            color: origemPalette[index % origemPalette.length]
          }))
          .sort((a, b) => b.value - a.value);

        return (
          <div className="space-y-8 pb-10">
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <SummaryCard title="Resumo da carteira">
                <div>
                  <div className="flex items-end gap-3">
                    <span className="theme-text text-[55px] font-semibold leading-none tracking-[-0.06em]">{data.clientes_ativos}</span>
                    <span className="theme-muted pb-2 text-lg">clientes ativos</span>
                  </div>
                  <p className="theme-muted mt-4 max-w-2xl text-sm leading-7">
                    {data.clientes_bons} clientes estão bem, {data.clientes_alerta} pedem atenção e {data.clientes_critico} estão em situação crítica.
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <InsightChip
                      label="Taxa de sucesso"
                      value={formatPercent(data.taxa_sucesso)}
                      tone="green"
                      tooltip="Percentual de clientes em status Bom dentro da base ativa com STATUS CLIENTE preenchido. Cálculo: clientes_bons / clientes_ativos."
                    />
                    <InsightChip
                      label="LTV médio"
                      value={`${formatMonths(data.ltv_medio)} meses`}
                      tone="blue"
                      tooltip="Tempo médio de permanência da base ativa. Usa PERÍODO quando existe; se não, calcula pela diferença entre DATA PLANEJAMENTO e SAÍDA CLIENTE ou a data atual."
                    />
                    <InsightChip
                      label="Variação da base"
                      value={formatSignedPercent(data.variacao_base)}
                      tone={data.variacao_base >= 0 ? "blue" : "yellow"}
                      tooltip="Compara a base ativa atual com a base de início do mês mais recente da série mensal. Cálculo: (clientes_ativos - base_mes_recente) / base_mes_recente."
                    />
                  </div>
                </div>
              </SummaryCard>

              <SummaryCard
                title="Status dos clientes ativos"
                description="Distribui a base entre clientes bons, em alerta e críticos."
              >
                <HealthDonut data={healthPieData} />
              </SummaryCard>
            </div>

            <div className="grid gap-4 xl:grid-cols-4">
              <MetricCard
                title="Clientes ativos"
                value={data.clientes_ativos}
                description="Base completa dos clientes ativos."
                badge={`${formatSignedPercent(data.variacao_base)} vs. referência`}
                icon={Users}
                tone="blue"
                href={"/clientes/ativos" as Route}
              />
              <MetricCard
                title="Clientes bons"
                value={data.clientes_bons}
                description="Clientes em situação estável."
                badge={`${formatPercent(data.perc_bons)} da base`}
                icon={ShieldCheck}
                tone="green"
                href={"/clientes/bons" as Route}
              />
              <MetricCard
                title="Sinal de alerta"
                value={data.clientes_alerta}
                description="Clientes que pedem atenção."
                badge={`${formatPercent(data.perc_alerta)} da base`}
                icon={AlertTriangle}
                tone="yellow"
                href={"/clientes/alerta" as Route}
              />
              <MetricCard
                title="Situação crítica"
                value={data.clientes_critico}
                description="Clientes com maior risco de saída."
                badge={`${formatPercent(data.perc_critico)} da base`}
                icon={ShieldAlert}
                tone="red"
                href={"/clientes/critico" as Route}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <SummaryCard title="Métricas cruzadas por gestor" description="Cruza taxa de sucesso e LTV médio por mês das carteiras por gestor.">
                <GestorCrossMetricSummary gestores={data.por_gestor} />
              </SummaryCard>

              <SummaryCard title="Origem dos Clientes" description="Mostra de qual empresa veio cada cliente ativo da base atual.">
                <OrigemMixCard data={origemData} />
              </SummaryCard>
            </div>
          </div>
        );
      }}
    </DashboardDataPage>
  );
}
