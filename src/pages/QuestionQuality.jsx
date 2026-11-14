import { useState } from 'react';
import { toast } from 'sonner';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatLocalDate, DATE_FORMATS } from '@/utils/date';

export const route = { path: '/question-quality', layout: 'owner', access: "profile === 'Admin_c'" };
export const nav = { label: 'Question quality', icon: 'ShieldCheck', order: 91, profiles: ['Admin_c'] };

const QUALITY_STATUSES = ['Unverified', 'Verified', 'Needs Review', 'Rejected'];
const FILTER_ALL = 'all';
const PAGE_SIZE = 25;

const FIELDS = [
  'Id',
  'question_text_c',
  'subject_c',
  'topic_c',
  'difficulty_c',
  'exam_track_c',
  'status_c',
  'quality_status_c',
  'source_c',
  'reviewed_on_c',
];

async function fetchQuestions(filter, page) {
  const { eq, isNull, or } = window.ApperSDK.CoreSDK;
  let query = sdk.table('questions_c').select(FIELDS);
  if (filter === 'Unverified') {
    query = query.where(or(isNull('quality_status_c'), eq('quality_status_c', 'Unverified')));
  } else if (filter !== FILTER_ALL) {
    query = query.where(eq('quality_status_c', filter));
  }
  const res = await query.orderByDesc('CreatedOn').page(page, PAGE_SIZE).fetch();
  if (!res.success) throw new Error(res.message || 'प्रश्न लोड झाले नाहीत.');
  return { rows: res.data ?? [], total: res.total ?? 0 };
}

export default function QuestionQuality() {
  const [filter, setFilter] = useState(FILTER_ALL);
  const [page, setPage] = useState(1);
  const [savingId, setSavingId] = useState(null);
  const { data, loading, error, run } = useFetch(() => fetchQuestions(filter, page), [filter, page]);
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function changeFilter(value) {
    setFilter(value);
    setPage(1);
  }

  async function changeQuality(row, value) {
    setSavingId(row.Id);
    try {
      const res = await sdk.table('questions_c').update({
        Id: row.Id,
        quality_status_c: value,
        reviewed_on_c: new Date().toISOString(),
      });
      if (!res.data?.length) {
        toast.error(res.messages?.[0] || 'स्थिती जतन झाली नाही.', {
          description: res.messages?.slice(1).join('\n') || undefined,
          duration: 8000,
        });
        console.error(`questions_c update failed: ${(res.messages ?? []).join('; ')}`);
        return;
      }
      toast.success('प्रश्नाची स्थिती जतन झाली.');
      run();
    } catch (err) {
      toast.error('प्रश्न जतन करताना त्रुटी आली.');
      console.error(`questions_c update threw: ${err?.message ?? err}`);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">प्रश्न गुणवत्ता</p>
        <h1 className="mt-1 text-3xl font-semibold">प्रश्न पडताळणी</h1>
        <p className="mt-2 text-muted-foreground">प्रश्न बँकेतील प्रत्येक प्रश्नाची पडताळणी स्थिती ठरवा.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={filter} onValueChange={changeFilter}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>सर्व प्रश्न</SelectItem>
            {QUALITY_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground tabular-nums">एकूण {total}</span>
      </div>

      {loading && <p className="py-8 text-center text-sm text-muted-foreground">प्रश्न लोड होत आहेत...</p>}
      {error && (
        <div className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">
          {error.message ?? error}
          <button onClick={run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button>
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <ApperIcon name="ShieldCheck" size={30} className="mx-auto text-muted-foreground" />
          <h2 className="mt-3 font-semibold">या स्थितीत प्रश्न नाहीत</h2>
          <p className="mt-2 text-sm text-muted-foreground">दुसरी स्थिती निवडून पहा.</p>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((row) => {
          const status = row.quality_status_c ?? 'Unverified';
          return (
            <article key={row.Id} className="min-w-0 rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="line-clamp-2 break-words font-medium">{row.question_text_c || '—'}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[row.subject_c, row.topic_c, row.exam_track_c, row.difficulty_c].filter(Boolean).join(' · ') || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    स्रोत: {row.source_c || '—'}
                    {row.reviewed_on_c && ` · पडताळणी: ${formatLocalDate(row.reviewed_on_c, DATE_FORMATS.SHORT)}`}
                  </p>
                </div>
                <div className="shrink-0">
                  <Select
                    value={status}
                    onValueChange={(value) => changeQuality(row, value)}
                    disabled={savingId === row.Id}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUALITY_STATUSES.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            मागे
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
            पुढे
          </Button>
        </div>
      )}
    </div>
  );
}