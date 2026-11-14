import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';
import { formatLocalDate, DATE_FORMATS } from '@/utils/date';

export const route = { path: '/study-plan', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'अभ्यास प्लॅन', icon: 'CalendarDays', order: 2 };

const TASK_FIELDS = [
  'Id',
  'Name',
  'subject_c',
  'topic_c',
  'due_date_c',
  'duration_minutes_c',
  'status_c',
  'priority_c',
  'notes_c',
];

const PLAN_FIELDS = [
  'Id',
  'Name',
  'exam_track_c',
  'start_date_c',
  'target_date_c',
  'daily_goal_minutes_c',
  'status_c',
];

async function fetchTasks() {
  const result = await sdk.table('study_tasks_c')
    .select(TASK_FIELDS)
    .orderByDesc('CreatedOn')
    .fetch();

  if (!result.success) throw new Error(result.message || 'अभ्यास कामे लोड झाली नाहीत.');
  return result.data;
}

async function fetchPlans() {
  const result = await sdk.table('study_plans_c')
    .select(PLAN_FIELDS)
    .orderByDesc('CreatedOn')
    .fetch();

  if (!result.success) throw new Error(result.message || 'अभ्यास आराखडा लोड झाला नाही.');
  return result.data;
}

export default function StudyPlan() {
  const [notice, setNotice] = useState('');
  const [savingId, setSavingId] = useState('');
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const { data: tasksData, loading, error, run } = useFetch(fetchTasks, []);
  const { data: plansData, loading: plansLoading, error: plansError, run: reloadPlans } = useFetch(fetchPlans, []);
  const tasks = tasksData ?? [];
  const plan = plansData?.[0] ?? null;
  const done = tasks.filter((task) => task.status_c === 'Done').length;
  const minutes = tasks.filter((task) => task.status_c === 'Done')
    .reduce((sum, task) => sum + (Number(task.duration_minutes_c) || 0), 0);

  const values = planForm ?? {
    Name: plan?.Name || 'माझा अभ्यास आराखडा',
    exam_track_c: plan?.exam_track_c || 'MPSC राज्यसेवा',
    start_date_c: plan?.start_date_c || new Date().toISOString().slice(0, 10),
    target_date_c: plan?.target_date_c || '',
    daily_goal_minutes_c: String(plan?.daily_goal_minutes_c ?? 180),
    status_c: plan?.status_c || 'Active',
  };

  function changePlan(field, value) {
    setPlanForm((current) => ({ ...(current ?? values), [field]: value }));
  }

  async function savePlan(event) {
    event.preventDefault();
    setSavingPlan(true);
    setNotice('');

    try {
      const payload = {
        ...values,
        Name: values.Name.trim(),
        daily_goal_minutes_c: Number(values.daily_goal_minutes_c) || 0,
      };
      const result = plan
        ? await sdk.table('study_plans_c').update({ Id: plan.Id, ...payload })
        : await sdk.table('study_plans_c').create(payload);

      if (!result.data?.length) throw new Error(result.messages?.[0] || 'अभ्यास आराखडा जतन झाला नाही.');

      setPlanForm(null);
      setShowPlanForm(false);
      setNotice('अभ्यास आराखडा जतन झाला.');
      await reloadPlans();
    } catch (err) {
      setNotice(err.message || 'आराखडा जतन करताना त्रुटी आली.');
    } finally {
      setSavingPlan(false);
    }
  }

  async function update(task, status) {
    setSavingId(task.Id);
    setNotice('');

    try {
      const result = await sdk.table('study_tasks_c').update({
        Id: task.Id,
        status_c: status,
      });

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
          <p className="mt-2 text-muted-foreground">ध्येय ठरवा, कामे जोडा आणि पूर्ण झालेली कामे नोंदवा.</p>
        </div>
        <Link to="/study-items/new" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground">
          <ApperIcon name="Plus" size={16} />
          काम जोडा
        </Link>
      </div>

      {plansError && <p role="alert" className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">{plansError}</p>}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">माझे ध्येय</p>
            <h2 className="mt-1 text-xl font-semibold">{plan?.Name || 'अभ्यास आराखडा सेट करा'}</h2>
            {plan && <p className="mt-1 text-sm text-muted-foreground">{plan.exam_track_c} · दररोज {plan.daily_goal_minutes_c} मिनिटे</p>}
            {plan?.target_date_c && <p className="mt-1 text-xs text-muted-foreground">लक्ष्य तारीख: {formatLocalDate(plan.target_date_c, DATE_FORMATS.SHORT)}</p>}
          </div>
          <button onClick={() => setShowPlanForm((value) => !value)} className="min-h-10 rounded-lg border border-border px-3 text-sm font-semibold">{plan ? 'आराखडा संपादित करा' : 'ध्येय सेट करा'}</button>
        </div>
        {showPlanForm && (
          <form onSubmit={savePlan} className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
            <Field label="आराखड्याचे नाव"><input required value={values.Name} onChange={(e) => changePlan('Name', e.target.value)} className="field" /></Field>
            <Field label="लक्ष्य परीक्षा"><select value={values.exam_track_c} onChange={(e) => changePlan('exam_track_c', e.target.value)} className="field"><option>MPSC राज्यसेवा</option><option>तलाठी भरती</option><option>पोलीस भरती</option><option>गट-क परीक्षा</option></select></Field>
            <Field label="सुरुवात तारीख"><input type="date" value={values.start_date_c} onChange={(e) => changePlan('start_date_c', e.target.value)} className="field" /></Field>
            <Field label="लक्ष्य तारीख"><input type="date" value={values.target_date_c} onChange={(e) => changePlan('target_date_c', e.target.value)} className="field" /></Field>
            <Field label="दररोजचे लक्ष्य (मिनिटे)"><input type="number" min="0" value={values.daily_goal_minutes_c} onChange={(e) => changePlan('daily_goal_minutes_c', e.target.value)} className="field" /></Field>
            <Field label="स्थिती"><select value={values.status_c} onChange={(e) => changePlan('status_c', e.target.value)} className="field"><option>Active</option><option>Paused</option><option>Completed</option></select></Field>
            <div className="flex items-end gap-2"><button disabled={savingPlan || plansLoading} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">{savingPlan ? 'जतन...' : 'आराखडा जतन करा'}</button><button type="button" onClick={() => setShowPlanForm(false)} className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold">रद्द</button></div>
          </form>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="पूर्ण कामे" value={done + ' / ' + tasks.length} />
        <Metric label="पूर्ण केलेला नियोजित वेळ" value={minutes + ' मिनिटे'} />
        <Metric label="बाकी कामे" value={tasks.length - done} />
      </div>

      {notice && <p role="status" className="rounded-lg bg-success-muted px-4 py-3 text-sm font-semibold text-success-foreground">{notice}</p>}
      {loading && <p className="py-8 text-center text-sm text-muted-foreground">अभ्यास प्लॅन लोड होत आहे...</p>}
      {error && <div className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">{error}<button onClick={run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button></div>}
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
      <style>{'.field{width:100%;min-height:44px;border:1px solid var(--border);border-radius:0.5rem;background:var(--background);padding:0.65rem 0.8rem;font-size:0.9rem;outline:none}'}</style>
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}

function Field({ label, children }) {
  return <label className="block space-y-2"><span className="text-sm font-semibold">{label}</span>{children}</label>;
}
