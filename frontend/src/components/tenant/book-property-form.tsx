'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Calendar, IndianRupee, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { createBooking } from '@/lib/actions/booking.actions';

interface BookPropertyFormProps {
  propertyId: string;
  propertyTitle: string;
  rent: number;
}

const DURATION_OPTIONS = [
  { value: '3',  label: '3 months' },
  { value: '6',  label: '6 months' },
  { value: '11', label: '11 months' },
  { value: '12', label: '1 year' },
  { value: '24', label: '2 years' },
];

function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const COLORS = ['#6366f1','#22c55e','#f59e0b','#ec4899','#3b82f6','#a855f7','#f97316'];
  const pieces = Array.from({ length: 100 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    r: Math.random() * 8 + 4,
    d: Math.random() * 4 + 2,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    tilt: Math.random() * 10 - 5,
    tiltAngle: 0,
    tiltSpeed: Math.random() * 0.1 + 0.05,
  }));

  let frame = 0;
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.tiltAngle += p.tiltSpeed;
      p.y += p.d;
      p.tilt = Math.sin(p.tiltAngle) * 12;
      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.ellipse(p.x, p.y, p.r, p.r / 2, p.tilt, 0, Math.PI * 2);
      ctx.fill();
    });
    frame++;
    if (frame < 120) requestAnimationFrame(draw);
    else document.body.removeChild(canvas);
  };
  requestAnimationFrame(draw);
}

export function BookPropertyForm({ propertyId, propertyTitle, rent }: BookPropertyFormProps) {
  const router = useRouter();
  const [open, setOpen]              = useState(false);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess]        = useState(false);
  const today                        = new Date().toISOString().split('T')[0];
  const [moveInDate, setMoveInDate]  = useState('');
  const [duration, setDuration]      = useState('11');
  const [message, setMessage]        = useState('');

  const handleSubmit = useCallback(() => {
    if (!moveInDate) { toast.error('Please select a move-in date'); return; }

    startTransition(async () => {
      const result = await createBooking({
        propertyId,
        moveInDate,
        durationMonths: Number(duration),
        message: message.trim() || undefined,
      });

      if ('error' in result) { toast.error(result.error); return; }

      setSuccess(true);
      launchConfetti();
      toast.success('🎉 Booking request sent! Landlord will respond soon.', { duration: 5000 });

      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setMoveInDate('');
        setDuration('11');
        setMessage('');
        router.push('/tenant/stay');
        router.refresh();
      }, 2200);
    });
  }, [propertyId, moveInDate, duration, message, router]);

  return (
    <>
      <Button size="lg" className="w-full gap-2 shadow-glow-primary transition-transform active:scale-95" onClick={() => setOpen(true)}>
        <Calendar className="h-4 w-4" /> Request Booking
      </Button>

      <Dialog open={open} onOpenChange={v => { if (!isPending) setOpen(v); }}>
        <DialogContent>
          {success ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-16 w-16 animate-bounce items-center justify-center rounded-full bg-secondary-100 dark:bg-secondary-500/20">
                <PartyPopper className="h-8 w-8 text-secondary-600" />
              </div>
              <div>
                <h2 className="font-display text-xl font-extrabold text-foreground">Booking Sent! 🎊</h2>
                <p className="mt-1 text-sm text-muted-foreground">The landlord will review and respond shortly.</p>
              </div>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Request Booking</DialogTitle>
                <DialogDescription>{propertyTitle} — {formatCurrency(rent)}/month</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="move-in">Move-in Date <span className="text-destructive">*</span></Label>
                  <Input id="move-in" type="date" min={today} value={moveInDate} onChange={e => setMoveInDate(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger id="duration"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="msg">Message <span className="text-muted-foreground">(optional)</span></Label>
                  <Textarea id="msg" rows={3} placeholder="Introduce yourself, family size, occupation…" value={message} onChange={e => setMessage(e.target.value)} />
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  <IndianRupee className="h-3.5 w-3.5 shrink-0" />
                  Monthly rent: <span className="ml-1 font-bold text-foreground">{formatCurrency(rent)}</span>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
                <Button className="bg-primary-700 hover:bg-primary-800 transition-transform active:scale-95"
                  onClick={handleSubmit} disabled={isPending || !moveInDate}>
                  {isPending
                    ? <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Sending…</>
                    : 'Send Request 🚀'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
