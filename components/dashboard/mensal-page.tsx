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
  ChurnByDimensionChart,
  CustomTooltip,
  EvolucaoTable,
  HealthByOriginChart,
  InsightChip,
  SummaryCard,
  getSimpleMonthlyInsight,
  shortMonthLabel,
} from "@/components/dashboard/dashboard-shared";
import { BaseClienteDetalhado, ClientesDashboardData, EvolucaoMensal } from "@/lib/types";
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

function parseMonthYear(value: string | null) {
  if (!value) return null;
  const match = value.match(/^(\d{2})\/(\d{2,4})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const rawYear = Number(match[2]);
  if (!month || month < 1 || month > 12) return null;
  const year = rawYear < 100 ? rawYear + 2000 : rawYear;
  return new Date(year, month - 1, 1);
}

function parseDatePt(value: string | null) {
  if (!value) return null;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
}

function resolveEntryDate(record: BaseClienteDetalhado) {
  return parseMonthYear(record.ma_entrada) || parseDatePt(record.data_inicio);
}

function buildMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function fullMonthLabel(date: Date) {
  return `${monthNames[date.getMonth()]}/${date.getFullYear()}`;
}

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function MensalPage() {
  return (
    <DashboardDataPage
      title="Evolução mensal"
      description="Acompanhe a entrada de clientes, a composição por origem e nicho e a evolução da base ao longo do tempo."
    >
      {(data) => <MensalContent data={data} />}
    </DashboardDataPage>
  );
}

function MensalContent({ data }: { data: ClientesDashboardData }) {
  const [selectedChartYear, setSelectedChartYear] = useState("");
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
    setSelectedChartYear((current) => (years.includes(current) ? current : years[0]));
  }, [years]);

  useEffect(() => {
    if (!monthsForYear.length) return;
    const monthExists = monthsForYear.some((item) => item.mesNome === selectedMonth);
    setSelectedMonth(monthExists || selectedMonth === "all" ? selectedMonth : "all");
  }, [monthsForYear, selectedMonth]);

  const chartYearRows = monthRows.filter((item) => item.ano === selectedChartYear);
  const lastTwelveRows = (chartYearRows.length ? chartYearRows : monthRows).slice(-12);
  const chartRows = lastTwelveRows.map((item) => ({
    ...item,
    axisLabel: shortMonthLabel(item.mesNome)
  }));
  const closedMonths = monthRows.filter((item) => !item.parcial && item.churn !== null);
  const lastClosed = closedMonths[closedMonths.length - 1];
  const averageEntries =
    monthRows.reduce((acc: number, item) => acc + (item.entradas ?? 0), 0) / Math.max(monthRows.length, 1);
  const latestEntries = lastClosed?.entradas ?? monthRows.at(-1)?.entradas ?? null;
  const baseClientes = data.base_clientes_detalhada ?? [];
  const activeWithStatus = baseClientes.filter((cliente) => cliente.ativo === "Sim" && cliente.status !== "sem_status");
  const healthByNicho = Array.from(
    activeWithStatus.reduce<Map<string, { nicho: string; bom: number; alerta: number; critico: number }>>((acc, record) => {
      const nicho = record.nicho || "Sem nicho";
      if (!acc.has(nicho)) {
        acc.set(nicho, { nicho, bom: 0, alerta: 0, critico: 0 });
      }
      const item = acc.get(nicho)!;
      if (record.status === "bom") item.bom += 1;
      if (record.status === "alerta") item.alerta += 1;
      if (record.status === "critico") item.critico += 1;
      return acc;
    }, new Map())
  )
    .map(([, value]) => value)
    .sort((a, b) => b.bom + b.alerta + b.critico - (a.bom + a.alerta + a.critico));
  const entriesByOrigin = useMemo(() => {
    const records = baseClientes
      .map((record) => ({
        ...record,
        entry: resolveEntryDate(record)
      }))
      .filter((record) => record.entry && record.origem);

    const topOrigins = Array.from(
      records.reduce((acc, record) => {
        const key = record.origem || "Sem origem";
        acc.set(key, (acc.get(key) ?? 0) + 1);
        return acc;
      }, new Map<string, number>())
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name]) => name);

    const months = Array.from(new Set(records.map((record) => buildMonthKey(record.entry!))))
      .sort()
      .filter((key) => key.startsWith(`${selectedChartYear || years[0]}`));

    return months.map((key) => {
      const year = Number(key.slice(0, 4));
      const month = Number(key.slice(5, 7));
      const date = new Date(year, month - 1, 1);
      const row: Record<string, any> = {
        mes: monthNames[date.getMonth()],
        tooltipLabel: fullMonthLabel(date)
      };

      topOrigins.forEach((origin) => {
        row[origin] = records.filter(
          (record) => buildMonthKey(record.entry!) === key && (record.origem || "Sem origem") === origin
        ).length;
      });

      return row;
    });
  }, [baseClientes, selectedChartYear, years]);

  const originPeak = useMemo(() => {
    const totals = new Map<string, number>();
    entriesByOrigin.forEach((row) => {
      Object.entries(row).forEach(([key, value]) => {
        if (key === "mes" || key === "tooltipLabel") return;
        totals.set(key, (totals.get(key) ?? 0) + Number(value));
      });
    });
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1])[0] ?? null;
  }, [entriesByOrigin]);

  return (
    <div className="space-y-8 pb-10">
      <div className="grid gap-3 md:grid-cols-3">
        <InsightChip
          label="Entradas médias"
          value={String(Math.round(averageEntries))}
          tone="blue"
          icon={BarChart3}
          tooltip="Média simples de entradas mensais da série disponível em evolução_mensal."
        />
        <InsightChip
          label="Último mês fechado"
          value={lastClosed ? `${lastClosed.mes} · ${latestEntries ?? "—"} entradas` : "—"}
          tone="green"
          icon={CalendarRange}
          tooltip="Mostra o último mês fechado da série e o volume de entradas registrado naquele período."
        />
        <InsightChip
          label="Base atual"
          value={String(data.evolucao_mensal.at(-1)?.base_inicio ?? data.clientes_ativos)}
          tone="blue"
          icon={Users}
          tooltip="Quantidade de clientes ativos na base mais recente da série mensal derivada da BASE_CLIENTES."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <SummaryCard
          title="Base e churn dos últimos 12 meses"
          description="Mostra o tamanho da base e o churn ao longo dos últimos 12 meses."
          actions={
            <select
              value={selectedChartYear}
              onChange={(event) => setSelectedChartYear(event.target.value)}
              className="theme-soft-surface theme-text h-10 rounded-full border px-4 text-sm outline-none"
            >
              {years.map((year) => (
                <option key={`chart-${year}`} value={year} style={{ background: "var(--surface)", color: "var(--text-color)" }}>
                  {year}
                </option>
              ))}
            </select>
          }
        >
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

        <SummaryCard title="Entrada de clientes por origem" description="Mostra, mês a mês, quais canais de origem trouxeram mais clientes para dentro da empresa.">
          <div className="space-y-4">
            <ChurnByDimensionChart data={entriesByOrigin} palette={["#1a68ff", "#4b8dff", "#7ab0ff", "#c9cfe5"]} />
            <div className="theme-strong-surface rounded-[18px] border p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-primary">Leitura rápida</p>
              <p className="theme-text mt-2 text-sm leading-6">
                {originPeak
                  ? `${originPeak[0]} lidera as entradas do período exibido com ${originPeak[1]} clientes trazidos para a base.`
                  : "Ainda não há entradas suficientes para identificar a origem dominante do período."}
              </p>
            </div>
          </div>
        </SummaryCard>
      </div>

      <SummaryCard
        title="Status dos clientes ativos por nicho"
        description="Análise da qualidade dos clientes ativos por nicho, separando quem está bem, em alerta e em situação crítica."
      >
        <HealthByOriginChart data={healthByNicho} labelKey="nicho" />
      </SummaryCard>

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
