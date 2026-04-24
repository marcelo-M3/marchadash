"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CircleAlert,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
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
import { useClientesData } from "@/hooks/use-clientes-data";
import { ClientesDashboardData, EvolucaoMensal, GestorMetric, SaidasPorMes } from "@/lib/types";
import { cn, formatMonths, formatPercent, formatSignedPercent, getChurnColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SECTION_IDS = ["overview", "gestores", "mensal", "saidas"] as const;
type SectionId = (typeof SECTION_IDS)[number];

const navItems: Array<{
  id: SectionId;
  label: string;
  icon: typeof LayoutDashboard;
  caption: string;
}> = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard, caption: "Saúde da carteira" },
  { id: "gestores", label: "Por Gestor", icon: Users, caption: "Qualidade operacional" },
  { id: "mensal", label: "Evolução Mensal", icon: TrendingUp, caption: "Base, churn e tendência" },
  { id: "saidas", label: "Registro de Saídas", icon: LogOut, caption: "Perdas e memória recente" }
];

const statusColors = {
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

function shortMonthLabel(month: string) {
  const base = month.split("/")[0];
  return base.slice(0, 3);
}

function getToneFromChurn(value: number | null | undefined): "green" | "yellow" | "red" | "gray" {
  if (value === null || value === undefined || Number.isNaN(value)) return "gray";
  if (value < 8) return "green";
  if (value <= 12) return "yellow";
  return "red";
}

function buildInsight(evolucaoMensal: EvolucaoMensal[]) {
  const completed = evolucaoMensal.filter((item) => !item.parcial && item.churn !== null);
  if (!completed.length) {
    return "Sem meses fechados suficientes para detectar uma tendência de churn confiável.";
  }

  const worstMonth = completed.reduce((worst, current) =>
    (current.churn ?? 0) > (worst.churn ?? 0) ? current : worst
  );
  const latest = completed[completed.length - 1];
  const previous = completed[completed.length - 2];
  let trend = "Último fechamento ainda sem diferença relevante.";

  if (previous && latest.churn !== null && previous.churn !== null) {
    if (latest.churn < previous.churn) {
      trend = `${latest.mes} trouxe recuperação frente a ${previous.mes}.`;
    } else if (latest.churn > previous.churn) {
      trend = `${latest.mes} deteriorou a retenção frente a ${previous.mes}.`;
    }
  }

  return `${worstMonth.mes} foi o pior mês, com ${worstMonth.saidas} saídas e churn de ${formatPercent(
    worstMonth.churn
  )}. ${trend}`;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-4 h-20 w-full" />
      </Card>
      <div className="grid gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="mt-6 h-12 w-28" />
            <Skeleton className="mt-4 h-4 w-40" />
            <Skeleton className="mt-4 h-8 w-28" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="p-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-5 h-40 w-full" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 2xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-5 h-72 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="flex min-h-[360px] flex-col items-center justify-center gap-5 p-10 text-center">
      <div className="rounded-full border border-rose-400/20 bg-rose-500/12 p-4 text-rose-300">
        <CircleAlert className="h-7 w-7" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-50">Falha ao carregar o dashboard</h2>
        <p className="max-w-xl text-sm leading-6 text-slate-300">{message}</p>
      </div>
      <Button onClick={onRetry}>Tentar novamente</Button>
    </Card>
  );
}

function CustomTooltip({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string; payload?: unknown }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-[18px] border border-white/15 bg-slate-950/80 p-3 shadow-2xl backdrop-blur-xl">
      <p className="mb-2 text-sm font-semibold text-slate-50">{label}</p>
      <div className="space-y-1.5">
        {payload.map((item) => (
          <div key={`${item.name}-${item.value}`} className="flex items-center justify-between gap-8 text-xs">
            <span className="flex items-center gap-2 text-slate-300">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color ?? "#93c5fd" }}
              />
              {item.name}
            </span>
            <span className="font-semibold text-slate-100">
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

function SectionShell({
  id,
  eyebrow,
  title,
  description,
  action,
  children
}: {
  id: SectionId;
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-sky-200/70">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
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
  icon: typeof Users;
  tone: keyof typeof healthGradient;
}) {
  const toneClasses = {
    blue: "text-sky-300",
    green: "text-emerald-300",
    yellow: "text-amber-300",
    red: "text-rose-300"
  } as const;

  const badgeTone = {
    blue: "blue",
    green: "green",
    yellow: "yellow",
    red: "red"
  } as const;

  return (
    <Card className="relative overflow-hidden p-5">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80", healthGradient[tone])} />
      <div className="relative">
        <CardHeader>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-300">{title}</p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/10 p-2 text-slate-100">
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="mt-6 space-y-3">
          <div className={cn("metric-number font-bold", toneClasses[tone])}>{value}</div>
          <p className="max-w-[18rem] text-sm text-slate-300">{description}</p>
          <Badge tone={badgeTone[tone]} className="w-fit">
            <ArrowUpRight className="h-3 w-3" />
            {badge}
          </Badge>
        </CardContent>
      </div>
    </Card>
  );
}

function MonthExitBar({ data }: { data: SaidasPorMes[] }) {
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

function GestorStatusCard({ gestores }: { gestores: GestorMetric[] }) {
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
          <CardTitle>Distribuição de Status</CardTitle>
          <p className="mt-1 text-sm text-slate-300">Barras empilhadas para comparar qualidade da carteira por gestor.</p>
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
                tick={{ fill: "#e2e8f0", fontSize: 12 }}
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

function GestorRadarCard({ gestores }: { gestores: GestorMetric[] }) {
  const maxLtv = Math.max(...gestores.map((gestor) => gestor.ltv_medio), 1);
  const radarData = gestores.map((gestor) => {
    const total = gestor.bons + gestor.alerta + gestor.critico;
    const control = total ? ((gestor.bons + gestor.alerta) / total) * 100 : 0;
    return {
      gestor: gestor.nome,
      "Taxa de sucesso": gestor.taxa_sucesso,
      "Retenção relativa": (gestor.ltv_medio / maxLtv) * 100,
      "Carteira controlada": control
    };
  });

  return (
    <Card className="p-6">
      <CardHeader>
        <div>
          <CardTitle>Mapa de Performance</CardTitle>
          <p className="mt-1 text-sm text-slate-300">Radar para enxergar sucesso, retenção relativa e controle de risco por gestor.</p>
        </div>
      </CardHeader>
      <CardContent className="mt-5">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart outerRadius="68%" data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="gestor" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Radar dataKey="Taxa de sucesso" fill="#38bdf8" stroke="#38bdf8" fillOpacity={0.25} />
              <Radar dataKey="Retenção relativa" fill="#34d399" stroke="#34d399" fillOpacity={0.2} />
              <Radar dataKey="Carteira controlada" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.18} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function EvolucaoTable({ data }: { data: ClientesDashboardData }) {
  const completed = data.evolucao_mensal.filter((item) => !item.parcial && item.churn !== null);

  return (
    <Card className="p-6">
      <CardHeader>
        <div>
          <CardTitle>Detalhamento Mensal</CardTitle>
          <p className="mt-1 text-sm text-slate-300">Leitura tática da base com insight automático gerado a partir do histórico fechado.</p>
        </div>
      </CardHeader>
      <CardContent className="mt-5 space-y-4">
        <div className="overflow-hidden rounded-[18px] border border-white/10 bg-slate-950/20">
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
                  <TableCell className="font-medium text-slate-100">{row.mes}</TableCell>
                  <TableCell>{row.base_inicio}</TableCell>
                  <TableCell className="text-emerald-300">{row.entradas ?? "—"}</TableCell>
                  <TableCell className="text-rose-300">-{row.saidas}</TableCell>
                  <TableCell className="text-right">
                    {row.parcial ? <Badge tone="gray">Em aberto</Badge> : <Badge tone={getToneFromChurn(row.churn)}>{formatPercent(row.churn)}</Badge>}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-white/[0.04] hover:bg-white/[0.04]">
                <TableCell className="font-semibold text-white">Média</TableCell>
                <TableCell colSpan={3} className="text-slate-300">
                  Somente meses fechados
                </TableCell>
                <TableCell className="text-right font-semibold text-white">
                  {formatPercent(
                    completed.reduce((acc, item) => acc + (item.churn ?? 0), 0) / Math.max(completed.length, 1)
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div className="rounded-[18px] border border-sky-300/15 bg-sky-400/10 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-sky-200">Insight automático</p>
          <p className="mt-2 text-sm leading-6 text-slate-100">{buildInsight(data.evolucao_mensal)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { data, loading, error, refetch } = useClientesData();
  const [activeSection, setActiveSection] = useState<SectionId>("overview");

  useEffect(() => {
    const sectionElements = SECTION_IDS
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id && SECTION_IDS.includes(visible.target.id as SectionId)) {
          setActiveSection(visible.target.id as SectionId);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.2, 0.45, 0.65]
      }
    );

    sectionElements.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const healthPieData = useMemo(
    () =>
      data
        ? [
            { name: "Bons", value: data.clientes_bons, color: statusColors.bons },
            { name: "Alerta", value: data.clientes_alerta, color: statusColors.alerta },
            { name: "Crítico", value: data.clientes_critico, color: statusColors.critico }
          ]
        : [],
    [data]
  );

  const momentumData = useMemo(
    () =>
      data
        ? data.evolucao_mensal.map((item) => ({
            mes: shortMonthLabel(item.mes),
            churn: item.churn ?? 0,
            base: item.base_inicio,
            saldo: (item.entradas ?? 0) - item.saidas
          }))
        : [],
    [data]
  );

  const gestorPerformanceData = useMemo(
    () =>
      data
        ? [...data.por_gestor]
            .sort((a, b) => b.taxa_sucesso - a.taxa_sucesso)
            .map((gestor) => ({
              ...gestor,
              color:
                gestor.taxa_sucesso >= 65
                  ? statusColors.bons
                  : gestor.taxa_sucesso >= 45
                    ? statusColors.alerta
                    : statusColors.critico
            }))
        : [],
    [data]
  );

  const monthlyExitVolumes = useMemo(
    () =>
      data
        ? data.saidas_por_mes.map((item) => ({
            mes: shortMonthLabel(item.mes),
            mesCompleto: item.mes,
            saidas: item.clientes.length,
            churn: item.churn ?? 0
          }))
        : [],
    [data]
  );

  const topExitMonths = useMemo(
    () =>
      data
        ? [...data.saidas_por_mes].sort((a, b) => b.clientes.length - a.clientes.length).slice(0, 3)
        : [],
    [data]
  );

  const scrollToSection = (id: SectionId) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-slate-50">
      <div className="glass-orb left-[-6rem] top-[6rem] h-72 w-72 bg-sky-400/35" />
      <div className="glass-orb right-[-4rem] top-[20rem] h-80 w-80 bg-teal-400/20" />
      <div className="glass-orb bottom-[-8rem] left-[22%] h-72 w-72 bg-blue-500/18" />

      <div className="relative z-10 mx-auto flex max-w-[1880px] flex-col md:flex-row">
        <aside className="border-b border-white/10 bg-slate-950/35 px-5 py-6 backdrop-blur-2xl md:sticky md:top-0 md:h-screen md:w-[290px] md:border-b-0 md:border-r">
          <div className="flex h-full flex-col">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.06] px-5 py-5 shadow-2xl shadow-sky-950/20">
              <Image
                src="/logomarcha.png"
                alt="Marcha Ads"
                width={700}
                height={495}
                priority
                className="h-auto w-full max-w-[172px]"
              />
              <p className="mt-3 max-w-[180px] text-sm leading-6 text-slate-300">
                Monitor premium de retenção, carteira e risco operacional.
              </p>
            </div>

            <div className="relative mt-8">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input disabled placeholder="Navegação do dashboard" className="border-white/10 bg-white/[0.04] pl-11" />
            </div>

            <nav className="mt-8 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={cn(
                      "group flex w-full items-start gap-3 rounded-[18px] border px-4 py-3 text-left transition duration-300",
                      isActive
                        ? "border-sky-300/25 bg-sky-300/14 text-white shadow-lg shadow-sky-950/25"
                        : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/14 hover:bg-white/[0.06]"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 rounded-full border p-2 transition",
                        isActive ? "border-sky-200/30 bg-sky-300/18 text-sky-200" : "border-white/10 bg-white/[0.04]"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{item.caption}</p>
                    </div>
                  </button>
                );
              })}
            </nav>

            <div className="mt-8 rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-sky-300/12 text-sm font-bold text-sky-200">
                  MD
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">Marcha Digital</p>
                  <p className="text-xs text-slate-400">Agência de Tráfego Pago</p>
                </div>
              </div>
            </div>

            <div className="mt-auto rounded-[22px] border border-white/10 bg-gradient-to-br from-sky-400/14 via-white/[0.02] to-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-sky-200/70">Modo analítico</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Cada botão da barra lateral agora ancora a leitura da página na seção correspondente.
              </p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <header className="mb-6 rounded-[28px] border border-white/10 bg-slate-950/25 px-6 py-5 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.22em] text-sky-200/80">
                  <Sparkles className="h-3.5 w-3.5" />
                  Dashboard / Saúde de Clientes 2026
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                  Controle de carteira com linguagem de produto premium.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                  Refatorado em glassmorphism com camadas translúcidas, navegação por seção e leitura executiva
                  contínua da saúde, retenção, risco e histórico de churn.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
                  Última atualização: <span className="font-semibold text-white">{data?.atualizado_em ?? "—"}</span>
                </div>
                <Button className="rounded-[18px] bg-sky-400 text-slate-950 hover:bg-sky-300" onClick={() => void refetch()}>
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  Atualizar
                </Button>
              </div>
            </div>
          </header>

          {loading ? (
            <DashboardSkeleton />
          ) : error || !data ? (
            <ErrorState message={error ?? "Nenhum dado retornado pela API."} onRetry={() => void refetch()} />
          ) : (
            <div className="space-y-12 pb-10">
              <section className="scroll-mt-24">
                <Card className="relative overflow-hidden p-6 sm:p-8">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_20%,rgba(56,189,248,0.22),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(45,212,191,0.18),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]" />
                  <div className="relative grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs uppercase tracking-[0.22em] text-slate-200">
                        <Target className="h-3.5 w-3.5 text-sky-200" />
                        Health signal
                      </div>
                      <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                        Sua carteira está saudável, mas com uma zona de risco relevante para intervenção imediata.
                      </h2>
                      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                        O painel agora prioriza contraste, profundidade e navegação para transformar o dado em leitura
                        executiva. A base ativa atual soma <span className="font-semibold text-white">{data.clientes_ativos}</span> contas,
                        com variação de <span className="font-semibold text-white">{formatSignedPercent(data.variacao_base)}</span> frente ao último
                        ponto histórico.
                      </p>

                      <div className="mt-8 grid gap-4 sm:grid-cols-3">
                        <div className="rounded-[20px] border border-white/10 bg-white/[0.05] p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Taxa de sucesso</p>
                          <p className="mt-3 text-3xl font-semibold text-white">{formatPercent(data.taxa_sucesso)}</p>
                        </div>
                        <div className="rounded-[20px] border border-white/10 bg-white/[0.05] p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">LTV médio</p>
                          <p className="mt-3 text-3xl font-semibold text-white">{formatMonths(data.ltv_medio)} meses</p>
                        </div>
                        <div className="rounded-[20px] border border-white/10 bg-white/[0.05] p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Churn médio</p>
                          <p className={cn("mt-3 text-3xl font-semibold", getChurnColor(data.churn_medio))}>{formatPercent(data.churn_medio)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <Card className="p-5">
                        <CardHeader>
                          <div>
                            <CardTitle>Mix da Carteira</CardTitle>
                            <p className="mt-1 text-sm text-slate-300">Donut de saúde com leitura imediata do portfólio.</p>
                          </div>
                        </CardHeader>
                        <CardContent className="mt-3 grid grid-cols-[180px_1fr] items-center gap-2">
                          <div className="h-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={healthPieData}
                                  dataKey="value"
                                  nameKey="name"
                                  innerRadius={54}
                                  outerRadius={76}
                                  stroke="transparent"
                                  paddingAngle={3}
                                >
                                  {healthPieData.map((entry) => (
                                    <Cell key={entry.name} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="space-y-3">
                            {healthPieData.map((item) => (
                              <div key={item.name} className="rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-sm font-medium text-slate-100">{item.name}</span>
                                  </div>
                                  <span className="text-sm text-slate-300">{item.value}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </Card>
              </section>

              <SectionShell
                id="overview"
                eyebrow="Overview"
                title="Saúde geral da operação"
                description="Cards com leitura tática rápida, usando camadas translúcidas, badges mais claros e composição mais editorial."
              >
                <div className="grid gap-4 xl:grid-cols-4">
                  <MetricCard
                    title="Clientes Ativos"
                    value={data.clientes_ativos}
                    description="Base ativa utilizada como denominador principal das métricas de saúde."
                    badge={`${formatSignedPercent(data.variacao_base)} vs. referência`}
                    icon={Users}
                    tone="blue"
                  />
                  <MetricCard
                    title="Clientes Bons"
                    value={data.clientes_bons}
                    description="Carteira saudável, estável e com maior propensão de retenção."
                    badge={`${formatPercent(data.perc_bons)} da base`}
                    icon={ShieldCheck}
                    tone="green"
                  />
                  <MetricCard
                    title="Sinal de Alerta"
                    value={data.clientes_alerta}
                    description="Clientes que pedem atenção, mas ainda têm espaço para recuperação."
                    badge={`${formatPercent(data.perc_alerta)} da base`}
                    icon={AlertTriangle}
                    tone="yellow"
                  />
                  <MetricCard
                    title="Situação Crítica"
                    value={data.clientes_critico}
                    description="Risco alto, urgência de plano de ação e acompanhamento de liderança."
                    badge={`${formatPercent(data.perc_critico)} da base`}
                    icon={ShieldAlert}
                    tone="red"
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  <Card className="p-6">
                    <CardHeader>
                      <div>
                        <CardTitle>LTV Médio & Mediana</CardTitle>
                        <p className="mt-1 text-sm text-slate-300">Distância entre permanência média e concentração real da carteira.</p>
                      </div>
                    </CardHeader>
                    <CardContent className="mt-5">
                      <div className="flex items-end gap-3">
                        <div className="metric-number font-bold text-sky-300">{formatMonths(data.ltv_medio)}</div>
                        <span className="pb-1 text-lg font-medium text-slate-100">meses</span>
                      </div>
                      <div className="mt-5 rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Mediana</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{formatMonths(data.ltv_mediana)} meses</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="p-6">
                    <CardHeader>
                      <div>
                        <CardTitle>Pulse da Carteira</CardTitle>
                        <p className="mt-1 text-sm text-slate-300">Área e linha para cruzar base e churn em leitura compacta.</p>
                      </div>
                    </CardHeader>
                    <CardContent className="mt-5">
                      <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={momentumData} margin={{ top: 0, right: 0, left: -16, bottom: 0 }}>
                            <defs>
                              <linearGradient id="overviewBase" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.34} />
                                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="base" stroke="#38bdf8" strokeWidth={2.5} fill="url(#overviewBase)" name="Base" />
                            <Line type="monotone" dataKey="churn" stroke="#f97316" strokeWidth={2.5} dot={false} name="Churn %" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="p-6">
                    <CardHeader>
                      <div>
                        <CardTitle>Saldo Mensal</CardTitle>
                        <p className="mt-1 text-sm text-slate-300">Linha líquida entre entradas e saídas por mês.</p>
                      </div>
                    </CardHeader>
                    <CardContent className="mt-5 space-y-4">
                      <div className="h-[170px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={momentumData} margin={{ top: 0, right: 0, left: -16, bottom: 0 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                              type="monotone"
                              dataKey="saldo"
                              stroke="#22c55e"
                              strokeWidth={2.5}
                              dot={{ r: 3, fill: "#22c55e" }}
                              name="Saldo"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-300">Churn médio</span>
                          <span className={cn("text-lg font-semibold", getChurnColor(data.churn_medio))}>{formatPercent(data.churn_medio)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </SectionShell>

              <SectionShell
                id="gestores"
                eyebrow="Gestores"
                title="Leitura por liderança"
                description="Além da barra empilhada, o radar adiciona outro tipo de leitura para sucesso, retenção e controle de risco."
                action={
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-300">
                    <Activity className="h-3.5 w-3.5 text-sky-200" />
                    {gestorPerformanceData.length} gestores ativos
                  </div>
                }
              >
                <div className="grid gap-4 2xl:grid-cols-2">
                  <GestorStatusCard gestores={data.por_gestor} />
                  <GestorRadarCard gestores={data.por_gestor} />
                </div>

                <Card className="p-6">
                  <CardHeader>
                    <div>
                      <CardTitle>Leaderboard Executivo</CardTitle>
                      <p className="mt-1 text-sm text-slate-300">Faixas de progresso com glass layers para comparar taxa de sucesso e LTV médio.</p>
                    </div>
                  </CardHeader>
                  <CardContent className="mt-5 space-y-4">
                    {gestorPerformanceData.map((gestor, index) => (
                      <div key={gestor.nome} className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-sm font-semibold text-white">
                              {String(index + 1).padStart(2, "0")}
                            </div>
                            <div>
                              <p className="text-base font-semibold text-white">{gestor.nome}</p>
                              <p className="text-sm text-slate-400">{formatMonths(gestor.ltv_medio)} meses de LTV médio</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge tone={gestor.taxa_sucesso >= 65 ? "green" : gestor.taxa_sucesso >= 45 ? "yellow" : "red"}>
                              {formatPercent(gestor.taxa_sucesso)}
                            </Badge>
                            <ArrowRight className="h-4 w-4 text-slate-500" />
                          </div>
                        </div>
                        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-950/40">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.max(gestor.taxa_sucesso, 4)}%`,
                              background: `linear-gradient(90deg, ${gestor.color}, rgba(255,255,255,0.85))`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </SectionShell>

              <SectionShell
                id="mensal"
                eyebrow="Mensal"
                title="Base, churn e narrativa temporal"
                description="O foco aqui é leitura de tendência. O gráfico principal cruza base e churn, enquanto a tabela sustenta a análise operacional."
              >
                <div className="grid gap-4 2xl:grid-cols-[1.2fr_0.8fr]">
                  <Card className="p-6">
                    <CardHeader>
                      <div>
                        <CardTitle>Evolução de Base x Churn</CardTitle>
                        <p className="mt-1 text-sm text-slate-300">Composed chart com área, linha e densidade visual mais refinada.</p>
                      </div>
                    </CardHeader>
                    <CardContent className="mt-5">
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
                            <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                            <YAxis
                              yAxisId="left"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#94a3b8", fontSize: 12 }}
                              tickFormatter={(value) => `${value}%`}
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#94a3b8", fontSize: 12 }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Area
                              yAxisId="right"
                              type="monotone"
                              dataKey="base_inicio"
                              name="Base de clientes"
                              fill="url(#monthlyBase)"
                              stroke="#38bdf8"
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
                    </CardContent>
                  </Card>

                  <EvolucaoTable data={data} />
                </div>
              </SectionShell>

              <SectionShell
                id="saidas"
                eyebrow="Saídas"
                title="Registro de churn com memória visual"
                description="A seção final usa outro tipo de gráfico para expor volume de saídas e mantém os cards mensais como camada de detalhe."
              >
                <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
                  <Card className="p-6">
                    <CardHeader>
                      <div>
                        <CardTitle>Volume de Saídas por Mês</CardTitle>
                        <p className="mt-1 text-sm text-slate-300">Barras coloridas por intensidade de churn para leitura rápida.</p>
                      </div>
                    </CardHeader>
                    <CardContent className="mt-5 space-y-5">
                      <MonthExitBar data={data.saidas_por_mes} />
                      <div className="grid gap-3">
                        {topExitMonths.map((month) => (
                          <div key={month.mes} className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-white">{month.mes}</p>
                                <p className="text-xs text-slate-400">{month.clientes.length} saídas no período</p>
                              </div>
                              <Badge tone={getToneFromChurn(month.churn)}>{formatPercent(month.churn)}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 lg:grid-cols-2">
                    {data.saidas_por_mes.map((mes) => (
                      <Card key={mes.mes} className="p-6">
                        <CardHeader className="items-start">
                          <div>
                            <CardTitle className="text-lg uppercase tracking-[0.08em] text-white">
                              {mes.mes} · {mes.clientes.length} saídas
                            </CardTitle>
                            <p className="mt-1 text-sm text-slate-400">Lista auditável para memória operacional do mês.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {mes.parcial && <Badge tone="gray">Em aberto</Badge>}
                            <Badge tone={getToneFromChurn(mes.churn)}>{mes.churn !== null ? formatPercent(mes.churn) : "—"}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="mt-5">
                          <div className="flex flex-wrap gap-2">
                            {mes.clientes.map((cliente) => (
                              <span
                                key={`${mes.mes}-${cliente}`}
                                className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-100"
                              >
                                {cliente}
                              </span>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </SectionShell>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
