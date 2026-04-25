"use client";

import { Activity, BarChart3, Trophy, Users } from "lucide-react";
import { DashboardDataPage } from "@/components/dashboard/dashboard-shell";
import {
  buildGestorMetricsFromBase,
  GestorPerformanceChart,
  GestorStatusCard,
  InsightChip,
  SummaryCard
} from "@/components/dashboard/dashboard-shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMonths, formatPercent } from "@/lib/utils";

export function GestoresPage() {
  return (
    <DashboardDataPage
      title="Análise Gestores"
      description="Compare saúde da carteira, taxa de sucesso e retenção por gestor."
    >
      {(data) => {
        const gestores = (
          data.base_clientes_detalhada?.length
            ? buildGestorMetricsFromBase(data.base_clientes_detalhada)
            : data.por_gestor
        ).sort((a, b) => (b.score_composto ?? 0) - (a.score_composto ?? 0));
        const gestoresComDados = gestores.filter(
          (gestor) => (gestor.clientes_com_status ?? (gestor.bons + gestor.alerta + gestor.critico)) > 0
        );
        const topGestor = gestoresComDados[0];
        const avgSuccess =
          gestoresComDados.reduce((acc, gestor) => acc + gestor.taxa_sucesso, 0) / Math.max(gestoresComDados.length, 1);
        const avgScore =
          gestoresComDados.reduce((acc, gestor) => acc + (gestor.score_composto ?? 0), 0) / Math.max(gestoresComDados.length, 1);

        return (
          <div className="space-y-8 pb-10">
            <div className="grid gap-3 md:grid-cols-3">
              <InsightChip
                label="Melhores métricas"
                value={topGestor ? `${topGestor.nome} · ${formatPercent(topGestor.score_composto ?? 0)}` : "—"}
                tone="yellow"
                icon={Trophy}
                tooltip="Ranking composto por taxa de sucesso, LTV médio por mês e volume de clientes com status preenchido. Evita que uma carteira muito pequena lidere só por ter poucos clientes bons."
              />
              <InsightChip
                label="Métrica média da equipe"
                value={formatPercent(avgScore)}
                tone="blue"
                icon={BarChart3}
                tooltip="Média do score composto da equipe. Combina taxa de sucesso, LTV médio por mês e volume de clientes com status preenchido."
              />
              <InsightChip
                label="Gestores ativos"
                value={String(gestores.length)}
                tone="green"
                icon={Users}
                tooltip="Quantidade de gestores com pelo menos um cliente ativo na BASE_CLIENTES."
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <GestorStatusCard gestores={gestoresComDados} />
              <SummaryCard
                title="Mapa de performance"
                description="Análise com base nos clientes ativos, taxa de sucesso e LTV médio/mês."
              >
                <GestorPerformanceChart gestores={gestoresComDados} />
              </SummaryCard>
            </div>

            <Card className="p-6">
              <CardHeader>
                <div>
                  <CardTitle>Ranking por gestor</CardTitle>
                  <p className="theme-muted mt-1 text-sm">
                    Ranking do cálculo entre quantidade de clientes, taxa de sucesso e LTV médio/mês de cada gestor.
                  </p>
                </div>
                <div className="theme-soft-surface theme-muted inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs uppercase tracking-[0.18em]">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  {gestoresComDados.length} gestores
                </div>
              </CardHeader>
              <CardContent className="mt-5 space-y-4">
                {gestoresComDados.map((gestor, index) => {
                  const tone =
                    (gestor.score_composto ?? 0) >= 50 ? "green" : (gestor.score_composto ?? 0) >= 30 ? "yellow" : "red";

                  return (
                    <div key={gestor.nome} className="theme-soft-surface rounded-[22px] border p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="theme-surface theme-text flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold">
                            {String(index + 1).padStart(2, "0")}
                          </div>
                          <div>
                            <p className="theme-text text-base font-semibold">{gestor.nome}</p>
                            <p className="theme-muted text-sm">
                              {gestor.ativos ?? 0} clientes ativos · {gestor.clientes_com_status ?? (gestor.bons + gestor.alerta + gestor.critico)} com status · {formatMonths(gestor.ltv_medio)} meses de LTV médio por mês
                            </p>
                          </div>
                        </div>
                        <Badge tone={tone}>{formatPercent(gestor.score_composto ?? 0)}</Badge>
                      </div>
                      <div className="theme-border mt-4 h-3 overflow-hidden rounded-full border bg-[var(--surface)]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(gestor.score_composto ?? 0, 4)}%`,
                            background:
                              tone === "green"
                                ? "linear-gradient(90deg, var(--success-color), rgba(255,255,255,0.85))"
                                : tone === "yellow"
                                  ? "linear-gradient(90deg, var(--warning-color), rgba(255,255,255,0.85))"
                                  : "linear-gradient(90deg, var(--danger-color), rgba(255,255,255,0.85))"
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        );
      }}
    </DashboardDataPage>
  );
}
