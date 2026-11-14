import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import { toast } from 'sonner';
import ApperIcon from '@/components/ApperIcon';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';

export const route = { path: '/study-items/:id', layout: 'owner', access: 'authenticated' };

const FIELDS = ['Id', 'Name', 'subject_c', 'topic_c', 'due_date_c', 'duration_minutes_c', 'status_c', 'priority_c', 'notes_c'];

async function fetchItem(id) {
  const result = await sdk.table('study_tasks_c').select(FIELDS).get(id);
  return result.data;
}

export default function StudyItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const { data: item, loading, error, run } = useFetch(() => fetchItem(id), [id]);

  async function removeItem() {
    if (!item) return;
    setDeleting(true);
    try {
      const result = await sdk.table('study_tasks_c').remove({ Id: item.Id });
      if (!result.data?.length) throw new Error(result.messages?.[0] || 'नोंद हटवता आली नाही.');
      toast.success('नोंद हटवली.');
      navigate('/study-plan');
    } catch (err) {
      toast.error(err.message || 'नोंद हटवताना त्रुटी आली.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <p className="py-12 text-center text-muted-foreground">नोंद लोड होत आहे...</p>;
  if (error) return <div className="space-y-3"><Link to="/study-plan" className="text-sm font-bold text-primary">← अभ्यास प्लॅनकडे परत</Link><p role="alert" className="rounded-lg bg-warning-muted p-4 text-warning-foreground">{error}</p><button onClick={run} className="font-bold text-primary underline">पुन्हा प्रयत्न करा</button></div>;
  if (!item) return <div className="space-y-3"><Link to="/study-plan" className="text-sm font-bold text-primary">← अभ्यास प्लॅनकडे परत</Link><h1 className="text-2xl font-semibold">नोंद सापडली नाही</h1></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/study-plan" className="inline-flex items-center gap-2 text-sm font-bold text-primary"><ApperIcon name="ArrowLeft" size={16} /> अभ्यास प्लॅनकडे परत</Link>
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-sm font-semibold text-primary">{item.subject_c}</p><h1 className="mt-2 text-3xl font-semibold">{item.Name}</h1><p className="mt-2 text-sm text-muted-foreground">{item.topic_c}</p></div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">{item.status_c}</span>
        </div>
        <dl className="mt-7 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
          <Detail label="विषय" value={item.subject_c} />
          <Detail label="घटक" value={item.topic_c} />
          <Detail label="कालावधी" value={item.duration_minutes_c ? `${item.duration_minutes_c} मिनिटे` : 'लागू नाही'} />
          <Detail label="प्राधान्य" value={item.priority_c} />
          <Detail label="देय तारीख" value={item.due_date_c} />
          <Detail label="नोंद" value={item.notes_c} />
        </dl>
        <div className="mt-7 flex flex-wrap gap-3 border-t border-border pt-5">
          <Link to={`/study-items/${item.Id}/edit`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"><ApperIcon name="Pencil" size={16} /> संपादित करा</Link>
          <AlertDialog>
            <AlertDialogTrigger asChild><button disabled={deleting} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-destructive/40 px-4 text-sm font-bold text-destructive"><ApperIcon name="Trash2" size={16} /> हटवा</button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>ही नोंद हटवायची आहे?</AlertDialogTitle><AlertDialogDescription>“{item.Name}” ही नोंद कायमची हटवली जाईल. ही कृती पूर्ववत करता येणार नाही.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>रद्द करा</AlertDialogCancel><AlertDialogAction onClick={removeItem} disabled={deleting}>होय, हटवा</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return <div><dt className="text-xs font-semibold text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-semibold">{value || '—'}</dd></div>;
}
