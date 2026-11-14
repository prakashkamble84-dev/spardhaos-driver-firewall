import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/practice', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'प्रश्न सराव', icon: 'ClipboardCheck', order: 3 };

const QUESTION_FIELDS = [
  'Id',
  'Name',
  'question_text_c',
  'options_c',
  'correct_answer_c',
  'explanation_c',
  'subject_c',
  'topic_c',
  'difficulty_c',
];

async function fetchQuestions() {
  const result = await sdk.table('questions_c')
    .select(QUESTION_FIELDS)
    .where(window.ApperSDK.CoreSDK.eq('status_c', 'Published'))
    .fetch();

  if (!result.success) {
    throw new Error(result.message || 'प्रश्न लोड झाले नाहीत.');
  }

  return result.data;
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

export default function Practice() {
  const { data, loading, error, run } = useFetch(fetchQuestions, []);
  const questions = data ?? [];
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState({});
  const [submitted, setSubmitted] = useState({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now());
  const question = questions[index];
  const options = question ? parseOptions(question.options_c) : [];
  const correctOption = question ? answerIndex(question, options) : -1;
  const isSubmitted = question ? Boolean(submitted[question.Id]) : false;
  const correct = isSubmitted && selected[question.Id] === correctOption;

  async function submit() {
    if (!question || selected[question.Id] === undefined || saving) return;

    setSaving(true);
    setNotice('');

    const isCorrect = selected[question.Id] === correctOption;
    const elapsedSeconds = Math.max(0, Math.round((Date.now() - questionStartedAt) / 1000));

    try {
      const attempt = await sdk.table('quiz_attempts_c').create({
        Name: question.Name || question.question_text_c || 'Quiz attempt',
        question_id_c: question.Id,
        selected_answer_c: options[selected[question.Id]],
        is_correct_c: isCorrect,
        time_spent_seconds_c: elapsedSeconds,
        attempted_on_c: new Date().toISOString(),
      });

      if (!attempt.data?.length) {
        throw new Error(attempt.messages?.[0] || 'उत्तर जतन झाले नाही.');
      }

      if (!isCorrect) {
        const mistake = await sdk.table('mistake_records_c').create({
          Name: question.Name || question.question_text_c || 'सरावातील चूक',
          question_id_c: question.Id,
          subject_c: question.subject_c || '',
          topic_c: question.topic_c || '',
          mistake_type_c: 'Concept',
          explanation_c: question.explanation_c || '',
          review_status_c: 'Open',
        });

        if (!mistake.data?.length) {
          setNotice('उत्तर जतन झाले; पण चूक वहीत नोंद करता आली नाही.');
        }
      }

      setSubmitted((current) => ({ ...current, [question.Id]: true }));
    } catch (err) {
      setNotice(err.message || 'उत्तर जतन करताना त्रुटी आली.');
    } finally {
      setSaving(false);
    }
  }

  function goToQuestion(nextIndex) {
    setIndex(nextIndex);
    setQuestionStartedAt(Date.now());
    setNotice('');
  }

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">प्रकाशित प्रश्न लोड होत आहेत...</div>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold">प्रश्न सराव</h1>
        <p role="alert" className="rounded-lg bg-warning-muted p-4 text-warning-foreground">{error}</p>
        <button onClick={run} className="font-bold text-primary underline">पुन्हा प्रयत्न करा</button>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-primary">विषयानुसार MCQ सराव</p>
          <h1 className="mt-1 text-3xl font-semibold">प्रश्न सोडवा</h1>
        </div>
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <ApperIcon name="ClipboardCheck" size={30} className="mx-auto text-muted-foreground" />
          <h2 className="mt-3 font-semibold">अजून प्रकाशित प्रश्न उपलब्ध नाहीत</h2>
          <p className="mt-2 text-sm text-muted-foreground">Admin ने प्रश्न तयार करून Published केल्यावर ते येथे दिसतील. बनावट प्रश्न दाखवण्यापेक्षा रिकामी पण खरी यादी बरी.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">विषयानुसार MCQ सराव</p>
        <h1 className="mt-1 text-3xl font-semibold">प्रश्न सोडवा</h1>
        <p className="mt-2 text-muted-foreground">प्रत्येक उत्तरानंतर स्पष्टीकरण वाचा. चुकीचे उत्तर चूक वहीतही जतन होते.</p>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">{question.subject_c} · {question.difficulty_c || 'सराव'}</span>
        <span className="text-muted-foreground">प्रश्न {index + 1} / {questions.length}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(index + 1) / questions.length * 100}%` }} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
        <h2 className="text-xl font-semibold leading-relaxed">{question.question_text_c || question.Name}</h2>
        <p className="mt-2 text-xs text-muted-foreground">{question.topic_c}</p>
        <div className="mt-6 space-y-3">
          {options.map((option, optionIndex) => {
            const chosen = selected[question.Id] === optionIndex;
            const right = isSubmitted && optionIndex === correctOption;
            const wrong = isSubmitted && chosen && !right;
            const optionClass = right
              ? 'border-success bg-success-muted text-success'
              : wrong
                ? 'border-destructive bg-destructive/10 text-destructive'
                : chosen
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-accent';

            return (
              <button
                key={optionIndex}
                disabled={isSubmitted}
                onClick={() => setSelected((value) => ({ ...value, [question.Id]: optionIndex }))}
                className={`flex min-h-12 w-full items-center gap-3 rounded-xl border p-3 text-left text-sm font-semibold transition-colors ${optionClass}`}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-current/30 text-xs">{['अ', 'ब', 'क', 'ड'][optionIndex] || optionIndex + 1}</span>
                {option}
                {right && <ApperIcon name="CheckCircle2" className="ml-auto" size={18} />}
                {wrong && <ApperIcon name="XCircle" className="ml-auto" size={18} />}
              </button>
            );
          })}
        </div>

        {isSubmitted && (
          <div className="mt-5 rounded-xl bg-secondary p-4">
            <p className="font-bold">{correct ? 'बरोबर उत्तर!' : 'हे उत्तर बरोबर नाही.'}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{question.explanation_c || 'या प्रश्नासाठी स्पष्टीकरण उपलब्ध नाही.'}</p>
          </div>
        )}
        {notice && <p role="status" className="mt-4 text-sm text-warning-foreground">{notice}</p>}

        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <button disabled={index === 0} onClick={() => goToQuestion(index - 1)} className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold disabled:opacity-40">मागील प्रश्न</button>
          {!isSubmitted ? (
            <button disabled={selected[question.Id] === undefined || saving || correctOption < 0} onClick={submit} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-40">
              {saving ? 'जतन करत आहे...' : 'उत्तर तपासा'}
            </button>
          ) : (
            <button disabled={index === questions.length - 1} onClick={() => goToQuestion(index + 1)} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-40">
              पुढील प्रश्न
              <ApperIcon name="ArrowRight" size={16} className="ml-1 inline" />
            </button>
          )}
        </div>
      </section>
      <p className="text-xs text-muted-foreground">फक्त Admin ने Published केलेले प्रश्न दिसतात. प्रश्नांची अचूकता आणि अधिकृत PYQ स्थिती Admin ने पडताळणे आवश्यक आहे.</p>
    </div>
  );
}
