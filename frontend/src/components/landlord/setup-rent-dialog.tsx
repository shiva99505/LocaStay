'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { IndianRupee, CalendarDays, Clock3, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';

interface SetupRentDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bookingId: string;
  propertyId: string;
  tenantId: string;
  tenantName: string;
  tenantPhone?: string | null;
  propertyTitle: string;
  /** Pre-fill from booking */
  defaultStartDate?: string;
  defaultDuration?: number;
  defaultRent?: number;
  /** Whether payments already exist (re-setup mode) */
  isUpdate?: boolean;
}

const DURATION_OPTIONS = [1,2,3,4,5,6,7,8,9,10,11,12,18,24,36];

export function SetupRentDialog({
  open, onOpenChange,
  bookingId, propertyId, tenantId,
  tenantName, tenantPhone, propertyTitle,
  defaultStartDate, defaultDuration = 11, defaultRent = 0,
  isUpdate = false,
}: SetupRentDialogProps) {
  const router = useRouter();
  const [isPending, startT] = useTransition();
  const [done, setDone]     = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate]     = useState(defaultStartDate ?? today);
  const [duration, setDuration]       = useState(String(defaultDuration));
  const [rent, setRent]               = useState(String(defaultRent));
  const [dueDay, setDueDay]           = useState('1');

  // Preview: correctly compute first due date and lease end
  const { firstDuePreview, leaseEndPreview } = (() => {
    try {
      const [sy, sm, sd] = startDate.split('-').map(Number);
      const start = new Date(sy, sm - 1, sd);
      const dd = Number(dueDay);
      const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
      const clamp = (y: number, m: number, d: number) => Math.min(d, lastDay(y, m));

      // First due date ≥ start
      let firstDue = new Date(sy, sm - 1, clamp(sy, sm - 1, dd));
      if (firstDue < start) {
        const nm = sm % 12; const ny = nm === 0 ? sy + 1 : sy;
        const nm2 = nm === 0 ? 0 : nm;
        firstDue = new Date(ny, nm2, clamp(ny, nm2, dd));
      }

      // Last due date = firstDue + (duration-1) months
      const dur = Number(duration);
      const lastDue = new Date(firstDue.getFullYear(), firstDue.getMonth() + dur - 1, 1);
      const lastDay2 = clamp(lastDue.getFullYear(), lastDue.getMonth(), dd);
      const finalLastDue = new Date(lastDue.getFullYear(), lastDue.getMonth(), lastDay2);

      // Lease end = last day of the last payment month
      const leaseEnd = new Date(finalLastDue.getFullYear(), finalLastDue.getMonth() + 1, 0);

      return {
        firstDuePreview: firstDue.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        leaseEndPreview: leaseEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      };
    } catch { return { firstDuePreview: '—', leaseEndPreview: '—' }; }
  })();

  function handleSubmit() {
    if (!startDate || !duration || !rent || !dueDay) {
      toast.error('Please fill in all fields');
      return;
    }
    if (Number(rent) <= 0) { toast.error('Rent amount must be greater than 0'); return; }

    startT(async () => {
      try {
        const res = await fetch('/api/rent-tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId,
            propertyId,
            tenantId,
            tenantPhone: tenantPhone ?? undefined,
            tenantName,
            propertyTitle,
            startDate,
            durationMonths: Number(duration),
            rentAmount:     Number(rent),
            dueDay:         Number(dueDay),
          }),
        });
        const data = await res.json() as { success?: boolean; count?: number; error?: string };
        if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed');

        setDone(true);
        toast.success(`Rent tracker started — ${data.count} payments scheduled`);
        setTimeout(() => {
          setDone(false);
          onOpenChange(false);
          router.refresh();
        }, 1800);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isPending && !done) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isUpdate ? 'Update Rent Tracker' : 'Setup Rent Tracker'}</DialogTitle>
          <DialogDescription>
            {tenantName} · {propertyTitle}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100 dark:bg-secondary-500/20">
              <CheckCircle2 className="h-9 w-9 text-secondary-600" />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-foreground">Rent Tracker Started!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {duration} payments scheduled. Tenant has been notified.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Start date */}
            <div className="space-y-1.5">
              <Label htmlFor="rt-start" className="flex items-center gap-1.5 text-sm">
                <CalendarDays className="h-3.5 w-3.5" /> Move-in / Start Date
              </Label>
              <Input
                id="rt-start"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <Label htmlFor="rt-duration" className="flex items-center gap-1.5 text-sm">
                <Clock3 className="h-3.5 w-3.5" /> Duration (months)
              </Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger id="rt-duration"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(m => (
                    <SelectItem key={m} value={String(m)}>
                      {m} {m === 1 ? 'month' : 'months'}{m === 11 ? ' (11-month agreement)' : m === 12 ? ' (1 year)' : m === 24 ? ' (2 years)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rent amount */}
            <div className="space-y-1.5">
              <Label htmlFor="rt-rent" className="flex items-center gap-1.5 text-sm">
                <IndianRupee className="h-3.5 w-3.5" /> Monthly Rent (₹)
              </Label>
              <Input
                id="rt-rent"
                type="number"
                min={1}
                placeholder="e.g. 8000"
                value={rent}
                onChange={e => setRent(e.target.value)}
              />
            </div>

            {/* Due day */}
            <div className="space-y-1.5">
              <Label htmlFor="rt-due" className="text-sm">Rent Due Day (each month)</Label>
              <Select value={dueDay} onValueChange={setDueDay}>
                <SelectTrigger id="rt-due"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,5,7,10,15,20,25,28].map(d => (
                    <SelectItem key={d} value={String(d)}>{d}{d === 1 ? 'st' : d === 5 ? 'th' : d === 7 ? 'th' : 'th'} of every month</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total payments</span>
                <span className="font-bold text-foreground">{duration} months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Per month</span>
                <span className="font-bold text-foreground">{rent ? formatCurrency(Number(rent)) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total rent</span>
                <span className="font-bold text-foreground">
                  {rent && duration ? formatCurrency(Number(rent) * Number(duration)) : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">First payment due</span>
                <span className="font-semibold text-foreground">{firstDuePreview}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lease ends</span>
                <span className="font-semibold text-foreground">{leaseEndPreview}</span>
              </div>
            </div>

            {tenantPhone && (
              <p className="text-[11px] text-muted-foreground">
                SMS reminder will be sent to {tenantPhone} when tracker starts.
              </p>
            )}
          </div>
        )}

        {!done && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              className="bg-secondary-600 hover:bg-secondary-700 gap-1.5"
              onClick={handleSubmit}
              disabled={isPending}
              loading={isPending}
            >
              <IndianRupee className="h-3.5 w-3.5" />
              {isUpdate ? 'Update Tracker' : 'Start Rent Tracker'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
