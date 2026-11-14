import { useState } from 'react';
import { Link } from 'react-router-dom';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/learn', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'अभ्यास साहित्य', icon: 'BookOpen', order: 4 };

const subjects = [
  { name: 'इतिहास', chapters: 18, progress: 42, icon: 'Landmark', topics: 'प्राचीन, मध्ययुगीन आणि आधुनिक भारत' },
  { name: 'राज्यशास्त्र', chapters: 22, progress: 58, icon: 'Scale', topics: 'राज्यघटना, संसद, शासनव्यवस्था' },
  { name: 'भूगोल', chapters: 16, progress: 31, icon: 'Globe2', topics: 'भारत, महाराष्ट्र आणि जगाचा भूगोल' },
  { name: 'अर्थव्यवस्था', chapters: 14, progress: 24, icon: 'ChartNoAxesCombined', topics: 'मूलभूत संकल्पना, अर्थसंकल्प, बँकिंग' },
  { name: 'विज्ञान', chapters: 15, progress: 36, icon: 'Atom', topics: 'भौतिकशास्त्र, रसायनशास्त्र, जीवशास्त्र' },
  { name: 'चालू घडामोडी', chapters: 12, progress: 65, icon: 'Newspaper', topics: 'राष्ट्रीय आणि महाराष्ट्र विशेष' }
];

export default function Learn() {
  const [search, setSearch] = useState('');
  const visible = subjects.filter((subject) => subject.name.includes(search) || subject.topics.includes(search));
  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold text-primary">तुमचे डिजिटल वाचनालय</p><h1 className="mt-1 text-3xl font-semibold">अभ्यास साहित्य</h1><p className="mt-2 text-muted-foreground">विषयानुसार नोट्स, संकल्पना आणि flashcards एकाच ठिकाणी.</p></div>
      <label className="flex min-h-12 max-w-xl items-center gap-3 rounded-xl border border-border bg-card px-4"><ApperIcon name="Search" size={18} className="text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="विषय किंवा घटक शोधा..." className="w-full bg-transparent text-sm outline-none" /></label>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((subject) => <article key={subject.name} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-primary"><ApperIcon name={subject.icon} size={21} /></span><span className="text-xs font-semibold text-muted-foreground">{subject.chapters} घटक</span></div><h2 className="mt-4 font-serif text-xl font-semibold">{subject.name}</h2><p className="mt-1 min-h-10 text-sm text-muted-foreground">{subject.topics}</p><div className="mt-4 flex items-center justify-between text-xs"><span className="text-muted-foreground">नमुना अभ्यास प्रगती</span><strong>{subject.progress}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${subject.progress}%` }} /></div><Link to="/practice" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">सराव प्रश्न सोडवा <ApperIcon name="ArrowRight" size={15} /></Link></article>)}
      </div>
      <p className="text-xs text-muted-foreground">सर्व प्रगती आणि घटक संख्या नमुना आहेत. अभ्यास साहित्याचे स्रोत व पुनरावलोकन स्थिती प्रत्यक्ष सामग्री जोडताना दाखवली जाईल.</p>
    </div>
  );
}