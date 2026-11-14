import { useState } from 'react';
import { toast } from 'sonner';
import { useFetch } from '@/hooks/useFetch';
import { useProfile } from '@/hooks/useProfile';
import { sdk } from '@/services/sdk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import LookupPicker from '@/components/LookupPicker';
import ApperIcon from '@/components/ApperIcon';
import { formatLocalDate, DATE_FORMATS } from '@/utils/date';

export const route = { path: '/billing', layout: 'owner', access: 'authenticated' };
export const nav = { label: 'सदस्यता', icon: 'CreditCard', order: 12 };

const PLAN_FIELDS = ['Id', 'Name', 'price_c', 'duration_days_c', 'description_c', 'is_active_c'];
const SUBSCRIPTION_FIELDS = ['Id', 'Name', 'plan_c', 'student_profile_c', 'status_c', 'start_date_c', 'end_date_c'];
const PAYMENT_FIELDS = ['Id', 'Name', 'subscription_c', 'student_profile_c', 'amount_c', 'method_c', 'reference_c', 'paid_on_c', 'status_c'];

const SUBSCRIPTION_STATUSES = ['Pending', 'Active', 'Expired', 'Cancelled'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Other'];
const PAYMENT_STATUSES = ['Recorded', 'Refunded'];
const ADMIN_PROFILE = 'Admin_c';
const SELECT_CLASS = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';

const todayIso = () => new Date().toISOString().slice(0, 10);
const formatAmount = (value) => (value == null ? '—' : `₹${Number(value).toFixed(2)}`);
const formatDate = (value) => (value ? formatLocalDate(value, DATE_FORMATS.SHORT) : '—');

function writeSucceeded(res, label) {
  if (res.messages.length) {
    toast.error(res.messages[0], { description: res.messages.slice(1).join('\n') || undefined, duration: 8000 });
    console.error(`${label} failed: ${res.messages.join('; ')}`);
  }
  return res.data.length > 0 && !res.partial;
}

async function fetchPlans(isAdmin) {
  const { eq } = window.ApperSDK.CoreSDK;
  let query = sdk.table('subscription_plans_c').select(PLAN_FIELDS);
  if (!isAdmin) query = query.where(eq('is_active_c', true));
  const result = await query.orderBy('price_c').fetch();
  if (!result.success) throw new Error(result.message || 'योजना लोड झाल्या नाहीत.');
  return result.data ?? [];
}

async function fetchSubscriptions() {
  const result = await sdk.table('subscriptions_c').select(SUBSCRIPTION_FIELDS).orderByDesc('CreatedOn').fetch();
  if (!result.success) throw new Error(result.message || 'सदस्यता लोड झाली नाही.');
  return result.data ?? [];
}

async function fetchPayments() {
  const result = await sdk.table('payments_c').select(PAYMENT_FIELDS).orderByDesc('paid_on_c').fetch();
  if (!result.success) throw new Error(result.message || 'पेमेंट लोड झाले नाहीत.');
  return result.data ?? [];
}

function ListStatus({ loading, error, onRetry, isEmpty, emptyTitle, emptyText }) {
  if (loading) return <p className="py-6 text-center text-sm text-muted-foreground">लोड होत आहे...</p>;
  if (error) {
    return (
      <div className="rounded-lg bg-warning-muted p-3 text-sm text-warning-foreground">
        {error.message ?? error}
        <button type="button" onClick={onRetry} className="ml-2 font-bold underline">पुन्हा प्रयत्न करा</button>
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center">
        <h3 className="font-semibold">{emptyTitle}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{emptyText}</p>
      </div>
    );
  }
  return null;
}

function PlanForm({ onSaved }) {
  const [form, setForm] = useState({ name: '', price: '', days: '', description: '' });
  const [saving, setSaving] = useState(false);
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || form.price === '' || form.days === '') return;
    setSaving(true);
    try {
      const res = await sdk.table('subscription_plans_c').create({
        Name: form.name.trim(),
        price_c: Number(form.price),
        duration_days_c: Number(form.days),
        description_c: form.description.trim(),
        is_active_c: true,
      });
      if (writeSucceeded(res, 'subscription_plans_c create')) {
        setForm({ name: '', price: '', days: '', description: '' });
        onSaved();
      }
    } catch (error) {
      toast.error('योजना जतन झाली नाही.');
      console.error(`subscription_plans_c create failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h3 className="font-semibold">नवीन योजना</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input placeholder="योजनेचे नाव" value={form.name} onChange={setField('name')} required />
        <Input type="number" min="0" step="0.01" placeholder="किंमत (₹)" value={form.price} onChange={setField('price')} required />
        <Input type="number" min="1" placeholder="कालावधी (दिवस)" value={form.days} onChange={setField('days')} required />
      </div>
      <Textarea placeholder="वर्णन" value={form.description} onChange={setField('description')} />
      <Button type="submit" disabled={saving}>योजना जतन करा</Button>
    </form>
  );
}

function SubscriptionForm({ onSaved }) {
  const [form, setForm] = useState({ name: '', student: null, plan: null, status: 'Pending', start: '', end: '' });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.student || !form.plan) return;
    setSaving(true);
    try {
      const payload = {
        Name: form.name.trim(),
        student_profile_c: form.student,
        plan_c: form.plan,
        status_c: form.status,
      };
      if (form.start) payload.start_date_c = form.start;
      if (form.end) payload.end_date_c = form.end;
      const res = await sdk.table('subscriptions_c').create(payload);
      if (writeSucceeded(res, 'subscriptions_c create')) {
        setForm({ name: '', student: null, plan: null, status: 'Pending', start: '', end: '' });
        onSaved();
      }
    } catch (error) {
      toast.error('सदस्यता जतन झाली नाही.');
      console.error(`subscriptions_c create failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h3 className="font-semibold">नवीन सदस्यता</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="सदस्यतेचे नाव" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        <select className={SELECT_CLASS} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
          {SUBSCRIPTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <LookupPicker table="student_profiles_c" searchField="Name" value={form.student} onChange={(id) => setForm((f) => ({ ...f, student: id }))} clearable />
        <LookupPicker table="subscription_plans_c" searchField="Name" value={form.plan} onChange={(id) => setForm((f) => ({ ...f, plan: id }))} clearable />
        <Input type="date" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} />
        <Input type="date" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} />
      </div>
      <Button type="submit" disabled={saving}>सदस्यता जतन करा</Button>
    </form>
  );
}

function PaymentForm({ onSaved }) {
  const initial = { subscription: null, student: null, amount: '', method: 'UPI', reference: '', paidOn: todayIso(), status: 'Recorded', notes: '' };
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.student || form.amount === '') return;
    setSaving(true);
    try {
      const reference = form.reference.trim();
      const payload = {
        Name: reference || `Payment ${form.paidOn}`,
        student_profile_c: form.student,
        amount_c: Number(form.amount),
        method_c: form.method,
        status_c: form.status,
        paid_on_c: form.paidOn,
        reference_c: reference,
        notes_c: form.notes.trim(),
      };
      if (form.subscription) payload.subscription_c = form.subscription;
      const res = await sdk.table('payments_c').create(payload);
      if (writeSucceeded(res, 'payments_c create')) {
        setForm(initial);
        onSaved();
      }
    } catch (error) {
      toast.error('पेमेंट नोंद झाली नाही.');
      console.error(`payments_c create failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h3 className="font-semibold">पेमेंट नोंदवा</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <LookupPicker table="student_profiles_c" searchField="Name" value={form.student} onChange={(id) => setForm((f) => ({ ...f, student: id }))} clearable />
        <LookupPicker table="subscriptions_c" searchField="Name" value={form.subscription} onChange={(id) => setForm((f) => ({ ...f, subscription: id }))} clearable />
        <Input type="number" min="0" step="0.01" placeholder="रक्कम (₹)" value={form.amount} onChange={setField('amount')} required />
        <select className={SELECT_CLASS} value={form.method} onChange={setField('method')}>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <Input placeholder="संदर्भ क्रमांक" value={form.reference} onChange={setField('reference')} />
        <Input type="date" value={form.paidOn} onChange={setField('paidOn')} required />
        <select className={SELECT_CLASS} value={form.status} onChange={setField('status')}>
          {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <Textarea placeholder="टिप्पणी" value={form.notes} onChange={setField('notes')} />
      <Button type="submit" disabled={saving}>पेमेंट जतन करा</Button>
    </form>
  );
}

export default function Billing() {
  const { profile } = useProfile();
  const isAdmin = profile === ADMIN_PROFILE;

  const { data: plans, loading: plansLoading, error: plansError, run: refetchPlans } = useFetch(() => fetchPlans(isAdmin), [isAdmin]);
  const { data: subscriptions, loading: subsLoading, error: subsError, run: refetchSubscriptions } = useFetch(fetchSubscriptions, []);
  const { data: payments, loading: paymentsLoading, error: paymentsError, run: refetchPayments } = useFetch(fetchPayments, []);

  async function changeSubscriptionStatus(id, status) {
    try {
      const res = await sdk.table('subscriptions_c').update({ Id: id, status_c: status });
      if (writeSucceeded(res, 'subscriptions_c update')) refetchSubscriptions();
    } catch (error) {
      toast.error('सदस्यता बदलता आली नाही.');
      console.error(`subscriptions_c update failed: ${error.message}`);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-primary">योजना, पेमेंट आणि सदस्यता</p>
        <h1 className="mt-1 text-3xl font-semibold">सदस्यता</h1>
        <p className="mt-2 text-muted-foreground">उपलब्ध योजना, सदस्यता आणि नोंदवलेले पेमेंट.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">योजना</h2>
        {isAdmin && <PlanForm onSaved={refetchPlans} />}
        <ListStatus
          loading={plansLoading}
          error={plansError}
          onRetry={refetchPlans}
          isEmpty={!plansLoading && !plansError && !plans?.length}
          emptyTitle="अजून योजना उपलब्ध नाहीत"
          emptyText="योजना प्रकाशित झाल्यावर त्या येथे दिसतील."
        />
        {(plans ?? []).length > 0 && (
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {plans.map((plan) => (
              <div key={plan.Id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{plan.Name}</p>
                  {plan.description_c && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{plan.description_c}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums">{formatAmount(plan.price_c)}</p>
                  <p className="text-xs text-muted-foreground">{plan.duration_days_c ?? '—'} दिवस</p>
                </div>
                {!plan.is_active_c && <span className="shrink-0 text-xs font-medium text-muted-foreground">निष्क्रिय</span>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">सदस्यता</h2>
        {isAdmin && <SubscriptionForm onSaved={refetchSubscriptions} />}
        <ListStatus
          loading={subsLoading}
          error={subsError}
          onRetry={refetchSubscriptions}
          isEmpty={!subsLoading && !subsError && !subscriptions?.length}
          emptyTitle="अजून सदस्यता नाही"
          emptyText="सक्रिय सदस्यता येथे दिसेल."
        />
        {(subscriptions ?? []).length > 0 && (
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {subscriptions.map((sub) => (
              <div key={sub.Id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{sub.Name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {sub.plan_c?.Name ?? '—'} · {sub.student_profile_c?.Name ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(sub.start_date_c)} → {formatDate(sub.end_date_c)}</p>
                </div>
                {isAdmin ? (
                  <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={sub.status_c ?? 'Pending'} onChange={(e) => changeSubscriptionStatus(sub.Id, e.target.value)}>
                    {SUBSCRIPTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <span className="shrink-0 text-sm font-medium">{sub.status_c ?? '—'}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">पेमेंट</h2>
        {isAdmin && <PaymentForm onSaved={refetchPayments} />}
        <ListStatus
          loading={paymentsLoading}
          error={paymentsError}
          onRetry={refetchPayments}
          isEmpty={!paymentsLoading && !paymentsError && !payments?.length}
          emptyTitle="अजून पेमेंट नोंदवलेले नाही"
          emptyText="नोंदवलेले पेमेंट येथे दिसेल."
        />
        {(payments ?? []).length > 0 && (
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {payments.map((payment) => (
              <div key={payment.Id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{payment.Name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {payment.student_profile_c?.Name ?? '—'} · {payment.method_c ?? '—'} · {formatDate(payment.paid_on_c)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums">{formatAmount(payment.amount_c)}</p>
                  <p className="text-xs text-muted-foreground">{payment.status_c ?? '—'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}