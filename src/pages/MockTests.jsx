import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';
import { Link } from 'react-router-dom';

export const route = { path: '/mock-tests', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'मॉक टेस्ट', icon: 'FileText', order: 8 };

const FIELDS = ['Id', 'Name', 'exam_track_c', 'duration_minutes_c', 'total_questions_c', 'instructions_c', 'status_c'];

async function fetchTests() {
  const result = await sdk.table('mock_tests_c').select(FIELDS).where(window.ApperSDK.CoreSDK.eq('status_c', 'Published')).fetch();
  if (!result.success) throw new Error(result.message || 'मॉक टेस्ट लोड झाले नाहीत.');
  return result.data;
}

export default function MockTests() {
  const { data, loading, error, run } = useFetch(fetchTests, []);
  const [startingId, setStartingId] = useState('');
  const [notice, setNotice] = useState('');

  async function start(test) {
    setStartingId(test.Id);
    setNotice('');
    try {
      const result = await sdk.table('mock_test_attempts_c').create({
        Name: test.Name + ' · Attempt',
        mock_test_id_c: test.Id,
        score_c: 0,
        correct_count_c: 0,
        incorrect_count_c: 0,
        started_at_c: new Date().toISOString(),
        status_c: 'In Progress',
      });
      if (!result.data?.length) throw new Error(result.messages?.[0] || 'चाचणी सत्र सुरू झाले नाही.');
      setNotice('चाचणी सत्र तयार झाले. प्रश्नसंच उपलब्ध असल्यास प्रश्न सराव विभागातून सोडवा.');
      await run();
    } catch (err) {
      setNotice(err.message || 'चाचणी सुरू करताना त्रुटी आली.');
    } finally {
      setStartingId('');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><p className="text-sm font-semibold text-primary">परीक्षेचा अनुभव</p><h1 className="mt-1 text-3xl font-semibold">मॉक टेस्ट</h1><p className="mt-2 text-muted-foreground">वेळेचे नियोजन आणि विषयवार तयारी तपासा.</p></div>
      {notice && <p role="status" className="rounded-lg bg-secondary p-3 text-sm">{notice}</p>}
      {loading && <p className="py-8 text-center text-sm text-muted-foreground">प्रकाशित चाचण्या लोड होत आहेत...</p>}
      {error && <div className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">{error}<button onClick={run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button></div>}
      {!loading && !error && !data?.length && <div className="rounded-2xl border border-dashed border-border p-8 text-center"><ApperIcon name="ClipboardList" size={30} className="mx-auto text-muted-foreground" /><h2 className="mt-3 font-semibold">अजून प्रकाशित मॉक टेस्ट नाहीत</h2><p className="mt-2 text-sm text-muted-foreground">Admin ने चाचणी Published केल्यावर ती येथे दिसेल.</p><Link to="/practice" className="mt-4 inline-flex text-sm font-bold text-primary">प्रश्न सराव सुरू करा</Link></div>}
      <div className="space-y-4">{(data ?? []).map((test) => <article key={test.Id} className="rounded-2xl border border-border bg-card p-6"><div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">प्रकाशित चाचणी</span><h2 className="mt-4 font-serif text-2xl font-semibold">{test.Name}</h2><p className="mt-2 text-sm text-muted-foreground">{test.exam_track_c || 'सामान्य अध्ययन'}</p></div><ApperIcon name="ClipboardList" size={28} className="text-primary" /></div><div className="my-6 grid grid-cols-2 gap-3 border-y border-border py-5 sm:grid-cols-3"><Info label="प्रश्न" value={test.total_questions_c ?? '—'} /><Info label="वेळ" value={test.duration_minutes_c ? test.duration_minutes_c + ' मिनिटे' : '—'} /><Info label="स्थिती" value={test.status_c} /></div>{test.instructions_c && <p className="text-sm leading-6 text-muted-foreground">{test.instructions_c}</p>}<button disabled={startingId === test.Id} onClick={() => start(test)} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50">{startingId === test.Id ? 'सत्र तयार होत आहे...' : 'चाचणी सत्र सुरू करा'} <ApperIcon name="ArrowRight" size={17} /></button></article>)}</div>
    </div>
  );
}

function Info({ label, value }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}
