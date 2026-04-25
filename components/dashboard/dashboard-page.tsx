"use client";

import type { Route } from "next";
import { AlertTriangle, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { DashboardDataPage } from "@/components/dashboard/dashboard-shell";
import {
  buildGestorMetricsFromBase,
  GestorPerformanceChart,
  HealthByOriginChart,
  InsightChip,
  LtvDistributionChart,
  MetricCard,
  OrigemMixCard,
  SuccessGaugeCard,
  SummaryCard
} from "@/components/dashboard/dashboard-shared";
import type { BaseClienteDetalhado } from "@/lib/types";
import { formatMonths, formatPercent, formatSignedPercent } from "@/lib/utils";

export function DashboardPage() {
  return (
    <DashboardDataPage
      title="Visão geral"
      description="Resumo da saúde da carteira, retenção e churn."
    >
      {(data) => {
        const origemPalette = ["var(--primary-color)", "#64a7fe", "#c9cfe5", "#a8b2d2"];
        const origemSource = data.base_clientes_detalhada?.filter((cliente) => cliente.ativo === "Sim") ?? data.clientes_detalhados ?? [];
        const origemCounts = origemSource.reduce<Record<string, number>>((acc, cliente) => {
          const origem = (cliente.origem ?? "Sem origem").trim() || "Sem origem";
          acc[origem] = (acc[origem] ?? 0) + 1;
          return acc;
        }, {});
        const origemData = Object.entries(origemCounts)
          .map(([name, value], index) => ({
            name,
            value,
            percent: data.clientes_ativos ? (value / data.clientes_ativos) * 100 : 0,
            color: origemPalette[index % origemPalette.length]
          }))
          .sort((a, b) => b.value - a.value);
        const activeBase = (data.base_clientes_detalhada ?? []).filter((record) => record.ativo === "Sim");
        const ltvDistribution = [
          { faixa: "0–3", min: 0, max: 3 },
          { faixa: "4–6", min: 4, max: 6 },
          { faixa: "7–12", min: 7, max: 12 },
          { faixa: "13–18", min: 13, max: 18 },
          { faixa: "19+", min: 19, max: Number.POSITIVE_INFINITY }
        ].map((bin) => ({
          faixa: bin.faixa,
          quantidade: activeBase.filter((record) => {
            const ltv = record.ltv_meses ?? 0;
            return ltv >= bin.min && ltv <= bin.max;
          }).length
        }));
        const healthByOrigin = Array.from(
          activeBase.reduce<Map<string, { origem: string; bom: number; alerta: number; critico: number }>>((acc, record) => {
            const origem = record.origem || "Sem origem";
            if (!acc.has(origem)) {
              acc.set(origem, { origem, bom: 0, alerta: 0, critico: 0 });
            }
            const item = acc.get(origem)!;
            if (record.status === "bom") item.bom += 1;
            if (record.status === "alerta") item.alerta += 1;
            if (record.status === "critico") item.critico += 1;
            return acc;
          }, new Map())
        )
          .map(([, value]) => value)
          .sort((a, b) => b.bom + b.alerta + b.critico - (a.bom + a.alerta + a.critico));
        const gestores = (
          data.base_clientes_detalhada?.length
            ? buildGestorMetricsFromBase(data.base_clientes_detalhada as BaseClienteDetalhado[])
            : data.por_gestor
        ).filter((gestor) => (gestor.clientes_com_status ?? (gestor.bons + gestor.alerta + gestor.critico)) > 0);

        return (
          <div className="space-y-10 pb-10">
            <section className="space-y-4">
              <div>
                <p className="section-kicker">Indicadores centrais</p>
                <p className="theme-muted mt-2 max-w-2xl text-sm leading-6">
                  Leitura rápida da base ativa antes de aprofundar nas análises operacionais.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Clientes ativos"
                value={data.clientes_ativos}
                description="Base completa dos clientes ativos."
                badge={`${formatSignedPercent(data.variacao_base)} vs. referência`}
                icon={Users}
                tone="blue"
                href={"/clientes/ativos" as Route}
              />
              <MetricCard
                title="Clientes bons"
                value={data.clientes_bons}
                description="Clientes em situação estável."
                badge={`${formatPercent(data.perc_bons)} da base`}
                icon={ShieldCheck}
                tone="green"
                href={"/clientes/bons" as Route}
              />
              <MetricCard
                title="Sinal de alerta"
                value={data.clientes_alerta}
                description="Clientes que pedem atenção."
                badge={`${formatPercent(data.perc_alerta)} da base`}
                icon={AlertTriangle}
                tone="yellow"
                href={"/clientes/alerta" as Route}
              />
              <MetricCard
                title="Situação crítica"
                value={data.clientes_critico}
                description="Clientes com maior risco de saída."
                badge={`${formatPercent(data.perc_critico)} da base`}
                icon={ShieldAlert}
                tone="red"
                href={"/clientes/critico" as Route}
              />
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
              <SummaryCard title="Resumo da carteira">
                <div>
                  <div className="flex items-end gap-3">
                    <span className="theme-text text-[55px] font-semibold leading-none tracking-[-0.06em]">{data.clientes_ativos}</span>
                    <span className="theme-muted pb-2 text-lg">clientes ativos</span>
                  </div>
                  <p className="theme-muted mt-4 max-w-xl text-sm leading-6">
                    Base executiva usada para consolidar retenção, saúde e permanência média da carteira.
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <InsightChip
                      label="Taxa de sucesso"
                      value={formatPercent(data.taxa_sucesso)}
                      tone="green"
                      tooltip="Percentual de clientes em status Bom dentro da base ativa com STATUS CLIENTE preenchido. Cálculo: clientes_bons / clientes_ativos."
                    />
                    <InsightChip
                      label="LTV médio"
                      value={`${formatMonths(data.ltv_medio)} meses`}
                      tone="blue"
                      tooltip="Tempo médio de permanência da base ativa. Usa PERÍODO quando existe; se não, calcula pela diferença entre DATA PLANEJAMENTO e SAÍDA CLIENTE ou a data atual."
                    />
                  </div>
                </div>
              </SummaryCard>

              <SummaryCard
                title="Índice de sucesso"
              >
                <SuccessGaugeCard
                  score={data.taxa_sucesso}
                  bom={data.perc_bons}
                  alerta={data.perc_alerta}
                  critico={data.perc_critico}
                />
              </SummaryCard>
            </section>

            <section className="space-y-4">
              <div>
                <p className="section-kicker">Leitura operacional</p>
                <p className="theme-muted mt-2 max-w-2xl text-sm leading-6">
                  Aqui ficam os cruzamentos principais para entender composição da base, eficiência por gestor e permanência.
                </p>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
              <SummaryCard title="Mapa de performance" description="Cruza clientes ativos, taxa de sucesso e LTV médio por mês em uma única leitura por gestor.">
                <GestorPerformanceChart gestores={gestores} />
              </SummaryCard>

              <SummaryCard title="Origem dos Clientes" description="Mostra de qual empresa veio cada cliente ativo da base atual.">
                <OrigemMixCard data={origemData} />
              </SummaryCard>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <SummaryCard title="Distribuição de LTV" description="Mostra como a carteira se distribui entre faixas de permanência em meses: 0–3, 4–6, 7–12, 13–18 e 19+ meses.">
                <LtvDistributionChart data={ltvDistribution} />
              </SummaryCard>
              <SummaryCard title="Saúde por origem de cliente" description="Cruza qualidade da carteira com a empresa de origem do lead.">
                <HealthByOriginChart data={healthByOrigin} />
              </SummaryCard>
            </section>
          </div>
        );
      }}
    </DashboardDataPage>
  );
}
