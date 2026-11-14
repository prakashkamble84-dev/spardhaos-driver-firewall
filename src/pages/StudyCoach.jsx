import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useFetch } from '@/hooks/useFetch';
import { useFunction } from '@/hooks/useFunction';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';
import {
  buildTopicStats,
  buildRecommendations,
  buildAdaptivePlan,
  buildCoachQuestion,
  todayIso,
} from '@/services/recommendations';

export const route = { path: '/study-coach', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'अभ्यास सल्लागार', icon: 'Sparkles', order: 3 };

const ATTEMPT_FIELDS = ['Id', 'topic_c', 'is_correct_c', 'attempted_on_c'];
const MISTAKE_FIELDS = ['Id', 'topic_c', 'subject_c', 'review_status_c'];
const TASK_FIELDS = ['Id', 'Name', 'subject_c', 'topic_c', 'due_date_c', 'status_c', 'task_type_c'];
const PLAN_FIELDS = ['Id', 'Name', 'daily_goal_minutes_c'];

async function fetchCoachData() {
  const [attempts, mistakes, tasks, plans] = await Promise.all([
    sdk.table('quiz_attempts_c').select(ATTEMPT_FIELDS).fetch(),
    sdk.table('mistake_records_c').select(MISTAKE_FIELDS).fetch(),
    sdk.table('study_tasks_c').select(TASK_FIELDS).orderByDesc('CreatedOn').fetch(),
    sdk.table('study_plans_c').select(PLAN_FIELDS).orderByDesc('CreatedOn').fetch(),
  ]);

  if (!attempts.success) throw new Error(attempts.message || 'सराव नोंदी लोड झाल्या नाहीत.');
  if (!mistakes.success) throw new Error(mistakes.message || 'चुकांच्या नोंदी लोड झाल्या नाहीत.');
  if (!tasks.success) throw new Error(tasks.message || 'अभ्यास कामे लोड झाली नाहीत.');
  if (!plans.success) throw new Error(plans.message || 'अभ्यास आराखडा लोड झाला नाही.');

  return {
    attempts: attempts.data ?? [],
    mistakes: mistakes.data ?? [],
    tasks: tasks.data ?? [],
    plan: plans.data?.[0] ?? null,
  };
}

export default function StudyCoach() {
  const [savingPlan, setSavingPlan] = useState(false);
  const [coachReply, setCoachReply] = useState('');
  const { invoke, loading: coachLoading } = useFunction(import.meta.env.VITE_TUTOR_REPLY);
  const { data, loading, error, run } = useFetch(fetchCoachData, []);

  const attempts = data?.attempts ?? [];
  const mistakes = data?.mistakes ?? [];
  const tasks = data?.tasks ?? [];
  const plan = data?.plan ?? null;
  const today = todayIso();

  const stats = buildTopicStats(attempts, mistakes);
  const weakTopics = stats.filter((stat) => stat.isWeak);
  const overdueCount = tasks.filter((task) => task.status_c === 'Pending' && task.due_date_c && task.due_date_c < today).length;
  const recommendations = buildRecommendations({ stats, tasks, attemptCount: attempts.length, today });
  const adaptivePlan = buildAdaptivePlan({
    weakTopics,
    existingTasks: tasks,
    dailyGoalMinutes: plan?.daily_goal_minutes_c,
    today,
    planId: plan?.Id,
  });
  const coachQuestion = buildCoachQuestion(weakTopics, overdueCount);

  async function addAdaptiveSessions() {
    if (!adaptivePlan.length || savingPlan) return;
    setSavingPlan(true);
    try {
      const result = await sdk.table('study_tasks_c').create(adaptivePlan);
      if (!result.data?.length) {
        const message = result.messages?.[0] || 'सत्रे जोडता आली नाहीत.';
        toast.error(message);
        console.error(`study_tasks_c create failed: ${(result.messages ?? []).join('; ')}`);
        return;
      }
      toast.success(`${result.data.length} सुधारणा सत्रे अभ्यास आराखड्यात जोडली`);
      await run();
    } catch (err) {
      toast.error('सत्रे जोडताना त्रुटी आली.');
      console.error(`study_tasks_c create threw: ${err?.message ?? err}`);
    } finally {
      setSavingPlan(false);
    }
  }

  async function askCoach() {
    if (!coachQuestion || coachLoading) return;
    const result = await invoke({ question: coachQuestion });
    if (!result?.success || !result.data?.answer) {
      toast.error('AI सल्ला मिळवता आला नाही. कृपया पुन्हा प्रयत्न करा.');
      return;
    }
    setCoachReply(result.data.answer);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">तुमच्या सरावावर आधारित मार्गदर्शन</p>
        <h1 className="mt-1 text-3xl font-semibold">अभ्यास सल्लागार</h1>
        <p className="mt-2 text-muted-foreground">सरावातील कमकुवत घटक ओळखा, त्यासाठी आराखडा तयार करा आणि AI मार्गदर्शन घ्या.</p>
      </div>

      {loading && <p className="py-8 text-center text-sm text-muted-foreground">माहिती तयार होत आहे...</p>}
      {error && <div role="alert" className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">{error}<button onClick={run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button></div>}

      {!loading && !error && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="सराव प्रश्न" value={attempts.length} />
            <Metric label="खुल्या चुका" value={mistakes.filter((m) => m.review_status_c !== 'Resolved').length} />
            <Metric label="कमकुवत घटक" value={weakTopics.length} />
          </div>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">वैयक्तिक शिफारशी</h2>
            {recommendations.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">सध्या विशेष शिफारस नाही. चांगली प्रगती सुरू आहे.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {recommendations.map((item) => (
                  <li key={item.id} className="rounded-lg bg-secondary p-3">
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">५ दिवसांचा सुधारणा आराखडा</h2>
                <p className="mt-1 text-sm text-muted-foreground">कमकुवत घटकांसाठी रोज एक सत्र अभ्यास आराखड्यात जोडा.</p>
              </div>
              <button
                type="button"
                onClick={addAdaptiveSessions}
                disabled={!adaptivePlan.length || savingPlan}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                <ApperIcon name="CalendarPlus" size={16} />
                {savingPlan ? 'जोडत आहे...' : 'सत्रे जोडा'}
              </button>
            </div>
            {adaptivePlan.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">नवीन सुधारणा सत्रांची गरज नाही.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {adaptivePlan.map((session) => (
                  <li key={session.topic_c} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                    <span className="min-w-0 truncate font-semibold">{session.topic_c}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{session.duration_minutes_c} मिनिटे · {session.due_date_c}</span>
                  </li>
                ))}
              </ol>
            )}
            <Link to="/study-plan" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">अभ्यास प्लॅन पहा</Link>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">AI अभ्यास मार्गदर्शक</h2>
                <p className="mt-1 text-sm text-muted-foreground">तुमच्या कमकुवत घटकांनुसार 7 दिवसांचा सोपा सल्ला मिळवा.</p>
              </div>
              <button
                type="button"
                onClick={askCoach}
                disabled={!coachQuestion || coachLoading}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-accent disabled:opacity-50"
              >
                <ApperIcon name="Bot" size={16} />
                {coachLoading ? 'उत्तर तयार होत आहे...' : 'सल्ला घ्या'}
              </button>
            </div>
            {!coachQuestion && <p className="mt-3 text-sm text-muted-foreground">सल्ला घेण्यासाठी आधी सरावातून कमकुवत घटक ओळखले जावेत.</p>}
            {coachReply && <div className="mt-4 rounded-xl bg-secondary p-4 text-sm leading-6 whitespace-pre-line break-words">{coachReply}</div>}
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}