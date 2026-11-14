import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'मुख्यपृष्ठ', icon: 'House', order: 1 };

const { eq } = window.ApperSDK.CoreSDK;
const TASK_FIELDS = ['Id', 'Name', 'subject_c', 'topic_c', 'duration_minutes_c', 'status_c'];

async function fetchTasks() {
  const result = await sdk.table('study_tasks_c')
    .select(TASK_FIELDS)
    .orderByDesc('CreatedOn')
    .page(1, 6)
    .fetch();

  if (!result.success) throw new Error(result.message || 'अभ्यास कामे लोड झाली नाहीत.');
  return result.data;
}

async function fetchTaskMetrics() {
  const result = await sdk.table('study_tasks_c')
    .select([{ field: 'Id' }])
    .aggregate([
      { id: 'total', fields: [{ field: 'Id', fn: 'Count', alias: 'count' }] },
      { id: 'done', fields: [{ field: 'Id', fn: 'Count', alias: 'count' }], where: eq('status_c', 'Done') },
      { id: 'minutes', fields: [{ field: 'duration_minutes_c', fn: 'Sum', alias: 'count' }], where: eq('status_c', 'Done') },
    ])
    .limit(1)
    .fetch();

  if (!result.success) throw new Error(result.message || 'प्रगतीची आकडेवारी लोड झाली नाही.');

  const value = (id) => {
    const item = result.aggregators?.find((entry) => entry.id === id);
    return Number(item?.data?.count ?? item?.count ?? item?.value ?? 0);
  };

  return {
    total: value('total'),
    done: value('done'),
    minutes: value('minutes'),
  };
}

export default function Home() {
  const [notice, setNotice] = useState('');
  const { data: tasksData, loading, error, run } = useFetch(fetchTasks, []);
  const { data: metrics, run: reloadMetrics, error: metricsError } = useFetch(fetchTaskMetrics, []);
  const tasks = tasksData ?? [];

  async function toggleTask(task) {
    const nextStatus = task.status_c === 'Done' ? 'Pending' : 'Done';

    try {
      const result = await sdk.table('study_tasks_c').update({
        Id: task.Id,
        status_c: nextStatus,
      });

      if (!result.data?.length) throw new Error(result.messages?.[0] || 'बदल जतन झाले नाहीत.');
      setNotice(nextStatus === 'Done' ? 'काम पूर्ण म्हणून नोंदवले.' : 'काम पुन्हा बाकी म्हणून ठेवले.');
      await Promise.all([run(), reloadMetrics()]);
    } catch (err) {
      setNotice(err.message || 'काहीतरी चुकले. पुन्हा प्रयत्न करा.');
    }
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold text-primary">आजचा दिवस · नमस्कार!</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">आजचा अभ्यास सुरू करूया.</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">तुमचे ध्येय मोठे आहे. आजची छोटी पावले सातत्याने पूर्ण करा.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-success" />
          Live वैयक्तिक डेटा
        </span>
      </section>

      <section className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <p className="text-sm font-semibold text-primary-foreground/75">तुमचा वैयक्तिक अभ्यास आराखडा</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold sm:text-3xl">दररोज थोडी प्रगती. परीक्षेच्या दिवशी आत्मविश्वास.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-primary-foreground/80">तुमच्या खात्यात जतन केलेली कामे इथे दिसतात.</p>
          <Link to="/study-plan" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-foreground px-4 py-2 text-sm font-bold text-primary transition-transform hover:-translate-y-0.5">
            आजचा प्लॅन उघडा
            <ApperIcon name="ArrowUpRight" size={17} />
          </Link>
        </div>
        <div className="absolute -right-8 -top-12 hidden h-64 w-64 rounded-full border-[32px] border-primary-foreground/10 sm:block" />
      </section>

      {metricsError && <p role="alert" className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">{metricsError}</p>}

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric icon="Clock3" label="पूर्ण केलेला नियोजित वेळ" value={(metrics?.minutes ?? 0) + ' मिनिटे'} hint="पूर्ण कामांच्या वेळेची बेरीज" />
        <Metric icon="ListChecks" label="पूर्ण कामे" value={(metrics?.done ?? 0) + ' / ' + (metrics?.total ?? 0)} hint="तुमच्या जतन केलेल्या कामांपैकी" />
        <Metric icon="Target" label="बाकी कामे" value={Math.max(0, (metrics?.total ?? 0) - (metrics?.done ?? 0))} hint="अजून पूर्ण करायची कामे" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">तुमची पुढची पायरी</p>
              <h2 className="mt-1 font-serif text-2xl font-semibold">तुमची अभ्यास कामे</h2>
            </div>
            <Link to="/study-plan" className="text-sm font-bold text-primary hover:underline">सर्व पाहा</Link>
          </div>

          {loading && <p className="py-8 text-center text-sm text-muted-foreground">अभ्यास कामे लोड होत आहेत...</p>}
          {error && (
            <div className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">
              {error}
              <button onClick={run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button>
            </div>
          )}
          {!loading && !error && tasks.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              अभ्यास कामे अजून जोडलेली नाहीत.
              <Link to="/study-items/new" className="ml-1 font-bold text-primary underline">पहिले काम जोडा.</Link>
            </p>
          )}

          <div className="space-y-2">
            {tasks.map((task) => (
              <button
                key={task.Id}
                onClick={() => toggleTask(task)}
                className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${task.status_c === 'Done' ? 'border-success bg-success text-success-foreground' : 'border-border text-transparent'}`}>
                  <ApperIcon name="Check" size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-semibold ${task.status_c === 'Done' ? 'text-muted-foreground line-through' : ''}`}>{task.Name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{task.subject_c} · {task.topic_c}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{task.duration_minutes_c} मि.</span>
              </button>
            ))}
          </div>
          {notice && <p role="status" className="mt-3 text-xs font-semibold text-success">{notice}</p>}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">सातत्य</p>
                <h2 className="mt-1 font-serif text-xl font-semibold">पुढील कृती</h2>
              </div>
              <ApperIcon name="Flame" size={22} className="text-warning" />
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">दररोजचा अभ्यास पूर्ण झाल्यावर कामांची स्थिती बदला. तुमची प्रगती खऱ्या नोंदींवर आधारित राहील.</p>
            <Link to="/progress" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary">
              प्रगती पाहा
              <ApperIcon name="ArrowRight" size={16} />
            </Link>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">लक्ष द्या</p>
            <h2 className="mt-1 font-serif text-xl font-semibold">उजळणी आणि चुका</h2>
            <p className="mt-2 text-sm text-muted-foreground">कमकुवत घटक आणि चुका स्वतंत्रपणे नोंदवा, जेणेकरून त्या पुढील सरावात दिसतील.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/revision" className="text-sm font-bold text-primary">उजळणी <ApperIcon name="ArrowRight" size={14} className="inline" /></Link>
              <Link to="/mistakes" className="text-sm font-bold text-primary">चूक वही <ApperIcon name="ArrowRight" size={14} className="inline" /></Link>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">तुमचे अभ्यास साधन</p>
          <h2 className="mt-1 font-serif text-2xl font-semibold">पुढे काय करायचे?</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { to: '/study-plan', icon: 'CalendarDays', label: 'अभ्यास नियोजन', note: 'आजचा आणि आठवड्याचा प्लॅन' },
            { to: '/practice', icon: 'ClipboardCheck', label: 'सराव प्रश्न', note: 'प्रकाशित MCQ सोडवा' },
            { to: '/revision', icon: 'Brain', label: 'उजळणी', note: 'विसरण्यापूर्वी पुन्हा शिका' },
            { to: '/tutor', icon: 'MessageCircle', label: 'AI अभ्यास मार्गदर्शक', note: 'कठीण संकल्पना समजून घ्या' },
          ].map((item) => (
            <Link key={item.to} to={item.to} className="group rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
              <ApperIcon name={item.icon} size={21} className="text-primary" />
              <h3 className="mt-3 font-semibold">{item.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value, hint }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><ApperIcon name={icon} size={17} /> {label}</div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
