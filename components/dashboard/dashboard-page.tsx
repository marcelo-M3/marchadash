"use client";

import type { Route } from "next";
import { Activity, AlertTriangle, ArrowUpDown, Clock3, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { DashboardDataPage } from "@/components/dashboard/dashboard-shell";
import {
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
          { name: "Bons", value: data.clientes_bons, color: statusColors.bons },
          { name: "Alerta", value: data.clientes_alerta, color: statusColors.alerta },
          { name: "Crítico", value: data.clientes_critico, color: statusColors.critico }
        ];
        const origemPalette = ["var(--primary-color)", "var(--success-color)", "var(--warning-color)", "var(--danger-color)"];
        const origemCounts = (data.clientes_detalhados ?? []).reduce<Record<string, number>>((acc, cliente) => {
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
            <SummaryCard title="Resumo da carteira">
              <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                <div>
                  <div className="flex items-end gap-3">
                    <span className="theme-text text-6xl font-semibold tracking-[-0.06em]">{data.clientes_ativos}</span>
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
                      icon={Activity}
                    />
                    <InsightChip
                      label="LTV médio"
                      value={`${formatMonths(data.ltv_medio)} meses`}
                      tone="blue"
                      icon={Clock3}
                    />
                    <InsightChip
                      label="Variação da base"
                      value={formatSignedPercent(data.variacao_base)}
                      tone={data.variacao_base >= 0 ? "blue" : "yellow"}
                      icon={ArrowUpDown}
                    />
                  </div>
                </div>
                <HealthDonut data={healthPieData} />
              </div>
            </SummaryCard>

            <div className="grid gap-4 xl:grid-cols-4">
              <MetricCard
                title="Clientes ativos"
                value={data.clientes_ativos}
                description="Base usada para calcular as métricas."
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
              <SummaryCard title="LTV médio e mediana" description="Tempo médio e ponto central de permanência da carteira.">
                <div className="flex items-end gap-3">
                  <div className="metric-number font-bold text-primary">{formatMonths(data.ltv_medio)}</div>
                  <span className="theme-muted pb-1 text-lg font-medium">meses</span>
                </div>
                <div className="theme-soft-surface mt-5 rounded-[20px] border p-4">
                  <p className="theme-muted text-xs uppercase tracking-[0.2em]">Mediana</p>
                  <p className="theme-text mt-2 text-2xl font-semibold">{formatMonths(data.ltv_mediana)} meses</p>
                </div>
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
