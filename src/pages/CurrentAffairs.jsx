import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/current-affairs', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'चालू घडामोडी', icon: 'Newspaper', order: 9 };

const entries = [
  { date: '१२ नोव्हेंबर २०२६', category: 'महाराष्ट्र', title: 'राज्याच्या विकास योजनांचा आढावा', status: 'नमुना नोंद', summary: 'राज्यस्तरीय योजना, उद्दिष्टे आणि अंमलबजावणी यांचा अभ्यास करताना अधिकृत शासन निर्णयाचा संदर्भ तपासा.' },
  { date: '१० नोव्हेंबर २०२६', category: 'अर्थव्यवस्था', title: 'महागाई आणि ग्राहक किंमत निर्देशांक', status: 'अभ्यास टिप', summary: 'CPI, महागाई दर आणि सामान्य नागरिकांवरील परिणाम या संकल्पना समजून घ्या.' }
];

export default function CurrentAffairs() {
  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold text-primary">दररोज थोडे वाचा, नियमित उजळणी करा</p><h1 className="mt-1 text-3xl font-semibold">चालू घडामोडी</h1><p className="mt-2 text-muted-foreground">परीक्षेशी संबंधित बातम्या आणि अभ्यास टिपा.</p></div>
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>महत्त्वाची सूचना:</strong> खालील नोंदी नमुना आहेत. या live news किंवा अधिकृत सरकारी अपडेट्स नाहीत. कोणताही निर्णय घेण्यापूर्वी मूळ सरकारी स्रोत तपासा.</div>
      <div className="space-y-3">{entries.map((entry) => <article key={entry.title} className="rounded-xl border border-border bg-card p-5"><div className="flex flex-wrap items-center gap-2 text-xs"><span className="font-bold text-primary">{entry.category}</span><span className="text-muted-foreground">· {entry.date}</span><span className="rounded-full bg-secondary px-2 py-1 font-semibold">{entry.status}</span></div><h2 className="mt-3 text-lg font-semibold">{entry.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.summary}</p></article>)}</div>
    </div>
  );
}