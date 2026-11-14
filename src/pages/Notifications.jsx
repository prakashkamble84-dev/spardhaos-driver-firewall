import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';
import { formatLocalDate, formatRelativeTime, DATE_FORMATS } from '@/utils/date';
import {
  CATEGORIES, CHANNELS, ESSENTIAL_CATEGORIES, NOTIFICATION_FIELDS, PREFERENCE_FIELDS,
  DEFAULT_TIMEZONE, reportWriteError, syncStudentNotifications, toArray,
} from '@/services/notificationEngine';

export const route = { path: '/notifications', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'सूचना केंद्र', icon: 'Bell', order: 11 };

const PRIORITIES = ['Critical', 'High', 'Normal', 'Low'];
const LANGUAGES = ['Marathi', 'English'];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const DELIVERY_STYLES = {
  Pending: 'border-border bg-muted text-muted-foreground',
  Queued: 'border-warning/20 bg-warning/10 text-warning',
  Sent: 'border-primary/20 bg-primary/10 text-primary',
  Delivered: 'border-success/20 bg-success/10 text-success',
  Failed: 'border-destructive/20 bg-destructive/10 text-destructive',
  Expired: 'border-border bg-muted text-muted-foreground',
};

const VERIFICATION_STYLES = {
  'Official Verified': 'border-success/20 bg-success/10 text-success',
  'Pending Review': 'border-warning/20 bg-warning/10 text-warning',
  'AI Processed': 'border-border bg-muted text-muted-foreground',
};

const chip = 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold';

async function fetchPreferences() {
  const res = await sdk.table('notification_preferences_c').select(PREFERENCE_FIELDS).orderByDesc('CreatedOn').fetch();
  if (!res.success) throw new Error(res.message || 'सूचना सेटिंग्ज लोड झाल्या नाहीत.');
  return res.data?.[0] ?? null;
}

async function fetchInbox({ category, priority, unreadOnly, search }) {
  const prefs = await fetchPreferences().catch(() => null);
  await syncStudentNotifications(prefs).catch(() => null);
  const { eq, and, isNull, contains } = window.ApperSDK.CoreSDK;
  const filters = [eq('archived_c', false)];
  if (category) filters.push(eq('category_c', category));
  if (priority) filters.push(eq('priority_c', priority));
  if (unreadOnly) filters.push(isNull('read_at_c'));
  if (search.trim()) filters.push(contains('Name', search.trim()));
  const res = await sdk.table('notifications_c')
    .select(NOTIFICATION_FIELDS)
    .where(and(...filters))
    .orderByDesc('CreatedOn')
    .page(1, 100)
    .fetch();
  if (!res.success) throw new Error(res.message || 'सूचना लोड झाल्या नाहीत.');
  return res.data ?? [];
}

export default function Notifications() {
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const inbox = useFetch(() => fetchInbox({ category, priority, unreadOnly, search }), [category, priority, unreadOnly, search]);
  const prefsQuery = useFetch(fetchPreferences, []);
  const rows = inbox.data ?? [];
  const unreadCount = rows.filter((row) => !row.read_at_c).length;

  async function applyUpdates(updates, label) {
    if (!updates.length) return;
    setBusy(true);
    try {
      const res = await sdk.table('notifications_c').update(updates);
      if (reportWriteError(res, label)) return;
      await inbox.run();
    } finally {
      setBusy(false);
    }
  }

  function markRead(row) {
    if (row.read_at_c) return;
    applyUpdates([{ Id: row.Id, read_at_c: new Date().toISOString() }], 'सूचना वाचलेली नोंद');
  }

  function markAllRead() {
    const now = new Date().toISOString();
    applyUpdates(rows.filter((row) => !row.read_at_c).map((row) => ({ Id: row.Id, read_at_c: now })), 'सर्व सूचना वाचलेल्या नोंदी');
  }

  function archive(row) {
    applyUpdates([{ Id: row.Id, archived_c: true, read_at_c: row.read_at_c ?? new Date().toISOString() }], 'सूचना आर्काइव्ह');
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">सूचना केंद्र</p>
        <h1 className="mt-1 text-3xl font-semibold">माझ्या सूचना</h1>
        <p className="mt-2 text-muted-foreground">अभ्यास, परीक्षा आणि खाते संबंधित सूचना येथे दिसतात. सूचना उघडल्यावर त्या ताज्या केल्या जातात.</p>
      </div>

      <div className="rounded-xl border border-border bg-secondary p-4 text-sm leading-6">
        <strong>महत्त्वाचे:</strong> अर्ज, पात्रता किंवा परीक्षेच्या तारखांबाबत निर्णय घेण्यापूर्वी मूळ सरकारी सूचना तपासा. पडताळणी स्थिती प्रत्येक सूचनेवर दाखवली आहे.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">न वाचलेल्या सूचना: <span className="font-semibold tabular-nums text-foreground">{unreadCount}</span></p>
        <button type="button" onClick={markAllRead} disabled={busy || unreadCount === 0} className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-accent disabled:opacity-50">
          सर्व वाचले म्हणून चिन्हांकित करा
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="field" aria-label="श्रेणी">
          <option value="">सर्व श्रेणी</option>
          {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={priority} onChange={(event) => setPriority(event.target.value)} className="field" aria-label="प्राधान्य">
          <option value="">सर्व प्राधान्य</option>
          {PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="सूचना शोधा" className="field" aria-label="शोधा" />
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} className="h-4 w-4 accent-primary" />
          फक्त न वाचलेल्या
        </label>
      </div>

      {inbox.loading && <p className="py-8 text-center text-sm text-muted-foreground">सूचना लोड होत आहेत...</p>}
      {inbox.error && <div className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">{inbox.error.message}<button type="button" onClick={inbox.run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button></div>}
      {!inbox.loading && !inbox.error && !rows.length && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <ApperIcon name="Bell" size={30} className="mx-auto text-muted-foreground" />
          <h2 className="mt-3 font-semibold">सध्या सूचना नाहीत</h2>
          <p className="mt-2 text-sm text-muted-foreground">तुमच्या अभ्यास योजनेतील देय टास्क, उजळणी किंवा निवडलेल्या परीक्षेची प्रकाशित सूचना येथे दिसेल.</p>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((row) => (
          <article key={row.Id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-bold text-primary">{row.category_c}</span>
                  <span>· {row.priority_c}</span>
                  <span>· {row.language_c}</span>
                  <span>· {formatRelativeTime(row.CreatedOn)}</span>
                </div>
                <h2 className={`mt-2 break-words font-semibold ${row.read_at_c ? '' : 'text-foreground'}`}>{row.Name}</h2>
                {row.body_c && <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{row.body_c}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`${chip} ${DELIVERY_STYLES[row.delivery_status_c] ?? DELIVERY_STYLES.Pending}`}>{row.delivery_status_c || 'Pending'}</span>
                  <span className={`${chip} ${row.read_at_c ? DELIVERY_STYLES.Pending : DELIVERY_STYLES.Sent}`}>{row.read_at_c ? 'Read' : 'Unread'}</span>
                  {row.verification_status_c && <span className={`${chip} ${VERIFICATION_STYLES[row.verification_status_c] ?? DELIVERY_STYLES.Pending}`}>{row.verification_status_c}</span>}
                </div>
                {(row.source_c || row.source_url_c || row.source_published_on_c || row.retrieved_at_c) && (
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {row.source_c && <p>स्रोत: {row.source_c}</p>}
                    {row.source_published_on_c && <p>प्रकाशित: {formatLocalDate(row.source_published_on_c, DATE_FORMATS.SHORT)}</p>}
                    {row.retrieved_at_c && <p>तपासणी: {formatLocalDate(row.retrieved_at_c, DATE_FORMATS.WITH_TIME)}</p>}
                    {row.source_url_c && (
                      <a href={row.source_url_c} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary">
                        मूळ सूचना उघडा <ApperIcon name="ExternalLink" size={13} />
                      </a>
                    )}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                {row.destination_c && (
                  <Link to={row.destination_c} onClick={() => markRead(row)} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground">
                    उघडा <ApperIcon name="ArrowRight" size={13} />
                  </Link>
                )}
                {!row.read_at_c && (
                  <button type="button" onClick={() => markRead(row)} disabled={busy} className="min-h-9 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-accent disabled:opacity-50">वाचले</button>
                )}
                <button type="button" onClick={() => archive(row)} disabled={busy} className="min-h-9 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-accent disabled:opacity-50">आर्काइव्ह</button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {prefsQuery.loading
        ? <p className="text-sm text-muted-foreground">सेटिंग्ज लोड होत आहेत...</p>
        : <PreferencesPanel prefs={prefsQuery.data ?? null} onSaved={() => { prefsQuery.run(); inbox.run(); }} />}
      <style>{'.field{min-height:44px;width:100%;border:1px solid var(--border);border-radius:0.5rem;background:var(--background);padding:0.65rem 0.8rem}'}</style>
    </div>
  );
}

function buildPrefsForm(prefs) {
  return {
    categories_enabled: toArray(prefs?.categories_enabled_c).length ? toArray(prefs.categories_enabled_c) : [...CATEGORIES],
    channels: toArray(prefs?.channels_c).filter((item) => item !== 'In App'),
    daily_reminder_time_c: prefs?.daily_reminder_time_c || '07:30',
    weekly_summary_c: prefs?.weekly_summary_c ?? true,
    exam_alerts_c: prefs?.exam_alerts_c ?? true,
    quiet_start_c: prefs?.quiet_start_c || '22:00',
    quiet_end_c: prefs?.quiet_end_c || '07:00',
    timezone_c: prefs?.timezone_c || DEFAULT_TIMEZONE,
    language_c: prefs?.language_c || 'Marathi',
    max_daily_notifications_c: String(prefs?.max_daily_notifications_c ?? 10),
    marketing_consent_c: Boolean(prefs?.marketing_consent_c),
  };
}

function PreferencesPanel({ prefs, onSaved }) {
  const [form, setForm] = useState(() => buildPrefsForm(prefs));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(buildPrefsForm(prefs));
  }, [prefs]);

  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleIn(field, value) {
    setForm((current) => {
      const list = current[field];
      return { ...current, [field]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] };
    });
  }

  async function save(event) {
    event.preventDefault();
    if (![form.daily_reminder_time_c, form.quiet_start_c, form.quiet_end_c].every((value) => TIME_PATTERN.test(value))) {
      toast.error('वेळ HH:MM स्वरूपात लिहा, उदा. 07:30.');
      return;
    }
    const consentChanged = form.marketing_consent_c !== Boolean(prefs?.marketing_consent_c);
    const payload = {
      Name: 'Notification Preferences',
      categories_enabled_c: Array.from(new Set([...form.categories_enabled, ...ESSENTIAL_CATEGORIES])).join(','),
      channels_c: Array.from(new Set(['In App', ...form.channels])).join(','),
      daily_reminder_time_c: form.daily_reminder_time_c,
      weekly_summary_c: form.weekly_summary_c,
      exam_alerts_c: form.exam_alerts_c,
      quiet_start_c: form.quiet_start_c,
      quiet_end_c: form.quiet_end_c,
      timezone_c: form.timezone_c.trim() || DEFAULT_TIMEZONE,
      language_c: form.language_c,
      max_daily_notifications_c: Math.min(50, Math.max(1, Number(form.max_daily_notifications_c) || 10)),
      marketing_consent_c: form.marketing_consent_c,
      ...(consentChanged ? { marketing_consent_at_c: form.marketing_consent_c ? new Date().toISOString() : null } : {}),
    };
    setSaving(true);
    try {
      const res = prefs
        ? await sdk.table('notification_preferences_c').update({ Id: prefs.Id, ...payload })
        : await sdk.table('notification_preferences_c').create(payload);
      if (reportWriteError(res, 'सूचना सेटिंग्ज')) return;
      toast.success('सूचना सेटिंग्ज जतन झाल्या.');
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold">सूचना प्राधान्य</h2>
        <p className="text-sm text-muted-foreground">कोणत्या सूचना, कोणत्या वेळी आणि कोणत्या चॅनेलवर हव्यात ते ठरवा.</p>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold">सूचना श्रेणी</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((item) => {
            const essential = ESSENTIAL_CATEGORIES.includes(item);
            return (
              <label key={item} className="flex min-h-9 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={essential}
                  checked={essential || form.categories_enabled.includes(item)}
                  onChange={() => toggleIn('categories_enabled', item)}
                  className="h-4 w-4 accent-primary"
                />
                <span>{item}{essential && ' (नेहमी सुरू)'}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold">चॅनेल</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {CHANNELS.map((channel) => (
            <label key={channel.key} className="flex min-h-9 items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={!channel.connected}
                checked={channel.connected || form.channels.includes(channel.key)}
                onChange={() => toggleIn('channels', channel.key)}
                className="h-4 w-4 accent-primary"
              />
              <span>{channel.key}{!channel.connected && ' (अजून जोडलेले नाही)'}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2"><span className="text-sm font-semibold">दैनिक स्मरणपत्र वेळ</span><input type="time" value={form.daily_reminder_time_c} onChange={(event) => set('daily_reminder_time_c', event.target.value)} className="field" /></label>
        <label className="block space-y-2"><span className="text-sm font-semibold">भाषा</span>
          <select value={form.language_c} onChange={(event) => set('language_c', event.target.value)} className="field">
            {LANGUAGES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="block space-y-2"><span className="text-sm font-semibold">शांत वेळ सुरू</span><input type="time" value={form.quiet_start_c} onChange={(event) => set('quiet_start_c', event.target.value)} className="field" /></label>
        <label className="block space-y-2"><span className="text-sm font-semibold">शांत वेळ संपते</span><input type="time" value={form.quiet_end_c} onChange={(event) => set('quiet_end_c', event.target.value)} className="field" /></label>
        <label className="block space-y-2"><span className="text-sm font-semibold">टाइम झोन</span><input value={form.timezone_c} onChange={(event) => set('timezone_c', event.target.value)} className="field" /></label>
        <label className="block space-y-2"><span className="text-sm font-semibold">दिवसाला कमाल सूचना (1-50)</span><input type="number" min="1" max="50" value={form.max_daily_notifications_c} onChange={(event) => set('max_daily_notifications_c', event.target.value)} className="field" /></label>
      </div>

      <div className="space-y-2">
        <label className="flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" checked={form.weekly_summary_c} onChange={(event) => set('weekly_summary_c', event.target.checked)} className="h-4 w-4 accent-primary" />साप्ताहिक सारांश हवा</label>
        <label className="flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" checked={form.exam_alerts_c} onChange={(event) => set('exam_alerts_c', event.target.checked)} className="h-4 w-4 accent-primary" />निवडलेल्या परीक्षांच्या सूचना हव्यात</label>
        <label className="flex min-h-9 items-start gap-2 text-sm"><input type="checkbox" checked={form.marketing_consent_c} onChange={(event) => set('marketing_consent_c', event.target.checked)} className="mt-1 h-4 w-4 accent-primary" /><span>प्रचारात्मक संदेश मिळण्यास संमती (ऐच्छिक). खाते तयार करणे म्हणजे ही संमती नाही.</span></label>
      </div>

      <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50">
        {saving ? 'जतन होत आहे...' : 'सेटिंग्ज जतन करा'}
      </button>
    </form>
  );
}