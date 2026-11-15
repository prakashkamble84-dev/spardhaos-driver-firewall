import { useState } from 'react';
import { toast } from 'sonner';
import { useFetch } from '@/hooks/useFetch';
import { sdk } from '@/services/sdk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ApperIcon from '@/components/ApperIcon';
import { formatLocalDate, DATE_FORMATS } from '@/utils/date';

export const route = { path: '/admin-partners', layout: 'owner', access: "profile === 'Admin_c'" };
export const nav = { label: 'Partners', icon: 'Handshake', order: 94, profiles: ['Admin_c'] };

const PARTNER_FIELDS = ['Id', 'Name', 'revenue_share_percent_c', 'contact_email_c', 'is_active_c'];
const PAYOUT_FIELDS = ['Id', 'partner_c', 'period_start_c', 'period_end_c', 'gross_c', 'partner_share_c', 'status_c', 'paid_on_c', 'reference_c'];
const SUBSCRIPTION_FIELDS = ['Id', 'Name', 'status_c', 'partner_c'];
const PAYOUT_STATUSES = ['Pending', 'Paid'];
const SELECT_CLASS = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';
const EMPTY_PARTNER = { Name: '', revenue_share_percent_c: '', contact_email_c: '' };

const todayIso = () => new Date().toISOString().slice(0, 10);
const formatAmount = (value) => (value == null ? '—' : `₹${Number(value).toFixed(2)}`);
const formatDate = (value) => (value ? formatLocalDate(value, DATE_FORMATS.SHORT) : '—');
const roundMoney = (value) => Math.round(value * 100) / 100;

function writeSucceeded(res, label) {
  if (res.messages.length) {
    toast.error(res.messages[0], { description: res.messages.slice(1).join('\n') || undefined, duration: 8000 });
    console.error(`${label} failed: ${res.messages.join('; ')}`);
    return false;
  }
  if (!res.data.length) {
    toast.error(`${label} could not be saved.`);
    console.error(`${label} failed: no rows were committed`);
    return false;
  }
  if (res.partial) {
    toast.warning('Only part of the change was saved. Refresh and check the list.');
    console.error(`${label} partial: ${res.data.length} of ${res.results.length} rows committed`);
    return false;
  }
  return true;
}

async function fetchPartners() {
  const result = await sdk.table('partners_c').select(PARTNER_FIELDS).orderBy('Name').fetch();
  if (!result.success) throw new Error(result.message || 'Partners could not be loaded.');
  return result.data ?? [];
}

async function fetchPayouts() {
  const result = await sdk.table('payouts_c').select(PAYOUT_FIELDS).orderByDesc('period_end_c').fetch();
  if (!result.success) throw new Error(result.message || 'Payouts could not be loaded.');
  return result.data ?? [];
}

async function fetchSubscriptions() {
  const result = await sdk.table('subscriptions_c').select(SUBSCRIPTION_FIELDS).orderByDesc('CreatedOn').page(1, 100).fetch();
  if (!result.success) throw new Error(result.message || 'Subscriptions could not be loaded.');
  return result.data ?? [];
}

async function calculateShare(partner, start, end) {
  const { eq, and, between, isIn } = window.ApperSDK.CoreSDK;
  const subs = await sdk.table('subscriptions_c').select(['Id', 'partner_c']).where(eq('partner_c', partner.Id)).fetch();
  if (!subs.success) throw new Error(subs.message || 'Subscriptions could not be loaded.');
  const subIds = [...new Set((subs.data ?? []).map((s) => String(s.Id)))];
  if (!subIds.length) return { gross: 0, share: 0, subscriptionCount: 0 };

  const payments = await sdk.table('payments_c')
    .select(['Id', 'subscription_c', 'amount_c', 'status_c', 'paid_on_c'])
    .where(and(eq('status_c', 'Recorded'), between('paid_on_c', start, end), isIn('subscription_c', subIds)))
    .fetch();
  if (!payments.success) throw new Error(payments.message || 'Payments could not be loaded.');

  const gross = roundMoney(
    (payments.data ?? [])
      .filter((p) => subIds.includes(String(p.subscription_c?.Id ?? p.subscription_c)))
      .reduce((sum, p) => sum + Number(p.amount_c ?? 0), 0),
  );
  const share = roundMoney((gross * Number(partner.revenue_share_percent_c ?? 0)) / 100);
  return { gross, share, subscriptionCount: subIds.length };
}

export default function AdminPartners() {
  const { data: partners, loading: partnersLoading, error: partnersError, run: refetchPartners } = useFetch(fetchPartners, []);
  const { data: payouts, loading: payoutsLoading, error: payoutsError, run: refetchPayouts } = useFetch(fetchPayouts, []);
  const { data: subscriptions, loading: subsLoading, error: subsError, run: refetchSubscriptions } = useFetch(fetchSubscriptions, []);

  const [partnerForm, setPartnerForm] = useState(EMPTY_PARTNER);
  const [savingPartner, setSavingPartner] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ partnerId: '', start: '', end: '' });
  const [preview, setPreview] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [savingPayout, setSavingPayout] = useState(false);

  const partnerList = partners ?? [];
  const payoutList = payouts ?? [];
  const subscriptionList = subscriptions ?? [];

  async function addPartner(event) {
    event.preventDefault();
    const pct = Number(partnerForm.revenue_share_percent_c);
    if (!(pct > 0 && pct <= 100)) {
      toast.error('Revenue share must be greater than 0 and at most 100.');
      return;
    }
    setSavingPartner(true);
    try {
      const payload = {
        Name: partnerForm.Name.trim(),
        revenue_share_percent_c: pct,
        is_active_c: true,
      };
      const email = partnerForm.contact_email_c.trim();
      if (email) payload.contact_email_c = email;
      const res = await sdk.table('partners_c').create(payload);
      if (writeSucceeded(res, 'partners_c create')) {
        setPartnerForm(EMPTY_PARTNER);
        refetchPartners();
      }
    } catch (err) {
      toast.error('Partner could not be saved.');
      console.error(`partners_c create failed: ${err.message}`);
    } finally {
      setSavingPartner(false);
    }
  }

  async function togglePartner(partner) {
    try {
      const res = await sdk.table('partners_c').update({ Id: partner.Id, is_active_c: !partner.is_active_c });
      if (writeSucceeded(res, 'partners_c update')) refetchPartners();
    } catch (err) {
      toast.error('Partner could not be updated.');
      console.error(`partners_c update failed: ${err.message}`);
    }
  }

  async function assignPartner(subscription, partnerId) {
    try {
      const res = await sdk.table('subscriptions_c').update({ Id: subscription.Id, partner_c: partnerId || null });
      if (writeSucceeded(res, 'subscriptions_c update')) refetchSubscriptions();
    } catch (err) {
      toast.error('Subscription could not be linked.');
      console.error(`subscriptions_c update failed: ${err.message}`);
    }
  }

  async function runPreview(event) {
    event.preventDefault();
    const partner = partnerList.find((p) => String(p.Id) === payoutForm.partnerId);
    if (!partner || !payoutForm.start || !payoutForm.end) {
      toast.error('Choose a partner and a period.');
      return;
    }
    if (payoutForm.end < payoutForm.start) {
      toast.error('Period end must be on or after the start.');
      return;
    }
    setCalculating(true);
    try {
      const result = await calculateShare(partner, payoutForm.start, payoutForm.end);
      setPreview({ ...result, partner, start: payoutForm.start, end: payoutForm.end });
    } catch (err) {
      toast.error('Revenue could not be calculated.');
      console.error(`payments_c preview failed: ${err.message}`);
    } finally {
      setCalculating(false);
    }
  }

  async function savePayout() {
    if (!preview) return;
    setSavingPayout(true);
    try {
      const res = await sdk.table('payouts_c').create({
        partner_c: preview.partner.Id,
        period_start_c: preview.start,
        period_end_c: preview.end,
        gross_c: preview.gross,
        partner_share_c: preview.share,
        status_c: 'Pending',
      });
      if (writeSucceeded(res, 'payouts_c create')) {
        setPreview(null);
        setPayoutForm({ partnerId: '', start: '', end: '' });
        refetchPayouts();
      }
    } catch (err) {
      toast.error('Payout could not be saved.');
      console.error(`payouts_c create failed: ${err.message}`);
    } finally {
      setSavingPayout(false);
    }
  }

  async function setPayoutStatus(row, status) {
    try {
      const res = await sdk.table('payouts_c').update({
        Id: row.Id,
        status_c: status,
        paid_on_c: status === 'Paid' ? todayIso() : null,
      });
      if (writeSucceeded(res, 'payouts_c update')) refetchPayouts();
    } catch (err) {
      toast.error('Payout could not be updated.');
      console.error(`payouts_c update failed: ${err.message}`);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight font-heading">Partners and revenue share</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage partner terms, calculate each partner's share of recorded payments, and track payouts.
        </p>
      </div>

      <section aria-label="Partners" className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium">Partners</h2>
        <form onSubmit={addPartner} className="grid gap-3 sm:grid-cols-4">
          <Input placeholder="Partner name" value={partnerForm.Name} onChange={(e) => setPartnerForm((f) => ({ ...f, Name: e.target.value }))} required />
          <Input type="number" min="0.01" max="100" step="0.01" placeholder="Share %" value={partnerForm.revenue_share_percent_c} onChange={(e) => setPartnerForm((f) => ({ ...f, revenue_share_percent_c: e.target.value }))} required />
          <Input type="email" placeholder="Contact email" value={partnerForm.contact_email_c} onChange={(e) => setPartnerForm((f) => ({ ...f, contact_email_c: e.target.value }))} />
          <Button type="submit" disabled={savingPartner}>{savingPartner ? 'Saving...' : 'Add partner'}</Button>
        </form>

        {partnersLoading && !partners && <p className="py-4 text-sm text-muted-foreground">Loading partners...</p>}
        {partnersError && <p className="py-4 text-sm text-destructive">{partnersError.message}</p>}
        {!partnersLoading && !partnersError && partnerList.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">No partners yet. Add one above to start revenue sharing.</p>
        )}
        <ul className="divide-y divide-border">
          {partnerList.map((partner) => (
            <li key={partner.Id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{partner.Name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {partner.revenue_share_percent_c ?? 0}% share{partner.contact_email_c ? ` · ${partner.contact_email_c}` : ''}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => togglePartner(partner)}>
                {partner.is_active_c ? 'Deactivate' : 'Activate'}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Subscription partner links" className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium">Subscription partner links</h2>
        <p className="text-xs text-muted-foreground">Only payments on subscriptions linked to a partner count toward that partner's share.</p>
        {subsLoading && !subscriptions && <p className="py-4 text-sm text-muted-foreground">Loading subscriptions...</p>}
        {subsError && <p className="py-4 text-sm text-destructive">{subsError.message}</p>}
        {!subsLoading && !subsError && subscriptionList.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">No subscriptions yet.</p>
        )}
        <ul className="divide-y divide-border">
          {subscriptionList.map((sub) => (
            <li key={sub.Id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{sub.Name ?? '—'}</p>
                <p className="truncate text-xs text-muted-foreground">{sub.status_c ?? '—'}</p>
              </div>
              <select
                aria-label="Partner for subscription"
                className="h-8 max-w-48 rounded-md border border-input bg-background px-2 text-xs"
                value={String(sub.partner_c?.Id ?? sub.partner_c ?? '')}
                onChange={(e) => assignPartner(sub, e.target.value)}
              >
                <option value="">No partner</option>
                {partnerList.map((partner) => (
                  <option key={partner.Id} value={String(partner.Id)}>{partner.Name}</option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Revenue share calculation" className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium">Calculate partner share</h2>
        <form onSubmit={runPreview} className="grid gap-3 sm:grid-cols-4">
          <select className={SELECT_CLASS} value={payoutForm.partnerId} onChange={(e) => setPayoutForm((f) => ({ ...f, partnerId: e.target.value }))} required>
            <option value="">Select partner</option>
            {partnerList.map((partner) => (
              <option key={partner.Id} value={String(partner.Id)}>{partner.Name}</option>
            ))}
          </select>
          <Input type="date" value={payoutForm.start} onChange={(e) => setPayoutForm((f) => ({ ...f, start: e.target.value }))} required />
          <Input type="date" value={payoutForm.end} onChange={(e) => setPayoutForm((f) => ({ ...f, end: e.target.value }))} required />
          <Button type="submit" variant="outline" disabled={calculating}>{calculating ? 'Calculating...' : 'Calculate'}</Button>
        </form>

        {preview && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">{preview.partner.Name} · {formatDate(preview.start)} to {formatDate(preview.end)}</p>
              <p className="text-muted-foreground">
                Gross {formatAmount(preview.gross)} from {preview.subscriptionCount} subscription(s) · Partner share {formatAmount(preview.share)}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>Discard</Button>
              <Button size="sm" onClick={savePayout} disabled={savingPayout}>{savingPayout ? 'Saving...' : 'Save payout'}</Button>
            </div>
          </div>
        )}
      </section>

      <section aria-label="Partner payouts" className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium">Payouts</h2>
        {payoutsLoading && !payouts && <p className="py-4 text-sm text-muted-foreground">Loading payouts...</p>}
        {payoutsError && <p className="py-4 text-sm text-destructive">{payoutsError.message}</p>}
        {!payoutsLoading && !payoutsError && payoutList.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">No payouts recorded yet.</p>
        )}
        <ul className="divide-y divide-border">
          {payoutList.map((row) => (
            <li key={row.Id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{row.partner_c?.Name ?? '—'}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatDate(row.period_start_c)} to {formatDate(row.period_end_c)} · Gross {formatAmount(row.gross_c)} · Share {formatAmount(row.partner_share_c)}
                </p>
              </div>
              <select
                aria-label="Payout status"
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={row.status_c ?? 'Pending'}
                onChange={(e) => setPayoutStatus(row, e.target.value)}
              >
                {PAYOUT_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}