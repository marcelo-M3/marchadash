"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Moon, RefreshCw, Sun, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
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
  { href: "/registro-de-saidas", label: "Análise de Churn", icon: LogOut }
];

type ThemeMode = "light" | "dark";

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
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    if (currentTheme === "light" || currentTheme === "dark") {
      setTheme(currentTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("marcha-theme", theme);
  }, [theme]);

  return (
    <div className="theme-app min-h-screen theme-text">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="theme-sidebar md:sticky md:top-0 md:h-screen md:w-[280px]">
          <div className="flex h-full flex-col">
            <div className="px-6 py-7">
              <div className="brand-logo" aria-label="Marcha Ads" role="img" />
            </div>

            <nav className="space-y-1 px-4 py-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left transition duration-200",
                      isActive
                        ? "bg-primary text-white shadow-sm"
                        : "theme-muted hover:bg-[var(--nav-hover)] hover:text-[var(--text-color)]"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-full p-2 transition",
                        isActive ? "bg-white/15 text-white" : "theme-icon-surface theme-muted"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto px-6 py-5">
              <div className="mx-auto w-fit rounded-full theme-soft-surface p-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full transition",
                      theme === "light" ? "bg-primary text-white shadow-sm" : "theme-muted"
                    )}
                    aria-label="Ativar tema claro"
                    title="Tema claro"
                  >
                    <Sun className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full transition",
                      theme === "dark" ? "bg-primary text-white shadow-sm" : "theme-muted"
                    )}
                    aria-label="Ativar tema escuro"
                    title="Tema escuro"
                  >
                    <Moon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1380px]">
          <header className="theme-surface mb-6 rounded-[24px] px-6 py-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className="theme-muted text-xs uppercase tracking-[0.22em]">Dashboard / Análise de Dados</p>
                <h1 className="theme-text mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">{title}</h1>
                <p className="theme-muted mt-3 max-w-2xl text-sm leading-7">{description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="theme-soft-surface theme-muted rounded-[16px] px-4 py-3 text-sm">
                  Última atualização: <span className="theme-text font-semibold">{updatedAt ?? "—"}</span>
                </div>
                <Button className="rounded-[16px] bg-primary text-white hover:bg-blue-600" onClick={onRefresh}>
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
                    "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm transition",
                    isActive
                      ? "bg-primary text-white"
                      : "theme-surface theme-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {children}
          </div>
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
