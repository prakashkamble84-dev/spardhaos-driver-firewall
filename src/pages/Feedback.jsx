import { useState } from 'react';
import { toast } from 'sonner';
import { sdk } from '@/services/sdk';
import FilePicker from '@/components/FilePicker';

export const route = { path: '/feedback', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'प्रतिक्रिया', icon: 'MessageSquare', order: 13 };

const CATEGORIES = [
  { value: 'Bug', label: 'त्रुटी' },
  { value: 'Idea', label: 'सूचना' },
  { value: 'Content', label: 'अभ्यास साहित्य' },
  { value: 'Other', label: 'इतर' },
];
const SCREENSHOT_CONFIG = { supportedExtensions: ['png', 'jpg', 'jpeg'], supportMultipleValues: false, minValue: 0, maxValue: 5120 };
const MAX_MESSAGE_LENGTH = 2000;

export default function Feedback() {
  const [category, setCategory] = useState('Bug');
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState([]);
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    setSaving(true);
    try {
      const payload = { Name: text.slice(0, 80), message_c: text, category_c: category, status_c: 'New' };
      if (screenshot.length) payload.screenshot_c = await sdk.storage.toCreateFormat(screenshot);
      const res = await sdk.table('feedback_c').create(payload);
      if (!res.data?.length) {
        toast.error(res.messages?.[0] || 'प्रतिक्रिया पाठवता आली नाही.');
        console.error(`feedback_c create failed: ${res.messages?.join('; ') || 'no rows committed'}`);
        return;
      }
      toast.success('धन्यवाद! तुमची प्रतिक्रिया मिळाली.');
      setMessage('');
      setScreenshot([]);
    } catch (err) {
      toast.error('प्रतिक्रिया पाठवता आली नाही.');
      console.error(`feedback_c create threw: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">आम्हाला तुमचा अभिप्राय हवा आहे</p>
        <h1 className="mt-1 text-3xl font-semibold">प्रतिक्रिया द्या</h1>
        <p className="mt-2 text-muted-foreground">त्रुटी, सूचना किंवा अभ्यास साहित्याबद्दल लिहा.</p>
      </div>
      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <label className="block space-y-2">
          <span className="text-sm font-semibold">प्रकार</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="field">
            {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold">संदेश</span>
          <textarea required rows={5} maxLength={MAX_MESSAGE_LENGTH} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="तुमचा अभिप्राय येथे लिहा..." className="field" />
        </label>
        <div className="space-y-2">
          <span className="text-sm font-semibold">स्क्रीनशॉट (ऐच्छिक)</span>
          <FilePicker value={screenshot} onChange={setScreenshot} fieldConfig={SCREENSHOT_CONFIG} maxFiles={1} />
        </div>
        <button type="submit" disabled={saving || !message.trim()} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {saving ? 'पाठवत आहे...' : 'प्रतिक्रिया पाठवा'}
        </button>
      </form>
      <style>{'.field{min-height:44px;width:100%;border:1px solid var(--border);border-radius:0.5rem;background:var(--background);padding:0.65rem 0.8rem}'}</style>
    </div>
  );
}
