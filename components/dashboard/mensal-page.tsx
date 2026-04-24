"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
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
  SummaryCard,
  getSimpleMonthlyInsight,
  shortMonthLabel
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
        const saldoData = data.evolucao_mensal.map((item) => ({
          mes: shortMonthLabel(item.mes),
          saldo: (item.entradas ?? 0) - item.saidas
        }));

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
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
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
                        stroke="#246bff"
                        strokeWidth={2}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="churn"
                        name="Churn %"
                        stroke="#fb7185"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#fb7185", stroke: "#061018", strokeWidth: 2 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </SummaryCard>

              <SummaryCard title="Saldo mensal" description="Mostra a diferença entre entradas e saídas em cada mês.">
                <div className="h-[380px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={saldoData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="saldo"
                        name="Saldo"
                        stroke="#246bff"
                        strokeWidth={3}
                        dot={{ r: 3, fill: "#246bff" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
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
