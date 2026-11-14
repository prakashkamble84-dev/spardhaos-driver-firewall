import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';

export const route = { path: '/settings', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'सेटिंग्ज', icon: 'Settings', order: 12 };

const FIELDS = ['Id', 'Name', 'target_exam_c', 'exam_medium_c', 'district_c', 'daily_goal_minutes_c', 'onboarding_complete_c'];

async function fetchProfile() {
  const result = await sdk.table('student_profiles_c').select(FIELDS).orderByDesc('CreatedOn').fetch();
  if (!result.success) throw new Error(result.message || 'प्रोफाइल लोड झाली नाही.');
  return result.data?.[0] ?? null;
}

export default function Settings() {
  const { data: profile, loading, error, run } = useFetch(fetchProfile, []);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const values = form ?? {
    target_exam_c: profile?.target_exam_c || 'MPSC राज्यसेवा',
    exam_medium_c: profile?.exam_medium_c || 'Marathi',
    district_c: profile?.district_c || '',
    daily_goal_minutes_c: String(profile?.daily_goal_minutes_c ?? 180),
  };

  function change(field, value) {
    setForm((current) => ({ ...(current ?? values), [field]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    try {
      const payload = {
        Name: 'Student Profile',
        target_exam_c: values.target_exam_c,
        exam_medium_c: values.exam_medium_c,
        district_c: values.district_c.trim(),
        daily_goal_minutes_c: Number(values.daily_goal_minutes_c) || 0,
        onboarding_complete_c: true,
      };
      const result = profile
        ? await sdk.table('student_profiles_c').update({ Id: profile.Id, ...payload })
        : await sdk.table('student_profiles_c').create(payload);
      if (!result.data?.length) throw new Error(result.messages?.[0] || 'प्रोफाइल जतन झाली नाही.');
      setForm(null);
      setNotice('तुमचे प्रोफाइल बदल जतन झाले.');
      await run();
    } catch (err) {
      setNotice(err.message || 'बदल जतन करताना त्रुटी आली.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div><p className="text-sm font-semibold text-primary">तुमच्या तयारीनुसार बदला</p><h1 className="mt-1 text-3xl font-semibold">प्रोफाइल आणि सेटिंग्ज</h1><p className="mt-2 text-muted-foreground">तुमचा अभ्यास अनुभव वैयक्तिक करा.</p></div>
      {loading && <p className="text-sm text-muted-foreground">प्रोफाइल लोड होत आहे...</p>}
      {error && <p role="alert" className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">{error}</p>}
      <form onSubmit={save} className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <Field label="लक्ष्य परीक्षा"><select value={values.target_exam_c} onChange={(event) => change('target_exam_c', event.target.value)} className="field"><option>MPSC राज्यसेवा</option><option>तलाठी भरती</option><option>पोलीस भरती</option><option>गट-क परीक्षा</option></select></Field>
        <Field label="अभ्यासाची भाषा"><select value={values.exam_medium_c} onChange={(event) => change('exam_medium_c', event.target.value)} className="field"><option value="Marathi">मराठी</option><option value="English">English</option></select></Field>
        <Field label="जिल्हा"><input value={values.district_c} onChange={(event) => change('district_c', event.target.value)} placeholder="उदा. पुणे" className="field" /></Field>
        <Field label="दररोज अभ्यासाचे लक्ष्य (मिनिटे)"><input type="number" min="0" value={values.daily_goal_minutes_c} onChange={(event) => change('daily_goal_minutes_c', event.target.value)} className="field" /></Field>
        <button disabled={saving || loading} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? 'जतन करत आहे...' : 'बदल जतन करा'}</button>
        {notice && <p role="status" className="text-sm font-semibold text-success">{notice}</p>}
      </form>
      <style>{'.field{min-height:44px;width:100%;border:1px solid var(--border);border-radius:0.5rem;background:var(--background);padding:0.65rem 0.8rem}'}</style>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block space-y-2"><span className="text-sm font-semibold">{label}</span>{children}</label>;
}
