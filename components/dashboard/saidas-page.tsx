"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardDataPage } from "@/components/dashboard/dashboard-shell";
import { InsightChip, MonthExitBar, SummaryCard, getChurnTone } from "@/components/dashboard/dashboard-shared";
import { Badge } from "@/components/ui/badge";
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

export function SaidasPage() {
  return (
    <DashboardDataPage
      title="Registro de saídas"
      description="Veja o volume de saídas ao longo do tempo e filtre o detalhamento por mês e ano."
    >
      {(data) => <SaidasContent data={data} />}
    </DashboardDataPage>
  );
}

function SaidasContent({ data }: { data: { saidas_por_mes: ExitItem[] | any[] } & any }) {
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

  return (
    <div className="space-y-8 pb-10">
      <div className="grid gap-3 md:grid-cols-3">
        <InsightChip label="Meses com saídas" value={String(data.saidas_por_mes.length)} />
        <InsightChip
          label="Maior volume"
          value={exitItems.length ? `${Math.max(...exitItems.map((item) => item.clientes.length))} saídas` : "—"}
          tone="red"
        />
        <InsightChip label="Último período" value={exitItems.at(-1)?.label ?? "—"} tone="blue" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <SummaryCard title="Volume de saídas por mês" description="Mostra quantos clientes saíram em cada período.">
          <MonthExitBar data={data.saidas_por_mes} />
        </SummaryCard>

        <SummaryCard title="Detalhamento" description="Escolha o mês e o ano para ver apenas a lista daquele período.">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Ano</span>
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="h-11 w-full rounded-[14px] border border-white/5 bg-white/[0.03] px-4 text-sm text-slate-100 outline-none transition focus:border-primary/60 focus:bg-white/[0.05]"
              >
                {years.map((year) => (
                  <option key={year} value={year} className="bg-slate-950">
                    {year}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Mês</span>
              <select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="h-11 w-full rounded-[14px] border border-white/5 bg-white/[0.03] px-4 text-sm text-slate-100 outline-none transition focus:border-primary/60 focus:bg-white/[0.05]"
              >
                {monthsForYear.map((item) => (
                  <option key={item.key} value={item.mes} className="bg-slate-950">
                    {item.mes}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedExit ? (
            <div className="mt-6 space-y-4">
              <div className="flex flex-col gap-3 rounded-[20px] border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">{selectedExit.label}</p>
                  <p className="text-sm text-slate-400">{selectedExit.clientes.length} saídas registradas</p>
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
                    className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-100"
                  >
                    {cliente}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[18px] border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
              Nenhum detalhe encontrado para o filtro atual.
            </div>
          )}
        </SummaryCard>
      </div>
    </div>
  );
}
