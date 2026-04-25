"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarRange, Clock3 } from "lucide-react";
import { DashboardDataPage } from "@/components/dashboard/dashboard-shell";
import {
  ChurnByDimensionChart,
  CohortRetentionHeatmap,
  InsightChip,
  MonthExitBar,
  SummaryCard,
  getChurnTone
} from "@/components/dashboard/dashboard-shared";
import { Badge } from "@/components/ui/badge";
import type { BaseClienteDetalhado, ClientesDashboardData } from "@/lib/types";
import { formatPercent } from "@/lib/utils";

type ExitItem = {
  key: string;
  mes: string;
  ano: string;
  label: string;
  churn: number | null;
  parcial: boolean;
  clientes: string[];
};

function parseExitMonth(label: string): { mes: string; ano: string } {
  const [mes, ano] = label.split("/");
  return { mes, ano: ano ?? "" };
}

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

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

function diffMonths(start: Date, end: Date) {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return `${monthNames[date.getMonth()]}/${date.getFullYear()}`;
}

function resolveEntry(record: BaseClienteDetalhado) {
  return parseMonthYear(record.ma_entrada) || (record.data_inicio ? new Date(record.data_inicio.split("/").reverse().join("-")) : null);
}

function resolveExit(record: BaseClienteDetalhado) {
  return parseMonthYear(record.ma_saida) || (record.data_saida ? new Date(record.data_saida.split("/").reverse().join("-")) : null);
}

export function SaidasPage() {
  return (
    <DashboardDataPage
      title="Análise de Churn"
      description="Veja o churn ao longo do tempo, analise saídas e filtre o detalhamento por mês e ano."
    >
      {(data) => <SaidasContent data={data} />}
    </DashboardDataPage>
  );
}

function SaidasContent({ data }: { data: ClientesDashboardData & { saidas_por_mes: ExitItem[] | any[] } }) {
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  const exitItems = useMemo<ExitItem[]>(
    () =>
      data.saidas_por_mes.map((item: any) => {
        const { mes, ano } = parseExitMonth(item.mes);
        return {
          key: item.mes,
          mes,
          ano,
          label: item.mes,
          churn: item.churn,
          parcial: item.parcial,
          clientes: item.clientes
        };
      }),
    [data]
  );

  const years = useMemo(
    () => Array.from(new Set(exitItems.map((item) => item.ano).filter(Boolean))).sort((a, b) => b.localeCompare(a)),
    [exitItems]
  );

  const monthsForYear = useMemo(
    () => exitItems.filter((item) => item.ano === selectedYear),
    [exitItems, selectedYear]
  );

  useEffect(() => {
    if (!years.length) return;
    setSelectedYear((current) => (years.includes(current) ? current : years[0]));
  }, [years]);

  useEffect(() => {
    if (!monthsForYear.length) return;
    const hasMonth = monthsForYear.some((item) => item.mes === selectedMonth);
    setSelectedMonth(hasMonth ? selectedMonth : monthsForYear[monthsForYear.length - 1].mes);
  }, [monthsForYear, selectedMonth]);

  const selectedExit =
    monthsForYear.find((item) => item.mes === selectedMonth) ?? monthsForYear[monthsForYear.length - 1];
  const totalSaidas = exitItems.reduce((acc, item) => acc + item.clientes.length, 0);
  const peakMonth = exitItems.reduce<ExitItem | null>((current, item) => {
    if (!current || item.clientes.length > current.clientes.length) return item;
    return current;
  }, null);
  const latestExit = exitItems[exitItems.length - 1];
  const base = data.base_clientes_detalhada ?? [];

  const prepared = useMemo(() => {
    return base
      .map((record) => {
        const entry = resolveEntry(record);
        const exit = resolveExit(record);
        return {
          ...record,
          entry,
          exit
        };
      })
      .filter((record) => record.entry);
  }, [base]);

  const cohortRows = useMemo(() => {
    const groups = new Map<string, typeof prepared>();
    prepared.forEach((record) => {
      if (!record.entry) return;
      const key = monthLabel(record.entry);
      const current = groups.get(key) ?? [];
      current.push(record);
      groups.set(key, current);
    });

    return Array.from(groups.entries())
      .sort((a, b) => {
        const da = resolveEntry(a[1][0] as BaseClienteDetalhado)!;
        const db = resolveEntry(b[1][0] as BaseClienteDetalhado)!;
        return db.getTime() - da.getTime();
      })
      .slice(0, 8)
      .map(([cohort, records]) => {
        const values = Array.from({ length: 6 }).map((_, index) => {
          const retained = records.filter((record) => {
            if (!record.entry) return false;
            if (!record.exit) return true;
            return diffMonths(record.entry, record.exit) >= index;
          }).length;
          return records.length ? Number(((retained / records.length) * 100).toFixed(1)) : null;
        });
        return { cohort, values };
      });
  }, [prepared]);

  const churnByOrigin = useMemo(() => {
    const exited = prepared.filter((record) => record.exit && record.origem);
    const topOrigins = Array.from(
      exited.reduce((acc, record) => {
        const key = record.origem || "Sem origem";
        acc.set(key, (acc.get(key) ?? 0) + 1);
        return acc;
      }, new Map<string, number>())
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name]) => name);

    const months = Array.from(new Set(exited.map((record) => monthKey(record.exit!))))
      .sort()
      .slice(-12);

    return months.map((key) => {
      const date = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1);
      const row: Record<string, any> = { mes: monthNames[date.getMonth()], tooltipLabel: monthLabel(date) };
      topOrigins.forEach((origin) => {
        row[origin] = exited.filter((record) => monthKey(record.exit!) === key && (record.origem || "Sem origem") === origin).length;
      });
      return row;
    });
  }, [prepared]);

  const churnByGestor = useMemo(() => {
    const exited = prepared.filter((record) => record.exit && record.gestor);
    const topGestores = Array.from(
      exited.reduce((acc, record) => {
        const key = record.gestor || "Sem gestor";
        acc.set(key, (acc.get(key) ?? 0) + 1);
        return acc;
      }, new Map<string, number>())
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    const months = Array.from(new Set(exited.map((record) => monthKey(record.exit!))))
      .sort()
      .slice(-12);

    return months.map((key) => {
      const date = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1);
      const row: Record<string, any> = { mes: monthNames[date.getMonth()], tooltipLabel: monthLabel(date) };
      topGestores.forEach((gestor) => {
        row[gestor] = exited.filter((record) => monthKey(record.exit!) === key && (record.gestor || "Sem gestor") === gestor).length;
      });
      return row;
    });
  }, [prepared]);

  return (
    <div className="space-y-8 pb-10">
      <div className="grid gap-3 md:grid-cols-3">
        <InsightChip
          label="Total de saídas"
          value={String(totalSaidas)}
          tone="blue"
          icon={CalendarRange}
          tooltip="Soma de todos os clientes listados em saidas_por_mes ao longo da série histórica."
        />
        <InsightChip
          label="Pico mensal"
          value={peakMonth ? `${peakMonth.label} · ${peakMonth.clientes.length}` : "—"}
          tone="red"
          icon={AlertTriangle}
          tooltip="Mês com o maior número absoluto de saídas registradas."
        />
        <InsightChip
          label="Último mês com saída"
          value={latestExit ? `${latestExit.label} · ${latestExit.clientes.length}` : "—"}
          tone="yellow"
          icon={Clock3}
          tooltip="Último período da série que registrou clientes na lista de saídas."
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <SummaryCard title="Volume de churn por mês" description="Mostra quantos clientes saíram nos últimos 12 meses.">
          <MonthExitBar data={data.saidas_por_mes} />
        </SummaryCard>

        <SummaryCard title="Detalhamento" description="Escolha o mês e o ano para ver apenas a lista daquele período.">
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
                {monthsForYear.map((item) => (
                  <option
                    key={item.key}
                    value={item.mes}
                    style={{ background: "var(--surface)", color: "var(--text-color)" }}
                  >
                    {item.mes}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedExit ? (
            <div className="mt-6 space-y-4">
              <div className="theme-soft-surface flex flex-col gap-3 rounded-[20px] border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="theme-text text-lg font-semibold">{selectedExit.label}</p>
                  <p className="theme-muted text-sm">{selectedExit.clientes.length} saídas registradas</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedExit.parcial ? <Badge tone="gray">Em aberto</Badge> : null}
                  <Badge tone={getChurnTone(selectedExit.churn)}>
                    {selectedExit.churn !== null ? formatPercent(selectedExit.churn) : "—"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedExit.clientes.map((cliente) => (
                  <span
                    key={`${selectedExit.key}-${cliente}`}
                    className="theme-surface theme-text rounded-full border px-3 py-2 text-sm"
                  >
                    {cliente}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="theme-soft-surface theme-muted mt-6 rounded-[18px] border p-4 text-sm">
              Nenhum detalhe encontrado para o filtro atual.
            </div>
          )}
        </SummaryCard>
      </div>

      {!!data.base_clientes_detalhada?.length && (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <SummaryCard title="Cohort de retenção" description="Mostra retenção real por safra de entrada ao longo dos primeiros meses.">
              <CohortRetentionHeatmap rows={cohortRows} />
            </SummaryCard>
            <SummaryCard title="Churn por origem de cliente" description="Mostra quais origens concentram mais saídas em cada mês.">
              <ChurnByDimensionChart data={churnByOrigin} dimensionLabel="Origem" />
            </SummaryCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-1">
            <SummaryCard title="Churn por gestor" description="Mostra quais carteiras concentram mais saídas ao longo do tempo.">
              <ChurnByDimensionChart data={churnByGestor} dimensionLabel="Gestor" />
            </SummaryCard>
          </div>
        </>
      )}
    </div>
  );
}
