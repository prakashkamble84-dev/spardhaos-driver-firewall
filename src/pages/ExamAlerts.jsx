import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/exam-alerts', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'परीक्षा अपडेट्स', icon: 'BellRing', order: 10 };

export default function ExamAlerts() {
  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold text-primary">अधिकृत स्रोत तपासा</p><h1 className="mt-1 text-3xl font-semibold">परीक्षा अपडेट्स</h1><p className="mt-2 text-muted-foreground">MPSC, तलाठी आणि इतर भरती परीक्षांशी संबंधित सूचना.</p></div>
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Live integration जोडलेली नाही.</strong> येथे सध्या कोणतीही वास्तविक जाहिरात, अर्जाची तारीख किंवा परीक्षा तारीख प्रकाशित केलेली नाही.</div>
      <section className="rounded-2xl border border-border bg-card p-6"><ApperIcon name="ShieldCheck" size={27} className="text-primary" /><h2 className="mt-3 font-serif text-xl font-semibold">विश्वसनीय सूचना कशा दाखवू?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">प्रत्येक अपडेटसोबत अधिकृत स्रोताची लिंक, प्रकाशित तारीख, संबंधित परीक्षा आणि पडताळणी स्थिती दाखवली जाईल. सरकारी संकेतस्थळावरून पडताळणी न झालेली माहिती स्पष्टपणे अप्रमाणित म्हणून चिन्हांकित केली जाईल.</p><div className="mt-5 space-y-2 text-sm"><Source name="Maharashtra Public Service Commission" url="https://mpsc.gov.in/" /><Source name="Maharashtra Government" url="https://www.maharashtra.gov.in/" /></div></section>
    </div>
  );
}

function Source({ name, url }) {
  return <a href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-border px-3 py-3 font-semibold hover:bg-accent">{name}<ApperIcon name="ExternalLink" size={16} /></a>;
}