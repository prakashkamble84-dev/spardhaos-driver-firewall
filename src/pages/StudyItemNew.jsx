import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/study-items/new', layout: 'owner', access: 'authenticated' };

const SUBJECTS = ['इतिहास', 'राज्यशास्त्र', 'भूगोल', 'अर्थव्यवस्था', 'विज्ञान', 'चालू घडामोडी'];

export default function StudyItemNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    Name: '',
    subject_c: 'इतिहास',
    topic_c: '',
    due_date_c: new Date().toISOString().slice(0, 10),
    duration_minutes_c: '30',
    status_c: 'Pending',
    priority_c: 'Medium',
    notes_c: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save(event) {
    event.preventDefault();
    if (!form.Name.trim()) {
      setError('शीर्षक आवश्यक आहे.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await sdk.table('study_tasks_c').create({
        ...form,
        Name: form.Name.trim(),
        duration_minutes_c: Number(form.duration_minutes_c) || 0,
      });
      if (!result.data?.length) throw new Error(result.messages?.[0] || 'नोंद जतन झाली नाही.');
      navigate('/study-plan');
    } catch (err) {
      setError(err.message || 'नोंद जतन करताना त्रुटी आली.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/study-plan" className="inline-flex items-center gap-2 text-sm font-bold text-primary"><ApperIcon name="ArrowLeft" size={16} /> अभ्यास प्लॅनकडे परत</Link>
      <div><p className="text-sm font-semibold text-primary">नवीन नोंद</p><h1 className="mt-1 text-3xl font-semibold">अभ्यास काम जोडा</h1></div>
      <form onSubmit={save} className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <Field label="शीर्षक"><input required value={form.Name} onChange={(event) => change('Name', event.target.value)} placeholder="उदा. महाराष्ट्राचा भूगोल" className="field" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="विषय"><select value={form.subject_c} onChange={(event) => change('subject_c', event.target.value)} className="field">{SUBJECTS.map((value) => <option key={value}>{value}</option>)}</select></Field>
          <Field label="घटक"><input value={form.topic_c} onChange={(event) => change('topic_c', event.target.value)} placeholder="घटकाचे नाव" className="field" /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="कालावधी (मिनिटे)"><input type="number" min="0" value={form.duration_minutes_c} onChange={(event) => change('duration_minutes_c', event.target.value)} className="field" /></Field>
          <Field label="देय तारीख"><input type="date" value={form.due_date_c} onChange={(event) => change('due_date_c', event.target.value)} className="field" /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="प्राधान्य"><select value={form.priority_c} onChange={(event) => change('priority_c', event.target.value)} className="field"><option value="High">उच्च</option><option value="Medium">मध्यम</option><option value="Low">कमी</option></select></Field>
          <Field label="स्थिती"><select value={form.status_c} onChange={(event) => change('status_c', event.target.value)} className="field"><option value="Pending">बाकी</option><option value="Done">पूर्ण</option><option value="Deferred">पुढे ढकलले</option></select></Field>
        </div>
        <Field label="अभ्यास नोंद"><textarea value={form.notes_c} onChange={(event) => change('notes_c', event.target.value)} placeholder="लक्षात ठेवण्यासारखे मुद्दे..." rows={3} className="field" /></Field>
        {error && <p role="alert" className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">{error}</p>}
        <button disabled={saving} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60">{saving ? 'जतन करत आहे...' : 'नोंद जतन करा'}</button>
      </form>
      <style>{'.field{width:100%;min-height:44px;border:1px solid var(--border);border-radius:0.5rem;background:var(--background);padding:0.65rem 0.8rem;font-size:0.9rem;outline:none}.field:focus{box-shadow:0 0 0 2px var(--ring)}'}</style>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block space-y-2"><span className="text-sm font-semibold">{label}</span>{children}</label>;
}
