import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import { Link } from 'react-router-dom';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/admin', layout: 'owner', access: "profile === 'Admin_c'" };
export const nav = { label: 'Admin', icon: 'ShieldCheck', order: 90, profiles: ['Admin_c'] };

const METRICS = [
  { key: 'students', label: 'Student profiles', table: 'student_profiles_c' },
  { key: 'mockAttempts', label: 'Mock test attempts', table: 'mock_test_attempts_c' },
  { key: 'questions', label: 'Questions in bank', table: 'questions_c' },
  { key: 'currentAffairs', label: 'Current affairs items', table: 'current_affairs_c' },
  { key: 'subscriptions', label: 'Subscriptions', table: 'subscriptions_c' },
  { key: 'payments', label: 'Payments recorded', table: 'payments_c' },
];

const SECTIONS = [
  { to: '/billing', label: 'Billing plans and payments', icon: 'CreditCard' },
  { to: '/mock-tests', label: 'Mock tests', icon: 'ClipboardList' },
  { to: '/current-affairs', label: 'Current affairs', icon: 'Newspaper' },
  { to: '/exam-alerts', label: 'Exam alerts', icon: 'Bell' },
];

async function countRows(table) {
  const res = await sdk.table(table).select(['Id']).page(1, 1).fetch();
  if (!res.success) throw new Error(res.message || `${table} लोड झाले नाही.`);
  return res.total ?? 0;
}

async function fetchMetrics() {
  const counts = await Promise.all(METRICS.map((metric) => countRows(metric.table)));
  return Object.fromEntries(METRICS.map((metric, index) => [metric.key, counts[index]]));
}

export default function Admin() {
  const { data: metrics, loading, error, run } = useFetch(fetchMetrics, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight font-heading">Admin Control Centre</h1>
          <p className="mt-1 text-sm text-muted-foreground">Platform counts and shortcuts. Read-only overview.</p>
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
          {error.message || 'Metrics could not be loaded.'}
        </p>
      )}

      <section aria-label="Platform metrics" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {METRICS.map((metric) => (
          <div key={metric.key} className="min-w-0 rounded-2xl border border-border bg-card p-4">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground" title={metric.label}>
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums">
              {loading && !metrics ? '—' : (metrics?.[metric.key] ?? '—')}
            </p>
          </div>
        ))}
      </section>

      <section aria-label="Admin sections" className="space-y-3">
        <h2 className="text-base font-semibold font-heading">Manage</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <Link
              key={section.to}
              to={section.to}
              className="flex min-h-11 min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] duration-(--transition-fast)"
            >
              <ApperIcon name={section.icon} className="size-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 truncate">{section.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}