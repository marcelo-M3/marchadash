"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarRange, Clock3 } from "lucide-react";
import { DashboardDataPage } from "@/components/dashboard/dashboard-shell";
import {
  ChurnByDimensionChart,
  InsightChip,
  MonthExitBar,
  SummaryCard,
  getChurnTone
} from "@/components/dashboard/dashboard-shared";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

type ChartViewMode = "last12" | "period";

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function parseExitMonth(label: string): { mes: string; ano: string } {
  const [mes, ano] = label.split("/");
  return { mes, ano: ano ?? "" };
}

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

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return `${monthNames[date.getMonth()]}/${date.getFullYear()}`;
}

function parseChartPeriod(label: string) {
  const [mes, ano] = label.split("/");
  return { mes: mes ?? "", ano: ano ?? "" };
}

function resolveEntry(record: BaseClienteDetalhado) {
  return parseMonthYear(record.ma_entrada) || (record.data_inicio ? new Date(record.data_inicio.split("/").reverse().join("-")) : null);
}

function resolveExit(record: BaseClienteDetalhado) {
  return parseMonthYear(record.ma_saida) || (record.data_saida ? new Date(record.data_saida.split("/").reverse().join("-")) : null);
}

function filterDimensionRows(
  rows: Array<Record<string, any>>,
  mode: ChartViewMode,
  year: string,
  month: string
) {
  if (mode === "last12") return rows.slice(-12);

  return rows.filter((row) => {
    const parsed = parseChartPeriod(String(row.tooltipLabel ?? ""));
    if (parsed.ano !== year) return false;
    if (month === "all") return true;
    return parsed.mes === month;
  });
}

function summarizeDimension(rows: Array<Record<string, any>>, label: string) {
  const totals = new Map<string, number>();
  rows.forEach((row) => {
    Object.entries(row).forEach(([key, value]) => {
      if (key === "mes" || key === "tooltipLabel") return;
      totals.set(key, (totals.get(key) ?? 0) + Number(value));
    });
  });

  const top = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])[0];
  if (!top) {
    return `Ainda não há dados suficientes para destacar o ${label} com mais churn no período.`;
  }

  return `${top[0]} concentra o maior churn por ${label} no período exibido, com ${top[1]} saídas registradas.`;
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
  const [originMode, setOriginMode] = useState<ChartViewMode>("last12");
  const [originYear, setOriginYear] = useState("");
  const [originMonth, setOriginMonth] = useState("all");
  const [nichoMode, setNichoMode] = useState<ChartViewMode>("last12");
  const [nichoYear, setNichoYear] = useState("");
  const [nichoMonth, setNichoMonth] = useState("all");

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

  const buildDimensionRows = (field: "origem" | "nicho") => {
    const exited = prepared.filter((record) => record.exit && record[field]);
    const topValues = Array.from(
      exited.reduce((acc, record) => {
        const key = (record[field] as string) || (field === "origem" ? "Sem origem" : "Sem nicho");
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
      topValues.forEach((value) => {
        row[value] = exited.filter(
          (record) => monthKey(record.exit!) === key && ((record[field] as string) || (field === "origem" ? "Sem origem" : "Sem nicho")) === value
        ).length;
      });
      return row;
    });
  };

  const churnByOrigin = useMemo(() => buildDimensionRows("origem"), [prepared]);
  const churnByNicho = useMemo(() => buildDimensionRows("nicho"), [prepared]);

  const originYears = useMemo(
    () =>
      Array.from(new Set(churnByOrigin.map((row) => parseChartPeriod(String(row.tooltipLabel ?? "")).ano).filter(Boolean))).sort((a, b) =>
        b.localeCompare(a)
      ),
    [churnByOrigin]
  );

  const nicheYears = useMemo(
    () =>
      Array.from(new Set(churnByNicho.map((row) => parseChartPeriod(String(row.tooltipLabel ?? "")).ano).filter(Boolean))).sort((a, b) =>
        b.localeCompare(a)
      ),
    [churnByNicho]
  );

  useEffect(() => {
    if (!originYears.length) return;
    setOriginYear((current) => (originYears.includes(current) ? current : originYears[0]));
  }, [originYears]);

  useEffect(() => {
    if (!nicheYears.length) return;
    setNichoYear((current) => (nicheYears.includes(current) ? current : nicheYears[0]));
  }, [nicheYears]);

  const originMonths = useMemo(
    () =>
      churnByOrigin
        .map((row) => parseChartPeriod(String(row.tooltipLabel ?? "")))
        .filter((row) => row.ano === originYear)
        .map((row) => row.mes),
    [churnByOrigin, originYear]
  );

  const nicheMonths = useMemo(
    () =>
      churnByNicho
        .map((row) => parseChartPeriod(String(row.tooltipLabel ?? "")))
        .filter((row) => row.ano === nichoYear)
        .map((row) => row.mes),
    [churnByNicho, nichoYear]
  );

  useEffect(() => {
    const exists = originMonths.includes(originMonth);
    setOriginMonth(exists || originMonth === "all" ? originMonth : "all");
  }, [originMonths, originMonth]);

  useEffect(() => {
    const exists = nicheMonths.includes(nichoMonth);
    setNichoMonth(exists || nichoMonth === "all" ? nichoMonth : "all");
  }, [nicheMonths, nichoMonth]);

  const originRows = filterDimensionRows(churnByOrigin, originMode, originYear, originMonth);
  const nicheRows = filterDimensionRows(churnByNicho, nichoMode, nichoYear, nichoMonth);
  const clienteLookup = useMemo(
    () =>
      new Map(
        (data.base_clientes_detalhada ?? []).map((cliente) => [cliente.nome, cliente])
      ),
    [data.base_clientes_detalhada]
  );
  const detailedExitRows = useMemo(
    () =>
      (selectedExit?.clientes ?? []).map((nome) => {
        const match = clienteLookup.get(nome);
        return {
          nome,
          gestor: match?.gestor ?? "—",
          origem: match?.origem ?? "—",
          nicho: match?.nicho ?? "—"
        };
      }),
    [clienteLookup, selectedExit]
  );

  const renderChartActions = (
    mode: ChartViewMode,
    setMode: (value: ChartViewMode) => void,
    year: string,
    setYear: (value: string) => void,
    month: string,
    setMonth: (value: string) => void,
    yearsList: string[],
    monthsList: string[]
  ) => (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={mode}
        onChange={(event) => setMode(event.target.value as ChartViewMode)}
        className="theme-soft-surface theme-text h-9 rounded-full border px-3 text-xs outline-none"
      >
        <option value="last12" style={{ background: "var(--surface)", color: "var(--text-color)" }}>
          Últimos 12 meses
        </option>
        <option value="period" style={{ background: "var(--surface)", color: "var(--text-color)" }}>
          Período
        </option>
      </select>

      {mode === "period" ? (
        <>
          <select
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="theme-soft-surface theme-text h-9 rounded-full border px-3 text-xs outline-none"
          >
            {yearsList.map((item) => (
              <option key={item} value={item} style={{ background: "var(--surface)", color: "var(--text-color)" }}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="theme-soft-surface theme-text h-9 rounded-full border px-3 text-xs outline-none"
          >
            <option value="all" style={{ background: "var(--surface)", color: "var(--text-color)" }}>
              Todos os meses
            </option>
            {monthsList.map((item) => (
              <option key={item} value={item} style={{ background: "var(--surface)", color: "var(--text-color)" }}>
                {item}
              </option>
            ))}
          </select>
        </>
      ) : null}
    </div>
  );

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

      <SummaryCard title="Volume de churn por mês" description="Mostra quantos clientes saíram nos últimos 12 meses.">
        <MonthExitBar data={data.saidas_por_mes} />
      </SummaryCard>

      {!!data.base_clientes_detalhada?.length && (
        <div className="grid gap-4 xl:grid-cols-2">
          <SummaryCard
            title="Churn por origem de cliente"
            description="Mostra quais origens concentram mais saídas em cada mês."
            actions={renderChartActions(originMode, setOriginMode, originYear, setOriginYear, originMonth, setOriginMonth, originYears, originMonths)}
          >
            <div className="space-y-4">
              <ChurnByDimensionChart data={originRows} palette={["#1a68ff", "#4b8dff", "#7ab0ff", "#c9cfe5"]} />
              <div className="theme-strong-surface rounded-[18px] border p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-primary">Leitura rápida</p>
                <p className="theme-text mt-2 text-sm leading-6">{summarizeDimension(originRows, "origem")}</p>
              </div>
            </div>
          </SummaryCard>

          <SummaryCard
            title="Churn por nicho"
            description="Mostra quais nichos concentram mais saídas nos últimos 12 meses."
            actions={renderChartActions(nichoMode, setNichoMode, nichoYear, setNichoYear, nichoMonth, setNichoMonth, nicheYears, nicheMonths)}
          >
            <div className="space-y-4">
              <ChurnByDimensionChart data={nicheRows} palette={["#7c3aed", "#a855f7", "#22c55e", "#06b6d4", "#f59e0b"]} />
              <div className="theme-strong-surface rounded-[18px] border p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-primary">Leitura rápida</p>
                <p className="theme-text mt-2 text-sm leading-6">{summarizeDimension(nicheRows, "nicho")}</p>
              </div>
            </div>
          </SummaryCard>
        </div>
      )}

      <SummaryCard title="Detalhamento" description="Escolha o mês e o ano para ver a lista do período.">
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
                <option key={item.key} value={item.mes} style={{ background: "var(--surface)", color: "var(--text-color)" }}>
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

            <div className="theme-surface overflow-hidden rounded-[18px] border">
              <div className="max-h-[360px] overflow-auto scrollbar-subtle">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Cliente</TableHead>
                      <TableHead>Gestor</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Nicho</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedExitRows.map((row) => (
                      <TableRow key={`${selectedExit.key}-${row.nome}`}>
                        <TableCell className="theme-text font-medium">{row.nome}</TableCell>
                        <TableCell>{row.gestor}</TableCell>
                        <TableCell>{row.origem}</TableCell>
                        <TableCell>{row.nicho}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : (
          <div className="theme-soft-surface theme-muted mt-6 rounded-[18px] border p-4 text-sm">
            Nenhum detalhe encontrado para o filtro atual.
          </div>
        )}
      </SummaryCard>
    </div>
  );
}
