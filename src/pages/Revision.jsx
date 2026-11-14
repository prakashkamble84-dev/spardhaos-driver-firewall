import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/revision', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'उजळणी', icon: 'Brain', order: 5 };

const { eq } = window.ApperSDK.CoreSDK;
const FIELDS = ['Id', 'Name', 'item_type_c', 'subject_c', 'topic_c', 'duration_c', 'status_c', 'priority_c', 'due_label_c', 'reason_c'];

async function fetchRevision() {
  const result = await sdk.table('study_items_c').select(FIELDS).where(eq('item_type_c', 'revision')).fetch();
  if (!result.success) throw new Error(result.message || 'उजळणी यादी लोड झाली नाही.');
  return result.data;
}

export default function Revision() {
  const [notice, setNotice] = useState('');
  const { data, loading, error, run } = useFetch(fetchRevision, []);
  const items = data ?? [];
  const count = items.filter((item) => item.status_c !== 'Done').length;

  async function complete(item) {
    const result = await sdk.table('study_items_c').update({ Id: item.Id, status_c: 'Done' });
    if (!result.data?.length) {
      setNotice(result.messages?.[0] || 'बदल जतन झाले नाहीत.');
      return;
    }
    setNotice('उजळणी पूर्ण म्हणून नोंदवली.');
    run();
  }

  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold text-primary">Spaced repetition</p><h1 className="mt-1 text-3xl font-semibold">उजळणी केंद्र</h1><p className="mt-2 text-muted-foreground">विसरण्याआधी महत्त्वाचे विषय पुन्हा आठवा.</p></div>
      <div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">उजळणी बाकी</p><p className="mt-1 text-3xl font-semibold">{count} विषय</p></div>
      {notice && <p role="status" className="rounded-lg bg-success-muted p-3 text-sm font-semibold text-success-foreground">{notice}</p>}
      {loading && <p className="py-8 text-center text-sm text-muted-foreground">उजळणी यादी लोड होत आहे...</p>}
      {error && <div className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">{error.message} <button onClick={run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button></div>}
      <div className="space-y-3">{items.map((item) => <article key={item.Id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center"><div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-primary"><ApperIcon name="RotateCcw" size={19} /></div><div className="min-w-0 flex-1"><p className="text-xs font-bold text-primary">{item.subject_c} · {item.due_label_c}</p><h2 className="mt-1 font-semibold">{item.Name}</h2><p className="mt-1 text-sm text-muted-foreground">{item.reason_c}</p></div><button disabled={item.status_c === 'Done'} onClick={() => complete(item)} className="min-h-10 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:bg-success disabled:text-success-foreground">{item.status_c === 'Done' ? 'उजळणी पूर्ण' : 'उजळणी पूर्ण करा'}</button></article>)}</div>
      <p className="text-xs text-muted-foreground">ही नमुना उजळणी यादी आहे. प्रत्यक्ष spaced-repetition वेळापत्रक quiz attempts आणि delayed recall वर आधारित असेल.</p>
    </div>
  );
}