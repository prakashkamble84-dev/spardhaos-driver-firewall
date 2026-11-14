import { useState } from 'react';
import { toast } from 'sonner';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import LookupPicker from '@/components/LookupPicker';
import ApperIcon from '@/components/ApperIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatLocalDate, DATE_FORMATS } from '@/utils/date';

export const route = { path: '/admin-batches', layout: 'owner', access: "profile === 'Admin_c'" };
export const nav = { label: 'Batches', icon: 'Users', order: 93, profiles: ['Admin_c'] };

const BATCH_TYPES = ['Exam Specific', 'Subject Wise', 'Beginner', 'Advanced', 'Morning', 'Evening', 'Custom'];
const BATCH_STATUSES = ['Planned', 'Active', 'Completed', 'Archived'];
const BATCH_FIELDS = ['Name', 'institution_c', 'target_exam_c', 'batch_type_c', 'start_date_c', 'end_date_c', 'status_c', 'description_c'];
const CODE_FIELDS = ['Name', 'institution_c', 'code_c', 'expires_on_c', 'max_uses_c', 'uses_c', 'is_active_c', 'CreatedOn'];
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PAGE_SIZE = 50;
const EMPTY_BATCH = {
  Name: '',
  institution_c: null,
  target_exam_c: '',
  batch_type_c: 'Exam Specific',
  start_date_c: '',
  end_date_c: '',
  status_c: 'Planned',
  description_c: '',
};

function generateCode() {
  const bytes = new Uint32Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => CODE_ALPHABET[n % CODE_ALPHABET.length]).join('');
}

async function fetchBatches() {
  const res = await sdk.table('institution_batches_c').select(['Id', ...BATCH_FIELDS]).orderByDesc('CreatedOn').page(1, PAGE_SIZE).fetch();
  if (!res.success) throw new Error(res.message || 'बॅच यादी लोड झाली नाही.');
  return res.data;
}

async function fetchCodes() {
  const res = await sdk.table('enrollment_codes_c').select(['Id', ...CODE_FIELDS]).orderByDesc('CreatedOn').page(1, PAGE_SIZE).fetch();
  if (!res.success) throw new Error(res.message || 'नोंदणी कोड यादी लोड झाली नाही.');
  return res.data;
}

function BatchRow({ row, onChanged }) {
  const [saving, setSaving] = useState(false);

  async function changeStatus(value) {
    if (value === row.status_c) return;
    setSaving(true);
    try {
      const res = await sdk.table('institution_batches_c').update({ Id: row.Id, status_c: value });
      if (!res.data?.length) {
        toast.error(res.messages?.[0] || 'स्थिती बदलता आली नाही.');
        console.error(`institution_batches_c update failed: ${res.messages?.join('; ') || 'no rows committed'}`);
        return;
      }
      onChanged();
    } catch (err) {
      toast.error('स्थिती बदलता आली नाही.');
      console.error(`institution_batches_c update threw: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="min-w-0 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold" title={row.Name}>{row.Name ?? '—'}</h3>
          <p className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {row.institution_c?.Name && <span className="truncate">{row.institution_c.Name}</span>}
            {row.target_exam_c && <span>· {row.target_exam_c}</span>}
          </p>
        </div>
        <div className="w-40 shrink-0">
          <Select value={row.status_c ?? 'Planned'} onValueChange={changeStatus} disabled={saving}>
            <SelectTrigger className="min-h-11 w-full" aria-label="बॅचची स्थिती">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BATCH_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        {row.batch_type_c && <Badge variant="outline">{row.batch_type_c}</Badge>}
        {row.start_date_c && <Badge variant="outline">सुरू: {formatLocalDate(row.start_date_c, DATE_FORMATS.SHORT)}</Badge>}
        {row.end_date_c && <Badge variant="outline">समाप्ती: {formatLocalDate(row.end_date_c, DATE_FORMATS.SHORT)}</Badge>}
      </div>
    </article>
  );
}

function BatchForm({ onSaved, onCancel }) {
  const [form, setForm] = useState(EMPTY_BATCH);
  const [submitting, setSubmitting] = useState(false);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.Name.trim() || !form.institution_c) {
      toast.error('बॅचचे नाव आणि संस्था आवश्यक आहेत.');
      return;
    }
    if (form.start_date_c && form.end_date_c && form.end_date_c < form.start_date_c) {
      toast.error('समाप्तीची तारीख सुरुवातीनंतर असावी.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        Name: form.Name.trim(),
        institution_c: form.institution_c,
        batch_type_c: form.batch_type_c,
        status_c: form.status_c,
      };
      if (form.target_exam_c.trim()) payload.target_exam_c = form.target_exam_c.trim();
      if (form.description_c.trim()) payload.description_c = form.description_c.trim();
      if (form.start_date_c) payload.start_date_c = form.start_date_c;
      if (form.end_date_c) payload.end_date_c = form.end_date_c;

      const res = await sdk.table('institution_batches_c').create(payload);
      if (!res.data?.length) {
        toast.error(res.messages?.[0] || 'बॅच जतन झाली नाही.');
        console.error(`institution_batches_c create failed: ${res.messages?.join('; ') || 'no rows committed'}`);
        return;
      }
      toast.success('बॅच जोडली.');
      onSaved();
    } catch (err) {
      toast.error('बॅच जतन झाली नाही.');
      console.error(`institution_batches_c create threw: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">बॅचचे नाव *</span>
          <Input value={form.Name} onChange={(e) => update('Name', e.target.value)} required />
        </label>
        <div className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">संस्था *</span>
          <LookupPicker table="institutions_c" searchField="Name" value={form.institution_c} onChange={(id) => update('institution_c', id)} clearable />
        </div>
        <label className="space-y-1 text-sm">
          <span className="font-medium">लक्ष्य परीक्षा</span>
          <Input value={form.target_exam_c} onChange={(e) => update('target_exam_c', e.target.value)} />
        </label>
        <div className="space-y-1 text-sm">
          <span className="font-medium">बॅच प्रकार</span>
          <Select value={form.batch_type_c} onValueChange={(v) => update('batch_type_c', v)}>
            <SelectTrigger className="min-h-11 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BATCH_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <label className="space-y-1 text-sm">
          <span className="font-medium">सुरुवातीची तारीख</span>
          <Input type="date" value={form.start_date_c} onChange={(e) => update('start_date_c', e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">समाप्तीची तारीख</span>
          <Input type="date" value={form.end_date_c} onChange={(e) => update('end_date_c', e.target.value)} />
        </label>
        <div className="space-y-1 text-sm">
          <span className="font-medium">स्थिती</span>
          <Select value={form.status_c} onValueChange={(v) => update('status_c', v)}>
            <SelectTrigger className="min-h-11 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BATCH_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">वर्णन</span>
          <Input value={form.description_c} onChange={(e) => update('description_c', e.target.value)} />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>रद्द करा</Button>
        <Button type="submit" disabled={submitting}>{submitting ? 'जतन होत आहे...' : 'बॅच जोडा'}</Button>
      </div>
    </form>
  );
}

function CodeRow({ row, onChanged }) {
  const [saving, setSaving] = useState(false);

  async function toggleActive() {
    setSaving(true);
    try {
      const res = await sdk.table('enrollment_codes_c').update({ Id: row.Id, is_active_c: !row.is_active_c });
      if (!res.data?.length) {
        toast.error(res.messages?.[0] || 'कोड बदलता आला नाही.');
        console.error(`enrollment_codes_c update failed: ${res.messages?.join('; ') || 'no rows committed'}`);
        return;
      }
      onChanged();
    } catch (err) {
      toast.error('कोड बदलता आला नाही.');
      console.error(`enrollment_codes_c update threw: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="min-w-0 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-mono text-sm font-semibold tracking-wider" title={row.code_c}>{row.code_c ?? '—'}</h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">{row.institution_c?.Name ?? '—'}</p>
        </div>
        <Button variant="outline" size="sm" onClick={toggleActive} disabled={saving} className="shrink-0">
          {row.is_active_c ? 'निष्क्रिय करा' : 'सक्रिय करा'}
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant={row.is_active_c ? 'default' : 'outline'}>{row.is_active_c ? 'सक्रिय' : 'निष्क्रिय'}</Badge>
        <Badge variant="outline" className="tabular-nums">वापर: {row.uses_c ?? 0}{row.max_uses_c != null ? ` / ${row.max_uses_c}` : ''}</Badge>
        {row.expires_on_c && <Badge variant="outline">मुदत: {formatLocalDate(row.expires_on_c, DATE_FORMATS.SHORT)}</Badge>}
      </div>
    </article>
  );
}

function CodeForm({ onSaved, onCancel }) {
  const [form, setForm] = useState({ code: generateCode(), institution_c: null, expires_on_c: '', max_uses_c: '' });
  const [submitting, setSubmitting] = useState(false);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.code.trim() || !form.institution_c) {
      toast.error('कोड आणि संस्था आवश्यक आहेत.');
      return;
    }
    setSubmitting(true);
    try {
      const code = form.code.trim().toUpperCase();
      const payload = {
        Name: code,
        code_c: code,
        institution_c: form.institution_c,
        uses_c: 0,
        is_active_c: true,
      };
      if (form.expires_on_c) payload.expires_on_c = form.expires_on_c;
      if (form.max_uses_c !== '') payload.max_uses_c = Number(form.max_uses_c);

      const res = await sdk.table('enrollment_codes_c').create(payload);
      if (!res.data?.length) {
        toast.error(res.messages?.[0] || 'कोड जतन झाला नाही.');
        console.error(`enrollment_codes_c create failed: ${res.messages?.join('; ') || 'no rows committed'}`);
        return;
      }
      toast.success('नोंदणी कोड तयार झाला.');
      onSaved();
    } catch (err) {
      toast.error('कोड जतन झाला नाही.');
      console.error(`enrollment_codes_c create threw: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">संस्था *</span>
          <LookupPicker table="institutions_c" searchField="Name" value={form.institution_c} onChange={(id) => update('institution_c', id)} clearable />
        </div>
        <div className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">नोंदणी कोड *</span>
          <div className="flex min-w-0 gap-2">
            <Input className="min-w-0 flex-1 font-mono tracking-wider" value={form.code} onChange={(e) => update('code', e.target.value)} required />
            <Button type="button" variant="outline" onClick={() => update('code', generateCode())} className="shrink-0">
              <ApperIcon name="RefreshCw" size={16} /> नवीन
            </Button>
          </div>
        </div>
        <label className="space-y-1 text-sm">
          <span className="font-medium">कमाल वापर (रिकामे = मर्यादा नाही)</span>
          <Input type="number" min="1" value={form.max_uses_c} onChange={(e) => update('max_uses_c', e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">मुदत संपण्याची तारीख</span>
          <Input type="date" value={form.expires_on_c} onChange={(e) => update('expires_on_c', e.target.value)} />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>रद्द करा</Button>
        <Button type="submit" disabled={submitting}>{submitting ? 'जतन होत आहे...' : 'कोड तयार करा'}</Button>
      </div>
    </form>
  );
}

export default function AdminBatches() {
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [showCodeForm, setShowCodeForm] = useState(false);
  const batches = useFetch(fetchBatches, []);
  const codes = useFetch(fetchCodes, []);

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight font-heading">बॅच व नोंदणी कोड</h1>
        <p className="mt-1 text-sm text-muted-foreground">संस्थेच्या बॅच आणि विद्यार्थी नोंदणीसाठीचे कोड व्यवस्थापित करा.</p>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-base font-semibold font-heading">बॅच</h2>
          {!showBatchForm && (
            <Button onClick={() => setShowBatchForm(true)} className="shrink-0">
              <ApperIcon name="Plus" size={16} /> बॅच जोडा
            </Button>
          )}
        </div>
        {showBatchForm && (
          <BatchForm
            onSaved={() => { setShowBatchForm(false); batches.run(); }}
            onCancel={() => setShowBatchForm(false)}
          />
        )}
        {batches.loading && !batches.data && <p className="py-6 text-center text-sm text-muted-foreground">लोड होत आहे...</p>}
        {batches.error && (
          <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {batches.error}
            <button type="button" onClick={batches.run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button>
          </p>
        )}
        {!batches.loading && !batches.error && !batches.data?.length && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">अजून बॅच नाहीत.</p>
        )}
        <div className="space-y-3">
          {(batches.data ?? []).map((row) => (
            <BatchRow key={row.Id} row={row} onChanged={batches.run} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-base font-semibold font-heading">नोंदणी कोड</h2>
          {!showCodeForm && (
            <Button onClick={() => setShowCodeForm(true)} className="shrink-0">
              <ApperIcon name="Plus" size={16} /> कोड तयार करा
            </Button>
          )}
        </div>
        {showCodeForm && (
          <CodeForm
            onSaved={() => { setShowCodeForm(false); codes.run(); }}
            onCancel={() => setShowCodeForm(false)}
          />
        )}
        {codes.loading && !codes.data && <p className="py-6 text-center text-sm text-muted-foreground">लोड होत आहे...</p>}
        {codes.error && (
          <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {codes.error}
            <button type="button" onClick={codes.run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button>
          </p>
        )}
        {!codes.loading && !codes.error && !codes.data?.length && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">अजून नोंदणी कोड नाहीत.</p>
        )}
        <div className="space-y-3">
          {(codes.data ?? []).map((row) => (
            <CodeRow key={row.Id} row={row} onChanged={codes.run} />
          ))}
        </div>
      </section>
    </div>
  );
}