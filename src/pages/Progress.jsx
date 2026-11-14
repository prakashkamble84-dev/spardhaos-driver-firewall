import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/progress', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'प्रगती', icon: 'ChartNoAxesCombined', order: 6 };

const { eq } = window.ApperSDK.CoreSDK;

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

  if (!result.success) throw new Error(result.message || 'अभ्यास आकडेवारी लोड झाली नाही.');
  return result.aggregators ?? [];
}

async function fetchAttemptMetrics() {
  const result = await sdk.table('quiz_attempts_c')
    .select([{ field: 'Id' }])
    .aggregate([
      { id: 'total', fields: [{ field: 'Id', fn: 'Count', alias: 'count' }] },
      { id: 'correct', fields: [{ field: 'Id', fn: 'Count', alias: 'count' }], where: eq('is_correct_c', true) },
      { id: 'seconds', fields: [{ field: 'time_spent_seconds_c', fn: 'Sum', alias: 'count' }] },
    ])
    .limit(1)
    .fetch();

  if (!result.success) throw new Error(result.message || 'सराव आकडेवारी लोड झाली नाही.');
  return result.aggregators ?? [];
}

function aggregateValue(data, id) {
  const item = (data ?? []).find((entry) => entry.id === id);
  return Number(item?.data?.count ?? item?.count ?? item?.value ?? 0);
}

export default function Progress() {
  const { data: taskMetrics, loading: tasksLoading, error: tasksError, run: reloadTasks } = useFetch(fetchTaskMetrics, []);
  const { data: attemptMetrics, loading: attemptsLoading, error: attemptsError, run: reloadAttempts } = useFetch(fetchAttemptMetrics, []);
  const totalTasks = aggregateValue(taskMetrics, 'total');
  const completedTasks = aggregateValue(taskMetrics, 'done');
  const plannedMinutes = aggregateValue(taskMetrics, 'minutes');
  const totalAttempts = aggregateValue(attemptMetrics, 'total');
  const correct = aggregateValue(attemptMetrics, 'correct');
  const seconds = aggregateValue(attemptMetrics, 'seconds');
  const accuracy = totalAttempts ? Math.round(correct / totalAttempts * 100) : 0;
  const loading = tasksLoading || attemptsLoading;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">तुमची तयारी कुठे पोहोचली?</p>
        <h1 className="mt-1 text-3xl font-semibold">माझी प्रगती</h1>
        <p className="mt-2 text-muted-foreground">गुणांपेक्षा सातत्य आणि विषयातील सुधारणा महत्त्वाची.</p>
      </div>

      {(tasksError || attemptsError) && (
        <div className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">
          {tasksError || attemptsError}
          <button onClick={() => { reloadTasks(); reloadAttempts(); }} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="सराव अचूकता" value={loading ? '...' : accuracy + '%'} icon="Target" />
        <Stat label="पूर्ण कामांचा नियोजित वेळ" value={loading ? '...' : (plannedMinutes / 60).toFixed(1) + ' तास'} icon="Clock3" />
        <Stat label="सोडवलेले प्रश्न" value={loading ? '...' : totalAttempts} icon="BookOpen" />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-serif text-xl font-semibold">सरावाचा निकाल</h2>
        <p className="mt-1 text-sm text-muted-foreground">तुमच्या जतन केलेल्या quiz attempts वरून</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-secondary p-4"><p className="text-xs text-muted-foreground">बरोबर</p><p className="mt-1 text-2xl font-semibold">{correct}</p></div>
          <div className="rounded-xl bg-secondary p-4"><p className="text-xs text-muted-foreground">चुकीचे</p><p className="mt-1 text-2xl font-semibold">{Math.max(0, totalAttempts - correct)}</p></div>
          <div className="rounded-xl bg-secondary p-4"><p className="text-xs text-muted-foreground">नोंदवलेला वेळ</p><p className="mt-1 text-2xl font-semibold">{Math.round(seconds / 60)} मि.</p></div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-serif text-xl font-semibold">अभ्यास कामांची प्रगती</h2>
        <p className="mt-2 text-sm text-muted-foreground">{completedTasks} / {totalTasks} अभ्यास कामे पूर्ण</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary" style={{ width: totalTasks ? `${completedTasks / totalTasks * 100}%` : '0%' }} />
        </div>
      </section>

      <p className="text-xs text-muted-foreground">येथील आकडे तुमच्या खात्यातील जतन केलेल्या कामे आणि सराव प्रयत्नांवर आधारित आहेत. सिलेबस कव्हरेजसाठी विषयवार syllabus tracking जोडलेले नाही.</p>
    </div>
  );
}

function Stat({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <ApperIcon name={icon} size={19} className="text-primary" />
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
