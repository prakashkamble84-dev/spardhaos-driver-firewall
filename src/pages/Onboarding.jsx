import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import { fetchStudentProfile, markOnboardingDone } from '@/services/studentProfile';

export const route = { path: '/onboarding', layout: 'owner', access: 'authenticated' };

const EXAM_OPTIONS = ['MPSC राज्यसेवा', 'तलाठी भरती', 'पोलीस भरती', 'गट-क परीक्षा'];
const PHONE_PATTERN = /^[6-9]\d{9}$/;

export default function Onboarding() {
  const navigate = useNavigate();
  const { data: existing, loading, error } = useFetch(fetchStudentProfile, []);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const values = form ?? {
    target_exam_c: existing?.target_exam_c || EXAM_OPTIONS[0],
    exam_medium_c: existing?.exam_medium_c || 'Marathi',
    phone_c: existing?.phone_c || '',
    district_c: existing?.district_c || '',
    daily_goal_minutes_c: String(existing?.daily_goal_minutes_c ?? 180),
  };

  function change(field, value) {
    setForm((current) => ({ ...(current ?? values), [field]: value }));
  }

  async function save(event) {
    event.preventDefault();
    const phone = values.phone_c.replace(/\s+/g, '');
    const district = values.district_c.trim();
    if (!PHONE_PATTERN.test(phone)) {
      setNotice('कृपया वैध १० अंकी मोबाईल नंबर टाका.');
      return;
    }
    if (!district) {
      setNotice('कृपया तुमचा जिल्हा टाका.');
      return;
    }
    setSaving(true);
    setNotice('');
    const payload = {
      Name: 'Student Profile',
      target_exam_c: values.target_exam_c,
      exam_medium_c: values.exam_medium_c,
      district_c: district,
      phone_c: phone,
      daily_goal_minutes_c: Number(values.daily_goal_minutes_c) || 0,
      onboarding_complete_c: true,
    };
    try {
      const result = existing
        ? await sdk.table('student_profiles_c').update({ Id: existing.Id, ...payload })
        : await sdk.table('student_profiles_c').create(payload);
      if (!result.data?.length) {
        const message = result.messages?.[0] || 'प्रोफाइल जतन झाली नाही.';
        toast.error(message);
        console.error(`student_profiles_c onboarding save failed: ${(result.messages ?? []).join('; ')}`);
        setNotice(message);
        return;
      }
      markOnboardingDone();
      toast.success('तुमचे प्रोफाइल जतन झाले.');
      navigate('/', { replace: true });
    } catch (err) {
      const message = err?.message || 'प्रोफाइल जतन करताना त्रुटी आली.';
      toast.error(message);
      console.error(`student_profiles_c onboarding save threw: ${message}`);
      setNotice(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">स्वागत आहे</p>
        <h1 className="mt-1 text-3xl font-semibold">तुमचे प्रोफाइल पूर्ण करा</h1>
        <p className="mt-2 text-muted-foreground">तुमची परीक्षा आणि अभ्यासाचे लक्ष्य निवडा. हे नंतर बदलता येईल.</p>
      </div>
      {loading && <p className="text-sm text-muted-foreground">प्रोफाइल लोड होत आहे...</p>}
      {error && <p role="alert" className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">{error}</p>}
      <form onSubmit={save} className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <Field label="लक्ष्य परीक्षा">
          <select value={values.target_exam_c} onChange={(event) => change('target_exam_c', event.target.value)} className="field">
            {EXAM_OPTIONS.map((exam) => <option key={exam} value={exam}>{exam}</option>)}
          </select>
        </Field>
        <Field label="अभ्यासाची भाषा">
          <select value={values.exam_medium_c} onChange={(event) => change('exam_medium_c', event.target.value)} className="field">
            <option value="Marathi">मराठी</option>
            <option value="English">English</option>
          </select>
        </Field>
        <Field label="मोबाईल नंबर">
          <input type="tel" inputMode="numeric" value={values.phone_c} onChange={(event) => change('phone_c', event.target.value)} placeholder="उदा. 9876543210" className="field" required />
        </Field>
        <Field label="जिल्हा">
          <input value={values.district_c} onChange={(event) => change('district_c', event.target.value)} placeholder="उदा. पुणे" className="field" required />
        </Field>
        <Field label="दररोज अभ्यासाचे लक्ष्य (मिनिटे)">
          <input type="number" min="0" value={values.daily_goal_minutes_c} onChange={(event) => change('daily_goal_minutes_c', event.target.value)} className="field" />
        </Field>
        <button type="submit" disabled={saving || loading} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {saving ? 'जतन करत आहे...' : 'प्रोफाइल जतन करा आणि सुरू करा'}
        </button>
        {notice && <p role="status" className="text-sm font-semibold text-destructive">{notice}</p>}
      </form>
      <style>{'.field{min-height:44px;width:100%;border:1px solid var(--border);border-radius:0.5rem;background:var(--background);padding:0.65rem 0.8rem}'}</style>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block space-y-2"><span className="text-sm font-semibold">{label}</span>{children}</label>;
}