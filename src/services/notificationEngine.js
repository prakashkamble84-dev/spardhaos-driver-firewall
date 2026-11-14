import { sdk } from '@/services/sdk';
import { toast } from 'sonner';

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const CATEGORIES = [
  'Study Reminder', 'Missed Task', 'Revision Due', 'Topic Recommendation', 'Mock Test Recommendation',
  'Exam Notice', 'Recruitment Update', 'Application Deadline', 'Exam Date', 'Admit Card', 'Answer Key',
  'Result', 'Current Affairs', 'Subscription Expiry', 'Payment Receipt', 'Community Reply',
  'Study Group Activity', 'Achievement', 'Challenge Update', 'Account Security', 'Weekly Summary', 'Announcement',
];

export const ESSENTIAL_CATEGORIES = ['Account Security', 'Payment Receipt', 'Subscription Expiry'];

export const CATEGORY_PRIORITY = {
  'Account Security': 'Critical',
  'Payment Receipt': 'High',
  'Subscription Expiry': 'High',
  'Application Deadline': 'High',
  'Admit Card': 'High',
  'Exam Date': 'High',
  'Result': 'High',
  'Missed Task': 'Normal',
  'Revision Due': 'Normal',
  'Exam Notice': 'Normal',
  'Study Reminder': 'Low',
  'Announcement': 'Low',
};

export const PRIORITY_RANK = { Critical: 0, High: 1, Normal: 2, Low: 3 };

export const CHANNELS = [
  { key: 'In App', connected: true },
  { key: 'Email', connected: false },
  { key: 'SMS', connected: false },
  { key: 'WhatsApp', connected: false },
  { key: 'Push', connected: false },
];

export function reportWriteError(res, label) {
  if (res.messages?.length) {
    toast.error(res.messages[0], { description: res.messages.slice(1).join('\n') || undefined, duration: 8000 });
    console.error(`${label} failed: ${res.messages.join('; ')}`);
    return true;
  }
  if (!res.data?.length) {
    toast.error(`${label} जतन झाले नाही.`);
    console.error(`${label} failed: no rows were committed`);
    return true;
  }
  return false;
}

export const PREFERENCE_FIELDS = [
  'Id', 'Name', 'categories_enabled_c', 'channels_c', 'daily_reminder_time_c', 'weekly_summary_c',
  'exam_alerts_c', 'quiet_start_c', 'quiet_end_c', 'timezone_c', 'language_c',
  'max_daily_notifications_c', 'marketing_consent_c', 'marketing_consent_at_c',
];

export const NOTIFICATION_FIELDS = [
  'Id', 'Name', 'category_c', 'priority_c', 'language_c', 'body_c', 'source_c', 'source_url_c',
  'source_published_on_c', 'retrieved_at_c', 'verification_status_c', 'destination_c', 'exam_track_c',
  'channel_c', 'delivery_status_c', 'read_at_c', 'archived_c', 'CreatedOn',
];

const COPY = {
  English: {
    study: (topic) => ({ title: `Today's study: ${topic}`, body: 'This task is due today. Open your study plan to start it.' }),
    missed: (topic) => ({ title: `Missed task: ${topic}`, body: 'This task was due earlier and is still pending. Reschedule or complete it in your study plan.' }),
    revision: (topic) => ({ title: `Revision due: ${topic}`, body: 'Your spaced revision for this topic is due today.' }),
    examFallback: 'New published notice for your selected exam. Read the original source before acting on it.',
  },
  Marathi: {
    study: (topic) => ({ title: `आजचा अभ्यास: ${topic}`, body: 'हा टास्क आज देय आहे. अभ्यास योजनेत जाऊन सुरू करा.' }),
    missed: (topic) => ({ title: `चुकलेला टास्क: ${topic}`, body: 'हा टास्क आधी देय होता आणि अजून बाकी आहे. अभ्यास योजनेत पुन्हा नियोजन करा किंवा पूर्ण करा.' }),
    revision: (topic) => ({ title: `उजळणी देय: ${topic}`, body: 'या विषयाची उजळणी आज देय आहे.' }),
    examFallback: 'तुमच्या निवडलेल्या परीक्षेसाठी नवीन प्रकाशित सूचना. कृती करण्यापूर्वी मूळ स्रोत वाचा.',
  },
};

export function toArray(value) {
  if (Array.isArray(value)) return value;
  return typeof value === 'string' && value ? value.split(',') : [];
}

export function toMinutes(hhmm) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? '');
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function localMinutes(date, timeZone = DEFAULT_TIMEZONE) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
    return Number(parts.find((p) => p.type === 'hour').value) * 60 + Number(parts.find((p) => p.type === 'minute').value);
  } catch {
    return date.getHours() * 60 + date.getMinutes();
  }
}

export function dayKey(date, timeZone = DEFAULT_TIMEZONE) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function isQuietNow(prefs, now = new Date()) {
  const start = toMinutes(prefs?.quiet_start_c);
  const end = toMinutes(prefs?.quiet_end_c);
  if (start == null || end == null || start === end) return false;
  const current = localMinutes(now, prefs?.timezone_c || DEFAULT_TIMEZONE);
  return start < end ? current >= start && current < end : current >= start || current < end;
}

function buildNotification({ title, body, category, language, source, recordId, destination, dedupeKey, examTrack = '', verification = 'Not Applicable', sourceUrl = '', publishedOn = '' }, now) {
  return {
    Name: title,
    body_c: body,
    category_c: category,
    priority_c: CATEGORY_PRIORITY[category] ?? 'Normal',
    language_c: language,
    source_c: source,
    source_record_id_c: recordId,
    source_url_c: sourceUrl,
    retrieved_at_c: now.toISOString(),
    verification_status_c: verification,
    destination_c: destination,
    exam_track_c: examTrack,
    dedupe_key_c: dedupeKey,
    channel_c: 'In App',
    delivery_status_c: 'Sent',
    attempt_count_c: 1,
    archived_c: false,
    expires_at_c: new Date(now.getTime() + WEEK_MS).toISOString(),
    ...(publishedOn ? { source_published_on_c: publishedOn } : {}),
  };
}

export async function syncStudentNotifications(prefs, now = new Date()) {
  if (isQuietNow(prefs, now)) return { created: 0, skipped: 'quiet-hours' };

  const { eq, and, isIn, lte } = window.ApperSDK.CoreSDK;
  const tz = prefs?.timezone_c || DEFAULT_TIMEZONE;
  const language = prefs?.language_c === 'English' ? 'English' : 'Marathi';
  const copy = COPY[language];
  const today = dayKey(now, tz);
  const enabled = toArray(prefs?.categories_enabled_c);
  const categoryOn = (category) => !enabled.length || enabled.includes(category);
  const examAlertsOn = prefs?.exam_alerts_c !== false;

  const profileRes = await sdk.table('student_profiles_c').select(['Id', 'target_exam_c', 'secondary_exam_c']).orderByDesc('CreatedOn').fetch();
  if (!profileRes.success) throw new Error(profileRes.message || 'Student profile unavailable');
  const profile = profileRes.data?.[0];
  const targets = [profile?.target_exam_c, profile?.secondary_exam_c].filter(Boolean);

  const existingRes = await sdk.table('notifications_c').select(['Id', 'dedupe_key_c', 'CreatedOn']).orderByDesc('CreatedOn').page(1, 500).fetch();
  if (!existingRes.success) throw new Error(existingRes.message || 'Notifications unavailable');
  const existing = existingRes.data ?? [];
  const existingKeys = new Set(existing.map((row) => row.dedupe_key_c).filter(Boolean));
  const createdToday = existing.filter((row) => row.CreatedOn && dayKey(new Date(row.CreatedOn), tz) === today).length;
  const budget = Math.max(0, (Number(prefs?.max_daily_notifications_c) || 10) - createdToday);
  if (!budget) return { created: 0, skipped: 'daily-limit' };

  const [tasksRes, revisionsRes] = await Promise.all([
    sdk.table('study_tasks_c').select(['Id', 'topic_c', 'due_date_c', 'status_c']).where(and(eq('status_c', 'Pending'), lte('due_date_c', today))).page(1, 200).fetch(),
    sdk.table('revision_schedules_c').select(['Id', 'topic_c', 'revision_date_c', 'status_c']).where(and(eq('status_c', 'Due'), lte('revision_date_c', today))).page(1, 200).fetch(),
  ]);
  if (!tasksRes.success) throw new Error(tasksRes.message || 'Study tasks unavailable');
  if (!revisionsRes.success) throw new Error(revisionsRes.message || 'Revisions unavailable');

  let examRows = [];
  if (targets.length && examAlertsOn) {
    const examRes = await sdk.table('exam_notifications_c')
      .select(['Id', 'Name', 'content_c', 'exam_track_c', 'publish_date_c', 'source_url_c'])
      .where(and(eq('status_c', 'Published'), isIn('exam_track_c', targets)))
      .orderByDesc('publish_date_c')
      .page(1, 50)
      .fetch();
    if (!examRes.success) throw new Error(examRes.message || 'Exam notices unavailable');
    examRows = examRes.data ?? [];
  }

  const candidates = [];

  for (const task of tasksRes.data ?? []) {
    const overdue = task.due_date_c < today;
    const category = overdue ? 'Missed Task' : 'Study Reminder';
    if (!categoryOn(category)) continue;
    const text = (overdue ? copy.missed : copy.study)(task.topic_c || 'Study task');
    candidates.push(buildNotification({ ...text, category, language, source: 'Study Plan', recordId: task.Id, destination: '/study-plan', dedupeKey: `task:${task.Id}:${today}` }, now));
  }

  if (categoryOn('Revision Due')) {
    for (const revision of revisionsRes.data ?? []) {
      const text = copy.revision(revision.topic_c || 'Revision topic');
      candidates.push(buildNotification({ ...text, category: 'Revision Due', language, source: 'Revision Schedule', recordId: revision.Id, destination: '/revision', dedupeKey: `revision:${revision.Id}:${today}` }, now));
    }
  }

  if (categoryOn('Exam Notice')) {
    for (const notice of examRows) {
      candidates.push(buildNotification({
        title: notice.Name,
        body: notice.content_c || copy.examFallback,
        category: 'Exam Notice',
        language,
        source: 'Exam Notice (admin-published)',
        recordId: notice.Id,
        destination: '/exam-alerts',
        dedupeKey: `exam:${notice.Id}`,
        examTrack: notice.exam_track_c,
        verification: notice.source_url_c ? 'Official Verified' : 'Pending Review',
        sourceUrl: notice.source_url_c || '',
        publishedOn: notice.publish_date_c || '',
      }, now));
    }
  }

  const fresh = candidates
    .filter((item) => !existingKeys.has(item.dedupe_key_c))
    .sort((a, b) => PRIORITY_RANK[a.priority_c] - PRIORITY_RANK[b.priority_c])
    .slice(0, budget);
  if (!fresh.length) return { created: 0 };

  const res = await sdk.table('notifications_c').create(fresh);
  if (!res.data?.length) throw new Error(res.messages?.[0] || 'Notifications could not be stored');
  return { created: res.data.length };
}