import { Link, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/study-items/:id/edit', layout: 'owner', access: 'authenticated' };

const FIELDS = ['Id', 'Name', 'subject_c', 'topic_c', 'due_date_c', 'duration_minutes_c', 'status_c', 'priority_c', 'notes_c'];

async function fetchItem(id) {
  const result = await sdk.table('study_tasks_c').select(FIELDS).get(id);
  return result.data;
}

export default function StudyItemEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: item, loading, error } = useFetch(() => fetchItem(id), [id]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  if (loading) return <p className="py-12 text-center text-muted-foreground">नोंद लोड होत आहे...</p>;
  if (error || !item) return <div className="space-y-3"><Link to="/study-plan" className="text-sm font-bold text-primary">← अभ्यास प्लॅनकडे परत</Link><p role="alert" className="rounded-lg bg-warning-muted p-4 text-warning-foreground">{error || 'नोंद सापडली नाही.'}</p></div>;

  const values = form ?? {
    Name: item.Name || '',
    subject_c: item.subject_c || '',
    topic_c: item.topic_c || '',
    due_date_c: item.due_date_c || '',
    duration_minutes_c: String(item.duration_minutes_c || 0),
    status_c: item.status_c || 'Pending',
    priority_c: item.priority_c || 'Medium',
    notes_c: item.notes_c || '',
  };

  function change(field, value) {
    setForm((current) => ({ ...(current ?? values), [field]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const result = await sdk.table('study_tasks_c').update({
        Id: item.Id,
        ...values,
        Name: values.Name.trim(),
        duration_minutes_c: Number(values.duration_minutes_c) || 0,
      });
      if (!result.data?.length) throw new Error(result.messages?.[0] || 'बदल जतन झाले नाहीत.');
      navigate(`/study-items/${item.Id}`);
    } catch (err) {
      setSaveError(err.message || 'बदल जतन करताना त्रुटी आली.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to={`/study-items/${item.Id}`} className="inline-flex items-center gap-2 text-sm font-bold text-primary"><ApperIcon name="ArrowLeft" size={16} /> नोंदीकडे परत</Link>
      <div><p className="text-sm font-semibold text-primary">नोंद संपादन</p><h1 className="mt-1 text-3xl font-semibold">अभ्यास काम संपादित करा</h1></div>
      <form onSubmit={save} className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <Field label="शीर्षक"><input required value={values.Name} onChange={(event) => change('Name', event.target.value)} className="field" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="विषय"><input value={values.subject_c} onChange={(event) => change('subject_c', event.target.value)} className="field" /></Field>
          <Field label="घटक"><input value={values.topic_c} onChange={(event) => change('topic_c', event.target.value)} className="field" /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="कालावधी (मिनिटे)"><input type="number" min="0" value={values.duration_minutes_c} onChange={(event) => change('duration_minutes_c', event.target.value)} className="field" /></Field>
          <Field label="देय तारीख"><input type="date" value={values.due_date_c} onChange={(event) => change('due_date_c', event.target.value)} className="field" /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="स्थिती"><select value={values.status_c} onChange={(event) => change('status_c', event.target.value)} className="field"><option value="Pending">बाकी</option><option value="Done">पूर्ण</option><option value="Deferred">पुढे ढकलले</option></select></Field>
          <Field label="प्राधान्य"><select value={values.priority_c} onChange={(event) => change('priority_c', event.target.value)} className="field"><option value="High">उच्च</option><option value="Medium">मध्यम</option><option value="Low">कमी</option></select></Field>
        </div>
        <Field label="नोंद"><textarea rows={3} value={values.notes_c} onChange={(event) => change('notes_c', event.target.value)} className="field" /></Field>
        {saveError && <p role="alert" className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">{saveError}</p>}
        <button disabled={saving} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60">{saving ? 'जतन करत आहे...' : 'बदल जतन करा'}</button>
      </form>
      <style>{'.field{width:100%;min-height:44px;border:1px solid var(--border);border-radius:0.5rem;background:var(--background);padding:0.65rem 0.8rem;font-size:0.9rem;outline:none}.field:focus{box-shadow:0 0 0 2px var(--ring)}'}</style>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block space-y-2"><span className="text-sm font-semibold">{label}</span>{children}</label>;
}
