'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Calendar, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';

interface BookPropertyFormProps {
  propertyId: string;
  propertyTitle: string;
  rent: number;
}

const DURATION_OPTIONS = [
  { value: '3', label: '3 months' },
  { value: '6', label: '6 months' },
  { value: '11', label: '11 months' },
  { value: '12', label: '1 year' },
  { value: '24', label: '2 years' },
];

export function BookPropertyForm({ propertyId, propertyTitle, rent }: BookPropertyFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().split('T')[0];
  const [moveInDate, setMoveInDate] = useState('');
  const [durationMonths, setDurationMonths] = useState('11');
  const [message, setMessage] = useState('');

  function handleSubmit() {
    if (!moveInDate) {
      toast.error('Please select a move-in date');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId,
            moveInDate: new Date(moveInDate + 'T00:00:00').toISOString(),
            durationMonths: Number(durationMonths),
            message: message.trim() || undefined,
          }),
        });
        const data = await res.json() as { booking?: unknown; error?: string };
        if (!res.ok || !data.booking) throw new Error(data.error ?? 'Failed to submit booking');
        toast.success('Booking request sent!');
        setOpen(false);
        setMoveInDate('');
        setDurationMonths('11');
        setMessage('');
        router.push('/tenant/stay');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  }

  return (
    <>
      <Button
        size="lg"
        className="w-full gap-2 shadow-glow-primary"
        onClick={() => setOpen(true)}
      >
        <Calendar className="h-4 w-4" /> Request Booking
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Booking</DialogTitle>
            <DialogDescription>
              {propertyTitle} — {formatCurrency(rent)}/month
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="move-in-date">Move-in Date</Label>
              <Input
                id="move-in-date"
                type="date"
                min={today}
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select value={durationMonths} onValueChange={setDurationMonths}>
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message to Landlord (optional)</Label>
              <Textarea
                id="message"
                placeholder="Introduce yourself, mention family size, occupation, etc."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <IndianRupee className="h-3.5 w-3.5 shrink-0" />
                <span>Monthly rent: <span className="font-bold text-foreground">{formatCurrency(rent)}</span></span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              className="bg-primary-700 hover:bg-primary-800"
              onClick={handleSubmit}
              disabled={isPending || !moveInDate}
              loading={isPending}
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
