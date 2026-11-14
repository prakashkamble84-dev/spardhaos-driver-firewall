import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/progress', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'प्रगती', icon: 'ChartNoAxesCombined', order: 6 };

const weeks = [{ day: 'सोम', value: 45 }, { day: 'मंगळ', value: 70 }, { day: 'बुध', value: 55 }, { day: 'गुरु', value: 85 }, { day: 'शुक्र', value: 62 }, { day: 'शनि', value: 75 }, { day: 'रवि', value: 30 }];

export default function Progress() {
  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold text-primary">तुमची तयारी कुठे पोहोचली?</p><h1 className="mt-1 text-3xl font-semibold">माझी प्रगती</h1><p className="mt-2 text-muted-foreground">गुणांपेक्षा सातत्य आणि विषयातील सुधारणा महत्त्वाची.</p></div>
      <div className="grid gap-3 sm:grid-cols-3"><Stat label="सराव अचूकता" value="७२%" icon="Target" /><Stat label="अभ्यास वेळ" value="१८.५ तास" icon="Clock3" /><Stat label="सिलेबस कव्हरेज" value="३८%" icon="BookOpen" /></div>
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><h2 className="font-serif text-xl font-semibold">या आठवड्यातील अभ्यास वेळ</h2><p className="mt-1 text-sm text-muted-foreground">दररोजच्या अभ्यासाचे नमुना मिनिटे</p><div className="mt-7 flex h-48 items-end justify-between gap-2">{weeks.map((item) => <div key={item.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] font-semibold text-muted-foreground">{item.value}</span><div className="w-full max-w-10 rounded-t-md bg-primary/85" style={{ height: `${item.value}%` }} /><span className="text-xs text-muted-foreground">{item.day}</span></div>)}</div></section>
      <section className="rounded-2xl border border-border bg-card p-5"><h2 className="font-serif text-xl font-semibold">विषयानुसार अचूकता</h2><div className="mt-4 space-y-4">{[{ name: 'राज्यशास्त्र', score: 82 }, { name: 'इतिहास', score: 74 }, { name: 'भूगोल', score: 61 }, { name: 'अर्थव्यवस्था', score: 55 }].map((item) => <div key={item.name}><div className="mb-1 flex justify-between text-sm"><span>{item.name}</span><strong>{item.score}%</strong></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${item.score}%` }} /></div></div>)}</div></section>
      <p className="text-xs text-muted-foreground">सर्व आकडे नमुना आहेत. प्रत्यक्ष गुण, readiness आणि syllabus coverage वापरकर्त्याच्या जतन केलेल्या प्रयत्नांवरून मोजले जातील.</p>
    </div>
  );
}

function Stat({ label, value, icon }) {
  return <div className="rounded-xl border border-border bg-card p-4"><ApperIcon name={icon} size={19} className="text-primary" /><p className="mt-3 text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}