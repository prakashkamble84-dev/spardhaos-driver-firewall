import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';
import { formatLocalDate, DATE_FORMATS } from '@/utils/date';

export const route = { path: '/mock-analytics', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'कामगिरी विश्लेषण', icon: 'BarChart3', order: 9 };

const TEST_FIELDS = ['Id', 'Name', 'total_questions_c'];
const ATTEMPT_FIELDS = ['Id', 'Name', 'mock_test_id_c', 'score_c', 'correct_count_c', 'incorrect_count_c', 'total_marks_c', 'completed_at_c', 'CreatedOn'];

async function fetchAnalytics() {
  const [testResult, attemptResult] = await Promise.all([
    sdk.table('mock_tests_c').select(TEST_FIELDS).fetch(),
    sdk.table('mock_test_attempts_c')
      .select(ATTEMPT_FIELDS)
      .where(window.ApperSDK.CoreSDK.eq('status_c', 'Completed'))
      .orderByDesc('CreatedOn')
      .limit(200)
      .fetch(),
  ]);

  if (!testResult.success) throw new Error(testResult.message || 'मॉक टेस्ट माहिती लोड झाली नाही.');
  if (!attemptResult.success) throw new Error(attemptResult.message || 'निकाल लोड झाले नाहीत.');

  const testNames = new Map((testResult.data ?? []).map((test) => [String(test.Id), test.Name]));
  const attempts = (attemptResult.data ?? []).map((attempt) => {
    const correct = Number(attempt.correct_count_c) || 0;
    const incorrect = Number(attempt.incorrect_count_c) || 0;
    const answered = correct + incorrect;
    return {
      ...attempt,
      testName: testNames.get(String(attempt.mock_test_id_c)) || attempt.Name || 'मॉक टेस्ट',
      accuracy: answered ? Math.round((correct / answered) * 100) : 0,
      date: attempt.completed_at_c || attempt.CreatedOn,
    };
  });

  return { attempts };
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export default function MockAnalytics() {
  const { data, loading, error, run } = useFetch(fetchAnalytics, []);
  const attempts = data?.attempts ?? [];

  const average = attempts.length
    ? Math.round(attempts.reduce((sum, a) => sum + a.accuracy, 0) / attempts.length)
    : 0;
  const best = attempts.reduce((max, a) => Math.max(max, Number(a.score_c) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-heading font-semibold tracking-tight text-foreground">कामगिरी विश्लेषण</h1>
          <p className="text-sm text-muted-foreground">पूर्ण झालेल्या मॉक टेस्टचे निकाल आणि अचूकता.</p>
        </div>
      </div>

      {loading && !data && (
        <p className="text-sm text-muted-foreground">विश्लेषण लोड होत आहे...</p>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error.message}</p>
          <button type="button" onClick={() => run()} className="text-sm font-medium text-primary underline">
            पुन्हा प्रयत्न करा
          </button>
        </div>
      )}

      {!loading && !error && attempts.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
          <ApperIcon name="BarChart3" size={28} className="text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">अजून निकाल नाहीत</p>
          <p className="text-sm text-muted-foreground">मॉक टेस्ट पूर्ण केल्यावर येथे विश्लेषण दिसेल.</p>
        </div>
      )}

      {attempts.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="पूर्ण चाचण्या" value={attempts.length} />
            <Stat label="सरासरी अचूकता" value={`${average}%`} />
            <Stat label="सर्वोत्तम गुण" value={best} />
          </div>

          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {attempts.map((attempt, index) => (
              <div key={attempt.Id ?? index} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground" title={attempt.testName}>{attempt.testName}</p>
                  <p className="text-xs text-muted-foreground">
                    {attempt.date ? formatLocalDate(attempt.date, DATE_FORMATS.SHORT) : '—'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    गुण {Number(attempt.score_c) || 0}
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    बरोबर {Number(attempt.correct_count_c) || 0} · चुकीचे {Number(attempt.incorrect_count_c) || 0} · अचूकता {attempt.accuracy}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}