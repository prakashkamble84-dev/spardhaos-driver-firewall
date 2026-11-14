import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';
import { formatLocalDate, DATE_FORMATS } from '@/utils/date';

export const route = { path: '/current-affairs', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'चालू घडामोडी', icon: 'Newspaper', order: 9 };

const FIELDS = ['Id', 'Name', 'content_c', 'category_c', 'published_date_c', 'source_c'];

async function fetchEntries() {
  const result = await sdk.table('current_affairs_c').select(FIELDS).where(window.ApperSDK.CoreSDK.eq('status_c', 'Published')).orderByDesc('published_date_c').fetch();
  if (!result.success) throw new Error(result.message || 'चालू घडामोडी लोड झाल्या नाहीत.');
  return result.data;
}

export default function CurrentAffairs() {
  const { data, loading, error, run } = useFetch(fetchEntries, []);

  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold text-primary">दररोज थोडे वाचा, नियमित उजळणी करा</p><h1 className="mt-1 text-3xl font-semibold">चालू घडामोडी</h1><p className="mt-2 text-muted-foreground">Admin ने प्रकाशित केलेल्या आणि स्रोतासह दिलेल्या नोंदी.</p></div>
      <div className="rounded-xl border border-border bg-secondary p-4 text-sm leading-6"><strong>पडताळणी:</strong> प्रत्येक नोंदीचा मूळ स्रोत तपासा. Published स्थिती ही सामग्री प्रकाशित असल्याचे दर्शवते, सरकारी सत्यतेची स्वतंत्र हमी नाही.</div>
      {loading && <p className="py-8 text-center text-sm text-muted-foreground">नोंदी लोड होत आहेत...</p>}
      {error && <div className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">{error}<button onClick={run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button></div>}
      {!loading && !error && !data?.length && <div className="rounded-2xl border border-dashed border-border p-8 text-center"><ApperIcon name="Newspaper" size={30} className="mx-auto text-muted-foreground" /><h2 className="mt-3 font-semibold">अजून नोंदी प्रकाशित नाहीत</h2><p className="mt-2 text-sm text-muted-foreground">Admin ने स्रोत आणि तारीख तपासून नोंद Published केल्यावर ती येथे दिसेल.</p></div>}
      <div className="space-y-3">{(data ?? []).map((entry) => <article key={entry.Id} className="rounded-xl border border-border bg-card p-5"><div className="flex flex-wrap items-center gap-2 text-xs"><span className="font-bold text-primary">{entry.category_c}</span><span className="text-muted-foreground">· {entry.published_date_c ? formatLocalDate(entry.published_date_c, DATE_FORMATS.SHORT) : 'तारीख नाही'}</span></div><h2 className="mt-3 text-lg font-semibold">{entry.Name}</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{entry.content_c}</p>{entry.source_c && <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><ApperIcon name="Link" size={14} /> स्रोत: {entry.source_c}</p>}</article>)}</div>
    </div>
  );
}
