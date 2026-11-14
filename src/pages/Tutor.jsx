import { useState } from 'react';
import { toast } from 'sonner';
import { useFunction } from '@/hooks/useFunction';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/tutor', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'AI मार्गदर्शक', icon: 'MessageCircle', order: 11 };

export default function Tutor() {
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState('नमस्कार! मी तुमचा अभ्यास मार्गदर्शक आहे. एखादी संकल्पना सोप्या मराठीत समजावून सांगण्याची विनंती करा.');
  const { invoke, loading } = useFunction(import.meta.env.VITE_TUTOR_REPLY);
  async function send(event) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    const result = await invoke({ question: trimmed });
    if (!result) return;
    if (!result.success || !result.data?.answer) {
      toast.error('उत्तर मिळवता आले नाही. कृपया पुन्हा प्रयत्न करा.');
      return;
    }
    setReply(result.data.answer);
    setQuestion('');
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><p className="text-sm font-semibold text-primary">Marathi-first study assistant</p><h1 className="mt-1 text-3xl font-semibold">AI अभ्यास मार्गदर्शक</h1><p className="mt-2 text-muted-foreground">संकल्पना समजून घ्या, प्रश्न विचारा आणि स्वतःची उजळणी करा.</p></div>
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6"><div className="mb-4 flex items-center gap-3 border-b border-border pb-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground"><ApperIcon name="Bot" size={20} /></span><div><p className="font-semibold">SpardhaOS Tutor</p><p className="text-xs text-muted-foreground">AI मार्गदर्शक · उत्तरे अधिकृत स्रोतांची पडताळणी करा</p></div></div><div className="min-h-36 rounded-xl bg-secondary p-4 text-sm leading-6 whitespace-pre-line break-words">{loading ? 'उत्तर तयार होत आहे…' : reply}</div><form onSubmit={send} className="mt-5 flex gap-2 border-t border-border pt-4"><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="उदा. मूलभूत हक्क सोप्या भाषेत समजवा..." className="min-h-12 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /><button type="submit" disabled={loading} className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50" aria-label="प्रश्न पाठवा"><ApperIcon name="Send" size={18} /></button></form></div>
    </div>
  );
}