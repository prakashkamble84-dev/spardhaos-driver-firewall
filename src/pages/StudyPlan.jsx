import { useState } from 'react';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/study-plan', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'अभ्यास प्लॅन', icon: 'CalendarDays', order: 2 };

const seed = [
  { id: 1, time: '७:००', subject: 'इतिहास', title: 'महाराष्ट्रातील समाजसुधारक', duration: 35, status: 'बाकी', priority: 'उच्च' },
  { id: 2, time: '७:४०', subject: 'राज्यशास्त्र', title: 'मूलभूत हक्क आणि कर्तव्ये', duration: 40, status: 'बाकी', priority: 'उच्च' },
  { id: 3, time: '८:३०', subject: 'भूगोल', title: 'भारतीय मान्सूनची उजळणी', duration: 25, status: 'पूर्ण', priority: 'मध्यम' },
  { id: 4, time: '९:००', subject: 'चालू घडामोडी', title: 'महाराष्ट्र शासनाच्या योजना', duration: 20, status: 'बाकी', priority: 'मध्यम' }
];

export default function StudyPlan() {
  const [tasks, setTasks] = useState(seed);
  const [notice, setNotice] = useState('');
  const done = tasks.filter((task) => task.status === 'पूर्ण').length;

  function update(id, status) {
    setTasks((items) => items.map((task) => task.id === id ? { ...task, status } : task));
    setNotice(status === 'पूर्ण' ? 'काम पूर्ण म्हणून नोंदवले.' : 'काम पुढील अभ्यास सत्रासाठी ठेवले.');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">तुमच्या वेळेनुसार आखलेला नमुना आराखडा</p>
          <h1 className="mt-1 text-3xl font-semibold">माझा अभ्यास प्लॅन</h1>
          <p className="mt-2 text-muted-foreground">आजची कामे पूर्ण करा किंवा राहिलेली कामे पुढे ढकला.</p>
        </div>
        <span className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">डेमो प्लॅन</span>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm text-muted-foreground">आजची प्रगती</p><p className="mt-1 text-3xl font-semibold">{done} / {tasks.length} <span className="text-base font-normal text-muted-foreground">कामे पूर्ण</span></p></div>
          <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-emerald-700 transition-all" style={{ width: `${done / tasks.length * 100}%` }} /></div>
        </div>
      </div>
      {notice && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{notice} <span className="font-normal">हे बदल सध्या डेमो सत्रापुरते आहेत.</span></p>}
      <div className="space-y-3">
        {tasks.map((task) => (
          <article key={task.id} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 sm:w-24"><span className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-sm font-bold">{task.time}</span><span className="text-xs text-muted-foreground sm:hidden">{task.duration} मिनिटे</span></div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-primary">{task.subject}</span><span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold">{task.priority} प्राधान्य</span></div><h2 className="mt-1 font-semibold">{task.title}</h2><p className="mt-1 text-xs text-muted-foreground">{task.duration} मिनिटे · {task.status}</p></div>
            <div className="flex flex-wrap gap-2">
              {task.status !== 'पूर्ण' ? <button onClick={() => update(task.id, 'पूर्ण')} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground"><ApperIcon name="Check" size={16} /> पूर्ण करा</button> : <button onClick={() => update(task.id, 'बाकी')} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold"><ApperIcon name="RotateCcw" size={15} /> पुन्हा उघडा</button>}
              {task.status !== 'पूर्ण' && <button onClick={() => update(task.id, 'उद्याचा प्लॅन')} className="min-h-10 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-accent">उद्यासाठी ठेवा</button>}
            </div>
          </article>
        ))}
      </div>
      <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground"><strong className="text-foreground">पुढील टप्पा:</strong> Apper database जोडल्यावर तुमचा अभ्यास वेळ, राहिलेली कामे, कमकुवत विषय आणि परीक्षेची तारीख वापरून हा प्लॅन कायमस्वरूपी व adaptive केला जाईल.</div>
    </div>
  );
}