import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/topics', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'विषय अभ्यास', icon: 'PlayCircle', order: 5 };

const TOPIC_FIELDS = ['Id', 'Name', 'exam_track_c', 'subject_c', 'topic_c', 'topic_mr_c', 'learning_objectives_c', 'difficulty_c', 'sequence_c'];
const MATERIAL_FIELDS = ['Id', 'Name', 'title_mr_c', 'material_type_c', 'url_c', 'duration_seconds_c', 'provider_c'];
const QUESTION_FIELDS = ['Id', 'Name', 'question_text_c', 'options_c', 'correct_answer_c', 'explanation_c', 'exam_track_c', 'topic_c'];
const PROGRESS_FIELDS = ['Id', 'Name', 'item_id_c', 'exam_track_c', 'status_c', 'best_score_c', 'attempts_c'];
const PASS_PERCENT = 60;
const PROGRESS_LABELS = { Completed: 'पूर्ण', 'In Progress': 'सुरू आहे' };

async function fetchTopics() {
  const { eq } = window.ApperSDK.CoreSDK;
  const result = await sdk.table('syllabus_topics_c')
    .select(TOPIC_FIELDS)
    .where(eq('status_c', 'Published'))
    .orderBy('sequence_c')
    .fetch();

  if (!result.success) {
    throw new Error(result.message || 'विषय यादी लोड झाली नाही.');
  }

  return result.data;
}

async function fetchTopicProgress() {
  const { eq } = window.ApperSDK.CoreSDK;
  const result = await sdk.table('learning_progress_c')
    .select(PROGRESS_FIELDS)
    .where(eq('item_type_c', 'Topic'))
    .fetch();

  if (!result.success) {
    throw new Error(result.message || 'प्रगती लोड झाली नाही.');
  }

  return result.data;
}

async function fetchTopicContent(topicName) {
  const { and, eq } = window.ApperSDK.CoreSDK;
  const [materials, questions] = await Promise.all([
    sdk.table('learning_materials_c')
      .select(MATERIAL_FIELDS)
      .where(and(eq('status_c', 'Published'), eq('topic_c', topicName)))
      .fetch(),
    sdk.table('questions_c')
      .select(QUESTION_FIELDS)
      .where(and(eq('status_c', 'Published'), eq('topic_c', topicName)))
      .fetch(),
  ]);

  if (!materials.success) {
    throw new Error(materials.message || 'व्हिडिओ धडे लोड झाले नाहीत.');
  }

  if (!questions.success) {
    throw new Error(questions.message || 'चाचणी प्रश्न लोड झाले नाहीत.');
  }

  return { materials: materials.data ?? [], questions: questions.data ?? [] };
}

function parseOptions(value) {
  if (Array.isArray(value)) return value;

  const raw = String(value || '');

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // Plain text options are also supported.
  }

  return raw.split(/\n|\|/).map((item) => item.trim()).filter(Boolean);
}

function answerIndex(question, options) {
  const answer = String(question.correct_answer_c ?? '').trim();
  const byText = options.findIndex((option) => option.trim() === answer);

  if (byText >= 0) return byText;

  const normalized = answer.toUpperCase();
  const letters = ['A', 'B', 'C', 'D'];

  if (letters.includes(normalized)) return letters.indexOf(normalized);

  const numeric = Number(answer);
  return Number.isInteger(numeric) && numeric >= 0 && numeric < options.length ? numeric : -1;
}

function progressLabel(row) {
  return PROGRESS_LABELS[row?.status_c] ?? 'सुरू नाही';
}

export default function Topics() {
  const [selectedId, setSelectedId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const { data: topics, loading, error, run } = useFetch(fetchTopics, []);
  const { data: progressRows, run: refetchProgress } = useFetch(fetchTopicProgress, []);
  const topicList = topics ?? [];
  const selected = topicList.find((topic) => String(topic.Id) === String(selectedId)) ?? null;
  const progressByItem = useMemo(
    () => new Map((progressRows ?? []).map((row) => [String(row.item_id_c), row])),
    [progressRows],
  );
  const progress = selected ? progressByItem.get(String(selected.Id)) : undefined;
  const { data: content, loading: contentLoading, error: contentError } = useFetch(
    () => (selected ? fetchTopicContent(selected.topic_c) : Promise.resolve(null)),
    [selectedId],
  );
  const materials = content?.materials ?? [];
  const questions = content?.questions ?? [];

  function selectTopic(topic) {
    setSelectedId(topic.Id);
    setAnswers({});
    setResult(null);
    setNotice('');
  }

  async function submitTest() {
    if (!selected || questions.length === 0 || submitting) return;

    const unanswered = questions.filter((question) => answers[question.Id] === undefined).length;
    if (unanswered > 0) {
      setNotice(`${unanswered} प्रश्नांची उत्तरे बाकी आहेत.`);
      return;
    }

    setSubmitting(true);
    setNotice('');

    const sessionId = crypto.randomUUID();
    const attemptNumber = (progress?.attempts_c ?? 0) + 1;
    const attemptedOn = new Date().toISOString();
    const attempts = questions.map((question) => {
      const options = parseOptions(question.options_c);
      const choice = answers[question.Id];
      return {
        Name: question.Name || question.question_text_c || selected.Name,
        question_id_c: question.Id,
        selected_answer_c: options[choice] ?? '',
        is_correct_c: choice === answerIndex(question, options),
        attempted_on_c: attemptedOn,
        topic_c: selected.topic_c,
        exam_track_c: selected.exam_track_c || question.exam_track_c || '',
        assessment_type_c: 'Topic Assessment',
        attempt_number_c: attemptNumber,
        session_id_c: sessionId,
      };
    });
    const score = attempts.filter((attempt) => attempt.is_correct_c).length;
    const percent = Math.round((score / attempts.length) * 100);
    const passed = percent >= PASS_PERCENT;

    try {
      const savedAttempts = await sdk.table('quiz_attempts_c').create(attempts);
      if (!savedAttempts.data?.length) {
        throw new Error(savedAttempts.messages?.[0] || 'चाचणी निकाल जतन झाला नाही.');
      }

      const progressFields = {
        status_c: passed ? 'Completed' : 'In Progress',
        best_score_c: Math.max(percent, progress?.best_score_c ?? 0),
        attempts_c: attemptNumber,
      };
      const savedProgress = progress
        ? await sdk.table('learning_progress_c').update({ Id: progress.Id, ...progressFields })
        : await sdk.table('learning_progress_c').create({
          Name: selected.Name,
          item_type_c: 'Topic',
          item_id_c: String(selected.Id),
          exam_track_c: selected.exam_track_c || '',
          ...progressFields,
        });
      if (!savedProgress.data?.length) {
        throw new Error(savedProgress.messages?.[0] || 'प्रगती जतन झाली नाही.');
      }

      setResult({ score, total: attempts.length, percent, passed });
      refetchProgress();
    } catch (err) {
      toast.error(err.message || 'चाचणी जतन करता आली नाही.');
      console.error(`topic test save failed for ${selected.Name}: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  function retakeTest() {
    setAnswers({});
    setResult(null);
    setNotice('');
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">विषयवार अभ्यास</p>
        <h1 className="mt-1 text-3xl font-semibold">विषय अभ्यास</h1>
        <p className="mt-2 text-muted-foreground">विषय निवडा, व्हिडिओ धडे पाहा आणि विषय चाचणी देऊन प्रगती तपासा.</p>
      </div>

      {loading && <p className="py-8 text-center text-sm text-muted-foreground">विषय यादी लोड होत आहे...</p>}
      {error && (
        <div className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">
          {error}
          <button type="button" onClick={run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button>
        </div>
      )}
      {!loading && !error && topicList.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <ApperIcon name="PlayCircle" size={30} className="mx-auto text-muted-foreground" />
          <h2 className="mt-3 font-semibold">अजून विषय प्रकाशित नाहीत</h2>
          <p className="mt-2 text-sm text-muted-foreground">Admin ने विषय Published केल्यावर ते येथे दिसतील.</p>
        </div>
      )}

      {topicList.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <ul className="min-w-0 space-y-2">
            {topicList.map((topic) => {
              const isActive = String(topic.Id) === String(selectedId);
              return (
                <li key={topic.Id}>
                  <button
                    type="button"
                    onClick={() => selectTopic(topic)}
                    className={`w-full min-w-0 rounded-xl border p-4 text-left transition hover:bg-secondary ${
                      isActive ? 'border-primary bg-secondary' : 'border-border bg-card'
                    }`}
                  >
                    <span className="block truncate font-semibold">{topic.topic_mr_c || topic.topic_c || topic.Name}</span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {topic.subject_c} · {progressLabel(progressByItem.get(String(topic.Id)))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <section className="min-w-0 space-y-6">
            {!selected && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                डावीकडून विषय निवडा.
              </div>
            )}

            {selected && (
              <>
                <div className="min-w-0 rounded-2xl border border-border bg-card p-5">
                  <h2 className="font-serif text-2xl font-semibold break-words">{selected.topic_mr_c || selected.topic_c}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selected.subject_c} · {selected.exam_track_c} · कठीणता: {selected.difficulty_c || '—'}
                  </p>
                  {selected.learning_objectives_c && (
                    <p className="mt-3 whitespace-pre-line text-sm leading-6 break-words">{selected.learning_objectives_c}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-semibold">व्हिडिओ धडे</h3>
                  {contentLoading && <p className="text-sm text-muted-foreground">साहित्य लोड होत आहे...</p>}
                  {!contentLoading && contentError && <p className="text-sm text-warning-foreground">{contentError}</p>}
                  {!contentLoading && !contentError && materials.length === 0 && (
                    <p className="text-sm text-muted-foreground">या विषयासाठी अजून धडे प्रकाशित नाहीत.</p>
                  )}
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {materials.map((item) => (
                      <li key={item.Id} className="min-w-0 rounded-xl border border-border bg-card p-4">
                        <p className="truncate text-xs text-muted-foreground">
                          {item.material_type_c}{item.provider_c ? ` · ${item.provider_c}` : ''}
                        </p>
                        <p className="mt-1 truncate font-semibold" title={item.title_mr_c || item.Name}>{item.title_mr_c || item.Name}</p>
                        {item.url_c && (
                          <a href={item.url_c} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary">
                            पाहा
                            <ApperIcon name="ExternalLink" size={14} />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold">विषय चाचणी</h3>
                    {progress?.attempts_c > 0 && (
                      <span className="text-xs text-muted-foreground">
                        प्रयत्न: {progress.attempts_c} · सर्वोत्तम गुण: {progress.best_score_c ?? 0}%
                      </span>
                    )}
                  </div>

                  {!contentLoading && !contentError && questions.length === 0 && (
                    <p className="text-sm text-muted-foreground">या विषयासाठी अजून चाचणी प्रश्न प्रकाशित नाहीत.</p>
                  )}

                  {questions.map((question, questionIndex) => {
                    const options = parseOptions(question.options_c);
                    const chosen = answers[question.Id];
                    const correctIndex = answerIndex(question, options);
                    return (
                      <div key={question.Id} className="min-w-0 space-y-2">
                        <p className="text-sm font-semibold break-words">{questionIndex + 1}. {question.question_text_c}</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {options.map((option, optionIndex) => {
                            const isChosen = chosen === optionIndex;
                            const resultClass = result
                              ? optionIndex === correctIndex
                                ? 'border-success text-success font-semibold'
                                : isChosen
                                  ? 'border-destructive text-destructive'
                                  : 'border-border'
                              : isChosen
                                ? 'border-primary bg-secondary font-semibold'
                                : 'border-border';
                            return (
                              <button
                                key={`${question.Id}-${optionIndex}`}
                                type="button"
                                disabled={Boolean(result) || submitting}
                                onClick={() => setAnswers((current) => ({ ...current, [question.Id]: optionIndex }))}
                                className={`min-w-0 rounded-lg border px-3 py-2 text-left text-sm transition hover:bg-secondary disabled:pointer-events-none ${resultClass}`}
                              >
                                <span className="break-words">{option}</span>
                              </button>
                            );
                          })}
                        </div>
                        {result && question.explanation_c && (
                          <p className="text-xs leading-5 text-muted-foreground break-words">स्पष्टीकरण: {question.explanation_c}</p>
                        )}
                      </div>
                    );
                  })}

                  {result ? (
                    <div className="space-y-2 rounded-xl bg-secondary p-4 text-sm">
                      <p className="font-semibold">{result.score} / {result.total} बरोबर ({result.percent}%)</p>
                      <p className="text-muted-foreground">
                        {result.passed ? 'अभिनंदन! हा विषय पूर्ण झाला.' : `${PASS_PERCENT}% गुणांसाठी पुन्हा सराव करा.`}
                      </p>
                      <button type="button" onClick={retakeTest} className="font-bold text-primary underline">पुन्हा चाचणी द्या</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={submitTest}
                      disabled={submitting || questions.length === 0}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {submitting ? 'जतन होत आहे...' : 'चाचणी सबमिट करा'}
                    </button>
                  )}
                  {notice && <p className="text-sm text-warning-foreground">{notice}</p>}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}