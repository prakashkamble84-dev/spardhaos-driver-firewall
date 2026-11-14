import { useState } from 'react';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/admin-integrations', layout: 'owner', access: "profile === 'Admin_c'" };
export const nav = { label: 'Integrations', icon: 'Plug', order: 93, profiles: ['Admin_c'] };

const INTEGRATIONS = [
  {
    id: 'tutor',
    label: 'AI tutor',
    envVar: import.meta.env.VITE_TUTOR_REPLY,
    purpose: 'Answers student questions in Marathi.',
    secret: 'GOOGLE_API_KEY',
  },
  {
    id: 'exam-content',
    label: 'Exam content lookup',
    envVar: import.meta.env.VITE_FETCH_EXAM_CONTENT,
    purpose: 'Fetches reference summaries for an exam name.',
    secret: null,
  },
  {
    id: 'business-brief',
    label: 'Operations brief',
    envVar: import.meta.env.VITE_BUSINESS_BRIEF,
    purpose: 'Writes the admin operations brief from aggregate counts.',
    secret: 'GOOGLE_API_KEY',
  },
];

const STATE_STYLES = {
  reachable: 'border-success/20 bg-success/10 text-success',
  unreachable: 'border-destructive/20 bg-destructive/10 text-destructive',
  missing: 'border-warning/20 bg-warning/10 text-warning',
};

const STATE_LABELS = {
  reachable: 'Reachable',
  unreachable: 'Unreachable',
  missing: 'Not configured',
};

async function probe(functionName) {
  if (!functionName) return { state: 'missing', message: 'The endpoint name is not set in the build environment.' };
  try {
    const result = await sdk.functions.invoke(functionName, {});
    if (result?.ok) {
      return { state: 'reachable', message: 'The endpoint answered. An empty request is rejected before any provider is called.' };
    }
    return { state: 'unreachable', message: result?.error?.message || 'No response from the endpoint.' };
  } catch (err) {
    return { state: 'unreachable', message: err.message || 'No response from the endpoint.' };
  }
}

export default function AdminIntegrations() {
  const [results, setResults] = useState({});
  const [checking, setChecking] = useState(false);

  async function checkAll() {
    setChecking(true);
    try {
      const entries = await Promise.all(
        INTEGRATIONS.map(async (item) => [item.id, await probe(item.envVar)]),
      );
      setResults(Object.fromEntries(entries));
    } finally {
      setChecking(false);
    }
  }

  const checkedCount = Object.keys(results).length;
  const reachableCount = Object.values(results).filter((r) => r.state === 'reachable').length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight font-heading">Integrations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Edge-function endpoints the app depends on. Check them to confirm each one answers.
          </p>
        </div>
        <button
          type="button"
          onClick={checkAll}
          disabled={checking}
          className="min-h-11 shrink-0 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          {checking ? 'Checking...' : 'Check endpoints'}
        </button>
      </div>

      {checkedCount > 0 && (
        <p className="text-sm text-muted-foreground">
          {reachableCount} of {INTEGRATIONS.length} endpoints reachable.
        </p>
      )}

      <section aria-label="Integration endpoints" className="space-y-3">
        {INTEGRATIONS.map((item) => {
          const result = results[item.id];
          return (
            <div key={item.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <ApperIcon name="Plug" className="size-4 shrink-0 text-muted-foreground" />
                    <h2 className="truncate text-sm font-medium">{item.label}</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.purpose}</p>
                  <p className="mt-2 truncate font-mono text-xs text-muted-foreground" title={item.envVar}>
                    {item.envVar || 'Endpoint not set'}
                  </p>
                  {item.secret && (
                    <p className="mt-1 text-xs text-muted-foreground">Requires secret {item.secret}</p>
                  )}
                </div>
                <div className="shrink-0">
                  {result ? (
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATE_STYLES[result.state]}`}>
                      {STATE_LABELS[result.state]}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                      Not checked
                    </span>
                  )}
                </div>
              </div>
              {result && (
                <p className="mt-3 text-xs text-muted-foreground">{result.message}</p>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}