import { useState } from 'react';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/practice', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'प्रश्न सराव', icon: 'ClipboardCheck', order: 3 };

const questions = [
  { id: 1, subject: 'राज्यशास्त्र', question: 'भारतीय राज्यघटनेतील मूलभूत हक्क कोणत्या भागात दिले आहेत?', options: ['भाग II', 'भाग III', 'भाग IV', 'भाग IVA'], answer: 1, explanation: 'मूलभूत हक्क भारतीय राज्यघटनेच्या भाग III मध्ये कलम १२ ते ३५ दरम्यान दिले आहेत.' },
  { id: 2, subject: 'इतिहास', question: 'सत्यशोधक समाजाची स्थापना कोणी केली?', options: ['लोकमान्य टिळक', 'महात्मा फुले', 'गोपाळ गणेश आगरकर', 'महर्षी कर्वे'], answer: 1, explanation: 'महात्मा ज्योतिराव फुले यांनी १८७३ मध्ये सत्यशोधक समाजाची स्थापना केली.' },
  { id: 3, subject: 'भूगोल', question: 'काळी माती प्रामुख्याने कोणत्या खडकापासून तयार होते?', options: ['ग्रॅनाइट', 'बेसॉल्ट', 'वाळूचा खडक', 'चुनखडी'], answer: 1, explanation: 'दख्खनच्या पठारातील बेसॉल्ट लाव्हा खडकाच्या अपक्षयातून काळी माती तयार होते.' }
];

export default function Practice() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState({});
  const [submitted, setSubmitted] = useState({});
  const question = questions[index];
  const isSubmitted = submitted[question.id];
  const correct = isSubmitted && selected[question.id] === question.answer;

  function submit() {
    if (selected[question.id] === undefined) return;
    setSubmitted((value) => ({ ...value, [question.id]: true }));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><p className="text-sm font-semibold text-primary">विषयानुसार MCQ सराव</p><h1 className="mt-1 text-3xl font-semibold">प्रश्न सोडवा</h1><p className="mt-2 text-muted-foreground">प्रत्येक उत्तरानंतर स्पष्टीकरण वाचा. घाईपेक्षा समज महत्त्वाची.</p></div>
      <div className="flex items-center justify-between text-sm"><span className="font-semibold">{question.subject}</span><span className="text-muted-foreground">प्रश्न {index + 1} / {questions.length}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(index + 1) / questions.length * 100}%` }} /></div>
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
        <h2 className="text-xl font-semibold leading-relaxed">{question.question}</h2>
        <div className="mt-6 space-y-3">
          {question.options.map((option, optionIndex) => {
            const chosen = selected[question.id] === optionIndex;
            const right = isSubmitted && optionIndex === question.answer;
            const wrong = isSubmitted && chosen && !right;
            return <button key={option} disabled={isSubmitted} onClick={() => setSelected((value) => ({ ...value, [question.id]: optionIndex }))} className={`flex min-h-12 w-full items-center gap-3 rounded-xl border p-3 text-left text-sm font-semibold transition-colors ${right ? 'border-emerald-600 bg-emerald-50 text-emerald-950' : wrong ? 'border-destructive bg-destructive/10' : chosen ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'}`}>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-current/30 text-xs">{['अ','ब','क','ड'][optionIndex]}</span>{option}
              {right && <ApperIcon name="CheckCircle2" className="ml-auto" size={18} />}
              {wrong && <ApperIcon name="XCircle" className="ml-auto" size={18} />}
            </button>;
          })}
        </div>
        {isSubmitted && <div className="mt-5 rounded-xl bg-secondary p-4"><p className="font-bold">{correct ? 'बरोबर उत्तर!' : 'हे उत्तर बरोबर नाही.'}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{question.explanation}</p></div>}
        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <button disabled={index === 0} onClick={() => setIndex((value) => value - 1)} className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold disabled:opacity-40">मागील प्रश्न</button>
          {!isSubmitted ? <button disabled={selected[question.id] === undefined} onClick={submit} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-40">उत्तर तपासा</button> : <button onClick={() => setIndex((value) => (value + 1) % questions.length)} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground">पुढील प्रश्न <ApperIcon name="ArrowRight" size={16} className="ml-1 inline" /></button>}
        </div>
      </section>
      <p className="text-xs text-muted-foreground">हे नमुना सराव प्रश्न आहेत. अधिकृत मागील वर्षांचे प्रश्न (PYQ) म्हणून समजू नका.</p>
    </div>
  );
}