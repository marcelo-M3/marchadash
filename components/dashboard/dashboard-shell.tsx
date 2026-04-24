"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, RefreshCw, TrendingUp, Users } from "lucide-react";
import { useClientesData } from "@/hooks/use-clientes-data";
import { ClientesDashboardData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DashboardErrorState, DashboardSkeleton } from "@/components/dashboard/dashboard-shared";
import { Button } from "@/components/ui/button";

type NavItem = {
  href: Route;
  label: string;
  icon: typeof LayoutDashboard;
};

const navItems: NavItem[] = [
  { href: "/", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/gestores", label: "Por Gestor", icon: Users },
  { href: "/evolucao-mensal", label: "Evolução Mensal", icon: TrendingUp },
  { href: "/registro-de-saidas", label: "Registro de Saídas", icon: LogOut }
];

export function DashboardShell({
  title,
  description,
  updatedAt,
  loading,
  onRefresh,
  children
}: {
  title: string;
  description: string;
  updatedAt?: string;
  loading: boolean;
  onRefresh: () => void;
  children: ReactNode;
}) {
  const pathname = usePathname();

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
            </div>

            <nav className="mt-8 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-[18px] border px-4 py-3 text-left transition duration-300",
                      isActive
                        ? "border-sky-300/25 bg-sky-300/14 text-white shadow-lg shadow-sky-950/25"
                        : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/14 hover:bg-white/[0.06]"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-full border p-2 transition",
                        isActive ? "border-sky-200/30 bg-sky-300/18 text-sky-200" : "border-white/10 bg-white/[0.04]"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
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
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <header className="mb-6 rounded-[28px] border border-white/10 bg-slate-950/25 px-6 py-5 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs uppercase tracking-[0.22em] text-sky-200/80">Dashboard / Saúde de Clientes</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">{title}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">{description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
                  Última atualização: <span className="font-semibold text-white">{updatedAt ?? "—"}</span>
                </div>
                <Button className="rounded-[18px] bg-sky-400 text-slate-950 hover:bg-sky-300" onClick={onRefresh}>
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  Atualizar
                </Button>
              </div>
            </div>
          </header>

          <div className="scrollbar-subtle mb-8 flex gap-3 overflow-x-auto pb-2 md:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={`mobile-${item.href}`}
                  href={item.href}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition",
                    isActive
                      ? "border-sky-300/25 bg-sky-300/14 text-white"
                      : "border-white/10 bg-white/[0.04] text-slate-300"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}

export function DashboardDataPage({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: (data: ClientesDashboardData) => ReactNode;
}) {
  const { data, loading, error, refetch } = useClientesData();

  return (
    <DashboardShell
      title={title}
      description={description}
      updatedAt={data?.atualizado_em}
      loading={loading}
      onRefresh={() => void refetch()}
    >
      {loading ? (
        <DashboardSkeleton />
      ) : error || !data ? (
        <DashboardErrorState
          message={error ?? "Nenhum dado retornado pela API."}
          onRetry={() => void refetch()}
        />
      ) : (
        children(data)
      )}
    </DashboardShell>
  );
}
