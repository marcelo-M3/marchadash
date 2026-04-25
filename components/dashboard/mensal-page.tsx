"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { DashboardDataPage } from "@/components/dashboard/dashboard-shell";
import {
  CustomTooltip,
  EvolucaoTable,
  InsightChip,
  OrigemMixCard,
  SummaryCard,
  getSimpleMonthlyInsight,
} from "@/components/dashboard/dashboard-shared";
import { formatPercent } from "@/lib/utils";

export function MensalPage() {
  return (
    <DashboardDataPage
      title="Evolução mensal"
      description="Acompanhe a base, o churn e a variação mensal da carteira."
    >
      {(data) => {
        const closedMonths = data.evolucao_mensal.filter((item) => !item.parcial && item.churn !== null);
        const lastClosed = closedMonths[closedMonths.length - 1];
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
            <div className="grid gap-3 md:grid-cols-3">
              <InsightChip label="Churn médio" value={formatPercent(data.churn_medio)} tone="yellow" />
              <InsightChip
                label="Último mês fechado"
                value={lastClosed ? `${lastClosed.mes} · ${formatPercent(lastClosed.churn)}` : "—"}
                tone="blue"
              />
              <InsightChip
                label="Base atual"
                value={String(data.evolucao_mensal.at(-1)?.base_inicio ?? data.clientes_ativos)}
              />
            </div>

            <div className="grid gap-4 2xl:grid-cols-[1.2fr_0.8fr]">
              <SummaryCard title="Base e churn por mês" description="Mostra o tamanho da base e o churn ao longo do tempo.">
                <div className="h-[380px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.evolucao_mensal} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="monthlyBase" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary-color)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--primary-color)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
                      <YAxis
                        yAxisId="left"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--muted-color)", fontSize: 12 }}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--muted-color)", fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="base_inicio"
                        name="Base"
                        fill="url(#monthlyBase)"
                        stroke="var(--primary-color)"
                        strokeWidth={2}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="churn"
                        name="Churn %"
                        stroke="var(--danger-color)"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "var(--danger-color)", stroke: "var(--surface)", strokeWidth: 2 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </SummaryCard>

              <SummaryCard title="Origem da carteira" description="Mostra de qual empresa veio cada cliente ativo da base atual.">
                <OrigemMixCard data={origemData} />
              </SummaryCard>
            </div>

            <EvolucaoTable
              data={data}
              footer={
                <div className="theme-strong-surface rounded-[18px] border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-primary">Leitura rápida</p>
                  <p className="theme-text mt-2 text-sm leading-6">
                    {getSimpleMonthlyInsight(data.evolucao_mensal)}
                  </p>
                </div>
              }
            />
          </div>
        );
      }}
    </DashboardDataPage>
  );
}
