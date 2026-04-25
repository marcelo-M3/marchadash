"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarRange, Users } from "lucide-react";
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
  shortMonthLabel,
} from "@/components/dashboard/dashboard-shared";
import { ClientesDashboardData, EvolucaoMensal } from "@/lib/types";
import { formatPercent } from "@/lib/utils";

function parseEvolutionMonth(label: string) {
  const [mes, ano] = label.split("/");
  return {
    mes: mes ?? label,
    ano: ano ?? ""
  };
}

type MonthlyRow = EvolucaoMensal & {
  mesNome: string;
  ano: string;
  tooltipLabel: string;
};

export function MensalPage() {
  return (
    <DashboardDataPage
      title="Evolução mensal"
      description="Acompanhe a base, o churn e a variação mensal da carteira."
    >
      {(data) => <MensalContent data={data} />}
    </DashboardDataPage>
  );
}

function MensalContent({ data }: { data: ClientesDashboardData }) {
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const monthRows = useMemo<MonthlyRow[]>(
    () =>
      data.evolucao_mensal.map((item) => {
        const parsed = parseEvolutionMonth(item.mes);
        return {
          ...item,
          mesNome: parsed.mes,
          ano: parsed.ano,
          tooltipLabel: item.mes
        };
      }),
    [data.evolucao_mensal]
  );
  const years = useMemo<string[]>(
    () =>
      (Array.from(new Set(monthRows.map((item) => item.ano).filter(Boolean))) as string[]).sort((a, b) =>
        b.localeCompare(a)
      ),
    [monthRows]
  );
  const monthsForYear = useMemo<MonthlyRow[]>(
    () => monthRows.filter((item) => item.ano === selectedYear),
    [monthRows, selectedYear]
  );
  const filteredRows = useMemo<MonthlyRow[]>(
    () =>
      monthsForYear.filter((item) =>
        selectedMonth === "all" ? true : item.mesNome === selectedMonth
      ),
    [monthsForYear, selectedMonth]
  );

  useEffect(() => {
    if (!years.length) return;
    setSelectedYear((current) => (years.includes(current) ? current : years[0]));
  }, [years]);

  useEffect(() => {
    if (!monthsForYear.length) return;
    const monthExists = monthsForYear.some((item) => item.mesNome === selectedMonth);
    setSelectedMonth(monthExists || selectedMonth === "all" ? selectedMonth : "all");
  }, [monthsForYear, selectedMonth]);

  const lastTwelveRows = monthRows.slice(-12);
  const chartRows = lastTwelveRows.map((item) => ({
    ...item,
    axisLabel: shortMonthLabel(item.mesNome)
  }));
  const closedMonths = monthRows.filter((item) => !item.parcial && item.churn !== null);
  const lastClosed = closedMonths[closedMonths.length - 1];
  const averageChurn =
    closedMonths.reduce((acc: number, item) => acc + (item.churn ?? 0), 0) / Math.max(closedMonths.length, 1);
  const origemPalette = ["var(--primary-color)", "var(--success-color)", "var(--warning-color)", "var(--danger-color)"];
  const origemCounts = (data.clientes_detalhados ?? []).reduce<Record<string, number>>(
    (acc, cliente) => {
      const origem = (cliente.origem ?? "Sem origem").trim() || "Sem origem";
      acc[origem] = (acc[origem] ?? 0) + 1;
      return acc;
    },
    {}
  );
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
        <InsightChip label="Churn médio" value={formatPercent(averageChurn)} tone="red" icon={BarChart3} />
        <InsightChip
          label="Último mês fechado"
          value={lastClosed ? `${lastClosed.mes} · ${formatPercent(lastClosed.churn)}` : "—"}
          tone="green"
          icon={CalendarRange}
        />
        <InsightChip
          label="Base atual"
          value={String(data.evolucao_mensal.at(-1)?.base_inicio ?? data.clientes_ativos)}
          tone="blue"
          icon={Users}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <SummaryCard title="Base e churn dos últimos 12 meses" description="Mostra o tamanho da base e o churn ao longo dos últimos 12 meses.">
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="monthlyBase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary-color)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--primary-color)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="axisLabel" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
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

        <SummaryCard title="Origem dos Clientes" description="Mostra de qual empresa veio cada cliente ativo da base atual.">
          <OrigemMixCard data={origemData} />
        </SummaryCard>
      </div>

      <SummaryCard
        title="Filtro da evolução"
        description="Selecione o ano e, se quiser, um mês específico para analisar só o detalhamento mensal."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="theme-muted text-xs uppercase tracking-[0.18em]">Ano</span>
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              className="theme-surface theme-text h-11 w-full rounded-[14px] border px-4 text-sm outline-none transition focus:border-primary/60"
            >
              {years.map((year) => (
                <option key={year} value={year} style={{ background: "var(--surface)", color: "var(--text-color)" }}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="theme-muted text-xs uppercase tracking-[0.18em]">Mês</span>
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="theme-surface theme-text h-11 w-full rounded-[14px] border px-4 text-sm outline-none transition focus:border-primary/60"
            >
              <option value="all" style={{ background: "var(--surface)", color: "var(--text-color)" }}>
                Todos os meses
              </option>
              {monthsForYear.map((item) => (
                <option
                  key={`${item.ano}-${item.mesNome}`}
                  value={item.mesNome}
                  style={{ background: "var(--surface)", color: "var(--text-color)" }}
                >
                  {item.mesNome}
                </option>
              ))}
            </select>
          </label>
        </div>
      </SummaryCard>

      <EvolucaoTable
        rows={filteredRows}
        footer={
          <div className="theme-strong-surface rounded-[18px] border p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-primary">Leitura rápida</p>
            <p className="theme-text mt-2 text-sm leading-6">
              {getSimpleMonthlyInsight(filteredRows)}
            </p>
          </div>
        }
      />
    </div>
  );
}
