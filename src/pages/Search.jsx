import { useEffect, useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';
import { formatLocalDate, DATE_FORMATS } from '@/utils/date';

export const route = { path: '/search', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'शोध', icon: 'Search', order: 2 };

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 350;
const RESULTS_PER_GROUP = 8;
const CACHE_TTL_MS = 60000;
const CACHE_LIMIT = 30;
const RECENT_KEY = 'spardha.search.recent';
const MAX_RECENT = 8;

const TYPES = [
  { value: 'all', label: 'सर्व' },
  { value: 'exams', label: 'परीक्षा' },
  { value: 'syllabus', label: 'अभ्यासक्रम' },
  { value: 'materials', label: 'नोट्स व व्हिडिओ' },
  { value: 'questions', label: 'सराव प्रश्न' },
  { value: 'affairs', label: 'चालू घडामोडी' },
];

const VERIFICATION_LABELS = {
  Verified: 'सत्यापित',
  'Verification Required': 'सत्यापन आवश्यक',
  Unverified: 'असत्यापित',
  'Needs Review': 'पुनरावलोकन आवश्यक',
  Rejected: 'नाकारले',
};

// Static Marathi-English terminology. Matches are shown to the student, never applied silently.
const SYNONYMS = {
  इतिहास: ['history'],
  history: ['इतिहास'],
  भूगोल: ['geography'],
  geography: ['भूगोल'],
  अर्थशास्त्र: ['economics', 'economy'],
  economics: ['अर्थशास्त्र'],
  economy: ['अर्थशास्त्र', 'अर्थव्यवस्था'],
  गणित: ['maths', 'mathematics'],
  maths: ['गणित'],
  mathematics: ['गणित'],
  विज्ञान: ['science'],
  science: ['विज्ञान'],
  राज्यघटना: ['polity', 'constitution'],
  polity: ['राज्यघटना'],
  constitution: ['राज्यघटना'],
  बुद्धिमत्ता: ['reasoning'],
  reasoning: ['बुद्धिमत्ता'],
  'चालू घडामोडी': ['current affairs'],
  'current affairs': ['चालू घडामोडी'],
};

const GROUPS = {
  exams: {
    label: 'परीक्षा व भरती',
    table: 'exam_tracks_c',
    orderBy: 'ModifiedOn',
    select: ['Name', 'exam_code_c', 'description_c'],
    searchFields: ['Name', 'exam_code_c'],
    toItem: (r) => ({ title: r.Name, subtitle: r.description_c }),
  },
  syllabus: {
    label: 'अभ्यासक्रम',
    table: 'syllabus_topics_c',
    orderBy: 'ModifiedOn',
    select: ['Name', 'exam_track_c', 'subject_c', 'topic_c', 'topic_mr_c', 'verification_status_c'],
    searchFields: ['Name', 'topic_c', 'topic_mr_c', 'subject_c'],
    verifiedField: 'verification_status_c',
    toItem: (r) => ({
      title: r.topic_c || r.Name,
      titleMr: r.topic_mr_c,
      subtitle: r.subject_c,
      exam: r.exam_track_c,
      verification: r.verification_status_c,
    }),
  },
  materials: {
    label: 'नोट्स व व्हिडिओ',
    table: 'learning_materials_c',
    orderBy: 'ModifiedOn',
    select: ['Name', 'title_mr_c', 'material_type_c', 'subject_c', 'exam_track_c', 'language_c', 'topic_c', 'verification_status_c', 'provider_c'],
    searchFields: ['Name', 'title_mr_c', 'topic_c', 'subject_c'],
    verifiedField: 'verification_status_c',
    languageField: 'language_c',
    toItem: (r) => ({
      title: r.Name,
      titleMr: r.title_mr_c,
      subtitle: r.material_type_c,
      exam: r.exam_track_c,
      topic: r.topic_c,
      language: r.language_c,
      verification: r.verification_status_c,
      source: r.provider_c,
    }),
  },
  questions: {
    label: 'सराव प्रश्न',
    table: 'questions_c',
    orderBy: 'ModifiedOn',
    select: ['question_text_c', 'paper_c', 'subject_c', 'topic_c', 'exam_track_c', 'difficulty_c', 'quality_status_c', 'source_c'],
    searchFields: ['question_text_c', 'topic_c', 'subject_c'],
    toItem: (r) => ({
      title: r.question_text_c,
      subtitle: r.paper_c,
      exam: r.exam_track_c,
      topic: r.topic_c,
      difficulty: r.difficulty_c,
      verification: r.quality_status_c,
      source: r.source_c,
    }),
  },
  affairs: {
    label: 'चालू घडामोडी',
    table: 'current_affairs_c',
    orderBy: 'published_date_c',
    select: ['Name', 'content_c', 'category_c', 'published_date_c', 'source_c'],
    searchFields: ['Name', 'content_c', 'category_c'],
    toItem: (r) => ({
      title: r.Name,
      subtitle: r.content_c,
      topic: r.category_c,
      source: r.source_c,
      date: r.published_date_c,
    }),
  },
};

const cache = new Map();

function expandQuery(text) {
  const extra = SYNONYMS[text.toLowerCase()] ?? [];
  return [...new Set([text, ...extra])].slice(0, 3);
}

function textMatch(core, fields, terms) {
  const conditions = [];
  terms.forEach((term) => {
    const variants = [...new Set([term, term.toLowerCase()])];
    fields.forEach((field) => variants.forEach((variant) => conditions.push(core.contains(field, variant))));
  });
  return conditions.length === 1 ? conditions[0] : core.or(...conditions);
}

function scoreTitle(title, term) {
  const text = String(title ?? '').toLowerCase();
  const needle = term.toLowerCase();
  if (text === needle) return 3;
  if (text.startsWith(needle)) return 2;
  if (text.includes(needle)) return 1;
  return 0;
}

async function fetchGroup(key, core, terms, filters) {
  const group = GROUPS[key];
  const conditions = [core.eq('status_c', 'Published'), textMatch(core, group.searchFields, terms)];
  if (filters.verifiedOnly && group.verifiedField) conditions.push(core.eq(group.verifiedField, 'Verified'));
  if (filters.language && group.languageField) conditions.push(core.eq(group.languageField, filters.language));

  const res = await sdk
    .table(group.table)
    .select(['Id', ...group.select])
    .where(core.and(...conditions))
    .orderByDesc(group.orderBy)
    .page(1, RESULTS_PER_GROUP)
    .fetch();
  if (!res.success) throw new Error(res.message || 'शोध अयशस्वी');

  return (res.data ?? [])
    .map((row) => ({ id: row.Id, ...group.toItem(row), score: scoreTitle(group.toItem(row).title, terms[0]) }))
    .sort((a, b) => b.score - a.score);
}

async function runSearch({ terms, type, filters }) {
  const core = window.ApperSDK.CoreSDK;
  const keys = type === 'all' ? Object.keys(GROUPS) : [type];
  const cacheKey = JSON.stringify({ terms, keys, filters });
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  const settled = await Promise.allSettled(keys.map((key) => fetchGroup(key, core, terms, filters)));
  const groups = keys.map((key, index) => {
    const outcome = settled[index];
    return {
      key,
      label: GROUPS[key].label,
      items: outcome.status === 'fulfilled' ? outcome.value : [],
      error: outcome.status === 'rejected' ? outcome.reason?.message || 'failed' : null,
    };
  });

  if (groups.every((group) => !group.error)) {
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
    cache.set(cacheKey, { at: Date.now(), value: groups });
  }
  return groups;
}

async function fetchExamChips() {
  const res = await sdk
    .table('exam_tracks_c')
    .select(['Name'])
    .where(window.ApperSDK.CoreSDK.eq('status_c', 'Published'))
    .orderBy('sort_order_c')
    .page(1, 12)
    .fetch();
  if (!res.success) throw new Error(res.message || 'परीक्षा यादी लोड झाली नाही.');
  return (res.data ?? []).map((row) => row.Name).filter(Boolean);
}

function readRecent() {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecent(text) {
  const next = [text, ...readRecent().filter((item) => item !== text)].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: history stays in memory for this visit only */
  }
  return next;
}

function Chip({ children }) {
  return <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">{children}</span>;
}

function ResultCard({ item }) {
  const verification = item.verification ? VERIFICATION_LABELS[item.verification] ?? item.verification : null;
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <h3 className="break-words text-base font-semibold">{item.title || '—'}</h3>
      {item.titleMr && item.titleMr !== item.title && <p className="break-words text-sm text-muted-foreground">{item.titleMr}</p>}
      {item.subtitle && <p className="mt-2 line-clamp-3 whitespace-pre-line break-words text-sm text-muted-foreground">{item.subtitle}</p>}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {item.language && <Chip>भाषा: {item.language}</Chip>}
        {item.exam && <Chip>परीक्षा: {item.exam}</Chip>}
        {item.topic && <Chip>विषय: {item.topic}</Chip>}
        {item.difficulty && <Chip>काठिण्य: {item.difficulty}</Chip>}
        {verification && <Chip>सत्यापन: {verification}</Chip>}
        {item.source && <Chip>स्रोत: {item.source}</Chip>}
        {item.date && <Chip>{formatLocalDate(item.date, DATE_FORMATS.SHORT)}</Chip>}
      </div>
    </article>
  );
}

function Results({ groups, terms, onRetry }) {
  const total = groups.reduce((count, group) => count + group.items.length, 0);
  const failed = groups.filter((group) => group.error).length;

  if (!total && failed === groups.length) {
    return (
      <div className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">
        शोध सेवा सध्या उपलब्ध नाही.
        <button type="button" onClick={onRetry} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button>
      </div>
    );
  }

  if (!total) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <ApperIcon name="SearchX" size={30} className="mx-auto text-muted-foreground" />
        <h2 className="mt-3 font-semibold">कोणताही निकाल सापडला नाही</h2>
        <p className="mt-2 text-sm text-muted-foreground">शब्दलेखन तपासा, इंग्रजी किंवा मराठी शब्द वापरून पहा, किंवा प्रकार बदला.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {terms.length > 1 && (
        <p className="text-sm text-muted-foreground">यासह शोधत आहे: {terms.slice(1).join(', ')}</p>
      )}
      {groups.map((group) => (
        <section key={group.key} className="space-y-3">
          <h2 className="text-lg font-semibold">
            {group.label} <span className="text-sm font-normal text-muted-foreground">({group.items.length})</span>
          </h2>
          {group.error && <p className="text-sm text-warning-foreground">या विभागाचे निकाल आज मिळू शकले नाहीत.</p>}
          {group.items.length >= RESULTS_PER_GROUP && (
            <p className="text-xs text-muted-foreground">सर्वाधिक जुळणारे पहिले {RESULTS_PER_GROUP} निकाल दाखवले आहेत.</p>
          )}
          {group.items.map((item) => <ResultCard key={`${group.key}-${item.id}`} item={item} />)}
        </section>
      ))}
      <p className="rounded-lg border border-border bg-secondary p-3 text-xs leading-5 text-muted-foreground">
        निकाल क्रम: नावाशी अचूक जुळणारे, मग सुरुवातीचे शब्द जुळणारे, मग इतर जुळणी. लोकप्रियता, गुणवत्ता गुण किंवा प्रायोजित क्रम वापरलेला नाही.
      </p>
    </div>
  );
}

export default function Search() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [language, setLanguage] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [recent, setRecent] = useState(readRecent);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const hasQuery = query.length >= MIN_QUERY_LENGTH;
  const terms = hasQuery ? expandQuery(query) : [];
  const showsLanguage = type === 'all' || type === 'materials';
  const showsVerified = type === 'all' || type === 'syllabus' || type === 'materials';
  const filters = { language: showsLanguage ? language : '', verifiedOnly: showsVerified && verifiedOnly };

  const { data, loading, error, run } = useFetch(
    () => (hasQuery ? runSearch({ terms, type, filters }) : Promise.resolve(null)),
    [query, type, language, verifiedOnly],
  );
  const { data: examChips } = useFetch(fetchExamChips, []);

  function handleSubmit(event) {
    event.preventDefault();
    const text = input.trim();
    if (text.length < MIN_QUERY_LENGTH) return;
    setQuery(text);
    setRecent(saveRecent(text));
  }

  function pickSuggestion(text) {
    setInput(text);
    setQuery(text);
    setRecent(saveRecent(text));
  }

  function clearHistory() {
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      /* storage blocked: nothing persisted to clear */
    }
    setRecent([]);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">परीक्षा, विषय आणि साहित्य एकाच ठिकाणी</p>
        <h1 className="mt-1 text-3xl font-semibold">शोध</h1>
        <p className="mt-2 text-muted-foreground">मराठी किंवा English मध्ये शोधा. फक्त प्रकाशित आणि तुम्हाला उपलब्ध असलेले साहित्य दिसेल.</p>
      </div>

      <form role="search" onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="परीक्षा, विषय, प्रश्न किंवा घडामोड शोधा"
          aria-label="शोध"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <button type="submit" disabled={input.trim().length < MIN_QUERY_LENGTH} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50">
          शोधा
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {TYPES.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={type === item.value}
            onClick={() => setType(item.value)}
            className={`min-h-9 rounded-full border px-3 text-sm transition-colors ${type === item.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-accent'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {(showsLanguage || showsVerified) && (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {showsLanguage && (
            <label className="flex items-center gap-2">
              <span className="text-muted-foreground">भाषा</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value)} className="min-h-11 rounded-lg border border-border bg-background px-3">
                <option value="">सर्व</option>
                <option value="Marathi">मराठी</option>
                <option value="English">English</option>
              </select>
            </label>
          )}
          {showsVerified && (
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} />
              फक्त सत्यापित
            </label>
          )}
        </div>
      )}

      {!hasQuery && (
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">अलीकडील शोध</h2>
              {recent.length > 0 && (
                <button type="button" onClick={clearHistory} className="text-sm text-muted-foreground underline">इतिहास साफ करा</button>
              )}
            </div>
            {recent.length ? (
              <div className="flex flex-wrap gap-2">
                {recent.map((text) => (
                  <button key={text} type="button" onClick={() => pickSuggestion(text)} className="min-h-9 rounded-full border border-border px-3 text-sm hover:bg-accent">
                    {text}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">तुमचा शोध इतिहास येथे दिसेल. हा इतिहास फक्त या उपकरणावर साठवला जातो.</p>
            )}
          </section>
          {examChips?.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-semibold">परीक्षा प्रकार</h2>
              <div className="flex flex-wrap gap-2">
                {examChips.map((name) => (
                  <button key={name} type="button" onClick={() => pickSuggestion(name)} className="min-h-9 rounded-full border border-border px-3 text-sm hover:bg-accent">
                    {name}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {hasQuery && loading && <p className="py-8 text-center text-sm text-muted-foreground">शोधत आहे...</p>}
      {hasQuery && error && (
        <div className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">
          {error}
          <button type="button" onClick={run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button>
        </div>
      )}
      {hasQuery && !loading && !error && data && <Results groups={data} terms={terms} onRetry={run} />}
    </div>
  );
}