"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Pie,
  PieChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ArrowUpRight, CircleAlert } from "lucide-react";
import { ClientesDashboardData, EvolucaoMensal, GestorMetric, SaidasPorMes } from "@/lib/types";
import { cn, formatPercent, getChurnColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const statusColors = {
  bons: "var(--success-color)",
  alerta: "var(--warning-color)",
  critico: "var(--danger-color)"
};

const healthGradient = {
  blue: "from-sky-400/25 via-blue-400/10 to-transparent",
  green: "from-emerald-400/25 via-emerald-300/10 to-transparent",
  yellow: "from-amber-400/25 via-yellow-300/10 to-transparent",
  red: "from-rose-400/25 via-red-300/10 to-transparent"
};

export function shortMonthLabel(month: string) {
  const base = month.split("/")[0];
  return base.slice(0, 3);
}

export function getChurnTone(value: number | null | undefined): "green" | "yellow" | "red" | "gray" {
  if (value === null || value === undefined || Number.isNaN(value)) return "gray";
  if (value < 8) return "green";
  if (value <= 12) return "yellow";
  return "red";
}

export function getSimpleMonthlyInsight(data: EvolucaoMensal[]) {
  const closedMonths = data.filter((item) => !item.parcial && item.churn !== null);
  if (!closedMonths.length) {
    return "Ainda não há meses fechados suficientes para analisar a tendência.";
  }

  const worst = closedMonths.reduce((current, item) =>
    (item.churn ?? 0) > (current.churn ?? 0) ? item : current
  );
  const latest = closedMonths[closedMonths.length - 1];
  const previous = closedMonths[closedMonths.length - 2];

  if (!previous || previous.churn === null || latest.churn === null) {
    return `${worst.mes} teve o maior churn até agora: ${formatPercent(worst.churn)}.`;
  }

  if (latest.churn < previous.churn) {
    return `${worst.mes} foi o pior mês. ${latest.mes} melhorou em relação a ${previous.mes}.`;
  }

  if (latest.churn > previous.churn) {
    return `${worst.mes} foi o pior mês. ${latest.mes} piorou em relação a ${previous.mes}.`;
  }

  return `${worst.mes} teve o maior churn até agora: ${formatPercent(worst.churn)}.`;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-4 h-24 w-full" />
      </Card>
      <div className="grid gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="mt-6 h-12 w-28" />
            <Skeleton className="mt-4 h-4 w-40" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 2xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index} className="p-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-5 h-72 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}

export function DashboardErrorState({
  message,
  onRetry
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card className="flex min-h-[360px] flex-col items-center justify-center gap-5 p-10 text-center">
      <div className="rounded-full border border-rose-400/20 bg-rose-500/12 p-4 text-rose-300">
        <CircleAlert className="h-7 w-7" />
      </div>
      <div className="space-y-2">
        <h2 className="theme-text text-xl font-semibold">Falha ao carregar o dashboard</h2>
        <p className="theme-muted max-w-xl text-sm leading-6">{message}</p>
      </div>
      <Button onClick={onRetry}>Tentar novamente</Button>
    </Card>
  );
}

export function CustomTooltip({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string; payload?: { tooltipLabel?: string } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const tooltipLabel = payload[0]?.payload?.tooltipLabel ?? label;

  return (
    <div className="theme-surface rounded-[18px] border p-3">
      <p className="theme-text mb-2 text-sm font-semibold">{tooltipLabel}</p>
      <div className="space-y-1.5">
        {payload.map((item) => (
          <div key={`${item.name}-${item.value}`} className="flex items-center justify-between gap-8 text-xs">
            <span className="theme-muted flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color ?? "#93c5fd" }}
              />
              {item.name}
            </span>
            <span className="theme-text font-semibold">
              {item.name.toLowerCase().includes("churn") || item.name.includes("%")
                ? formatPercent(item.value)
                : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InsightChip({
  label,
  value,
  tone = "default",
  icon: Icon
}: {
  label: string;
  value: string;
  tone?: "default" | "blue" | "green" | "yellow" | "red";
  icon?: LucideIcon;
}) {
  const toneClasses = {
    default: "theme-surface theme-text",
    blue: "chip-blue",
    green: "chip-green",
    yellow: "chip-yellow",
    red: "chip-red"
  } as const;

  const iconColors = {
    default: "var(--muted-color)",
    blue: "var(--primary-color)",
    green: "var(--success-color)",
    yellow: "var(--warning-color)",
    red: "var(--danger-color)"
  } as const;

  return (
    <div
      className={cn(
        "relative flex min-h-[152px] flex-col justify-between overflow-hidden rounded-[24px] border px-6 py-5",
        toneClasses[tone]
      )}
    >
      {Icon ? (
        <Icon
          className="pointer-events-none absolute right-5 top-5 h-16 w-16"
          style={{ color: iconColors[tone], opacity: 0.18 }}
        />
      ) : null}
      <p
        className={cn(
          "max-w-[16rem] text-[12px] font-medium uppercase tracking-[0.18em]",
          tone === "default" || tone === "blue" ? "theme-text" : "text-inherit"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "relative z-10 mt-8 max-w-[18rem] pr-10 text-[clamp(2rem,2.5vw,2.8rem)] font-semibold leading-tight tracking-[-0.04em]",
          tone === "default" || tone === "blue" ? "theme-text" : "text-inherit"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function MetricCard({
  title,
  value,
  description,
  badge,
  icon: Icon,
  tone,
  href
}: {
  title: string;
  value: number;
  description: string;
  badge: string;
  icon: LucideIcon;
  tone: keyof typeof healthGradient;
  href?: Route;
}) {
  const toneClasses = {
    blue: "text-primary",
    green: "text-success",
    yellow: "text-warning",
    red: "text-danger"
  } as const;

  const badgeTone = {
    blue: "blue",
    green: "green",
    yellow: "yellow",
    red: "red"
  } as const;

  const iconColors = {
    blue: "var(--primary-color)",
    green: "var(--success-color)",
    yellow: "var(--warning-color)",
    red: "var(--danger-color)"
  } as const;

  const cardTone = {
    blue: "border-[#2d5eff]/25 bg-[#1d2740]",
    green: "border-[#2d7a43]/35 bg-[#1a2624]",
    yellow: "border-[#8e6420]/45 bg-[#2a2924]",
    red: "border-[#6a2835]/45 bg-[#26212a]"
  } as const;

  const card = (
    <Card
      className={cn(
        "relative overflow-hidden p-6 transition duration-200",
        cardTone[tone],
        href ? "hover:-translate-y-0.5 hover:border-primary/30" : ""
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", healthGradient[tone])} />
      <Icon
        className="pointer-events-none absolute right-5 top-6 h-20 w-20"
        style={{ color: iconColors[tone], opacity: 0.2 }}
      />
      <div className="relative">
        <CardHeader className="pr-16">
          <div>
            <p className="theme-muted text-[12px] font-medium uppercase tracking-[0.18em]">{title}</p>
          </div>
        </CardHeader>
        <CardContent className="mt-6 space-y-3">
          <div className={cn("metric-number font-bold", toneClasses[tone])}>{value}</div>
          <p className="theme-muted max-w-[18rem] text-sm">{description}</p>
          <Badge tone={badgeTone[tone]} className="w-fit">
            <ArrowUpRight className="h-3 w-3" />
            {badge}
          </Badge>
        </CardContent>
      </div>
    </Card>
  );

  if (!href) {
    return card;
  }

  return (
    <Link href={href} className="block focus-visible:outline-none">
      {card}
    </Link>
  );
}

export function HealthDonut({
  data
}: {
  data: Array<{ name: string; value: number; color: string }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[180px_1fr] sm:items-center">
      <div className="mx-auto h-[180px] w-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={54}
              outerRadius={76}
              stroke="transparent"
              paddingAngle={3}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.name} className="theme-soft-surface rounded-[18px] border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="theme-text text-sm font-medium">{item.name}</span>
              </div>
              <span className="theme-muted text-sm">{item.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrigemMixCard({
  data
}: {
  data: Array<{ name: string; value: number; percent: number; color: string }>;
}) {
  if (!data.length) {
    return (
      <div className="theme-soft-surface rounded-[20px] border p-5">
        <p className="theme-muted text-sm">Nenhuma origem disponível para a base atual.</p>
      </div>
    );
  }

  var total = data.reduce(function (acc, item) {
    return acc + item.value;
  }, 0);
  var topSource = data[0];

  return (
    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="theme-soft-surface rounded-[24px] border p-5">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="theme-muted text-[11px] uppercase tracking-[0.2em]">Base ativa</p>
              <p className="theme-text mt-2 text-5xl font-semibold tracking-[-0.05em]">{total}</p>
              <p className="theme-muted mt-2 text-sm">clientes distribuídos por origem</p>
            </div>
            <div className="theme-surface rounded-[18px] border px-4 py-3 sm:min-w-[220px]">
              <p className="theme-muted text-[11px] uppercase tracking-[0.18em]">Origem principal</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: topSource.color }} />
                  <div className="min-w-0">
                    <p className="theme-text truncate text-sm font-semibold">{topSource.name}</p>
                    <p className="theme-muted text-xs">{formatPercent(topSource.percent)} da base</p>
                  </div>
                </div>
                <span className="theme-text text-2xl font-semibold">{topSource.value}</span>
              </div>
            </div>
          </div>

          <div className="theme-surface rounded-[22px] border p-4">
            <p className="theme-muted text-[11px] uppercase tracking-[0.18em]">Distribuição proporcional</p>
            <div className="mt-4 flex h-6 overflow-hidden rounded-full border theme-border bg-[var(--surface-soft)]">
              {data.map((item) => (
                <div
                  key={item.name}
                  title={`${item.name} · ${formatPercent(item.percent)}`}
                  style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                />
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {data.map((item) => (
                <div key={item.name} className="rounded-[18px] border theme-border bg-[var(--surface)] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <p className="theme-text truncate text-sm font-semibold">{item.name}</p>
                  </div>
                  <p className="theme-text mt-4 text-2xl font-semibold tracking-[-0.04em]">{item.value}</p>
                  <p className="theme-muted mt-1 text-xs">{formatPercent(item.percent)} da base ativa</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {data.map((item) => (
          <div key={item.name} className="theme-soft-surface rounded-[20px] border p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <div>
                  <p className="theme-text text-base font-semibold">{item.name}</p>
                  <p className="theme-muted mt-1 text-sm">{formatPercent(item.percent)} da base ativa</p>
                </div>
              </div>
              <div className="text-right">
                <p className="theme-text text-3xl font-semibold tracking-[-0.04em]">{item.value}</p>
                <p className="theme-muted text-xs">clientes</p>
              </div>
            </div>
            <div className="theme-border mt-4 h-2.5 overflow-hidden rounded-full border bg-[var(--surface)]">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(item.percent, 4)}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GestorStatusCard({ gestores }: { gestores: GestorMetric[] }) {
  const chartData = gestores.map((gestor) => ({
    nome: gestor.nome,
    bons: gestor.bons,
    alerta: gestor.alerta,
    critico: gestor.critico
  }));

  return (
    <Card className="p-6">
      <CardHeader>
        <div>
          <CardTitle>Distribuição de status</CardTitle>
          <p className="theme-muted mt-1 text-sm">
            Mostra quantos clientes estão bem, em atenção e em risco por gestor.
          </p>
        </div>
      </CardHeader>
      <CardContent className="mt-5">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData} margin={{ top: 0, right: 0, left: 6, bottom: 0 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" hide />
              <YAxis
                dataKey="nome"
                type="category"
                width={88}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted-color)", fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="bons" stackId="status" fill={statusColors.bons} radius={[10, 0, 0, 10]} />
              <Bar dataKey="alerta" stackId="status" fill={statusColors.alerta} />
              <Bar dataKey="critico" stackId="status" fill={statusColors.critico} radius={[0, 10, 10, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function GestorPerformanceChart({ gestores }: { gestores: GestorMetric[] }) {
  const chartData = gestores.map((gestor) => ({
    gestor: gestor.nome,
    "Taxa de sucesso": gestor.taxa_sucesso,
    "LTV médio": gestor.ltv_medio
  }));

  return (
    <Card className="p-6">
      <CardHeader>
        <div>
          <CardTitle>Mapa de performance</CardTitle>
          <p className="theme-muted mt-1 text-sm">
            Compara taxa de sucesso e LTV médio com dados reais de cada gestor.
          </p>
        </div>
      </CardHeader>
      <CardContent className="mt-5">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="gestor" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
              <YAxis
                yAxisId="left"
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
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
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="Taxa de sucesso"
                name="Taxa de sucesso"
                fill="var(--primary-color)"
                radius={[10, 10, 0, 0]}
                barSize={28}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="LTV médio"
                name="LTV médio"
                stroke="var(--success-color)"
                strokeWidth={3}
                dot={{ r: 4, fill: "var(--success-color)" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function MonthExitBar({ data }: { data: SaidasPorMes[] }) {
  const monthData = data.slice(-12).map((item) => ({
    mes: shortMonthLabel(item.mes),
    tooltipLabel: item.mes,
    saidas: item.clientes.length,
    churn: item.churn ?? 0
  }));

  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={monthData} margin={{ top: 8, right: 0, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="saidas" name="Saídas" radius={[10, 10, 0, 0]}>
            {monthData.map((entry) => (
              <Cell
                key={`${entry.tooltipLabel}-${entry.saidas}`}
                fill={
                  entry.churn > 12
                    ? "var(--danger-color)"
                    : entry.churn > 8
                      ? "var(--warning-color)"
                      : "var(--primary-color)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EvolucaoTable({
  rows,
  footer
}: {
  rows: EvolucaoMensal[];
  footer?: ReactNode;
}) {
  const completed = rows.filter((item) => !item.parcial && item.churn !== null);

  return (
    <Card className="p-6">
      <CardHeader>
        <div>
          <CardTitle>Detalhamento mensal</CardTitle>
          <p className="theme-muted mt-1 text-sm">
            Mostra base, entradas, saídas e churn mês a mês.
          </p>
        </div>
      </CardHeader>
      <CardContent className="mt-5 space-y-4">
        <div className="theme-surface overflow-hidden rounded-[18px] border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Mês</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>Entradas</TableHead>
                <TableHead>Saídas</TableHead>
                <TableHead className="text-right">Churn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.mes}>
                  <TableCell className="theme-text font-medium">{row.mes}</TableCell>
                  <TableCell>{row.base_inicio}</TableCell>
                  <TableCell className="text-emerald-600">{row.entradas ?? "—"}</TableCell>
                  <TableCell className="text-rose-600">-{row.saidas}</TableCell>
                  <TableCell className="text-right">
                    {row.parcial ? (
                      <Badge tone="gray">Em aberto</Badge>
                    ) : (
                      <Badge tone={getChurnTone(row.churn)}>{formatPercent(row.churn)}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="theme-soft-surface">
                <TableCell className="theme-text font-semibold">Média</TableCell>
                <TableCell colSpan={3} className="theme-muted">
                  Apenas meses fechados
                </TableCell>
                <TableCell className="theme-text text-right font-semibold">
                  {formatPercent(
                    completed.reduce((acc, item) => acc + (item.churn ?? 0), 0) /
                      Math.max(completed.length, 1)
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        {footer}
      </CardContent>
    </Card>
  );
}

export function SummaryCard({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-6">
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <p className="theme-muted mt-1 text-sm">{description}</p> : null}
        </div>
      </CardHeader>
      <CardContent className="mt-5">{children}</CardContent>
    </Card>
  );
}
