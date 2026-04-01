import type { BacktestEquityResponse, BacktestResponse, BacktestTradeResponse } from "@/api/poseidon/types.gen";
import { LightweightChart } from "@/features/charts/lightweight-chart";
import type { TradeMarkerInput } from "@/features/charts/series-markers";
import { EmptyState } from "@/features/monitoring/empty-state";
import { PanelFrame } from "@/features/monitoring/panel-frame";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { formatCompactCurrency, formatPercent } from "@/features/portfolio/portfolio-view-model";

function normalizeTradeAction(action: string): TradeMarkerInput["action"] {
  const normalizedAction = action.toLowerCase();

  if (normalizedAction.includes("short")) {
    return "short";
  }

  if (normalizedAction.includes("cover")) {
    return "cover";
  }

  if (normalizedAction.includes("sell")) {
    return "sell";
  }

  return "buy";
}

type BacktestChartPanelProps = {
  backtest: BacktestResponse;
  equityCurve: BacktestEquityResponse | null;
  trades: BacktestTradeResponse[];
};

export function BacktestChartPanel({ backtest, equityCurve, trades }: BacktestChartPanelProps) {
  if (!equityCurve || equityCurve.data.length === 0) {
    return (
      <PanelFrame
        action={<StatusBadge label="chart pending" status="idle" />}
        description="The backtest exists, but Poseidon has not emitted an equity curve yet."
        eyebrow="Chart Surface"
        title="Equity Curve"
      >
        <EmptyState message="No equity curve points are available for this backtest yet." title="Chart waiting on data" />
      </PanelFrame>
    );
  }

  const chartData = equityCurve.data.map((point) => ({
    time: point.time,
    value: point.equity,
  }));
  const markers: TradeMarkerInput[] = trades.map((trade) => ({
    action: normalizeTradeAction(trade.action),
    price: trade.exit_price ?? trade.entry_price,
    time: trade.exit_time ?? trade.entry_time,
  }));
  const maxDrawdown = Math.min(...equityCurve.data.map((point) => point.drawdown));
  const latestEquity = equityCurve.data.at(-1)?.equity ?? 0;

  return (
    <PanelFrame
      action={<StatusBadge label={`${trades.length} markers`} status="up" />}
      description="Data-dense equity view with trade annotations for fast drill-down."
      eyebrow="Chart Surface"
      title="Equity Curve"
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.72)] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Latest Equity</div>
            <div className="mt-2 text-lg font-semibold text-[hsl(var(--foreground))]">{formatCompactCurrency(latestEquity)}</div>
          </div>
          <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.72)] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Max Drawdown</div>
            <div className="mt-2 text-lg font-semibold text-[hsl(var(--foreground))]">{formatPercent(maxDrawdown)}</div>
          </div>
          <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsla(225,47%,7%,0.72)] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Scope</div>
            <div className="mt-2 text-lg font-semibold text-[hsl(var(--foreground))]">
              {backtest.symbol} {backtest.interval}
            </div>
          </div>
        </div>

        <LightweightChart
          data={chartData}
          description={`${backtest.strategy_type} on ${backtest.symbol} with ${trades.length} trade markers.`}
          markers={markers}
          priceLabel="Equity"
          title="Backtest Equity"
        />
      </div>
    </PanelFrame>
  );
}
