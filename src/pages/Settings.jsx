import { useState } from 'react';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/settings', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'सेटिंग्ज', icon: 'Settings', order: 12 };

export default function Settings() {
  const [language, setLanguage] = useState('मराठी');
  const [hours, setHours] = useState('३ तास');
  const [exam, setExam] = useState('MPSC राज्यसेवा');
  const [saved, setSaved] = useState(false);
  function save(event) {
    event.preventDefault();
    setSaved(true);
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div><p className="text-sm font-semibold text-primary">तुमच्या तयारीनुसार बदला</p><h1 className="mt-1 text-3xl font-semibold">प्रोफाइल आणि सेटिंग्ज</h1><p className="mt-2 text-muted-foreground">तुमचा अभ्यास अनुभव वैयक्तिक करा.</p></div>
      <form onSubmit={save} className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <Field label="लक्ष्य परीक्षा"><select value={exam} onChange={(event) => setExam(event.target.value)} className="min-h-11 w-full rounded-lg border border-border bg-background px-3"><option>MPSC राज्यसेवा</option><option>तलाठी भरती</option><option>पोलीस भरती</option><option>गट-क परीक्षा</option></select></Field>
        <Field label="अभ्यासाची भाषा"><select value={language} onChange={(event) => setLanguage(event.target.value)} className="min-h-11 w-full rounded-lg border border-border bg-background px-3"><option>मराठी</option><option>English</option><option>मराठी + English</option></select></Field>
        <Field label="दररोज उपलब्ध वेळ"><select value={hours} onChange={(event) => setHours(event.target.value)} className="min-h-11 w-full rounded-lg border border-border bg-background px-3"><option>१ तास</option><option>२ तास</option><option>३ तास</option><option>४ तास</option><option>५+ तास</option></select></Field>
        <button className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground">बदल जतन करा</button>
        {saved && <p role="status" className="text-sm font-semibold text-emerald-700">डेमो सत्रात बदल जतन झाले. कायमस्वरूपी प्रोफाइलसाठी Apper database जोडणे आवश्यक आहे.</p>}
      </form>
      <div className="rounded-xl border border-dashed border-border p-4 text-sm leading-6 text-muted-foreground"><strong className="text-foreground">सध्या संकलित न केलेली माहिती:</strong> अधिकृत/अंदाजित परीक्षा तारीख, तयारीची पातळी, कमकुवत विषय आणि आठवड्यातील अभ्यासाचे दिवस onboarding टप्प्यात जोडले जातील.</div>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block space-y-2"><span className="text-sm font-semibold">{label}</span>{children}</label>;
}