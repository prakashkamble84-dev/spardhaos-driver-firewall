import { useState } from 'react';
import { toast } from 'sonner';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/mistakes', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'चूक वही', icon: 'NotebookPen', order: 7 };

const FIELDS = ['Id', 'Name', 'question_id_c', 'subject_c', 'topic_c', 'mistake_type_c', 'explanation_c', 'review_status_c'];

async function fetchMistakes() {
  const result = await sdk.table('mistake_records_c').select(FIELDS).orderByDesc('CreatedOn').fetch();
  if (!result.success) throw new Error(result.message || 'चूक वही लोड झाली नाही.');
  return result.data;
}

export default function Mistakes() {
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ Name: '', question_id_c: '', subject_c: 'इतिहास', topic_c: '', mistake_type_c: 'Concept', explanation_c: '', review_status_c: 'Open' });
  const { data, loading, error, run } = useFetch(fetchMistakes, []);
  const items = data ?? [];
  const unresolved = items.filter((item) => item.review_status_c !== 'Resolved').length;

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    try {
      const result = await sdk.table('mistake_records_c').create({ ...form, Name: form.Name.trim() });
      if (!result.data?.length) {
        const message = result.messages?.[0] || 'चूक नोंद जतन झाली नाही.';
        toast.error(message);
        console.error(`mistake_records_c create failed: ${result.messages?.join('; ') || 'no rows committed'}`);
        throw new Error(message);
      }
      setForm({ Name: '', question_id_c: '', subject_c: 'इतिहास', topic_c: '', mistake_type_c: 'Concept', explanation_c: '', review_status_c: 'Open' });
      setShowForm(false);
      setNotice('चूक वहीत नोंद जोडली.');
      await run();
    } catch (err) {
      setNotice(err.message || 'नोंद जतन करताना त्रुटी आली.');
      if (!err.message) console.error(`mistake_records_c create threw: ${err}`);
    } finally {
      setSaving(false);
    }
  }

  async function resolve(item) {
    try {
      const result = await sdk.table('mistake_records_c').update({ Id: item.Id, review_status_c: 'Resolved' });
      if (!result.data?.length) {
        const message = result.messages?.[0] || 'बदल जतन झाले नाहीत.';
        setNotice(message);
        toast.error(message);
        console.error(`mistake_records_c update failed: ${result.messages?.join('; ') || 'no rows committed'}`);
        return;
      }
      setNotice('नोंद सुधारलेली म्हणून चिन्हांकित केली.');
      await run();
    } catch (err) {
      toast.error('बदल जतन झाले नाहीत.');
      console.error(`mistake_records_c update threw: ${err.message}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-primary">चुकांमधून शिकण्याची जागा</p><h1 className="mt-1 text-3xl font-semibold">माझी चूक वही</h1><p className="mt-2 text-muted-foreground">चूक पुन्हा होऊ नये म्हणून तिचे कारण समजून घ्या.</p></div><button onClick={() => setShowForm((value) => !value)} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"><ApperIcon name="Plus" size={16} className="mr-1 inline" /> चूक नोंदवा</button></div>
      <div className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">सुधारणा बाकी</p><p className="text-3xl font-semibold">{unresolved}</p></div>
      {showForm && <form onSubmit={save} className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
        <Field label="चूक / प्रश्नाचा सारांश"><input required value={form.Name} onChange={(e) => setForm({ ...form, Name: e.target.value })} className="field" placeholder="उदा. कलम ३२ आणि २२६ गोंधळले" /></Field>
        <Field label="विषय"><input value={form.subject_c} onChange={(e) => setForm({ ...form, subject_c: e.target.value })} className="field" /></Field>
        <Field label="घटक"><input value={form.topic_c} onChange={(e) => setForm({ ...form, topic_c: e.target.value })} className="field" /></Field>
        <Field label="चुकीचा प्रकार"><select value={form.mistake_type_c} onChange={(e) => setForm({ ...form, mistake_type_c: e.target.value })} className="field"><option value="Concept">संकल्पना</option><option value="Memory">स्मरण</option><option value="Careless">निष्काळजीपणा</option><option value="Time Management">वेळेचे नियोजन</option></select></Field>
        <Field label="प्रश्न ID (असल्यास)"><input value={form.question_id_c} onChange={(e) => setForm({ ...form, question_id_c: e.target.value })} className="field" placeholder="ऐच्छिक" /></Field>
        <Field label="काय समजले / स्पष्टीकरण"><textarea rows={3} value={form.explanation_c} onChange={(e) => setForm({ ...form, explanation_c: e.target.value })} className="field" placeholder="योग्य संकल्पना स्वतःच्या शब्दांत लिहा" /></Field>
        <div className="flex items-end gap-2"><button disabled={saving} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? 'जतन...' : 'नोंद जतन करा'}</button><button type="button" onClick={() => setShowForm(false)} className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold">रद्द</button></div>
      </form>}
      {notice && <p role="status" className="rounded-lg bg-secondary p-3 text-sm font-semibold">{notice}</p>}
      {loading && <p className="py-8 text-center text-sm text-muted-foreground">नोंदी लोड होत आहेत...</p>}
      {error && <div className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">{error} <button onClick={run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button></div>}
      {!loading && !error && items.length === 0 && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">अजून चूक नोंदी नाहीत. सरावातून लक्षात आलेली पहिली चूक नोंदवा.</p>}
      <div className="space-y-3">{items.map((item) => <article key={item.Id} className="rounded-xl border border-border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold text-primary">{item.subject_c} · {item.topic_c}</span><span className="rounded-full bg-warning-muted px-2 py-1 text-xs font-semibold text-warning-foreground">{item.mistake_type_c}</span></div><h2 className="mt-2 text-lg font-semibold">{item.Name}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.explanation_c || 'स्पष्टीकरण अजून लिहिलेले नाही.'}</p><button disabled={item.review_status_c === 'Resolved'} onClick={() => resolve(item)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold disabled:text-success"><ApperIcon name="Check" size={16} />{item.review_status_c === 'Resolved' ? 'सुधारणा नोंदवली' : 'समजले, पुन्हा सराव करेन'}</button></article>)}</div>
      <style>{'.field{width:100%;min-height:44px;border:1px solid var(--border);border-radius:0.5rem;background:var(--background);padding:0.65rem 0.8rem;font-size:0.9rem;outline:none}'}</style>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block space-y-2"><span className="text-sm font-semibold">{label}</span>{children}</label>;
}
