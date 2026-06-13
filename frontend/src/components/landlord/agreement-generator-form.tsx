'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileText, Download, Printer, CheckCircle2, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createAgreement } from '@/lib/actions/agreement.actions';
import { formatCurrency } from '@/lib/utils';

interface ApprovedBooking {
  id: string;
  move_in_date: string;
  duration_months: number;
  tenant_id: string;
  property_id: string;
  property: { id: string; title: string; rent: number; deposit: number; city: string; state: string };
  tenant: { id: string; name: string | null; phone: string | null };
}

interface LandlordInfo {
  name: string | null;
  phone: string | null;
}

interface Props {
  approvedBookings: ApprovedBooking[];
  landlordInfo: LandlordInfo;
}

const DEFAULT_CLAUSES = `1. The tenant shall use the premises only for residential purposes.
2. Sub-letting or assignment of the premises is strictly prohibited without written consent.
3. The tenant shall maintain the premises in a clean and sanitary condition.
4. The tenant shall not make any structural changes or alterations without written permission.
5. The landlord may inspect the premises with 24-hour prior notice.
6. The tenant shall pay all electricity, water, and other utility bills on time.
7. Either party may terminate this agreement with 30 days written notice.
8. On vacating, the tenant shall return the premises in the same condition as received, subject to fair wear and tear.`;

export function AgreementGeneratorForm({ approvedBookings, landlordInfo }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const printRef = useRef<HTMLDivElement>(null);

  const [selectedBookingId, setSelectedBookingId] = useState<string>('manual');
  const [form, setForm] = useState({
    tenantName:    '',
    tenantPhone:   '',
    tenantId:      '',
    propertyId:    '',
    propertyTitle: '',
    propertyAddress: '',
    rentAmount:    '',
    depositAmount: '',
    startDate:     '',
    endDate:       '',
    clauses:       DEFAULT_CLAUSES,
  });

  function populateFromBooking(bookingId: string) {
    if (bookingId === 'manual') {
      setForm(f => ({ ...f, tenantName: '', tenantPhone: '', tenantId: '', propertyId: '', propertyTitle: '', propertyAddress: '', rentAmount: '', depositAmount: '' }));
      return;
    }
    const booking = approvedBookings.find(b => b.id === bookingId);
    if (!booking) return;

    const endDate = booking.duration_months
      ? (() => {
          const d = new Date(booking.move_in_date);
          d.setMonth(d.getMonth() + booking.duration_months);
          return d.toISOString().split('T')[0];
        })()
      : '';

    setForm(f => ({
      ...f,
      tenantName:      booking.tenant.name ?? '',
      tenantPhone:     booking.tenant.phone ?? '',
      tenantId:        booking.tenant.id,
      propertyId:      booking.property.id,
      propertyTitle:   booking.property.title,
      propertyAddress: `${booking.property.city}, ${booking.property.state}`,
      rentAmount:      String(booking.property.rent),
      depositAmount:   String(booking.property.deposit),
      startDate:       booking.move_in_date.split('T')[0],
      endDate,
    }));
  }

  function handleBookingSelect(value: string) {
    setSelectedBookingId(value);
    populateFromBooking(value);
  }

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));
  }

  const isValid = form.tenantName && form.propertyTitle && form.rentAmount && form.startDate;

  async function handleGenerate() {
    if (!isValid) { toast.error('Please fill in all required fields'); return; }

    const bookingObj = selectedBookingId !== 'manual'
      ? approvedBookings.find(b => b.id === selectedBookingId)
      : null;

    const tenantId = form.tenantId || bookingObj?.tenant.id;
    if (!tenantId) { toast.error('Tenant account not found — enter manually or select a booking'); return; }

    startTransition(async () => {
      const res = await createAgreement({
        propertyId:    form.propertyId || bookingObj?.property.id || '',
        bookingId:     selectedBookingId !== 'manual' ? selectedBookingId : undefined,
        tenantId,
        rentAmount:    Number(form.rentAmount),
        depositAmount: Number(form.depositAmount) || 0,
        startDate:     form.startDate,
        endDate:       form.endDate || undefined,
        clauses:       form.clauses,
      });

      if ('error' in res) { toast.error(res.error); return; }
      toast.success('Agreement generated and sent to tenant!');
      router.push('/landlord/agreements');
    });
  }

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Rental Agreement</title>
      <style>
        body { font-family: serif; font-size: 14px; color: #000; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.7; }
        h1 { text-align: center; font-size: 22px; margin-bottom: 4px; }
        h2 { font-size: 16px; margin-top: 24px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 24px; }
        .meta div { font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        td { padding: 6px 10px; border: 1px solid #ddd; font-size: 13px; }
        td:first-child { font-weight: bold; width: 40%; background: #f9f9f9; }
        .clauses { white-space: pre-wrap; font-size: 13px; }
        .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
        .sig-block { text-align: center; width: 45%; }
        .sig-line { border-top: 1px solid #000; padding-top: 6px; margin-top: 50px; font-size: 12px; }
        @media print { body { padding: 20px; } }
      </style></head><body>${content.innerHTML}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const rentWords = Number(form.rentAmount) ? formatCurrency(Number(form.rentAmount)) : '₹—';
  const depositWords = Number(form.depositAmount) ? formatCurrency(Number(form.depositAmount)) : '₹—';

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ── LEFT: Form ────────────────────────────────────────────────── */}
      <div className="space-y-5">
        {/* Auto-fill from booking */}
        {approvedBookings.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Auto-fill from Approved Booking</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedBookingId} onValueChange={handleBookingSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a booking…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Enter manually</SelectItem>
                  {approvedBookings.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.tenant.name ?? 'Tenant'} — {b.property.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Parties */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Parties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="landlord-name" className="text-xs">Landlord Name</Label>
                <Input id="landlord-name" value={landlordInfo.name ?? ''} disabled className="mt-1 bg-muted/40" />
              </div>
              <div>
                <Label htmlFor="landlord-phone" className="text-xs">Landlord Phone</Label>
                <Input id="landlord-phone" value={landlordInfo.phone ?? ''} disabled className="mt-1 bg-muted/40" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="tenant-name" className="text-xs">Tenant Name *</Label>
                <Input id="tenant-name" value={form.tenantName} onChange={set('tenantName')} placeholder="Full name" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="tenant-phone" className="text-xs">Tenant Phone</Label>
                <Input id="tenant-phone" value={form.tenantPhone} onChange={set('tenantPhone')} placeholder="+91 XXXXX XXXXX" className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="prop-title" className="text-xs">Property Title *</Label>
              <Input id="prop-title" value={form.propertyTitle} onChange={set('propertyTitle')} placeholder="e.g. 2BHK Flat, Gandhi Nagar" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="prop-addr" className="text-xs">City / Address</Label>
              <Input id="prop-addr" value={form.propertyAddress} onChange={set('propertyAddress')} placeholder="City, State" className="mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* Financials */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Rent & Deposit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="rent" className="text-xs">Monthly Rent (₹) *</Label>
                <Input id="rent" type="number" value={form.rentAmount} onChange={set('rentAmount')} placeholder="e.g. 8000" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="deposit" className="text-xs">Security Deposit (₹)</Label>
                <Input id="deposit" type="number" value={form.depositAmount} onChange={set('depositAmount')} placeholder="e.g. 16000" className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Duration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Duration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="start-date" className="text-xs">Start Date *</Label>
                <Input id="start-date" type="date" value={form.startDate} onChange={set('startDate')} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-xs">End Date (optional)</Label>
                <Input id="end-date" type="date" value={form.endDate} onChange={set('endDate')} className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Plus className="h-4 w-4" /> Terms & Conditions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={form.clauses}
              onChange={set('clauses')}
              rows={8}
              className="text-xs leading-relaxed"
              placeholder="Enter the terms and conditions…"
            />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            className="flex-1 gap-2 bg-secondary-600 hover:bg-secondary-700"
            onClick={handleGenerate}
            disabled={!isValid || isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {isPending ? 'Generating…' : 'Generate & Save Agreement'}
          </Button>
          <Button variant="outline" className="gap-2" onClick={handlePrint} disabled={!isValid}>
            <Printer className="h-4 w-4" /> Print / PDF
          </Button>
        </div>
      </div>

      {/* ── RIGHT: Live Preview ────────────────────────────────────────── */}
      <div className="hidden lg:block">
        <div className="sticky top-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-foreground">Live Preview</h2>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
              <Download className="h-3.5 w-3.5" /> Download PDF
            </Button>
          </div>
          <div className="max-h-[calc(100vh-140px)] overflow-y-auto rounded-2xl border border-border bg-white p-8 shadow-sm dark:bg-slate-950">
            <div ref={printRef} className="text-[13px] leading-relaxed text-slate-900 dark:text-slate-100">
              <h1 className="mb-1 text-center text-xl font-bold uppercase tracking-wide">RENTAL AGREEMENT</h1>
              <p className="mb-6 text-center text-xs text-slate-500">This agreement is executed on {today}</p>

              <h2 className="mb-2 border-b border-slate-200 pb-1 text-sm font-bold uppercase tracking-wide dark:border-slate-700">Parties</h2>
              <table className="mb-4 w-full text-[12px]">
                <tbody>
                  <tr>
                    <td className="w-[40%] border border-slate-200 bg-slate-50 px-3 py-2 font-semibold dark:border-slate-700 dark:bg-slate-800">Landlord</td>
                    <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">{landlordInfo.name ?? '—'}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 bg-slate-50 px-3 py-2 font-semibold dark:border-slate-700 dark:bg-slate-800">Landlord Contact</td>
                    <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">{landlordInfo.phone ?? '—'}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 bg-slate-50 px-3 py-2 font-semibold dark:border-slate-700 dark:bg-slate-800">Tenant</td>
                    <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">{form.tenantName || '—'}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 bg-slate-50 px-3 py-2 font-semibold dark:border-slate-700 dark:bg-slate-800">Tenant Contact</td>
                    <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">{form.tenantPhone || '—'}</td>
                  </tr>
                </tbody>
              </table>

              <h2 className="mb-2 border-b border-slate-200 pb-1 text-sm font-bold uppercase tracking-wide dark:border-slate-700">Property</h2>
              <table className="mb-4 w-full text-[12px]">
                <tbody>
                  <tr>
                    <td className="w-[40%] border border-slate-200 bg-slate-50 px-3 py-2 font-semibold dark:border-slate-700 dark:bg-slate-800">Property</td>
                    <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">{form.propertyTitle || '—'}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 bg-slate-50 px-3 py-2 font-semibold dark:border-slate-700 dark:bg-slate-800">Location</td>
                    <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">{form.propertyAddress || '—'}</td>
                  </tr>
                </tbody>
              </table>

              <h2 className="mb-2 border-b border-slate-200 pb-1 text-sm font-bold uppercase tracking-wide dark:border-slate-700">Financial Terms</h2>
              <table className="mb-4 w-full text-[12px]">
                <tbody>
                  <tr>
                    <td className="w-[40%] border border-slate-200 bg-slate-50 px-3 py-2 font-semibold dark:border-slate-700 dark:bg-slate-800">Monthly Rent</td>
                    <td className="border border-slate-200 px-3 py-2 font-bold dark:border-slate-700">{rentWords}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 bg-slate-50 px-3 py-2 font-semibold dark:border-slate-700 dark:bg-slate-800">Security Deposit</td>
                    <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">{depositWords}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 bg-slate-50 px-3 py-2 font-semibold dark:border-slate-700 dark:bg-slate-800">Start Date</td>
                    <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">
                      {form.startDate ? new Date(form.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 bg-slate-50 px-3 py-2 font-semibold dark:border-slate-700 dark:bg-slate-800">End Date</td>
                    <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">
                      {form.endDate ? new Date(form.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Month-to-Month'}
                    </td>
                  </tr>
                </tbody>
              </table>

              <h2 className="mb-2 border-b border-slate-200 pb-1 text-sm font-bold uppercase tracking-wide dark:border-slate-700">Terms & Conditions</h2>
              <pre className="mb-8 whitespace-pre-wrap text-[12px] leading-relaxed">{form.clauses}</pre>

              <div className="flex justify-between pt-8">
                <div className="w-[45%] text-center">
                  <div className="mb-10 border-t border-slate-300 dark:border-slate-600" />
                  <p className="text-[11px] font-semibold">LANDLORD SIGNATURE</p>
                  <p className="text-[11px] text-slate-500">{landlordInfo.name ?? ''}</p>
                </div>
                <div className="w-[45%] text-center">
                  <div className="mb-10 border-t border-slate-300 dark:border-slate-600" />
                  <p className="text-[11px] font-semibold">TENANT SIGNATURE</p>
                  <p className="text-[11px] text-slate-500">{form.tenantName || 'Tenant Name'}</p>
                </div>
              </div>

              {(isValid) && (
                <div className="mt-6 flex items-center gap-2 rounded-xl border border-secondary-200 bg-secondary-50 p-3 dark:border-secondary-500/20 dark:bg-secondary-500/10">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-secondary-600" />
                  <p className="text-[11px] text-secondary-700 dark:text-secondary-300">
                    This agreement will be digitally signed by both parties on the LocaStay platform.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
