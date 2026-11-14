import { useState } from 'react';
import { Link } from 'react-router-dom';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/mock-tests', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'मॉक टेस्ट', icon: 'FileText', order: 8 };

export default function MockTests() {
  const [started, setStarted] = useState(false);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><p className="text-sm font-semibold text-primary">परीक्षेचा अनुभव</p><h1 className="mt-1 text-3xl font-semibold">मॉक टेस्ट</h1><p className="mt-2 text-muted-foreground">वेळेचे नियोजन आणि विषयवार तयारी तपासा.</p></div>
      <article className="rounded-2xl border border-border bg-card p-6 sm:p-8"><div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">नमुना टेस्ट</span><h2 className="mt-4 font-serif text-2xl font-semibold">MPSC पूर्व परीक्षा · सराव संच ०१</h2><p className="mt-2 text-sm text-muted-foreground">सामान्य अध्ययन · नमुना प्रश्नसंच</p></div><ApperIcon name="ClipboardList" size={28} className="text-primary" /></div><div className="my-6 grid grid-cols-3 gap-3 border-y border-border py-5"><Info label="प्रश्न" value="५०" /><Info label="वेळ" value="६० मिनिटे" /><Info label="गुण" value="१००" /></div><p className="text-sm leading-6 text-muted-foreground">ही चाचणी डेमो स्वरूपात आहे. वास्तविक परीक्षेचा pattern, negative marking आणि अधिकृत अभ्यासक्रमाशी जुळवणी पडताळल्यानंतरच प्रकाशित केली जाईल.</p><button onClick={() => setStarted((value) => !value)} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground">{started ? 'चाचणी लवकरच उपलब्ध होईल' : 'नमुना चाचणी सुरू करा'} <ApperIcon name="ArrowRight" size={17} /></button></article>
      <Link to="/practice" className="inline-flex items-center gap-2 text-sm font-bold text-primary">आत्ता लहान प्रश्न सराव करा <ApperIcon name="ArrowUpRight" size={16} /></Link>
    </div>
  );
}

function Info({ label, value }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}