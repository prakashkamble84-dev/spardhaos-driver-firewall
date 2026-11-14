import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';
import { formatLocalDate, DATE_FORMATS } from '@/utils/date';

export const route = { path: '/exam-alerts', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'परीक्षा अपडेट्स', icon: 'BellRing', order: 10 };

const FIELDS = ['Id', 'Name', 'content_c', 'exam_track_c', 'publish_date_c', 'source_url_c'];

async function fetchAlerts() {
  const result = await sdk.table('exam_notifications_c').select(FIELDS).where(window.ApperSDK.CoreSDK.eq('status_c', 'Published')).orderByDesc('publish_date_c').fetch();
  if (!result.success) throw new Error(result.message || 'परीक्षा सूचना लोड झाल्या नाहीत.');
  return result.data;
}

export default function ExamAlerts() {
  const { data, loading, error, run } = useFetch(fetchAlerts, []);

  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold text-primary">अधिकृत स्रोत तपासा</p><h1 className="mt-1 text-3xl font-semibold">परीक्षा अपडेट्स</h1><p className="mt-2 text-muted-foreground">MPSC, तलाठी आणि इतर भरती परीक्षांशी संबंधित प्रकाशित सूचना.</p></div>
      <div className="rounded-xl border border-border bg-secondary p-4 text-sm leading-6"><strong>महत्त्वाचे:</strong> अर्ज, पात्रता किंवा परीक्षेच्या तारखांबाबत निर्णय घेण्यापूर्वी संबंधित सरकारी संकेतस्थळावरील मूळ सूचना वाचा.</div>
      {loading && <p className="py-8 text-center text-sm text-muted-foreground">सूचना लोड होत आहेत...</p>}
      {error && <div className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">{error}<button onClick={run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button></div>}
      {!loading && !error && !data?.length && <div className="rounded-2xl border border-dashed border-border p-8 text-center"><ApperIcon name="BellRing" size={30} className="mx-auto text-muted-foreground" /><h2 className="mt-3 font-semibold">अजून सूचना प्रकाशित नाहीत</h2><p className="mt-2 text-sm text-muted-foreground">Admin ने अधिकृत स्रोताची लिंक जोडून सूचना Published केल्यावर ती येथे दिसेल.</p></div>}
      <div className="space-y-3">{(data ?? []).map((entry) => <article key={entry.Id} className="rounded-xl border border-border bg-card p-5"><div className="flex flex-wrap items-center gap-2 text-xs"><span className="font-bold text-primary">{entry.exam_track_c}</span><span className="text-muted-foreground">· {entry.publish_date_c ? formatLocalDate(entry.publish_date_c, DATE_FORMATS.SHORT) : 'तारीख नाही'}</span></div><h2 className="mt-3 text-lg font-semibold">{entry.Name}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.content_c}</p>{entry.source_url_c && <a href={entry.source_url_c} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">मूळ सूचना उघडा <ApperIcon name="ExternalLink" size={15} /></a>}</article>)}</div>
    </div>
  );
}
