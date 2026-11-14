import { useState } from 'react';
import { toast } from 'sonner';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatLocalDate, DATE_FORMATS } from '@/utils/date';

export const route = { path: '/admin-institutions', layout: 'owner', access: "profile === 'Admin_c'" };
export const nav = { label: 'Institutions', icon: 'Building2', order: 92, profiles: ['Admin_c'] };

const INSTITUTION_TYPES = ['Coaching Centre', 'School', 'College', 'Library', 'Other'];
const INSTITUTION_STATUSES = ['Pending', 'Active', 'Suspended'];
const FIELDS = ['Name', 'institution_type_c', 'district_c', 'contact_email_c', 'status_c', 'seat_limit_c', 'license_expires_on_c', 'white_label_name_c', 'CreatedOn'];
const PAGE_SIZE = 50;
const EMPTY_FORM = {
  Name: '',
  institution_type_c: 'Coaching Centre',
  district_c: '',
  contact_email_c: '',
  status_c: 'Pending',
  seat_limit_c: '',
  license_expires_on_c: '',
  white_label_name_c: '',
};

async function fetchInstitutions() {
  const res = await sdk.table('institutions_c').select(['Id', ...FIELDS]).orderByDesc('CreatedOn').page(1, PAGE_SIZE).fetch();
  if (!res.success) throw new Error(res.message || 'संस्था यादी लोड झाली नाही.');
  return res.data;
}

function InstitutionRow({ row, onChanged }) {
  const [saving, setSaving] = useState(false);

  async function changeStatus(value) {
    if (value === row.status_c) return;
    setSaving(true);
    try {
      const res = await sdk.table('institutions_c').update({ Id: row.Id, status_c: value });
      if (!res.data?.length) {
        toast.error(res.messages?.[0] || 'स्थिती बदलता आली नाही.');
        console.error(`institutions_c update failed: ${res.messages?.join('; ') || 'no rows committed'}`);
        return;
      }
      onChanged();
    } catch (err) {
      toast.error('स्थिती बदलता आली नाही.');
      console.error(`institutions_c update threw: ${err.message}`);
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
            {row.institution_type_c && <span>{row.institution_type_c}</span>}
            {row.district_c && <span>· {row.district_c}</span>}
            {row.contact_email_c && <span className="truncate">· {row.contact_email_c}</span>}
          </p>
        </div>
        <div className="w-40 shrink-0">
          <Select value={row.status_c ?? 'Pending'} onValueChange={changeStatus} disabled={saving}>
            <SelectTrigger className="min-h-11 w-full" aria-label="संस्थेची स्थिती">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INSTITUTION_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        {row.seat_limit_c != null && <Badge variant="outline" className="tabular-nums">जागा: {row.seat_limit_c}</Badge>}
        {row.license_expires_on_c && <Badge variant="outline">परवाना संपतो: {formatLocalDate(row.license_expires_on_c, DATE_FORMATS.SHORT)}</Badge>}
        {row.white_label_name_c && <Badge variant="outline">{row.white_label_name_c}</Badge>}
      </div>
    </article>
  );
}

function InstitutionForm({ onSaved, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.Name.trim()) {
      toast.error('संस्थेचे नाव आवश्यक आहे.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        Name: form.Name.trim(),
        institution_type_c: form.institution_type_c,
        status_c: form.status_c,
      };
      if (form.district_c.trim()) payload.district_c = form.district_c.trim();
      if (form.contact_email_c.trim()) payload.contact_email_c = form.contact_email_c.trim();
      if (form.seat_limit_c !== '') payload.seat_limit_c = Number(form.seat_limit_c);
      if (form.license_expires_on_c) payload.license_expires_on_c = form.license_expires_on_c;
      if (form.white_label_name_c.trim()) payload.white_label_name_c = form.white_label_name_c.trim();

      const res = await sdk.table('institutions_c').create(payload);
      if (!res.data?.length) {
        toast.error(res.messages?.[0] || 'संस्था जतन झाली नाही.');
        console.error(`institutions_c create failed: ${res.messages?.join('; ') || 'no rows committed'}`);
        return;
      }
      toast.success('संस्था जोडली.');
      onSaved();
    } catch (err) {
      toast.error('संस्था जतन झाली नाही.');
      console.error(`institutions_c create threw: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">नाव *</span>
          <Input value={form.Name} onChange={(e) => update('Name', e.target.value)} required />
        </label>
        <div className="space-y-1 text-sm">
          <span className="font-medium">प्रकार</span>
          <Select value={form.institution_type_c} onValueChange={(v) => update('institution_type_c', v)}>
            <SelectTrigger className="min-h-11 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {INSTITUTION_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <label className="space-y-1 text-sm">
          <span className="font-medium">जिल्हा</span>
          <Input value={form.district_c} onChange={(e) => update('district_c', e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">संपर्क ईमेल</span>
          <Input type="email" value={form.contact_email_c} onChange={(e) => update('contact_email_c', e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">जागा मर्यादा</span>
          <Input type="number" min="0" value={form.seat_limit_c} onChange={(e) => update('seat_limit_c', e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">परवाना संपण्याची तारीख</span>
          <Input type="date" value={form.license_expires_on_c} onChange={(e) => update('license_expires_on_c', e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">व्हाइट-लेबल नाव</span>
          <Input value={form.white_label_name_c} onChange={(e) => update('white_label_name_c', e.target.value)} />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>रद्द करा</Button>
        <Button type="submit" disabled={submitting}>{submitting ? 'जतन होत आहे...' : 'संस्था जोडा'}</Button>
      </div>
    </form>
  );
}

export default function AdminInstitutions() {
  const [showForm, setShowForm] = useState(false);
  const institutions = useFetch(fetchInstitutions, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight font-heading">संस्था व्यवस्थापन</h1>
          <p className="mt-1 text-sm text-muted-foreground">कोचिंग सेंटर, शाळा आणि महाविद्यालयांचे B2B परवाने.</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="shrink-0">
            <ApperIcon name="Plus" size={16} /> संस्था जोडा
          </Button>
        )}
      </div>

      {showForm && (
        <InstitutionForm
          onSaved={() => { setShowForm(false); institutions.run(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {institutions.loading && !institutions.data && <p className="py-6 text-center text-sm text-muted-foreground">लोड होत आहे...</p>}
      {institutions.error && (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {institutions.error}
          <button type="button" onClick={institutions.run} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button>
        </p>
      )}
      {!institutions.loading && !institutions.error && !institutions.data?.length && (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">अजून संस्था नाहीत.</p>
      )}
      <div className="space-y-3">
        {(institutions.data ?? []).map((row) => (
          <InstitutionRow key={row.Id} row={row} onChanged={institutions.run} />
        ))}
      </div>
    </div>
  );
}