import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { useFunction } from '@/hooks/useFunction';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';
import { formatRelativeTime } from '@/utils/date';

export const route = { path: '/learn', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'अभ्यास साहित्य', icon: 'BookOpen', order: 4 };

const FIELDS = [
  'Id',
  'Name',
  'description_c',
  'material_type_c',
  'subject_c',
  'exam_track_c',
  'url_c',
  'language_c',
];

async function fetchMaterials() {
  const result = await sdk.table('learning_materials_c')
    .select(FIELDS)
    .where(window.ApperSDK.CoreSDK.eq('status_c', 'Published'))
    .orderByDesc('CreatedOn')
    .fetch();

  if (!result.success) {
    throw new Error(result.message || 'अभ्यास साहित्य लोड झाले नाही.');
  }

  return result.data;
}

const EXAM_FIELDS = ['Name', 'exam_code_c', 'exam_authority_c'];

async function fetchPublishedExams() {
  const result = await sdk.table('exam_tracks_c')
    .select(EXAM_FIELDS)
    .where(window.ApperSDK.CoreSDK.eq('status_c', 'Published'))
    .orderByDesc('CreatedOn')
    .fetch();

  if (!result.success) {
    throw new Error(result.message || 'परीक्षा यादी लोड झाली नाही.');
  }

  return result.data;
}

function LinkList({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.url} className="min-w-0">
          <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            <ApperIcon name="ExternalLink" size={14} className="shrink-0" />
            <span className="truncate">{item.label}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

const MAHARASHTRA_EXAMS = [
  'MPSC Rajyaseva',
  'MPSC Combined Group B',
  'MPSC Combined Group C',
  'MPSC Forest Services',
  'MPSC Engineering Services',
  'MPSC Agriculture Services',
  'MPSC Law Services',
  'Maharashtra Police Sub-Inspector (PSI)',
  'Maharashtra Police Constable',
  'Maharashtra State Tax Inspector (STI)',
  'Maharashtra ASO (Assistant Section Officer)',
  'Talathi Bharti Maharashtra',
  'Maharashtra Gram Sevak',
  'Maharashtra Zilla Parishad Bharti',
];

function LiveExamContent() {
  const [selectedExam, setSelectedExam] = useState(null);
  const { data: exams, loading: examsLoading, error: examsError } = useFetch(fetchPublishedExams, []);
  const { invoke, loading, data: response } = useFunction(import.meta.env.VITE_FETCH_EXAM_CONTENT);
  const content = response?.success ? response.data : null;
  const examNames = [...new Set([...(exams ?? []).map((exam) => exam.Name).filter(Boolean), ...MAHARASHTRA_EXAMS])];

  const handleSelect = (name) => {
    setSelectedExam(name);
    invoke({ examName: name });
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold">परीक्षा निवडा: थेट माहिती</h2>
        <p className="mt-1 text-sm text-muted-foreground">निवडलेल्या परीक्षेची माहिती, नोट्स, अभ्यासक्रम आणि व्हिडिओ थेट इंटरनेटवरून मिळवा.</p>
      </div>

      {examsLoading && <p className="text-sm text-muted-foreground">परीक्षा यादी लोड होत आहे...</p>}
      {examsError && <p className="text-sm text-warning-foreground">{examsError}</p>}

      <div className="flex flex-wrap gap-2">
        {examNames.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => handleSelect(name)}
            disabled={loading}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition hover:bg-secondary disabled:pointer-events-none disabled:opacity-50 ${
              selectedExam === name ? 'border-primary bg-secondary text-primary' : 'border-border'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-muted-foreground">थेट माहिती शोधत आहे...</p>}

      {content && !loading && (
        <div className="space-y-5 border-t border-border pt-4">
          {content.warning && <p className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">{content.warning}</p>}

          {(content.overview || content.marathiOverview) && (
            <div className="grid gap-4 md:grid-cols-2">
              {[content.overview, content.marathiOverview].filter(Boolean).map((summary) => (
                <div key={summary.url} className="min-w-0 space-y-2">
                  <h3 className="font-serif text-lg font-semibold break-words">{summary.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{summary.extract}</p>
                  <a href={summary.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                    स्रोत उघडा
                    <ApperIcon name="ExternalLink" size={14} />
                  </a>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">अधिकृत स्रोत</h3>
              <LinkList items={content.officialLinks ?? []} />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">अभ्यासक्रम</h3>
              <LinkList items={content.syllabus ?? []} />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">नोट्स</h3>
              <LinkList items={content.notes ?? []} />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">व्हिडिओ</h3>
              <LinkList items={content.videos ?? []} />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {selectedExam} · माहिती मिळवल्याची वेळ: {formatRelativeTime(content.fetchedAt)}
          </p>
        </div>
      )}
    </section>
  );
}

export default function Learn() {
  const [search, setSearch] = useState('');
  const { data, loading, error, run } = useFetch(fetchMaterials, []);
  const materials = (data ?? []).filter((item) => {
    const values = [item.Name, item.subject_c, item.description_c, item.exam_track_c];
    return values.some((value) => String(value || '').toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">तुमचे डिजिटल वाचनालय</p>
        <h1 className="mt-1 text-3xl font-semibold">अभ्यास साहित्य</h1>
        <p className="mt-2 text-muted-foreground">Admin ने पडताळून Published केलेल्या नोट्स, व्हिडिओ आणि लेख.</p>
      </div>

      <LiveExamContent />

      <label className="flex min-h-12 max-w-xl items-center gap-3 rounded-xl border border-border bg-card px-4">
        <ApperIcon name="Search" size={18} className="text-muted-foreground" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="विषय किंवा साहित्य शोधा..."
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>

      {loading && <p className="py-8 text-center text-sm text-muted-foreground">साहित्य लोड होत आहे...</p>}
      {error && (
        <div className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">
          {error}
          <button onClick={run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button>
        </div>
      )}
      {!loading && !error && materials.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <ApperIcon name="BookOpen" size={30} className="mx-auto text-muted-foreground" />
          <h2 className="mt-3 font-semibold">{data?.length ? 'शोधाशी जुळणारे साहित्य नाही' : 'अजून साहित्य प्रकाशित नाही'}</h2>
          <p className="mt-2 text-sm text-muted-foreground">फक्त प्रकाशित साहित्य येथे दाखवले जाते. Admin ने साहित्य जोडून Published करावे.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {materials.map((item) => (
          <article key={item.Id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-primary">
                <ApperIcon name={item.material_type_c === 'Video' ? 'PlayCircle' : item.material_type_c === 'PDF' ? 'FileText' : 'BookOpen'} size={21} />
              </span>
              <span className="rounded-full bg-secondary px-2 py-1 text-xs font-semibold">{item.material_type_c}</span>
            </div>
            <h2 className="mt-4 font-serif text-xl font-semibold">{item.Name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{item.subject_c} · {item.exam_track_c}</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description_c}</p>
            <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{item.language_c === 'Marathi' ? 'मराठी' : item.language_c || 'भाषा दिलेली नाही'}</span>
              {item.url_c && (
                <a href={item.url_c} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-primary">
                  उघडा
                  <ApperIcon name="ExternalLink" size={14} />
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
