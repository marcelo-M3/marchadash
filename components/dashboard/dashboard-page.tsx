"use client";

import { AlertTriangle, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import {
  Area,
  AreaChart,
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
  HealthDonut,
  InsightChip,
  MetricCard,
  SummaryCard,
  shortMonthLabel,
  statusColors
} from "@/components/dashboard/dashboard-shared";
import { formatMonths, formatPercent, formatSignedPercent, getChurnColor } from "@/lib/utils";

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

        const momentumData = data.evolucao_mensal.map((item) => ({
          mes: shortMonthLabel(item.mes),
          churn: item.churn ?? 0,
          base: item.base_inicio,
          saldo: (item.entradas ?? 0) - item.saidas
        }));

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
                    <InsightChip label="Taxa de sucesso" value={formatPercent(data.taxa_sucesso)} tone="green" />
                    <InsightChip label="LTV médio" value={`${formatMonths(data.ltv_medio)} meses`} tone="blue" />
                    <InsightChip
                      label="Variação da base"
                      value={formatSignedPercent(data.variacao_base)}
                      tone={data.variacao_base >= 0 ? "blue" : "yellow"}
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
              />
              <MetricCard
                title="Clientes bons"
                value={data.clientes_bons}
                description="Clientes em situação estável."
                badge={`${formatPercent(data.perc_bons)} da base`}
                icon={ShieldCheck}
                tone="green"
              />
              <MetricCard
                title="Sinal de alerta"
                value={data.clientes_alerta}
                description="Clientes que pedem atenção."
                badge={`${formatPercent(data.perc_alerta)} da base`}
                icon={AlertTriangle}
                tone="yellow"
              />
              <MetricCard
                title="Situação crítica"
                value={data.clientes_critico}
                description="Clientes com maior risco de saída."
                badge={`${formatPercent(data.perc_critico)} da base`}
                icon={ShieldAlert}
                tone="red"
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
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

              <SummaryCard title="Base e churn" description="Mostra a base e o churn ao longo dos meses.">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={momentumData} margin={{ top: 0, right: 0, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="overviewBase" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.34} />
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="base" stroke="#246bff" strokeWidth={2.5} fill="url(#overviewBase)" name="Base" />
                      <Line type="monotone" dataKey="churn" stroke="#ef4444" strokeWidth={2.5} dot={false} name="Churn %" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </SummaryCard>

              <SummaryCard title="Saldo mensal" description="Mostra a diferença entre entradas e saídas de cada mês.">
                <div className="h-[170px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={momentumData} margin={{ top: 0, right: 0, left: -16, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="saldo"
                        stroke="#246bff"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#246bff" }}
                        name="Saldo"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="theme-soft-surface mt-4 rounded-[18px] border p-4">
                  <div className="flex items-center justify-between">
                    <span className="theme-muted text-sm">Churn médio</span>
                    <span className={getChurnColor(data.churn_medio)}>{formatPercent(data.churn_medio)}</span>
                  </div>
                </div>
              </SummaryCard>
            </div>
          </div>
        );
      }}
    </DashboardDataPage>
  );
}
