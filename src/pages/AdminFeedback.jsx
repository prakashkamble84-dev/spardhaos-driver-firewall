import { useState } from 'react';
import { toast } from 'sonner';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatRelativeTime } from '@/utils/date';

export const route = { path: '/admin-feedback', layout: 'owner', access: "profile === 'Admin_c'" };
export const nav = { label: 'Feedback inbox', icon: 'Inbox', order: 91, profiles: ['Admin_c'] };

const FEEDBACK_FIELDS = ['Name', 'message_c', 'category_c', 'page_path_c', 'status_c', 'screenshot_c', 'CreatedOn'];
const LOG_FIELDS = ['message_c', 'page_path_c', 'CreatedOn'];
const STATUSES = ['New', 'Reviewed', 'Resolved'];
const PAGE_SIZE = 50;

async function fetchFeedback() {
  const res = await sdk.table('feedback_c').select(['Id', ...FEEDBACK_FIELDS]).orderByDesc('CreatedOn').page(1, PAGE_SIZE).fetch();
  if (!res.success) throw new Error(res.message || 'प्रतिक्रिया लोड झाल्या नाहीत.');
  return res.data;
}

async function fetchErrorLogs() {
  const res = await sdk.table('error_logs_c').select(['Id', ...LOG_FIELDS]).orderByDesc('CreatedOn').page(1, PAGE_SIZE).fetch();
  if (!res.success) throw new Error(res.message || 'एरर लॉग लोड झाले नाहीत.');
  return res.data;
}

function FeedbackRow({ row, onStatusChange }) {
  const [saving, setSaving] = useState(false);
  const screenshot = Array.isArray(row.screenshot_c) ? row.screenshot_c[0] : null;

  async function changeStatus(value) {
    if (value === row.status_c) return;
    setSaving(true);
    try {
      const res = await sdk.table('feedback_c').update({ Id: row.Id, status_c: value });
      if (!res.data?.length) {
        toast.error(res.messages?.[0] || 'स्थिती बदलता आली नाही.');
        console.error(`feedback_c update failed: ${res.messages?.join('; ') || 'no rows committed'}`);
        return;
      }
      onStatusChange();
    } catch (err) {
      toast.error('स्थिती बदलता आली नाही.');
      console.error(`feedback_c update threw: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="min-w-0 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-primary">{row.category_c ?? '—'}</span>
          <span>· {row.CreatedOn ? formatRelativeTime(row.CreatedOn) : '—'}</span>
          {row.page_path_c && <span className="truncate">· {row.page_path_c}</span>}
        </div>
        <div className="w-40 shrink-0">
          <Select value={row.status_c ?? 'New'} onValueChange={changeStatus} disabled={saving}>
            <SelectTrigger className="min-h-11 w-full" aria-label="प्रतिक्रियेची स्थिती">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-line break-words text-sm leading-6">{row.message_c ?? '—'}</p>
      {screenshot?.url && (
        <a href={screenshot.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-primary">
          स्क्रीनशॉट उघडा <ApperIcon name="ExternalLink" size={14} />
        </a>
      )}
    </article>
  );
}

export default function AdminFeedback() {
  const feedback = useFetch(fetchFeedback, []);
  const logs = useFetch(fetchErrorLogs, []);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight font-heading">Feedback inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">विद्यार्थ्यांच्या प्रतिक्रिया आणि अलीकडील एरर लॉग. नवीनतम {PAGE_SIZE} नोंदी.</p>
      </div>

      <section aria-label="Student feedback" className="space-y-3">
        <h2 className="text-base font-semibold font-heading">प्रतिक्रिया</h2>
        {feedback.loading && !feedback.data && <p className="py-6 text-center text-sm text-muted-foreground">लोड होत आहे...</p>}
        {feedback.error && (
          <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {feedback.error.message}
            <button type="button" onClick={feedback.run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button>
          </p>
        )}
        {!feedback.loading && !feedback.error && !feedback.data?.length && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">अजून प्रतिक्रिया नाहीत.</p>
        )}
        <div className="space-y-3">
          {(feedback.data ?? []).map((row) => (
            <FeedbackRow key={row.Id} row={row} onStatusChange={feedback.run} />
          ))}
        </div>
      </section>

      <section aria-label="Error logs" className="space-y-3">
        <h2 className="text-base font-semibold font-heading">एरर लॉग</h2>
        {logs.loading && !logs.data && <p className="py-6 text-center text-sm text-muted-foreground">लोड होत आहे...</p>}
        {logs.error && (
          <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {logs.error.message}
            <button type="button" onClick={logs.run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button>
          </p>
        )}
        {!logs.loading && !logs.error && !logs.data?.length && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">एरर लॉग रिकामे आहे.</p>
        )}
        <div className="space-y-2">
          {(logs.data ?? []).map((log) => (
            <div key={log.Id} className="min-w-0 rounded-xl border border-border bg-card p-3">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{log.CreatedOn ? formatRelativeTime(log.CreatedOn) : '—'}</span>
                {log.page_path_c && <span className="truncate">· {log.page_path_c}</span>}
              </div>
              <p className="mt-2 whitespace-pre-line break-words font-mono text-xs leading-5">{log.message_c ?? '—'}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}