"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  CircleAlert,
  CircleHelp,
  Frown,
  Meh,
  Smile
} from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis
} from "recharts";
import { cn, formatPercent } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BaseClienteDetalhado, EvolucaoMensal, GestorMetric, SaidasPorMes } from "@/lib/types";

export const statusColors = {
  bom: "var(--success-color)",
  alerta: "var(--warning-color)",
  critico: "var(--danger-color)"
};

const cardTone = {
  blue: "metric-card-blue",
  green: "metric-card-green",
  yellow: "metric-card-yellow",
  red: "metric-card-red"
} as const;

const metricTone = {
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

const iconTone = {
  blue: "var(--primary-color)",
  green: "var(--success-color)",
  yellow: "var(--warning-color)",
  red: "var(--danger-color)"
} as const;

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

export function HoverInfo({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center">
      <CircleHelp className="theme-muted h-4 w-4 cursor-help" />
      <span className="flat-tooltip pointer-events-none absolute bottom-full right-0 z-50 mb-3 hidden w-[260px] rounded-[14px] px-4 py-3 text-left text-xs font-normal leading-5 text-[var(--tooltip-text)] group-hover:block">
        {text}
      </span>
    </span>
  );
}

export function LabelWithHelp({
  label,
  tooltip,
  className
}: {
  label: string;
  tooltip?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span>{label}</span>
      {tooltip ? <HoverInfo text={tooltip} /> : null}
    </div>
  );
}

export function ChartLegendRow({
  items,
  className
}: {
  items: Array<{ label: string; color: string; description?: string }>;
  className?: string;
}) {
  return (
    <div className={cn("mt-5 flex flex-wrap items-start justify-center gap-x-6 gap-y-2 text-center", className)}>
      {items.map((item) => (
        <div key={item.label} className="max-w-[180px]">
          <div className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
            <p className="theme-text text-xs font-semibold">{item.label}</p>
          </div>
          {item.description ? <p className="theme-muted mt-1 text-[11px] leading-4">{item.description}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function CustomTooltip({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color?: string;
    fill?: string;
    payload?: Record<string, any>;
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const tooltipLabel = payload[0]?.payload?.tooltipLabel ?? label;
  const resolveSeriesColor = function (item: {
    name: string;
    color?: string;
    fill?: string;
    payload?: Record<string, any>;
  }) {
    if (item.name === "Taxa de sucesso") return "var(--primary-color)";
    if (item.name === "LTV médio por mês") return "var(--warning-color)";
    if (item.name === "Clientes ativos") return "var(--success-color)";
    if (item.name === "Clientes") return "var(--primary-color)";
    if (item.name === "Base" || item.name === "Base ativa") return "var(--primary-color)";
    if (item.name === "Entradas") return "var(--success-color)";
    if (item.name === "Saídas") return "var(--danger-color)";
    if (item.name === "Bom") return "var(--success-color)";
    if (item.name === "Alerta") return "var(--warning-color)";
    if (item.name === "Crítico") return "var(--danger-color)";
    return item.color ?? item.fill ?? item.payload?.color ?? "#93c5fd";
  };

  return (
    <div className="flat-tooltip rounded-[16px] p-3">
      <p className="mb-2 text-sm font-semibold text-[var(--tooltip-text)]">{tooltipLabel}</p>
      <div className="space-y-1.5">
        {payload.map((item) => {
          const rawName = item.name.toLowerCase();
          const isPercent = rawName.includes("churn") || rawName.includes("taxa") || item.name.includes("%");
          const isLtv = rawName.includes("ltv");
          const formatter = item.payload?.tooltipFormatter;
          const valueText = formatter
            ? formatter(item.value)
            : isPercent
              ? formatPercent(item.value)
              : isLtv
                ? `${item.value} meses`
                : item.value;

          return (
            <div key={`${item.name}-${item.value}`} className="flex items-center justify-between gap-8 text-xs">
              <span className="flex items-center gap-2 text-[var(--tooltip-muted)]">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: resolveSeriesColor(item) }}
                />
                {item.name}
              </span>
              <span className="font-semibold text-[var(--tooltip-text)]">{valueText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function InsightChip({
  label,
  value,
  tone = "default",
  icon: Icon,
  tooltip
}: {
  label: string;
  value: string;
  tone?: "default" | "blue" | "green" | "yellow" | "red";
  icon?: LucideIcon;
  tooltip?: string;
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
        "relative flex min-h-[128px] flex-col justify-between overflow-visible rounded-[22px] border px-5 py-4",
        toneClasses[tone]
      )}
    >
      {Icon ? (
        <Icon
          className="pointer-events-none absolute right-4 top-4 h-14 w-14"
          style={{ color: iconColors[tone], opacity: 0.12 }}
        />
      ) : null}
      <div className="relative z-10 flex max-w-[18rem] items-center gap-2">
        <p
          className={cn(
            "text-[11px] font-medium uppercase tracking-[0.18em]",
            tone === "default" || tone === "blue" ? "theme-text" : "text-inherit"
          )}
        >
          {label}
        </p>
        {tooltip ? <HoverInfo text={tooltip} /> : null}
      </div>
      <p
        className={cn(
          "relative z-10 mt-6 max-w-[18rem] pr-10 text-[24px] font-semibold leading-tight tracking-[-0.04em]",
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
  value: ReactNode;
  description: string;
  badge: string;
  icon: LucideIcon;
  tone: keyof typeof cardTone;
  href?: Route;
}) {
  const card = (
    <Card
      className={cn(
        "relative overflow-hidden p-6 transition duration-200 will-change-transform hover:scale-[1.025]",
        cardTone[tone]
      )}
    >
      <Icon
        className="pointer-events-none absolute right-5 top-6 h-16 w-16"
        style={{ color: iconTone[tone], opacity: 0.14 }}
      />
      <div className="relative">
        <CardHeader className="pr-16">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-current/70">{title}</p>
        </CardHeader>
        <CardContent className="mt-5 space-y-3">
          <div className={cn("metric-number font-bold", metricTone[tone])}>{value}</div>
          <p className="max-w-[18rem] text-sm leading-6 text-current/72">{description}</p>
          <Badge tone={badgeTone[tone]} className="w-fit">
            <ArrowUpRight className="h-3 w-3" />
            {badge}
          </Badge>
        </CardContent>
      </div>
    </Card>
  );

  return href ? (
    <Link href={href} className="block focus-visible:outline-none">
      {card}
    </Link>
  ) : (
    card
  );
}

export function HealthDonut({
  data
}: {
  data: Array<{ name: string; value: number; percent?: number; color: string }>;
}) {
  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="flex flex-col items-center">
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={0}
              outerRadius={126}
              stroke="var(--surface)"
              strokeWidth={5}
              paddingAngle={2}
              labelLine={false}
              label={({ cx, cy, midAngle, outerRadius, payload, value }) => {
                const exactPercent = payload?.percent ?? (total ? ((Number(value) || 0) / total) * 100 : 0);
                if (!exactPercent || exactPercent < 0.1 || !cx || !cy || !outerRadius) return null;
                var radius = outerRadius * 0.62;
                var x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
                var y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);
                var labelColor = payload?.name === "Alerta" ? "#0f172a" : "#ffffff";

                return (
                  <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill={labelColor}>
                    <tspan x={x} dy="-0.35em" fontSize="13" fontWeight={600}>
                      {payload?.name}
                    </tspan>
                    <tspan x={x} dy="1.35em" fontSize="20" fontWeight={700}>
                      {formatPercent(exactPercent)}
                    </tspan>
                  </text>
                );
              }}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={<CustomTooltip />}
              formatter={(value: number) => value}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="theme-muted text-sm">Base considerada: {total} clientes com status preenchido.</p>
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

  const palette = ["var(--origin-ring-1)", "var(--origin-ring-2)", "var(--origin-ring-3)", "var(--origin-ring-4)"];
  const normalized = data.slice(0, 4).map((item, index) => ({
    ...item,
    color: palette[index] || item.color
  }));

  return (
    <div className="space-y-5">
      <div className="mx-auto h-[392px] max-w-[520px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {normalized.map((item, index) => (
                <linearGradient
                  key={`${item.name}-gradient`}
                  id={`originMixGradient-${index}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop offset="0%" stopColor={item.color} stopOpacity={0.98} />
                  <stop offset="55%" stopColor={item.color} stopOpacity={0.82} />
                  <stop offset="100%" stopColor={item.color} stopOpacity={0.56} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={normalized}
              dataKey="value"
              nameKey="name"
              innerRadius={0}
              outerRadius={128}
              stroke="transparent"
              strokeWidth={0}
              paddingAngle={0}
              labelLine={false}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, payload }) => {
                if (!cx || !cy || !outerRadius || !payload?.percent) return null;
                const percentRadius = ((innerRadius ?? 0) + outerRadius) / 2;
                const percentX = cx + percentRadius * Math.cos((-midAngle * Math.PI) / 180);
                const percentY = cy + percentRadius * Math.sin((-midAngle * Math.PI) / 180);
                const direction = Math.cos((-midAngle * Math.PI) / 180) >= 0 ? 1 : -1;
                const lineStartRadius = outerRadius + 4;
                const lineMidRadius = outerRadius + 30;
                const startX = cx + lineStartRadius * Math.cos((-midAngle * Math.PI) / 180);
                const startY = cy + lineStartRadius * Math.sin((-midAngle * Math.PI) / 180);
                const midX = cx + lineMidRadius * Math.cos((-midAngle * Math.PI) / 180);
                const midY = cy + lineMidRadius * Math.sin((-midAngle * Math.PI) / 180);
                const endX = midX + direction * 36;
                const endY = midY;
                const labelX = endX + direction * 12;
                const labelY = endY;
                const textAnchor = direction > 0 ? "start" : "end";
                return (
                  <g>
                    <text
                      x={percentX}
                      y={percentY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      fontSize="17"
                      fontWeight={600}
                    >
                      {formatPercent(payload.percent)}
                    </text>
                    <path
                      d={`M ${startX} ${startY} L ${midX} ${midY} L ${endX} ${endY}`}
                      fill="none"
                      stroke={payload.color}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <circle cx={labelX - direction * 8} cy={labelY} r="4" fill={payload.color} />
                    <text
                      x={labelX}
                      y={labelY + 1}
                      textAnchor={textAnchor}
                      dominantBaseline="middle"
                      fill="var(--text-color)"
                      fontSize="13"
                      fontWeight={600}
                    >
                      {payload.name}
                    </text>
                  </g>
                );
              }}
            >
              {normalized.map((entry, index) => (
                <Cell key={entry.name} fill={`url(#originMixGradient-${index})`} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0]?.payload as (typeof normalized)[number];
                return (
                  <div className="flat-tooltip rounded-[16px] p-3">
                    <p className="text-sm font-semibold text-[var(--tooltip-text)]">{item.name}</p>
                    <p className="mt-1 text-xs text-[var(--tooltip-muted)]">{item.value} clientes</p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SuccessGaugeCard({
  score,
  bom,
  alerta,
  critico
}: {
  score: number;
  bom: number;
  alerta: number;
  critico: number;
}) {
  const gaugePath = "M 24 156 A 76 76 0 0 1 176 156";
  const dominant =
    bom >= 45 ? { value: bom, tone: "green" as const } : alerta >= critico
      ? { value: alerta, tone: "yellow" as const }
      : { value: critico, tone: "red" as const };
  const clampedScore = Math.max(0, Math.min(100, dominant.value));
  const levelTone = dominant.tone;
  const scoreColor =
    levelTone === "green"
      ? "var(--success-color)"
      : levelTone === "yellow"
        ? "var(--warning-color)"
        : "var(--danger-color)";
  const FaceIcon = levelTone === "green" ? Smile : levelTone === "yellow" ? Meh : Frown;
  const statusNote =
    levelTone === "green"
      ? "Carteira em equilíbrio"
      : levelTone === "yellow"
        ? "Momento de atenção"
        : "Risco de churn elevado";

  return (
    <div className="mx-auto flex max-w-[360px] flex-col items-center">
      <div className="relative h-[292px] w-full">
        <svg viewBox="0 0 200 190" className="h-full w-full overflow-visible">
          <path
            d={gaugePath}
            pathLength={100}
            fill="none"
            stroke="var(--surface-strong)"
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d={gaugePath}
            pathLength={100}
            fill="none"
            stroke={scoreColor}
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray={`${clampedScore} ${100 - clampedScore}`}
          />
        </svg>

        <div className="absolute inset-x-0 bottom-2 flex flex-col items-center text-center">
          <div
            className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border backdrop-blur-xl"
            style={{
              background: `linear-gradient(160deg, color-mix(in srgb, ${scoreColor} 34%, transparent) 0%, color-mix(in srgb, ${scoreColor} 12%, transparent) 100%)`,
              borderColor: `color-mix(in srgb, ${scoreColor} 38%, rgba(255,255,255,0.18))`,
              boxShadow: `0 0 0 10px color-mix(in srgb, ${scoreColor} 16%, transparent)`,
              color: scoreColor
            }}
          >
            <FaceIcon className="h-6 w-6" />
          </div>
          <p className="text-[38px] font-medium leading-none tracking-[-0.04em]" style={{ color: scoreColor }}>
            {formatPercent(clampedScore)}
          </p>
          <p className="mt-2 text-sm italic text-[var(--muted-color)]">{statusNote}</p>
        </div>

        <div className="theme-muted absolute bottom-[96px] left-7 text-xs font-medium">0%</div>
        <div className="theme-muted absolute bottom-[96px] right-7 text-xs font-medium">100%</div>
      </div>

      <div className="mt-4 grid w-full grid-cols-3 gap-2 text-center">
        <div
          className="metric-card-green rounded-[18px] px-3 py-3"
        >
          <p className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: "var(--success-color)" }}>
            Bom
          </p>
          <p className="mt-1 text-lg font-semibold text-current">{formatPercent(bom)}</p>
        </div>
        <div
          className="metric-card-yellow rounded-[18px] px-3 py-3"
        >
          <p className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: "var(--warning-color)" }}>
            Alerta
          </p>
          <p className="mt-1 text-lg font-semibold text-current">{formatPercent(alerta)}</p>
        </div>
        <div
          className="metric-card-red rounded-[18px] px-3 py-3"
        >
          <p className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: "var(--danger-color)" }}>
            Crítico
          </p>
          <p className="mt-1 text-lg font-semibold text-current">{formatPercent(critico)}</p>
        </div>
      </div>
    </div>
  );
}

export function GestorCrossMetricSummary({ gestores }: { gestores: GestorMetric[] }) {
  const chartData = [...gestores]
    .filter((gestor) => (gestor.clientes_com_status ?? (gestor.bons + gestor.alerta + gestor.critico)) > 0)
    .sort((a, b) => (b.score_composto ?? 0) - (a.score_composto ?? 0))
    .map((gestor) => ({
      gestor: gestor.nome,
      taxa_sucesso: gestor.taxa_sucesso,
      ltv_medio: gestor.ltv_medio,
      tooltipLabel: gestor.nome
    }));

  return (
    <div>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="crossBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary-color)" stopOpacity={1} />
                <stop offset="100%" stopColor="#64a7fe" stopOpacity={0.72} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="gestor" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
            <YAxis yAxisId="left" axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fill: "var(--muted-color)", fontSize: 12 }} tickFormatter={(value) => `${value}%`} />
            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar yAxisId="left" dataKey="taxa_sucesso" name="Taxa de sucesso" fill="url(#crossBlue)" radius={[10, 10, 0, 0]} barSize={28} />
            <Line yAxisId="right" type="monotone" dataKey="ltv_medio" name="LTV médio por mês" stroke="var(--success-color)" strokeWidth={3} dot={{ r: 4, fill: "var(--success-color)" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ChartLegendRow
        items={[
          { label: "Taxa de sucesso", color: "var(--primary-color)", description: "Percentual de clientes BONS na carteira ativa." },
          { label: "LTV médio por mês", color: "var(--success-color)", description: "Tempo médio de permanência em meses." }
        ]}
      />
    </div>
  );
}

export function GestorStatusCard({ gestores }: { gestores: GestorMetric[] }) {
  const chartData = gestores
    .filter((gestor) => (gestor.clientes_com_status ?? (gestor.bons + gestor.alerta + gestor.critico)) > 0)
    .sort((a, b) => (b.score_composto ?? 0) - (a.score_composto ?? 0))
    .map((gestor) => {
      const total = gestor.clientes_com_status ?? (gestor.bons + gestor.alerta + gestor.critico);
      return {
        nome: gestor.nome,
        bom: gestor.bons,
        alerta: gestor.alerta,
        critico: gestor.critico,
        bomPercent: total ? `${Math.round((gestor.bons / total) * 100)}%` : "",
        alertaPercent: total ? `${Math.round((gestor.alerta / total) * 100)}%` : "",
        criticoPercent: total ? `${Math.round((gestor.critico / total) * 100)}%` : ""
      };
    });

  return (
    <Card className="p-6">
      <CardHeader>
        <div>
          <CardTitle>Distribuição de status</CardTitle>
          <p className="theme-muted mt-1 text-sm">Mostra quantos clientes estão bem, em atenção e em risco por gestor.</p>
        </div>
      </CardHeader>
      <CardContent className="mt-5">
        <div className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData} margin={{ top: 0, right: 4, left: 8, bottom: 0 }} barSize={28}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" hide />
              <YAxis dataKey="nome" type="category" width={146} axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="bom" name="Bom" stackId="status" fill="var(--status-green)" radius={[8, 0, 0, 8]}>
                <LabelList dataKey="bomPercent" position="center" fill="var(--chart-label-contrast)" fontSize={11} fontWeight={500} />
              </Bar>
              <Bar dataKey="alerta" name="Alerta" stackId="status" fill="var(--status-yellow)">
                <LabelList dataKey="alertaPercent" position="center" fill="var(--chart-label-contrast)" fontSize={11} fontWeight={500} />
              </Bar>
              <Bar dataKey="critico" name="Crítico" stackId="status" fill="var(--status-red)" radius={[0, 8, 8, 0]}>
                <LabelList dataKey="criticoPercent" position="center" fill="var(--chart-label-contrast)" fontSize={11} fontWeight={500} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ChartLegendRow
          items={[
            { label: "Bom", color: "var(--success-color)" },
            { label: "Alerta", color: "var(--warning-color)" },
            { label: "Crítico", color: "var(--danger-color)" }
          ]}
        />
      </CardContent>
    </Card>
  );
}

export function GestorPerformanceChart({ gestores }: { gestores: GestorMetric[] }) {
  const chartData = gestores
    .filter((gestor) => (gestor.clientes_com_status ?? (gestor.bons + gestor.alerta + gestor.critico)) > 0)
    .sort((a, b) => (b.score_composto ?? 0) - (a.score_composto ?? 0))
    .map((gestor) => ({
      gestor: gestor.nome,
      clientes_ativos: gestor.ativos ?? 0,
      taxa_sucesso: Number(gestor.taxa_sucesso.toFixed(1)),
      ltv_medio: Number(gestor.ltv_medio.toFixed(1)),
      tooltipLabel: gestor.nome
    }));

  return (
    <div>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="performanceGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--success-color)" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#1f7a48" stopOpacity={0.78} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="gestor" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fill: "var(--muted-color)", fontSize: 12 }} tickFormatter={(value) => `${value}%`} />
            <YAxis yAxisId="ltv" hide domain={[0, "dataMax + 2"]} />
            <Tooltip content={<CustomTooltip />} />
            <Bar yAxisId="left" dataKey="clientes_ativos" name="Clientes ativos" fill="url(#performanceGreen)" radius={[6, 6, 2, 2]} barSize={24} />
            <Line yAxisId="right" type="monotone" dataKey="taxa_sucesso" name="Taxa de sucesso" stroke="var(--primary-color)" strokeWidth={3} dot={{ r: 4, fill: "var(--primary-color)" }} />
            <Line yAxisId="ltv" type="monotone" dataKey="ltv_medio" name="LTV médio por mês" stroke="var(--warning-color)" strokeWidth={3} strokeDasharray="7 5" dot={{ r: 4, fill: "var(--warning-color)" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ChartLegendRow
        items={[
          { label: "Clientes ativos", color: "var(--success-color)", description: "Volume atual da carteira por gestor." },
          { label: "Taxa de sucesso", color: "var(--primary-color)", description: "Percentual de clientes BONS na carteira ativa." },
          { label: "LTV médio por mês", color: "var(--warning-color)", description: "Permanência média em meses, arredondada em 1 casa." }
        ]}
      />
    </div>
  );
}

export function MonthExitBar({ data }: { data: SaidasPorMes[] }) {
  const monthData = data.slice(-12).map((item) => ({
    mes: shortMonthLabel(item.mes),
    tooltipLabel: item.mes,
    saidas: item.clientes.length,
    churn: item.churn
  }));
  const maxSaidas = Math.max(...monthData.map((item) => item.saidas), 1);

  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={monthData} margin={{ top: 8, right: 0, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="exitBarBlueLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9fc6ff" />
              <stop offset="100%" stopColor="#64a7fe" />
            </linearGradient>
            <linearGradient id="exitBarBlueMid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a68ff" />
              <stop offset="100%" stopColor="#64a7fe" />
            </linearGradient>
            <linearGradient id="exitBarBlueDark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d1732" />
              <stop offset="100%" stopColor="#1a68ff" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="saidas" name="Saídas" radius={[6, 6, 2, 2]}>
            {monthData.map((entry) => (
              <Cell
                key={`${entry.tooltipLabel}-${entry.saidas}`}
                fill={
                  entry.saidas / maxSaidas >= 0.75
                    ? "url(#exitBarBlueDark)"
                    : entry.saidas / maxSaidas >= 0.4
                      ? "url(#exitBarBlueMid)"
                      : "url(#exitBarBlueLight)"
                }
              />
            ))}
            <LabelList
              dataKey="churn"
              position="top"
              formatter={(value: number | null | undefined) => formatPercent(value)}
              fill="var(--muted-color)"
              fontSize={11}
              offset={8}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CohortRetentionHeatmap({
  rows
}: {
  rows: Array<{ cohort: string; values: Array<number | null> }>;
}) {
  if (!rows.length) {
    return <div className="theme-muted text-sm">Ainda não há base suficiente para montar a cohort de retenção.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[120px_repeat(6,minmax(0,1fr))] gap-2 text-[11px] uppercase tracking-[0.18em] theme-muted">
        <span>Safra</span>
        {Array.from({ length: 6 }).map((_, index) => (
          <span key={index}>M+{index}</span>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.cohort} className="grid grid-cols-[120px_repeat(6,minmax(0,1fr))] gap-2">
          <div className="theme-text text-sm font-semibold">{row.cohort}</div>
          {row.values.map((value, index) => (
            <div
              key={`${row.cohort}-${index}`}
              className="flex h-12 items-center justify-center rounded-[14px] text-sm font-semibold"
              style={{
                background:
                  value === null
                    ? "var(--surface-soft)"
                    : `rgba(26, 104, 255, ${0.12 + (value / 100) * 0.55})`,
                color: value !== null && value > 55 ? "#ffffff" : "var(--text-color)"
              }}
            >
              {value === null ? "—" : formatPercent(value)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function LtvDistributionChart({
  data
}: {
  data: Array<{ faixa: string; quantidade: number }>;
}) {
  const total = data.reduce((acc, item) => acc + item.quantidade, 0);
  const chartData = data.map((item) => ({
    ...item,
    percent: total ? (item.quantidade / total) * 100 : 0,
    tooltipLabel: `${item.faixa} meses`
  }));

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 24, right: 4, left: -8, bottom: 18 }} barCategoryGap={18}>
          <defs>
            <linearGradient id="ltvDistribution" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a68ff" />
              <stop offset="100%" stopColor="#64a7fe" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="faixa"
            axisLine={false}
            tickLine={false}
            interval={0}
            height={64}
            tick={({ x, y, payload }) => (
              <g transform={`translate(${x},${y + 6})`}>
                <text textAnchor="middle" fill="var(--muted-color)" fontSize="12">
                  <tspan x="0" dy="0">{payload.value}</tspan>
                  <tspan x="0" dy="16">meses</tspan>
                </text>
              </g>
            )}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="quantidade" name="Clientes" fill="url(#ltvDistribution)" radius={[6, 6, 2, 2]} barSize={42}>
            <LabelList
              dataKey="percent"
              position="top"
              formatter={(value: number) => formatPercent(value)}
              fill="var(--primary-color)"
              fontSize={11}
              fontWeight={700}
              offset={8}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HealthByOriginChart({
  data,
  labelKey = "origem"
}: {
  data: Array<Record<string, string | number>>;
  labelKey?: string;
}) {
  return (
    <div>
      <div className="h-[332px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barSize={30}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
            <YAxis dataKey={labelKey} type="category" width={128} axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="bom" name="Bom" stackId="health" fill="#3bb86b" radius={[6, 0, 0, 6]} />
            <Bar dataKey="alerta" name="Alerta" stackId="health" fill="#f0b93a" />
            <Bar dataKey="critico" name="Crítico" stackId="health" fill="#ef5b72" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegendRow
        items={[
          { label: "Bom", color: "var(--success-color)" },
          { label: "Alerta", color: "var(--warning-color)" },
          { label: "Crítico", color: "var(--danger-color)" }
        ]}
      />
    </div>
  );
}

export function ChurnByDimensionChart({
  data,
  palette
}: {
  data: Array<Record<string, any>>;
  palette?: string[];
}) {
  const keys = Object.keys(data[0] ?? {}).filter(
    (key) => key !== "mes" && key !== "tooltipLabel" && key !== "ano" && key !== "mesNome"
  );
  const chartPalette = palette ?? ["#1a68ff", "#4b8dff", "#7ab0ff", "#b7d3ff", "#dce8ff"];

  return (
    <div>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="18%" barGap={4}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            {keys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                name={key}
                fill={chartPalette[index % chartPalette.length]}
                radius={[6, 6, 2, 2]}
                maxBarSize={20}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegendRow
        items={keys.map((key, index) => ({
          label: key,
          color: chartPalette[index % chartPalette.length]
        }))}
      />
    </div>
  );
}

export function EntryExitBaseChart({
  data,
  compactLegend = false
}: {
  data: Array<{
    axisLabel: string;
    tooltipLabel: string;
    base_inicio: number;
    entradas: number | null;
    saidas: number;
  }>;
  compactLegend?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="h-[312px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="entryArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(97, 217, 117, 0.34)" />
              <stop offset="100%" stopColor="rgba(97, 217, 117, 0.02)" />
            </linearGradient>
            <linearGradient id="baseBarGlass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(26, 104, 255, 0.9)" />
              <stop offset="100%" stopColor="rgba(26, 104, 255, 0.28)" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="axisLabel" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-color)", fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="base_inicio"
            name="Base ativa"
            fill="url(#baseBarGlass)"
            radius={[6, 6, 2, 2]}
            barSize={24}
          />
          <Area
            type="linear"
            dataKey="entradas"
            name="Entradas"
            stroke="var(--success-color)"
            fill="url(#entryArea)"
            strokeWidth={3}
          />
          <Line
            type="monotone"
            dataKey="saidas"
            name="Saídas"
            stroke="var(--danger-color)"
            strokeWidth={3}
            strokeDasharray="8 6"
            dot={{ r: 4, fill: "var(--danger-color)", stroke: "var(--surface)", strokeWidth: 2 }}
          />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="px-3">
        <ChartLegendRow
        className={compactLegend ? "mt-0" : "mt-0"}
        items={[
          {
            label: "Base ativa",
            color: "var(--primary-color)",
            description: compactLegend ? undefined : "Volume total de clientes ativos no início do período."
          },
          {
            label: "Entradas",
            color: "var(--success-color)",
            description: compactLegend ? undefined : "Clientes que entraram no período selecionado."
          },
          {
            label: "Saídas",
            color: "var(--danger-color)",
            description: compactLegend ? undefined : "Clientes que saíram no período selecionado."
          }
        ]}
        />
      </div>
    </div>
  );
}

export function GestorMatrixChart({
  data
}: {
  data: Array<{ gestor: string; carteira: number; taxa_sucesso: number; ltv_medio: number; color: string }>;
}) {
  return (
    <div className="h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 10, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="carteira" name="Carteira ativa" tick={{ fill: "var(--muted-color)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis type="number" dataKey="taxa_sucesso" name="Taxa de sucesso" domain={[0, 100]} tick={{ fill: "var(--muted-color)", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} />
          <ZAxis type="number" dataKey="ltv_medio" range={[80, 420]} name="LTV médio por mês" />
          <Tooltip cursor={{ strokeDasharray: "4 4" }} content={<CustomTooltip />} />
          <Scatter
            name="Gestores"
            data={data.map((item) => ({
              ...item,
              tooltipLabel: item.gestor,
              "Carteira ativa": item.carteira,
              "Taxa de sucesso": item.taxa_sucesso,
              "LTV médio por mês": item.ltv_medio,
              fill: item.color
            }))}
          >
            {data.map((entry) => (
              <Cell key={entry.gestor} fill={entry.color} />
            ))}
          </Scatter>
        </ScatterChart>
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
          <p className="theme-muted mt-1 text-sm">Mostra base, entradas, saídas e churn mês a mês.</p>
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
                    {row.parcial ? <Badge tone="gray">Em aberto</Badge> : <Badge tone={getChurnTone(row.churn)}>{formatPercent(row.churn)}</Badge>}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="theme-soft-surface">
                <TableCell className="theme-text font-semibold">Resumo</TableCell>
                <TableCell className="theme-text">{Math.round(rows.reduce((acc, item) => acc + item.base_inicio, 0) / Math.max(rows.length, 1))}</TableCell>
                <TableCell className="theme-text text-emerald-600">+{rows.reduce((acc, item) => acc + (item.entradas ?? 0), 0)}</TableCell>
                <TableCell className="theme-text text-rose-600">-{rows.reduce((acc, item) => acc + item.saidas, 0)}</TableCell>
                <TableCell className="theme-text text-right font-semibold">
                  {formatPercent(
                    completed.reduce((acc, item) => acc + (item.churn ?? 0), 0) / Math.max(completed.length, 1)
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
  actions,
  children
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="p-6 sm:p-7">
      <CardHeader className="flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <CardTitle className="display-heading text-[30.6px] leading-[1.05]">{title}</CardTitle>
          {description ? <p className="theme-muted mt-2 max-w-2xl text-sm leading-6">{description}</p> : null}
        </div>
        {actions}
      </CardHeader>
      <CardContent className="mt-6">{children}</CardContent>
    </Card>
  );
}

export function buildGestorMetricsFromBase(baseClientes: BaseClienteDetalhado[]) {
  const grouped = new Map<
    string,
    {
      nome: string;
      ativos: number;
      bons: number;
      alerta: number;
      critico: number;
      ltvValues: number[];
    }
  >();

  baseClientes.forEach((cliente) => {
    const nome = cliente.gestor || "Sem gestor";
    if (!grouped.has(nome)) {
      grouped.set(nome, { nome, ativos: 0, bons: 0, alerta: 0, critico: 0, ltvValues: [] });
    }
    const item = grouped.get(nome)!;

    if (cliente.ativo === "Sim") {
      item.ativos += 1;
      if (cliente.status === "bom") item.bons += 1;
      if (cliente.status === "alerta") item.alerta += 1;
      if (cliente.status === "critico") item.critico += 1;
      if (typeof cliente.ltv_meses === "number") item.ltvValues.push(cliente.ltv_meses);
    }
  });

  var rawMetrics = Array.from(grouped.values())
    .map((item) => {
      var total = item.bons + item.alerta + item.critico;
      return {
        nome: item.nome,
        ativos: item.ativos,
        clientes_com_status: total,
        bons: item.bons,
        alerta: item.alerta,
        critico: item.critico,
        taxa_sucesso: total ? (item.bons / total) * 100 : 0,
        ltv_medio: item.ltvValues.length
          ? item.ltvValues.reduce((acc, value) => acc + value, 0) / item.ltvValues.length
          : 0
      };
    })
    .filter((item) => item.ativos > 0);

  var maxClientesComStatus = rawMetrics.reduce(function (max, item) {
    return Math.max(max, item.clientes_com_status);
  }, 0);
  var maxLtv = rawMetrics.reduce(function (max, item) {
    return Math.max(max, item.ltv_medio);
  }, 0);

  return rawMetrics
    .map(function (item) {
      var successScore = item.taxa_sucesso / 100;
      var volumeScore = maxClientesComStatus ? item.clientes_com_status / maxClientesComStatus : 0;
      var ltvScore = maxLtv ? item.ltv_medio / maxLtv : 0;

      return {
        nome: item.nome,
        ativos: item.ativos,
        clientes_com_status: item.clientes_com_status,
        bons: item.bons,
        alerta: item.alerta,
        critico: item.critico,
        taxa_sucesso: item.taxa_sucesso,
        ltv_medio: item.ltv_medio,
        score_composto: (successScore * 0.5 + volumeScore * 0.3 + ltvScore * 0.2) * 100
      };
    })
    .sort((a, b) => (b.score_composto ?? 0) - (a.score_composto ?? 0));
}
