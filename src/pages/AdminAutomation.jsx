import { useState } from 'react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useFetch } from '@/hooks/useFetch';
import { useFunction } from '@/hooks/useFunction';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/admin-automation', layout: 'owner', access: "profile === 'Admin_c'" };
export const nav = { label: 'Automation', icon: 'Zap', order: 92, profiles: ['Admin_c'] };

const EXPIRING_WITHIN_DAYS = 14;
const ERROR_SPIKE_THRESHOLD = 20;

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return ymd(d);
};
const hoursAgoIso = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString().slice(0, 19);

const SEVERITY_STYLES = {
  destructive: 'border-destructive/20 bg-destructive/10 text-destructive',
  warning: 'border-warning/20 bg-warning/10 text-warning',
  info: 'border-border bg-card text-foreground',
};

async function countRows(table, filter) {
  let query = sdk.table(table).select(['Id']);
  if (filter) query = query.where(filter);
  const res = await query.page(1, 1).fetch();
  if (!res.success) throw new Error(res.message || `${table} could not be loaded.`);
  return res.total ?? 0;
}

async function fetchSignals() {
  const { and, eq, gte, lt, lte } = window.ApperSDK.CoreSDK;
  const today = dayOffset(0);
  const [pendingSubscriptions, expiringSubscriptions, overdueSubscriptions, newFeedback, errorsLast24h] =
    await Promise.all([
      countRows('subscriptions_c', eq('status_c', 'Pending')),
      countRows(
        'subscriptions_c',
        and(
          eq('status_c', 'Active'),
          gte('end_date_c', today),
          lte('end_date_c', dayOffset(EXPIRING_WITHIN_DAYS)),
        ),
      ),
      countRows('subscriptions_c', and(eq('status_c', 'Active'), lt('end_date_c', today))),
      countRows('feedback_c', eq('status_c', 'New')),
      countRows('error_logs_c', gte('CreatedOn', hoursAgoIso(24))),
    ]);
  return { pendingSubscriptions, expiringSubscriptions, overdueSubscriptions, newFeedback, errorsLast24h };
}

function buildRules(signals) {
  return [
    {
      id: 'overdue',
      count: signals.overdueSubscriptions,
      severity: 'destructive',
      label: 'Active subscriptions past their end date',
      to: '/billing',
    },
    {
      id: 'errors',
      count: signals.errorsLast24h,
      severity: signals.errorsLast24h >= ERROR_SPIKE_THRESHOLD ? 'destructive' : 'warning',
      label: 'Client errors in the last 24 hours',
      to: '/admin',
    },
    {
      id: 'pending',
      count: signals.pendingSubscriptions,
      severity: 'warning',
      label: 'Subscriptions awaiting activation',
      to: '/billing',
    },
    {
      id: 'expiring',
      count: signals.expiringSubscriptions,
      severity: 'warning',
      label: `Subscriptions expiring within ${EXPIRING_WITHIN_DAYS} days`,
      to: '/billing',
    },
    {
      id: 'feedback',
      count: signals.newFeedback,
      severity: 'info',
      label: 'New feedback awaiting triage',
      to: '/admin-feedback',
    },
  ].filter((rule) => rule.count > 0);
}

export default function AdminAutomation() {
  const { data: signals, loading, error, run } = useFetch(fetchSignals, []);
  const { invoke, loading: briefLoading } = useFunction(import.meta.env.VITE_BUSINESS_BRIEF);
  const [brief, setBrief] = useState('');

  const rules = signals ? buildRules(signals) : [];

  async function generateBrief() {
    if (!signals) return;
    try {
      const result = await invoke({ metrics: signals });
      if (!result) return;
      const text = result?.data?.brief ?? '';
      if (!text) {
        toast.error('The AI brief came back empty.');
        return;
      }
      setBrief(text);
    } catch (err) {
      toast.error(err.message);
      console.error(`business brief failed: ${err.message}`);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight font-heading">Automation and alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rules run against live platform data. Each alert links to where you act on it.
          </p>
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
          {error.message || 'Signals could not be loaded.'}
        </p>
      )}

      <section aria-label="Alerts" className="space-y-3">
        <h2 className="text-base font-semibold font-heading">Alerts</h2>
        {loading && !signals ? (
          <p className="text-sm text-muted-foreground">Checking platform rules...</p>
        ) : rules.length === 0 && signals ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
            <ApperIcon name="CircleCheck" className="size-5 shrink-0 text-success" />
            <span>All clear. No rule needs action right now.</span>
          </div>
        ) : (
          <ul className="space-y-2">
            {rules.map((rule) => (
              <li key={rule.id}>
                <Link
                  to={rule.to}
                  className={`flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-2xl border p-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] duration-(--transition-fast) ${SEVERITY_STYLES[rule.severity]}`}
                >
                  <span className="min-w-0 truncate">{rule.label}</span>
                  <span className="shrink-0 text-lg font-bold tabular-nums">{rule.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="AI operations brief" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold font-heading">AI operations brief</h2>
          <button
            type="button"
            onClick={generateBrief}
            disabled={!signals || briefLoading}
            className="min-h-11 shrink-0 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            {briefLoading ? 'Writing brief...' : 'Generate brief'}
          </button>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          {brief ? (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{brief}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Generates a short brief from the counts above. Only aggregate numbers are sent, never student records.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}