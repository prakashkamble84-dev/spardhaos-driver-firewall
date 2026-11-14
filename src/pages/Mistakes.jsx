import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/mistakes', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'चूक वही', icon: 'NotebookPen', order: 7 };

const { eq } = window.ApperSDK.CoreSDK;
const FIELDS = ['Id', 'Name', 'item_type_c', 'subject_c', 'topic_c', 'status_c', 'priority_c', 'reason_c', 'note_c'];

async function fetchMistakes() {
  const result = await sdk.table('study_items_c').select(FIELDS).where(eq('item_type_c', 'mistake')).fetch();
  if (!result.success) throw new Error(result.message || 'चूक वही लोड झाली नाही.');
  return result.data;
}

export default function Mistakes() {
  const [notice, setNotice] = useState('');
  const { data, loading, error, run } = useFetch(fetchMistakes, []);
  const items = data ?? [];
  const unresolved = items.filter((item) => item.status_c !== 'Resolved').length;

  async function resolve(item) {
    const result = await sdk.table('study_items_c').update({ Id: item.Id, status_c: 'Resolved' });
    if (!result.data?.length) {
      setNotice(result.messages?.[0] || 'बदल जतन झाले नाहीत.');
      return;
    }
    setNotice('नोंद सुधारलेली म्हणून चिन्हांकित केली.');
    run();
  }

  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold text-primary">चुकांमधून शिकण्याची जागा</p><h1 className="mt-1 text-3xl font-semibold">माझी चूक वही</h1><p className="mt-2 text-muted-foreground">चूक पुन्हा होऊ नये म्हणून तिचे कारण समजून घ्या.</p></div>
      <div className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">सुधारणा बाकी</p><p className="text-3xl font-semibold">{unresolved}</p></div>
      {notice && <p role="status" className="rounded-lg bg-success-muted p-3 text-sm font-semibold text-success-foreground">{notice}</p>}
      {loading && <p className="py-8 text-center text-sm text-muted-foreground">नोंदी लोड होत आहेत...</p>}
      {error && <div className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">{error.message} <button onClick={run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button></div>}
      <div className="space-y-3">{items.map((item) => <article key={item.Id} className="rounded-xl border border-border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold text-primary">{item.subject_c}</span><span className="rounded-full bg-warning-muted px-2 py-1 text-xs font-semibold text-warning-foreground">{item.reason_c}</span></div><h2 className="mt-2 text-lg font-semibold">{item.Name}</h2><p className="mt-2 text-sm text-muted-foreground">{item.note_c}</p><button disabled={item.status_c === 'Resolved'} onClick={() => resolve(item)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold disabled:text-success"><ApperIcon name="Check" size={16} />{item.status_c === 'Resolved' ? 'सुधारणा नोंदवली' : 'समजले, पुन्हा सराव करेन'}</button></article>)}</div>
    </div>
  );
}