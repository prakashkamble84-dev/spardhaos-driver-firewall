import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/business-intelligence', layout: 'owner', access: "profile === 'Admin_c'" };
export const nav = { label: 'Business intelligence', icon: 'TrendingUp', order: 91, profiles: ['Admin_c'] };

const MONTHS_BACK = 6;
const FORECAST_WINDOW = 3;
const EXPIRING_WITHIN_DAYS = 14;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const dayOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return ymd(d);
};
const formatAmount = (value) => `₹${Number(value ?? 0).toFixed(2)}`;

function aggregateValue(res, id, alias) {
  const block = res.aggregators?.find((a) => a.id === id);
  return Number(block?.data?.[alias] ?? block?.[alias] ?? block?.value ?? 0);
}

async function fetchIntelligence() {
  const { and, eq, gte, lte } = window.ApperSDK.CoreSDK;

  const now = new Date();
  const months = Array.from({ length: MONTHS_BACK }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() - (MONTHS_BACK - 1 - i), 1),
  );
  const trend = months.map((d) => ({
    key: monthKey(d),
    label: `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
    total: 0,
  }));

  const [revenueRes, subsRes, trendRes] = await Promise.all([
    sdk
      .table('payments_c')
      .select([{ field: 'Id' }])
      .aggregate([
        {
          id: 'revenue',
          fields: [{ field: 'amount_c', fn: 'Sum', alias: 'total' }],
          where: and(eq('status_c', 'Recorded'), gte('paid_on_c', dayOffset(-29))),
        },
      ])
      .limit(1)
      .fetch(),
    sdk
      .table('subscriptions_c')
      .select([{ field: 'Id' }])
      .aggregate([
        {
          id: 'active',
          fields: [{ field: 'Id', fn: 'Count', alias: 'count' }],
          where: eq('status_c', 'Active'),
        },
        {
          id: 'expiring',
          fields: [{ field: 'Id', fn: 'Count', alias: 'count' }],
          where: and(
            eq('status_c', 'Active'),
            gte('end_date_c', dayOffset(0)),
            lte('end_date_c', dayOffset(EXPIRING_WITHIN_DAYS)),
          ),
        },
      ])
      .limit(1)
      .fetch(),
    sdk
      .table('payments_c')
      .select(['Id', 'amount_c', 'paid_on_c'])
      .where(and(eq('status_c', 'Recorded'), gte('paid_on_c', ymd(months[0]))))
      .page(1, 500)
      .fetch(),
  ]);

  if (!revenueRes.success) throw new Error(revenueRes.message || 'Revenue could not be loaded.');
  if (!subsRes.success) throw new Error(subsRes.message || 'Subscriptions could not be loaded.');
  if (!trendRes.success) throw new Error(trendRes.message || 'Payments could not be loaded.');

  for (const payment of trendRes.data ?? []) {
    const bucket = trend.find((t) => t.key === String(payment.paid_on_c ?? '').slice(0, 7));
    if (bucket) bucket.total += Number(payment.amount_c ?? 0);
  }

  const recent = trend.slice(-FORECAST_WINDOW);
  const forecast = recent.reduce((sum, t) => sum + t.total, 0) / FORECAST_WINDOW;

  return {
    revenue30: aggregateValue(revenueRes, 'revenue', 'total'),
    activeCount: aggregateValue(subsRes, 'active', 'count'),
    expiringCount: aggregateValue(subsRes, 'expiring', 'count'),
    trend,
    forecast,
  };
}

export default function BusinessIntelligence() {
  const { data, loading, error, run } = useFetch(fetchIntelligence, []);

  const trend = data?.trend ?? [];
  const maxTotal = Math.max(1, ...trend.map((t) => t.total));

  const kpis = [
    { key: 'revenue', label: 'Revenue, last 30 days', value: data ? formatAmount(data.revenue30) : '—' },
    { key: 'active', label: 'Active subscriptions', value: data ? String(data.activeCount) : '—' },
    { key: 'expiring', label: `Expiring in ${EXPIRING_WITHIN_DAYS} days`, value: data ? String(data.expiringCount) : '—' },
    { key: 'forecast', label: 'Projected next month', value: data ? formatAmount(data.forecast) : '—' },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight font-heading">Business intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">Recorded revenue and subscription health. Refunded payments are excluded.</p>
        </div>
        <button
          type="button"
          onClick={() => run()}
          disabled={loading}
          className="min-h-11 shrink-0 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error.message || 'Business data could not be loaded.'}
        </p>
      )}

      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.key} className="min-w-0 rounded-2xl border border-border bg-card p-4">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground" title={kpi.label}>
              {kpi.label}
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{loading && !data ? '—' : kpi.value}</p>
          </div>
        ))}
      </section>

      <section aria-label="Revenue trend" className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <ApperIcon name="TrendingUp" className="size-5 text-muted-foreground" />
          <h2 className="text-base font-semibold font-heading">Revenue by month</h2>
        </div>
        {loading && !data ? (
          <p className="text-sm text-muted-foreground">Loading revenue...</p>
        ) : (
          <ul className="space-y-2">
            {trend.map((month) => (
              <li key={month.key} className="flex min-w-0 items-center gap-3 text-sm">
                <span className="w-16 shrink-0 text-muted-foreground">{month.label}</span>
                <div className="h-2 min-w-0 flex-1 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(month.total / maxTotal) * 100}%` }}
                  />
                </div>
                <span className="w-28 shrink-0 text-right font-medium tabular-nums">{formatAmount(month.total)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Projection is the average of the last {FORECAST_WINDOW} months of recorded payments. It is a simple estimate, not a forecast model.
        </p>
      </section>
    </div>
  );
}