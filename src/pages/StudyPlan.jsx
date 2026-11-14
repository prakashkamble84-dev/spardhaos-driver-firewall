import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';
import { formatLocalDate, DATE_FORMATS } from '@/utils/date';

export const route = { path: '/study-plan', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'अभ्यास प्लॅन', icon: 'CalendarDays', order: 2 };

const FIELDS = ['Id', 'Name', 'subject_c', 'topic_c', 'due_date_c', 'duration_minutes_c', 'status_c', 'priority_c', 'notes_c'];

async function fetchTasks() {
  const result = await sdk.table('study_tasks_c').select(FIELDS).orderByDesc('CreatedOn').fetch();
  if (!result.success) throw new Error(result.message || 'अभ्यास कामे लोड झाली नाहीत.');
  return result.data;
}

export default function StudyPlan() {
  const [notice, setNotice] = useState('');
  const [savingId, setSavingId] = useState('');
  const { data, loading, error, run } = useFetch(fetchTasks, []);
  const tasks = data ?? [];
  const done = tasks.filter((task) => task.status_c === 'Done').length;
  const minutes = tasks.filter((task) => task.status_c === 'Done').reduce((sum, task) => sum + (Number(task.duration_minutes_c) || 0), 0);

  async function update(task, status) {
    setSavingId(task.Id);
    setNotice('');
    try {
      const result = await sdk.table('study_tasks_c').update({ Id: task.Id, status_c: status });
      if (!result.data?.length) throw new Error(result.messages?.[0] || 'बदल जतन झाले नाहीत.');
      setNotice(status === 'Done' ? 'काम पूर्ण म्हणून नोंदवले.' : status === 'Deferred' ? 'काम पुढील अभ्यास सत्रासाठी ठेवले.' : 'स्थिती बदलली.');
      await run();
    } catch (err) {
      setNotice(err.message || 'काहीतरी चुकले. पुन्हा प्रयत्न करा.');
    } finally {
      setSavingId('');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">तुमच्या वेळेनुसार आखलेला आराखडा</p>
          <h1 className="mt-1 text-3xl font-semibold">माझा अभ्यास प्लॅन</h1>
          <p className="mt-2 text-muted-foreground">आजची कामे पूर्ण करा किंवा राहिलेली कामे पुढे ढकला.</p>
        </div>
        <Link to="/study-items/new" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground">
          <ApperIcon name="Plus" size={16} /> काम जोडा
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="पूर्ण कामे" value={done + ' / ' + tasks.length} />
        <Metric label="पूर्ण केलेला नियोजित वेळ" value={minutes + ' मिनिटे'} />
        <Metric label="बाकी कामे" value={tasks.length - done} />
      </div>

      {notice && <p role="status" className="rounded-lg bg-success-muted px-4 py-3 text-sm font-semibold text-success-foreground">{notice}</p>}
      {loading && <p className="py-8 text-center text-sm text-muted-foreground">अभ्यास प्लॅन लोड होत आहे...</p>}
      {error && <div className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">{error} <button onClick={run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button></div>}
      {!loading && !error && tasks.length === 0 && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">अजून अभ्यास कामे नाहीत. पहिले काम जोडा.</p>}

      <div className="space-y-3">
        {tasks.map((task) => (
          <article key={task.Id} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary"><ApperIcon name="BookOpen" size={18} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-primary">{task.subject_c}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold">{task.priority_c === 'High' ? 'उच्च' : task.priority_c === 'Low' ? 'कमी' : 'मध्यम'} प्राधान्य</span>
              </div>
              <Link to={`/study-items/${task.Id}`} className="mt-1 inline-block font-semibold hover:text-primary hover:underline">{task.Name}</Link>
              <p className="mt-1 text-xs text-muted-foreground">{task.topic_c || 'घटक दिलेला नाही'} · {Number(task.duration_minutes_c) || 0} मिनिटे · {task.due_date_c ? formatLocalDate(task.due_date_c, DATE_FORMATS.SHORT) : 'तारीख नाही'}</p>
              <p className="mt-1 text-xs text-muted-foreground">{task.status_c === 'Done' ? 'पूर्ण' : task.status_c === 'Deferred' ? 'पुढे ढकलले' : 'बाकी'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {task.status_c !== 'Done' ? (
                <button disabled={savingId === task.Id} onClick={() => update(task, 'Done')} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-50"><ApperIcon name="Check" size={16} /> पूर्ण करा</button>
              ) : (
                <button disabled={savingId === task.Id} onClick={() => update(task, 'Pending')} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold disabled:opacity-50"><ApperIcon name="RotateCcw" size={15} /> पुन्हा उघडा</button>
              )}
              {task.status_c === 'Pending' && <button disabled={savingId === task.Id} onClick={() => update(task, 'Deferred')} className="min-h-10 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-accent disabled:opacity-50">उद्यासाठी ठेवा</button>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}
