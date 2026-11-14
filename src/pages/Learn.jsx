import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/learn', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'अभ्यास साहित्य', icon: 'BookOpen', order: 4 };

const FIELDS = ['Id', 'Name', 'description_c', 'material_type_c', 'subject_c', 'exam_track_c', 'url_c', 'language_c'];

async function fetchMaterials() {
  const result = await sdk.table('learning_materials_c').select(FIELDS).where(window.ApperSDK.CoreSDK.eq('status_c', 'Published')).orderByDesc('CreatedOn').fetch();
  if (!result.success) throw new Error(result.message || 'अभ्यास साहित्य लोड झाले नाही.');
  return result.data;
}

export default function Learn() {
  const [search, setSearch] = useState('');
  const { data, loading, error, run } = useFetch(fetchMaterials, []);
  const materials = (data ?? []).filter((item) => [item.Name, item.subject_c, item.description_c, item.exam_track_c].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold text-primary">तुमचे डिजिटल वाचनालय</p><h1 className="mt-1 text-3xl font-semibold">अभ्यास साहित्य</h1><p className="mt-2 text-muted-foreground">Admin ने पडताळून Published केलेल्या नोट्स, व्हिडिओ आणि लेख.</p></div>
      <label className="flex min-h-12 max-w-xl items-center gap-3 rounded-xl border border-border bg-card px-4"><ApperIcon name="Search" size={18} className="text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="विषय किंवा साहित्य शोधा..." className="w-full bg-transparent text-sm outline-none" /></label>
      {loading && <p className="py-8 text-center text-sm text-muted-foreground">साहित्य लोड होत आहे...</p>}
      {error && <div className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">{error}<button onClick={run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button></div>}
      {!loading && !error && materials.length === 0 && <div className="rounded-2xl border border-dashed border-border p-8 text-center"><ApperIcon name="BookOpen" size={30} className="mx-auto text-muted-foreground" /><h2 className="mt-3 font-semibold">{data?.length ? 'शोधाशी जुळणारे साहित्य नाही' : 'अजून साहित्य प्रकाशित नाही'}</h2><p className="mt-2 text-sm text-muted-foreground">फक्त प्रकाशित साहित्य येथे दाखवले जाते. Admin ने साहित्य जोडून Published करावे.</p></div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{materials.map((item) => <article key={item.Id} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-primary"><ApperIcon name={item.material_type_c === 'Video' ? 'PlayCircle' : item.material_type_c === 'PDF' ? 'FileText' : 'BookOpen'} size={21} /></span><span className="rounded-full bg-secondary px-2 py-1 text-xs font-semibold">{item.material_type_c}</span></div><h2 className="mt-4 font-serif text-xl font-semibold">{item.Name}</h2><p className="mt-1 text-sm text-muted-foreground">{item.subject_c} · {item.exam_track_c}</p><p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description_c}</p><div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{item.language_c === 'Marathi' ? 'मराठी' : item.language_c || 'भाषा दिलेली नाही'}</span>{item.url_c && <a href={item.url_c} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-primary">उघडा <ApperIcon name="ExternalLink" size={14} /></a>}</div></article>)}</div>
    </div>
  );
}
