import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/mock-tests', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'मॉक टेस्ट', icon: 'FileText', order: 8 };

const TEST_FIELDS = ['Id', 'Name', 'exam_track_c', 'duration_minutes_c', 'total_questions_c', 'instructions_c', 'status_c'];
const QUESTION_FIELDS = ['Id', 'Name', 'question_text_c', 'options_c', 'correct_answer_c', 'explanation_c', 'subject_c', 'topic_c'];

async function fetchTests() {
  const result = await sdk.table('mock_tests_c')
    .select(TEST_FIELDS)
    .where(window.ApperSDK.CoreSDK.eq('status_c', 'Published'))
    .fetch();

  if (!result.success) throw new Error(result.message || 'मॉक टेस्ट लोड झाले नाहीत.');
  return result.data;
}

function parseOptions(value) {
  if (Array.isArray(value)) return value;
  const raw = String(value || '');

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // Plain text options are supported too.
  }

  return raw.split(/\n|\|/).map((item) => item.trim()).filter(Boolean);
}

function getCorrectIndex(question, options) {
  const answer = String(question.correct_answer_c ?? '').trim();
  const exact = options.findIndex((option) => option.trim() === answer);
  if (exact >= 0) return exact;

  const letter = ['A', 'B', 'C', 'D'].indexOf(answer.toUpperCase());
  if (letter >= 0) return letter;

  const numeric = Number(answer);
  return Number.isInteger(numeric) && numeric >= 0 && numeric < options.length ? numeric : -1;
}

export default function MockTests() {
  const { data, loading, error, run } = useFetch(fetchTests, []);
  const [startingId, setStartingId] = useState('');
  const [notice, setNotice] = useState('');
  const [session, setSession] = useState(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState({});
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);

  const questions = session?.questions ?? [];
  const question = questions[index];
  const options = question ? parseOptions(question.options_c) : [];
  const correctIndex = question ? getCorrectIndex(question, options) : -1;

  async function start(test) {
    setStartingId(test.Id);
    setNotice('');

    try {
      const questionResult = await sdk.table('questions_c')
        .select(QUESTION_FIELDS)
        .where(window.ApperSDK.CoreSDK.and(
          window.ApperSDK.CoreSDK.eq('status_c', 'Published'),
          window.ApperSDK.CoreSDK.eq('exam_track_c', test.exam_track_c),
        ))
        .fetch();

      if (!questionResult.success) {
        throw new Error(questionResult.message || 'या चाचणीचे प्रश्न लोड झाले नाहीत.');
      }

      if (!questionResult.data?.length) {
        setNotice('या परीक्षेसाठी अजून प्रकाशित प्रश्न उपलब्ध नाहीत. Admin ने प्रश्नसंच जोडावा.');
        return;
      }

      const attemptResult = await sdk.table('mock_test_attempts_c').create({
        Name: test.Name + ' · Attempt',
        mock_test_id_c: test.Id,
        score_c: 0,
        correct_count_c: 0,
        incorrect_count_c: 0,
        started_at_c: new Date().toISOString(),
        status_c: 'In Progress',
      });

      if (!attemptResult.data?.length) {
        throw new Error(attemptResult.messages?.[0] || 'चाचणी सत्र सुरू झाले नाही.');
      }

      setSession({
        test,
        attempt: attemptResult.data[0],
        questions: questionResult.data.slice(0, Number(test.total_questions_c) || questionResult.data.length),
      });
      setIndex(0);
      setSelected({});
      setAnswers({});
    } catch (err) {
      setNotice(err.message || 'चाचणी सुरू करताना त्रुटी आली.');
    } finally {
      setStartingId('');
    }
  }

  async function submitAnswer() {
    if (!session || !question || selected[question.Id] === undefined || saving) return;

    setSaving(true);
    setNotice('');
    const isCorrect = selected[question.Id] === correctIndex;

    try {
      const result = await sdk.table('quiz_attempts_c').create({
        Name: question.Name || question.question_text_c || 'Mock test answer',
        question_id_c: question.Id,
        selected_answer_c: options[selected[question.Id]],
        is_correct_c: isCorrect,
        time_spent_seconds_c: 0,
        attempted_on_c: new Date().toISOString(),
      });

      if (!result.data?.length) {
        throw new Error(result.messages?.[0] || 'उत्तर जतन झाले नाही.');
      }

      if (!isCorrect) {
        await sdk.table('mistake_records_c').create({
          Name: question.Name || question.question_text_c || 'मॉक टेस्टमधील चूक',
          question_id_c: question.Id,
          subject_c: question.subject_c || '',
          topic_c: question.topic_c || '',
          mistake_type_c: 'Concept',
          explanation_c: question.explanation_c || '',
          review_status_c: 'Open',
        });
      }

      setAnswers((current) => ({ ...current, [question.Id]: isCorrect }));
    } catch (err) {
      setNotice(err.message || 'उत्तर जतन करताना त्रुटी आली.');
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    if (!session) return;
    setSaving(true);
    setNotice('');

    try {
      const correctCount = Object.values(answers).filter(Boolean).length;
      const answeredCount = Object.keys(answers).length;
      const incorrectCount = answeredCount - correctCount;
      const result = await sdk.table('mock_test_attempts_c').update({
        Id: session.attempt.Id,
        score_c: correctCount,
        correct_count_c: correctCount,
        incorrect_count_c: incorrectCount,
        completed_at_c: new Date().toISOString(),
        status_c: 'Completed',
      });

      if (!result.data?.length) {
        throw new Error(result.messages?.[0] || 'चाचणीचा निकाल जतन झाला नाही.');
      }

      setNotice(`चाचणी पूर्ण. बरोबर: ${correctCount}, चुकीचे: ${incorrectCount}, अनुत्तरित: ${questions.length - answeredCount}.`);
      setSession(null);
      await run();
    } catch (err) {
      setNotice(err.message || 'निकाल जतन करताना त्रुटी आली.');
    } finally {
      setSaving(false);
    }
  }

  if (session && question) {
    const isAnswered = Object.prototype.hasOwnProperty.call(answers, question.Id);

    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm font-semibold text-primary">{session.test.Name}</p>
          <h1 className="mt-1 text-3xl font-semibold">मॉक टेस्ट सुरू आहे</h1>
          <p className="mt-2 text-sm text-muted-foreground">प्रश्न {index + 1} / {questions.length}</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary" style={{ width: `${(index + 1) / questions.length * 100}%` }} />
        </div>
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
          <h2 className="text-xl font-semibold leading-relaxed">{question.question_text_c || question.Name}</h2>
          <p className="mt-2 text-xs text-muted-foreground">{question.subject_c} · {question.topic_c}</p>
          <div className="mt-6 space-y-3">
            {options.map((option, optionIndex) => (
              <button
                key={optionIndex}
                disabled={isAnswered}
                onClick={() => setSelected((current) => ({ ...current, [question.Id]: optionIndex }))}
                className={`flex min-h-12 w-full items-center gap-3 rounded-xl border p-3 text-left text-sm font-semibold ${selected[question.Id] === optionIndex ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'}`}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full border border-current/30 text-xs">{['अ', 'ब', 'क', 'ड'][optionIndex] || optionIndex + 1}</span>
                {option}
              </button>
            ))}
          </div>
          {isAnswered && <div className="mt-5 rounded-xl bg-secondary p-4"><p className="font-bold">{answers[question.Id] ? 'बरोबर उत्तर' : 'चुकीचे उत्तर'}</p><p className="mt-2 text-sm text-muted-foreground">{question.explanation_c || 'स्पष्टीकरण उपलब्ध नाही.'}</p></div>}
          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <button disabled={index === 0} onClick={() => setIndex((value) => value - 1)} className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold disabled:opacity-40">मागील</button>
            {!isAnswered ? (
              <button disabled={selected[question.Id] === undefined || saving || correctIndex < 0} onClick={submitAnswer} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-40">{saving ? 'जतन...' : 'उत्तर नोंदवा'}</button>
            ) : index < questions.length - 1 ? (
              <button onClick={() => setIndex((value) => value + 1)} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground">पुढील प्रश्न</button>
            ) : (
              <button disabled={saving} onClick={finish} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-40">{saving ? 'निकाल जतन...' : 'चाचणी पूर्ण करा'}</button>
            )}
          </div>
        </section>
        {notice && <p role="status" className="text-sm text-warning-foreground">{notice}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><p className="text-sm font-semibold text-primary">परीक्षेचा अनुभव</p><h1 className="mt-1 text-3xl font-semibold">मॉक टेस्ट</h1><p className="mt-2 text-muted-foreground">प्रकाशित प्रश्नसंचातून चाचणी द्या. प्रत्येक उत्तर आणि निकाल तुमच्या खात्यात जतन होतो.</p></div>
      {notice && <p role="status" className="rounded-lg bg-secondary p-3 text-sm">{notice}</p>}
      {loading && <p className="py-8 text-center text-sm text-muted-foreground">प्रकाशित चाचण्या लोड होत आहेत...</p>}
      {error && <div className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">{error}<button onClick={run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button></div>}
      {!loading && !error && !data?.length && <div className="rounded-2xl border border-dashed border-border p-8 text-center"><ApperIcon name="ClipboardList" size={30} className="mx-auto text-muted-foreground" /><h2 className="mt-3 font-semibold">अजून प्रकाशित मॉक टेस्ट नाहीत</h2><p className="mt-2 text-sm text-muted-foreground">Admin ने चाचणी Published केल्यावर ती येथे दिसेल.</p></div>}
      <div className="space-y-4">
        {(data ?? []).map((test) => (
          <article key={test.Id} className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-3">
              <div><span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">प्रकाशित चाचणी</span><h2 className="mt-4 font-serif text-2xl font-semibold">{test.Name}</h2><p className="mt-2 text-sm text-muted-foreground">{test.exam_track_c || 'सामान्य अध्ययन'}</p></div>
              <ApperIcon name="ClipboardList" size={28} className="text-primary" />
            </div>
            <div className="my-6 grid grid-cols-2 gap-3 border-y border-border py-5 sm:grid-cols-3">
              <Info label="प्रश्न" value={test.total_questions_c ?? '—'} />
              <Info label="वेळ" value={test.duration_minutes_c ? test.duration_minutes_c + ' मिनिटे' : '—'} />
              <Info label="स्थिती" value={test.status_c} />
            </div>
            {test.instructions_c && <p className="text-sm leading-6 text-muted-foreground">{test.instructions_c}</p>}
            <button disabled={startingId === test.Id} onClick={() => start(test)} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50">
              {startingId === test.Id ? 'चाचणी तयार होत आहे...' : 'चाचणी सुरू करा'}
              <ApperIcon name="ArrowRight" size={17} />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}
