"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardDataPage } from "@/components/dashboard/dashboard-shell";
import { SummaryCard } from "@/components/dashboard/dashboard-shared";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClienteDetalhado, ClientesDashboardData } from "@/lib/types";
import { formatMonths } from "@/lib/utils";

export type ClienteFiltro = "ativos" | "bons" | "alerta" | "critico";

const filterMeta: Record<
  ClienteFiltro,
  {
    title: string;
    description: string;
  }
> = {
  ativos: {
    title: "Clientes ativos",
    description: "Lista da base usada para calcular as métricas gerais."
  },
  bons: {
    title: "Clientes bons",
    description: "Clientes em situação estável, com maior previsibilidade de retenção."
  },
  alerta: {
    title: "Sinal de alerta",
    description: "Clientes que pedem acompanhamento mais próximo da operação."
  },
  critico: {
    title: "Situação crítica",
    description: "Clientes com maior risco e necessidade de intervenção imediata."
  }
};

const statusToneMap = {
  bom: "green",
  alerta: "yellow",
  critico: "red"
} as const;

function getExpectedCount(data: ClientesDashboardData, filter: ClienteFiltro) {
  switch (filter) {
    case "ativos":
      return data.clientes_ativos;
    case "bons":
      return data.clientes_bons;
    case "alerta":
      return data.clientes_alerta;
    case "critico":
      return data.clientes_critico;
  }
}

function getFilteredClients(data: ClientesDashboardData, filter: ClienteFiltro) {
  const details = data.clientes_detalhados ?? [];

  if (filter === "ativos") {
    return details;
  }

  const statusMap = {
    bons: "bom",
    alerta: "alerta",
    critico: "critico"
  } as const;

  return details.filter((cliente) => cliente.status === statusMap[filter]);
}

function MissingPayloadState({ expectedCount }: { expectedCount: number }) {
  return (
    <SummaryCard
      title="Lista indisponível"
      description="A API atual ainda não enviou o detalhamento dos clientes para esta tela."
    >
      <div className="theme-soft-surface rounded-[18px] border p-5">
        <p className="theme-text text-sm font-medium">
          O dashboard já conhece {expectedCount} registros nesta categoria, mas a API publicada ainda não trouxe os nomes.
        </p>
        <p className="theme-muted mt-2 text-sm leading-6">
          Para popular esta página, publique no Google Apps Script a versão mais recente do arquivo
          {" "}
          <code>apps-script.gs</code>
          {" "}
          que adiciona o campo
          {" "}
          <code>clientes_detalhados</code>
          .
        </p>
      </div>
    </SummaryCard>
  );
}

export function ClientesPage({ filter }: { filter: ClienteFiltro }) {
  const meta = filterMeta[filter];

  return (
    <DashboardDataPage title={meta.title} description={meta.description}>
      {(data) => {
        const expectedCount = getExpectedCount(data, filter);
        const clients = getFilteredClients(data, filter);
        const gestores = new Set(clients.map((cliente) => cliente.gestor)).size;
        const averageLtv =
          clients.reduce((acc, cliente) => acc + (cliente.ltv_meses ?? 0), 0) / Math.max(clients.length, 1);
        const hasDetailedPayload = Array.isArray(data.clientes_detalhados) && data.clientes_detalhados.length > 0;

        return (
          <div className="space-y-8 pb-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/"
                  className="theme-surface theme-text inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:border-primary/40"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para a visão geral
                </Link>
                <Badge tone={filter === "bons" ? "green" : filter === "alerta" ? "yellow" : filter === "critico" ? "red" : "blue"}>
                  {expectedCount} clientes
                </Badge>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-3 xl:w-auto">
                <div className="theme-soft-surface min-w-0 rounded-[18px] border px-4 py-3">
                  <p className="theme-muted text-[11px] uppercase tracking-[0.18em]">Clientes</p>
                  <p className="theme-text mt-2 text-2xl font-semibold">{expectedCount}</p>
                </div>
                <div className="theme-soft-surface min-w-0 rounded-[18px] border px-4 py-3">
                  <p className="theme-muted text-[11px] uppercase tracking-[0.18em]">Gestores</p>
                  <p className="theme-text mt-2 text-2xl font-semibold">{gestores || "—"}</p>
                </div>
                <div className="theme-soft-surface min-w-0 rounded-[18px] border px-4 py-3">
                  <p className="theme-muted text-[11px] uppercase tracking-[0.18em]">LTV médio</p>
                  <p className="theme-text mt-2 text-2xl font-semibold">
                    {clients.length ? `${formatMonths(averageLtv)} meses` : "—"}
                  </p>
                </div>
              </div>
            </div>

            {!hasDetailedPayload && expectedCount > 0 ? (
              <MissingPayloadState expectedCount={expectedCount} />
            ) : (
              <SummaryCard
                title="Lista de clientes"
                description="Confira nome, gestor, origem e situação para validar a base desse indicador."
              >
                <div className="theme-surface overflow-hidden rounded-[18px] border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Cliente</TableHead>
                        <TableHead>Gestor</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead>LTV</TableHead>
                        <TableHead className="text-right">Entrada</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.length ? (
                        clients.map((cliente: ClienteDetalhado) => (
                          <TableRow key={`${cliente.status}-${cliente.nome}`}>
                            <TableCell className="theme-text font-medium">{cliente.nome}</TableCell>
                            <TableCell>{cliente.gestor}</TableCell>
                            <TableCell>{cliente.origem ?? "—"}</TableCell>
                            <TableCell>
                              <Badge tone={statusToneMap[cliente.status]}>{cliente.status_label}</Badge>
                            </TableCell>
                            <TableCell>{cliente.ltv_meses !== null ? `${formatMonths(cliente.ltv_meses)} meses` : "—"}</TableCell>
                            <TableCell className="text-right">{cliente.data_inicio ?? "—"}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="theme-muted h-24 text-center">
                            Nenhum cliente encontrado para este recorte.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </SummaryCard>
            )}
          </div>
        );
      }}
    </DashboardDataPage>
  );
}
