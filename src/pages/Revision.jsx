import { useState } from 'react';
import { toast } from 'sonner';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';
import { Link } from 'react-router-dom';
import { formatLocalDate, DATE_FORMATS } from '@/utils/date';

export const route = { path: '/revision', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'उजळणी', icon: 'Brain', order: 5 };

const FIELDS = ['Id', 'Name', 'subject_c', 'topic_c', 'revision_date_c', 'interval_days_c', 'status_c'];

async function fetchRevision() {
  const result = await sdk.table('revision_schedules_c').select(FIELDS).orderByDesc('revision_date_c').fetch();
  if (!result.success) throw new Error(result.message || 'उजळणी यादी लोड झाली नाही.');
  return result.data;
}

export default function Revision() {
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ Name: '', subject_c: 'इतिहास', topic_c: '', revision_date_c: new Date().toISOString().slice(0, 10), interval_days_c: '1', status_c: 'Due' });
  const { data, loading, error, run } = useFetch(fetchRevision, []);
  const items = data ?? [];
  const due = items.filter((item) => item.status_c === 'Due').length;

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    try {
      const result = await sdk.table('revision_schedules_c').create({ ...form, Name: form.Name.trim(), interval_days_c: Number(form.interval_days_c) || 1 });
      if (!result.data?.length) {
        const message = result.messages?.[0] || 'उजळणी नोंद जतन झाली नाही.';
        toast.error(message);
        console.error(`revision_schedules_c create failed: ${result.messages?.join('; ') || 'no rows committed'}`);
        throw new Error(message);
      }
      setForm({ Name: '', subject_c: 'इतिहास', topic_c: '', revision_date_c: new Date().toISOString().slice(0, 10), interval_days_c: '1', status_c: 'Due' });
      setShowForm(false);
      setNotice('उजळणी वेळापत्रकात जोडली.');
      await run();
    } catch (err) {
      setNotice(err.message || 'नोंद जतन करताना त्रुटी आली.');
      if (!err.message) console.error(`revision_schedules_c create threw: ${err}`);
    } finally {
      setSaving(false);
    }
  }

  async function update(item, status) {
    setNotice('');
    try {
      const result = await sdk.table('revision_schedules_c').update({ Id: item.Id, status_c: status });
      if (!result.data?.length) {
        const message = result.messages?.[0] || 'बदल जतन झाले नाहीत.';
        setNotice(message);
        toast.error(message);
        console.error(`revision_schedules_c update failed: ${result.messages?.join('; ') || 'no rows committed'}`);
        return;
      }
      setNotice(status === 'Completed' ? 'उजळणी पूर्ण म्हणून नोंदवली.' : 'उजळणी पुढे ढकलली.');
      await run();
    } catch (err) {
      toast.error('बदल जतन झाले नाहीत.');
      console.error(`revision_schedules_c update threw: ${err.message}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-semibold text-primary">Spaced repetition</p><h1 className="mt-1 text-3xl font-semibold">उजळणी केंद्र</h1><p className="mt-2 text-muted-foreground">विसरण्याआधी महत्त्वाचे विषय पुन्हा आठवा.</p></div>
        <button onClick={() => setShowForm((value) => !value)} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"><ApperIcon name="Plus" size={16} className="mr-1 inline" /> उजळणी जोडा</button>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">उजळणी बाकी</p><p className="mt-1 text-3xl font-semibold">{due} विषय</p></div>
      {showForm && <form onSubmit={save} className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
        <Field label="शीर्षक"><input required value={form.Name} onChange={(e) => setForm({ ...form, Name: e.target.value })} className="field" placeholder="उदा. मूलभूत हक्क" /></Field>
        <Field label="विषय"><input value={form.subject_c} onChange={(e) => setForm({ ...form, subject_c: e.target.value })} className="field" /></Field>
        <Field label="घटक"><input value={form.topic_c} onChange={(e) => setForm({ ...form, topic_c: e.target.value })} className="field" /></Field>
        <Field label="उजळणी तारीख"><input type="date" value={form.revision_date_c} onChange={(e) => setForm({ ...form, revision_date_c: e.target.value })} className="field" /></Field>
        <Field label="अंतर (दिवस)"><input type="number" min="1" value={form.interval_days_c} onChange={(e) => setForm({ ...form, interval_days_c: e.target.value })} className="field" /></Field>
        <div className="flex items-end gap-2"><button disabled={saving} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? 'जतन...' : 'जतन करा'}</button><button type="button" onClick={() => setShowForm(false)} className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold">रद्द</button></div>
      </form>}
      {notice && <p role="status" className="rounded-lg bg-secondary p-3 text-sm font-semibold">{notice}</p>}
      {loading && <p className="py-8 text-center text-sm text-muted-foreground">उजळणी यादी लोड होत आहे...</p>}
      {error && <div className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">{error} <button onClick={run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button></div>}
      {!loading && !error && items.length === 0 && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">अजून उजळणी नोंदी नाहीत. पहिली उजळणी जोडा.</p>}
      <div className="space-y-3">{items.map((item) => <article key={item.Id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center"><div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-primary"><ApperIcon name="RotateCcw" size={19} /></div><div className="min-w-0 flex-1"><p className="text-xs font-bold text-primary">{item.subject_c} · {item.revision_date_c ? formatLocalDate(item.revision_date_c, DATE_FORMATS.SHORT) : 'तारीख नाही'}</p><h2 className="mt-1 font-semibold">{item.Name}</h2><p className="mt-1 text-sm text-muted-foreground">{item.topic_c} · {item.interval_days_c} दिवसांचे अंतर</p></div><div className="flex gap-2"><button disabled={item.status_c === 'Completed'} onClick={() => update(item, 'Completed')} className="min-h-10 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-40">{item.status_c === 'Completed' ? 'पूर्ण' : 'पूर्ण करा'}</button><button disabled={item.status_c === 'Skipped'} onClick={() => update(item, 'Skipped')} className="min-h-10 rounded-lg border border-border px-3 text-sm font-semibold disabled:opacity-40">वगळा</button></div></article>)}</div>
      <style>{'.field{width:100%;min-height:44px;border:1px solid var(--border);border-radius:0.5rem;background:var(--background);padding:0.65rem 0.8rem;font-size:0.9rem;outline:none}'}</style>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block space-y-2"><span className="text-sm font-semibold">{label}</span>{children}</label>;
}
