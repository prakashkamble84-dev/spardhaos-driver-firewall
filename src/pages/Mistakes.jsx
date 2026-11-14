import { useState } from 'react';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/mistakes', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'चूक वही', icon: 'NotebookPen', order: 7 };

const starter = [
  { id: 1, topic: 'मूलभूत हक्क', subject: 'राज्यशास्त्र', error: 'पर्यायांमधील गोंधळ', note: 'कलम १४ आणि १९ मधील फरक पुन्हा वाचा.', resolved: false },
  { id: 2, topic: 'सत्यशोधक समाज', subject: 'इतिहास', error: 'तथ्य विसरणे', note: 'स्थापना वर्ष १८७३ लक्षात ठेवा.', resolved: false }
];

export default function Mistakes() {
  const [items, setItems] = useState(starter);
  const unresolved = items.filter((item) => !item.resolved).length;
  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold text-primary">चुकांमधून शिकण्याची जागा</p><h1 className="mt-1 text-3xl font-semibold">माझी चूक वही</h1><p className="mt-2 text-muted-foreground">चूक पुन्हा होऊ नये म्हणून तिचे कारण समजून घ्या.</p></div>
      <div className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">सुधारणा बाकी</p><p className="text-3xl font-semibold">{unresolved}</p></div>
      <div className="space-y-3">{items.map((item) => <article key={item.id} className="rounded-xl border border-border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold text-primary">{item.subject}</span><span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">{item.error}</span></div><h2 className="mt-2 text-lg font-semibold">{item.topic}</h2><p className="mt-2 text-sm text-muted-foreground">{item.note}</p><button disabled={item.resolved} onClick={() => setItems((list) => list.map((entry) => entry.id === item.id ? { ...entry, resolved: true } : entry))} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold disabled:text-emerald-700"><ApperIcon name="Check" size={16} />{item.resolved ? 'सुधारणा नोंदवली' : 'समजले, पुन्हा सराव करेन'}</button></article>)}</div>
      <p className="text-xs text-muted-foreground">नमुना नोंदी. पुढील टप्प्यात चुकीच्या उत्तरांमधून या नोंदी आपोआप तयार होतील.</p>
    </div>
  );
}