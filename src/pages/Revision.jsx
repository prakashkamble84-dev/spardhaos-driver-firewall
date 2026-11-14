import { useState } from 'react';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/revision', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'उजळणी', icon: 'Brain', order: 5 };

const initial = [
  { id: 1, topic: 'भारतीय राज्यघटनेची उद्देशिका', subject: 'राज्यशास्त्र', reason: 'मागील सरावात २ चुका', due: 'आज', done: false },
  { id: 2, topic: 'सत्यशोधक समाज', subject: 'आधुनिक इतिहास', reason: '७ दिवसांपूर्वी अभ्यास केला', due: 'आज', done: false },
  { id: 3, topic: 'महाराष्ट्रातील नद्या', subject: 'भूगोल', reason: 'अचूकता ६०% पेक्षा कमी', due: 'उद्या', done: false }
];

export default function Revision() {
  const [items, setItems] = useState(initial);
  const count = items.filter((item) => !item.done).length;
  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold text-primary">Spaced repetition</p><h1 className="mt-1 text-3xl font-semibold">उजळणी केंद्र</h1><p className="mt-2 text-muted-foreground">विसरण्याआधी महत्त्वाचे विषय पुन्हा आठवा.</p></div>
      <div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">उजळणी बाकी</p><p className="mt-1 text-3xl font-semibold">{count} विषय</p></div>
      <div className="space-y-3">{items.map((item) => <article key={item.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center"><div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-primary"><ApperIcon name="RotateCcw" size={19} /></div><div className="min-w-0 flex-1"><p className="text-xs font-bold text-primary">{item.subject} · {item.due}</p><h2 className="mt-1 font-semibold">{item.topic}</h2><p className="mt-1 text-sm text-muted-foreground">{item.reason}</p></div><button disabled={item.done} onClick={() => setItems((list) => list.map((entry) => entry.id === item.id ? { ...entry, done: true } : entry))} className="min-h-10 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:bg-emerald-700"> {item.done ? 'उजळणी पूर्ण' : 'उजळणी पूर्ण करा'} </button></article>)}</div>
      <p className="text-xs text-muted-foreground">ही नमुना उजळणी यादी आहे. प्रत्यक्ष spaced-repetition वेळापत्रक quiz attempts आणि delayed recall वर आधारित असेल.</p>
    </div>
  );
}