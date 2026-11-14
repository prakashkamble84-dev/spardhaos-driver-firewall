import { useState } from 'react';
import { Link } from 'react-router-dom';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'मुख्यपृष्ठ', icon: 'House', order: 1 };

const initialTasks = [
  { id: 1, subject: 'इतिहास', title: 'महाराष्ट्रातील समाजसुधारक', type: 'वाचन', duration: 35, done: false },
  { id: 2, subject: 'राज्यशास्त्र', title: 'मूलभूत हक्क आणि कर्तव्ये', type: 'अभ्यास', duration: 40, done: false },
  { id: 3, subject: 'भूगोल', title: 'भारतीय मान्सून', type: 'उजळणी', duration: 25, done: true },
  { id: 4, subject: 'चालू घडामोडी', title: 'महाराष्ट्रातील महत्त्वाच्या योजना', type: 'प्रश्नसंच', duration: 20, done: false }
];

const quickLinks = [
  { to: '/study-plan', icon: 'CalendarDays', label: 'अभ्यास नियोजन', note: 'आजचा आणि आठवड्याचा प्लॅन' },
  { to: '/practice', icon: 'ClipboardCheck', label: 'सराव प्रश्न', note: 'विषयानुसार MCQ सोडवा' },
  { to: '/revision', icon: 'Brain', label: 'उजळणी', note: 'विसरण्यापूर्वी पुन्हा शिका' },
  { to: '/tutor', icon: 'MessageCircle', label: 'AI अभ्यास मार्गदर्शक', note: 'कठीण संकल्पना समजून घ्या' }
];

export default function Home() {
  const [tasks, setTasks] = useState(initialTasks);
  const completed = tasks.filter((task) => task.done).length;
  const minutes = tasks.filter((task) => task.done).reduce((sum, task) => sum + task.duration, 0);

  function toggleTask(id) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold text-primary">शनिवार, १४ नोव्हेंबर २०२६ · नमस्कार!</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">आजचा अभ्यास सुरू करूया.</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">तुमचे ध्येय मोठे आहे. आजची छोटी पावले सातत्याने पूर्ण करा.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> डेमो डेटा · नमुना प्रगती
        </span>
      </section>

      <section className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <p className="text-sm font-semibold text-primary-foreground/75">तुमचा वैयक्तिक अभ्यास आराखडा</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold sm:text-3xl">दररोज थोडी प्रगती. परीक्षेच्या दिवशी आत्मविश्वास.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-primary-foreground/80">आज २ तासांचा अभ्यास पूर्ण करण्यासाठी तयार केलेला नमुना प्लॅन तुमची वाट पाहत आहे.</p>
          <Link to="/study-plan" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-foreground px-4 py-2 text-sm font-bold text-primary transition-transform hover:-translate-y-0.5">
            आजचा प्लॅन उघडा <ApperIcon name="ArrowUpRight" size={17} />
          </Link>
        </div>
        <div className="absolute -right-8 -top-12 hidden h-64 w-64 rounded-full border-[32px] border-primary-foreground/10 sm:block" />
        <div className="absolute -bottom-20 right-28 hidden h-44 w-44 rounded-full bg-primary-foreground/10 sm:block" />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric icon="Clock3" label="आजचा अभ्यास" value={`${minutes} मिनिटे`} hint="पूर्ण केलेल्या कामांमधून" />
        <Metric icon="ListChecks" label="पूर्ण कामे" value={`${completed}/${tasks.length}`} hint="आजच्या नमुना कामांपैकी" />
        <Metric icon="Target" label="अचूकता" value="७२%" hint="मागील नमुना सराव" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">तुमची पुढची पायरी</p>
              <h2 className="mt-1 font-serif text-2xl font-semibold">आजची कामे</h2>
            </div>
            <Link to="/study-plan" className="text-sm font-bold text-primary hover:underline">सर्व पाहा</Link>
          </div>
          <div className="space-y-2">
            {tasks.map((task) => (
              <button key={task.id} onClick={() => toggleTask(task.id)} className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${task.done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-border text-transparent'}`}>
                  <ApperIcon name="Check" size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-semibold ${task.done ? 'text-muted-foreground line-through' : ''}`}>{task.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{task.subject} · {task.type}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{task.duration} मि.</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">नमुना डेटा: काम पूर्ण केल्यावर या डॅशबोर्डवरील स्थिती बदलते. सध्या बदल फक्त या डेमो सत्रात राहतात.</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">सातत्य</p>
                <h2 className="mt-1 font-serif text-xl font-semibold">अभ्यासाची सवय</h2>
              </div>
              <ApperIcon name="Flame" size={22} className="text-orange-600" />
            </div>
            <p className="mt-4 text-4xl font-semibold tabular-nums">४ दिवस</p>
            <p className="mt-1 text-sm text-muted-foreground">सलग अभ्यासाचे नमुना दिवस</p>
            <div className="mt-4 flex gap-2">
              {['सो','मं','बु','गु','शु','श','रवि'].map((day, index) => <div key={day} className={`grid h-9 flex-1 place-items-center rounded-lg text-xs font-bold ${index < 4 ? 'bg-emerald-700 text-white' : 'bg-secondary text-muted-foreground'}`}>{day}</div>)}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">लक्ष द्या</p>
            <h2 className="mt-1 font-serif text-xl font-semibold">उजळणी बाकी आहे</h2>
            <p className="mt-2 text-sm text-muted-foreground">भारतीय राज्यघटना आणि आधुनिक इतिहास या विषयांची उजळणी देय आहे.</p>
            <Link to="/revision" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">उजळणी सुरू करा <ApperIcon name="ArrowRight" size={16} /></Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">तुमचे अभ्यास साधन</p>
          <h2 className="mt-1 font-serif text-2xl font-semibold">पुढे काय करायचे?</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item) => (
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