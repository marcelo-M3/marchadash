"use client";

import { Activity } from "lucide-react";
import { DashboardDataPage } from "@/components/dashboard/dashboard-shell";
import {
  GestorRadarCard,
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
      title="Por gestor"
      description="Compare saúde da carteira, taxa de sucesso e retenção por gestor."
    >
      {(data) => {
        const gestores = [...data.por_gestor].sort((a, b) => b.taxa_sucesso - a.taxa_sucesso);
        const topGestor = gestores[0];
        const avgSuccess =
          gestores.reduce((acc, gestor) => acc + gestor.taxa_sucesso, 0) / Math.max(gestores.length, 1);

        return (
          <div className="space-y-8 pb-10">
            <div className="grid gap-3 md:grid-cols-3">
              <InsightChip
                label="Melhor taxa de sucesso"
                value={topGestor ? `${topGestor.nome} · ${formatPercent(topGestor.taxa_sucesso)}` : "—"}
                tone="green"
              />
              <InsightChip label="Média da equipe" value={formatPercent(avgSuccess)} tone="blue" />
              <InsightChip label="Gestores ativos" value={String(gestores.length)} />
            </div>

            <div className="grid gap-4 2xl:grid-cols-2">
              <GestorStatusCard gestores={gestores} />
              <GestorRadarCard gestores={gestores} />
            </div>

            <Card className="p-6">
              <CardHeader>
                <div>
                  <CardTitle>Resumo por gestor</CardTitle>
                  <p className="theme-muted mt-1 text-sm">
                    Ranking com taxa de sucesso e LTV médio de cada carteira.
                  </p>
                </div>
                <div className="theme-soft-surface theme-muted inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs uppercase tracking-[0.18em]">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  {gestores.length} gestores
                </div>
              </CardHeader>
              <CardContent className="mt-5 space-y-4">
                {gestores.map((gestor, index) => {
                  const tone =
                    gestor.taxa_sucesso >= 65 ? "green" : gestor.taxa_sucesso >= 45 ? "yellow" : "red";

                  return (
                    <div key={gestor.nome} className="theme-soft-surface rounded-[22px] border p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="theme-surface theme-text flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold">
                            {String(index + 1).padStart(2, "0")}
                          </div>
                          <div>
                            <p className="theme-text text-base font-semibold">{gestor.nome}</p>
                            <p className="theme-muted text-sm">{formatMonths(gestor.ltv_medio)} meses de LTV médio</p>
                          </div>
                        </div>
                        <Badge tone={tone}>{formatPercent(gestor.taxa_sucesso)}</Badge>
                      </div>
                      <div className="theme-border mt-4 h-3 overflow-hidden rounded-full border bg-[var(--surface)]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(gestor.taxa_sucesso, 4)}%`,
                            background:
                              tone === "green"
                                ? "linear-gradient(90deg, #22c55e, rgba(255,255,255,0.85))"
                                : tone === "yellow"
                                  ? "linear-gradient(90deg, #f59e0b, rgba(255,255,255,0.85))"
                                  : "linear-gradient(90deg, #ef4444, rgba(255,255,255,0.85))"
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
