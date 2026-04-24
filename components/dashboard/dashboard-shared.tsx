"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
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
  bons: "#22c55e",
  alerta: "#f59e0b",
  critico: "#ef4444"
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
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="theme-surface rounded-[18px] border p-3 shadow-panel">
      <p className="theme-text mb-2 text-sm font-semibold">{label}</p>
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
  tone = "default"
}: {
  label: string;
  value: string;
  tone?: "default" | "blue" | "green" | "yellow" | "red";
}) {
  const toneClasses = {
    default: "theme-surface theme-text",
    blue: "theme-strong-surface theme-text",
    green: "chip-green",
    yellow: "chip-yellow",
    red: "chip-red"
  } as const;

  return (
    <div className={cn("rounded-[18px] border p-4", toneClasses[tone])}>
      <p className="theme-muted text-[11px] uppercase tracking-[0.2em]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-inherit">{value}</p>
    </div>
  );
}

export function MetricCard({
  title,
  value,
  description,
  badge,
  icon: Icon,
  tone
}: {
  title: string;
  value: number;
  description: string;
  badge: string;
  icon: LucideIcon;
  tone: keyof typeof healthGradient;
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

  return (
    <Card className="relative overflow-hidden p-5">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", healthGradient[tone])} />
      <div className="relative">
        <CardHeader>
          <div>
            <p className="theme-muted text-xs uppercase tracking-[0.16em]">{title}</p>
          </div>
          <div className="theme-soft-surface theme-text rounded-full border p-2">
            <Icon className="h-4 w-4" />
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

export function GestorRadarCard({ gestores }: { gestores: GestorMetric[] }) {
  const maxLtv = Math.max(...gestores.map((gestor) => gestor.ltv_medio), 1);
  const radarData = gestores.map((gestor) => {
    const total = gestor.bons + gestor.alerta + gestor.critico;
    const control = total ? ((gestor.bons + gestor.alerta) / total) * 100 : 0;

    return {
      gestor: gestor.nome,
      "Taxa de sucesso": gestor.taxa_sucesso,
      "Retenção relativa": (gestor.ltv_medio / maxLtv) * 100,
      "Carteira estável": control
    };
  });

  return (
    <Card className="p-6">
      <CardHeader>
        <div>
          <CardTitle>Mapa de performance</CardTitle>
          <p className="theme-muted mt-1 text-sm">
            Compara taxa de sucesso, retenção relativa e estabilidade da carteira.
          </p>
        </div>
      </CardHeader>
      <CardContent className="mt-5">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart outerRadius="68%" data={radarData}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="gestor" tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Radar dataKey="Taxa de sucesso" fill="#38bdf8" stroke="#38bdf8" fillOpacity={0.25} />
              <Radar dataKey="Retenção relativa" fill="#34d399" stroke="#34d399" fillOpacity={0.2} />
              <Radar dataKey="Carteira estável" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.18} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function MonthExitBar({ data }: { data: SaidasPorMes[] }) {
  const monthData = data.map((item) => ({
    mes: shortMonthLabel(item.mes),
    saidas: item.clientes.length,
    churn: item.churn ?? 0
  }));

  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={monthData} margin={{ top: 8, right: 0, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="saidas" radius={[10, 10, 0, 0]}>
            {monthData.map((entry) => (
              <Cell
                key={`${entry.mes}-${entry.saidas}`}
                fill={entry.churn > 12 ? "#ef4444" : entry.churn > 8 ? "#f59e0b" : "#38bdf8"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EvolucaoTable({
  data,
  footer
}: {
  data: ClientesDashboardData;
  footer?: ReactNode;
}) {
  const completed = data.evolucao_mensal.filter((item) => !item.parcial && item.churn !== null);

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
              {data.evolucao_mensal.map((row) => (
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
