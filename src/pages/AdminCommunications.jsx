import { useState } from 'react';
import { toast } from 'sonner';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';
import { formatLocalDate, DATE_FORMATS } from '@/utils/date';
import { CATEGORIES } from '@/services/notificationEngine';

export const route = { path: '/admin-communications', layout: 'owner', access: "profile === 'Admin_c'" };
export const nav = { label: 'संवाद केंद्र', icon: 'Megaphone', order: 94, profiles: ['Admin_c'] };

const FIELDS = [
  'Id', 'Name', 'category_c', 'body_en_c', 'body_mr_c', 'audience_exam_c', 'audience_subscription_c',
  'status_c', 'scheduled_for_c', 'verification_status_c', 'high_impact_c', 'approved_by_name_c',
  'recipient_count_c', 'delivered_count_c', 'failed_count_c', 'CreatedOn',
];

const VERIFICATION = ['Official Verified', 'Pending Review', 'AI Processed', 'Not Applicable'];
const AUDIENCE_SUBSCRIPTION = ['Any', 'Active Subscription', 'No Active Subscription'];
const STATUS_STYLES = {
  Draft: 'border-border bg-muted text-muted-foreground',
  'Pending Approval': 'border-warning/20 bg-warning/10 text-warning',
  Approved: 'border-primary/20 bg-primary/10 text-primary',
  Scheduled: 'border-primary/20 bg-primary/10 text-primary',
  Sent: 'border-success/20 bg-success/10 text-success',
  Cancelled: 'border-destructive/20 bg-destructive/10 text-destructive',
};

const EMPTY_FORM = {
  Name: '', category_c: 'Announcement', body_en_c: '', body_mr_c: '', audience_exam_c: '',
  audience_subscription_c: 'Any', verification_status_c: 'Pending Review', source_url_c: '',
  scheduled_for_c: '', high_impact_c: false,
};

async function fetchAnnouncements() {
  const res = await sdk.table('announcements_c').select(FIELDS).orderByDesc('CreatedOn').page(1, 100).fetch();
  if (!res.success) throw new Error(res.message || 'Announcements could not be loaded');
  return res.data ?? [];
}

export default function AdminCommunications() {
  const { data, loading, error, run } = useFetch(fetchAnnouncements, []);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const announcements = data ?? [];

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveDraft(event) {
    event.preventDefault();
    if (!form.Name.trim() || !form.body_en_c.trim()) {
      toast.error('Title and English body are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        Name: form.Name.trim(),
        body_en_c: form.body_en_c.trim(),
        body_mr_c: form.body_mr_c.trim(),
        audience_exam_c: form.audience_exam_c.trim(),
        source_url_c: form.source_url_c.trim(),
        scheduled_for_c: form.scheduled_for_c ? new Date(form.scheduled_for_c).toISOString() : null,
        status_c: form.high_impact_c ? 'Pending Approval' : 'Draft',
        recipient_count_c: 0,
        delivered_count_c: 0,
        failed_count_c: 0,
      };
      const res = await sdk.table('announcements_c').create(payload);
      if (res.messages?.length) {
        toast.error(res.messages[0], { description: res.messages.slice(1).join('\n') || undefined, duration: 8000 });
        console.error(`announcements_c create failed: ${res.messages.join('; ')}`);
      }
      if (!res.data?.length) return;
      toast.success('Announcement saved as a draft');
      setForm(EMPTY_FORM);
      run();
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(row, status) {
    const res = await sdk.table('announcements_c').update({ Id: row.Id, status_c: status });
    if (res.messages?.length) {
      toast.error(res.messages[0], { description: res.messages.slice(1).join('\n') || undefined, duration: 8000 });
      console.error(`announcements_c status update failed: ${res.messages.join('; ')}`);
    }
    if (!res.data?.length) return;
    toast.success(`Marked ${status}`);
    run();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">संवाद व्यवस्थापन</p>
        <h1 className="mt-1 text-3xl font-semibold">संवाद केंद्र</h1>
        <p className="mt-2 text-muted-foreground">घोषणांचा मसुदा, मंजुरी आणि स्थिती. कोणताही संदेश बाहेरील चॅनलवर पाठवला जात नाही.</p>
      </div>

      <div className="rounded-xl border border-warning/20 bg-warning/10 p-4 text-sm text-warning">
        बाहेरील SMS, WhatsApp किंवा Email प्रदाते अद्याप जोडलेले नाहीत. येथील घोषणा फक्त विद्यार्थ्यांच्या सूचना केंद्रात दिसतील. उच्च-प्रभाव घोषणांना मंजुरी आवश्यक आहे.
      </div>

      <form onSubmit={saveDraft} className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">नवीन घोषणा मसुदा</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2 text-sm font-semibold">शीर्षक
            <input value={form.Name} onChange={(e) => change('Name', e.target.value)} className="field" />
          </label>
          <label className="block space-y-2 text-sm font-semibold">प्रकार
            <select value={form.category_c} onChange={(e) => change('category_c', e.target.value)} className="field">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block space-y-2 text-sm font-semibold">मराठी मजकूर
            <textarea rows={4} value={form.body_mr_c} onChange={(e) => change('body_mr_c', e.target.value)} className="field" />
          </label>
          <label className="block space-y-2 text-sm font-semibold">English body
            <textarea rows={4} value={form.body_en_c} onChange={(e) => change('body_en_c', e.target.value)} className="field" />
          </label>
          <label className="block space-y-2 text-sm font-semibold">लक्ष्य परीक्षा (रिकामे = सर्व)
            <input value={form.audience_exam_c} onChange={(e) => change('audience_exam_c', e.target.value)} className="field" />
          </label>
          <label className="block space-y-2 text-sm font-semibold">सबस्क्रिप्शन स्थिती
            <select value={form.audience_subscription_c} onChange={(e) => change('audience_subscription_c', e.target.value)} className="field">
              {AUDIENCE_SUBSCRIPTION.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="block space-y-2 text-sm font-semibold">स्रोत (Official URL)
            <input type="url" value={form.source_url_c} onChange={(e) => change('source_url_c', e.target.value)} className="field" />
          </label>
          <label className="block space-y-2 text-sm font-semibold">पडताळणी स्थिती
            <select value={form.verification_status_c} onChange={(e) => change('verification_status_c', e.target.value)} className="field">
              {VERIFICATION.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="block space-y-2 text-sm font-semibold">नियोजित वेळ (पर्यायी)
            <input type="datetime-local" value={form.scheduled_for_c} onChange={(e) => change('scheduled_for_c', e.target.value)} className="field" />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.high_impact_c} onChange={(e) => change('high_impact_c', e.target.checked)} />
            उच्च-प्रभाव घोषणा (मंजुरी आवश्यक)
          </label>
        </div>
        <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {saving ? 'जतन होत आहे...' : 'मसुदा जतन करा'}
        </button>
      </form>

      <section aria-label="घोषणा यादी" className="space-y-3">
        <h2 className="text-lg font-semibold">घोषणा</h2>
        {loading && <p className="text-sm text-muted-foreground">लोड होत आहे...</p>}
        {error && <p role="alert" className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">{error.message}</p>}
        {!loading && !error && !announcements.length && <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">अजून घोषणा नाहीत.</p>}
        {announcements.map((row) => (
          <article key={row.Id} className="space-y-3 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full border px-2 py-0.5 font-semibold ${STATUS_STYLES[row.status_c] ?? STATUS_STYLES.Draft}`}>{row.status_c || 'Draft'}</span>
              <span className="text-muted-foreground">{row.category_c}</span>
              <span className="text-muted-foreground">· {row.verification_status_c || 'Not Applicable'}</span>
              {row.CreatedOn && <span className="text-muted-foreground">· {formatLocalDate(row.CreatedOn, DATE_FORMATS.SHORT)}</span>}
            </div>
            <h3 className="font-semibold">{row.Name}</h3>
            <p className="text-sm text-muted-foreground">{row.body_en_c}</p>
            <div className="flex flex-wrap gap-2 text-sm">
              {row.status_c === 'Pending Approval' && (
                <button type="button" onClick={() => updateStatus(row, 'Approved')} className="min-h-9 rounded-lg border border-border px-3 font-semibold hover:bg-accent">मंजूर करा</button>
              )}
              {['Draft', 'Pending Approval', 'Approved', 'Scheduled'].includes(row.status_c) && (
                <button type="button" onClick={() => updateStatus(row, 'Cancelled')} className="min-h-9 rounded-lg border border-destructive/20 px-3 font-semibold text-destructive hover:bg-destructive/10">रद्द करा</button>
              )}
            </div>
          </article>
        ))}
      </section>
      <style>{'.field{min-height:44px;width:100%;border:1px solid var(--border);border-radius:0.5rem;background:var(--background);padding:0.65rem 0.8rem}'}</style>
    </div>
  );
}