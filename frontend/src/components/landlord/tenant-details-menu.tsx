'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  MoreVertical, Eye, CheckCircle2, XCircle, Phone, MessageSquare,
  Calendar, Clock, IndianRupee, Home, ShieldCheck, PlayCircle,
} from 'lucide-react';
import { SetupRentDialog } from '@/components/landlord/setup-rent-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDate, initials, whatsappLink, telLink } from '@/lib/utils';
import { BOOKING_STATUS_META, type BookingStatus } from '@/lib/constants';

export interface BookingDetailData {
  id: string;
  status: string;
  property_id: string;
  tenant_id: string;
  requested_at: string;
  responded_at?: string | null;
  move_in_date?: string | null;
  duration_months?: number | null;
  message?: string | null;
  rejection_reason?: string | null;
  tenant: {
    id: string;
    name: string | null;
    phone: string | null;
    avatar: string | null;
    is_verified: boolean;
  };
  property: {
    title: string;
    city: string;
  };
  agreement?: {
    status: string;
    rent_amount: number;
    start_date: string;
  } | null;
  /** true if rent payments already exist for this booking */
  hasRentTracker?: boolean;
}

export function TenantDetailsMenu({ booking }: { booking: BookingDetailData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [detailOpen, setDetailOpen]   = useState(false);
  const [rejectOpen, setRejectOpen]   = useState(false);
  const [rentOpen,   setRentOpen]     = useState(false);
  const [reason, setReason]           = useState('');

  const meta        = BOOKING_STATUS_META[booking.status as BookingStatus];
  const isPending_  = booking.status === 'PENDING';
  const isApproved  = booking.status === 'APPROVED';

  function handleApprove() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/bookings/${booking.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'APPROVED' }),
        });
        const data = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed');
        toast.success('Booking approved');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  }

  function handleReject() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/bookings/${booking.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'REJECTED', reason: reason.trim() || undefined }),
        });
        const data = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed');
        toast.success('Booking rejected');
        setRejectOpen(false);
        setReason('');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 rounded-lg p-0">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Tenant options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setDetailOpen(true)}>
            <Eye className="mr-2 h-4 w-4" /> View Details
          </DropdownMenuItem>

          {isPending_ && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleApprove}
                disabled={isPending}
                className="text-secondary-600 focus:text-secondary-600"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Accept Request
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setRejectOpen(true)}
                disabled={isPending}
                className="text-destructive focus:text-destructive"
              >
                <XCircle className="mr-2 h-4 w-4" /> Reject Request
              </DropdownMenuItem>
            </>
          )}

          {isApproved && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setRentOpen(true)}
                className="text-secondary-600 focus:text-secondary-600"
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                {booking.hasRentTracker ? 'Update Rent Tracker' : 'Setup Rent Tracker'}
              </DropdownMenuItem>
            </>
          )}

          {booking.tenant.phone && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href={telLink(booking.tenant.phone)}>
                  <Phone className="mr-2 h-4 w-4" /> Call Tenant
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={whatsappLink(booking.tenant.phone)} target="_blank" rel="noopener noreferrer">
                  <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp
                </a>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Booking Details Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Booking Request Details</DialogTitle>
            <DialogDescription>Full details for this booking request.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Tenant Info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 rounded-xl">
                {booking.tenant.avatar && (
                  <AvatarImage src={booking.tenant.avatar} alt={booking.tenant.name ?? ''} />
                )}
                <AvatarFallback className="rounded-xl text-sm font-bold">
                  {initials(booking.tenant.name ?? 'T')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-bold text-foreground">{booking.tenant.name ?? '—'}</p>
                  {booking.tenant.is_verified && (
                    <Badge variant="success" className="gap-0.5 text-[10px] py-0">
                      <ShieldCheck className="h-2.5 w-2.5" /> Verified
                    </Badge>
                  )}
                </div>
                {booking.tenant.phone && (
                  <p className="text-xs text-muted-foreground">{booking.tenant.phone}</p>
                )}
              </div>
              <StatusBadge tone={meta.tone} label={meta.label} />
            </div>

            <Separator />

            {/* Property & Booking Info */}
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <Home className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{booking.property.title}</p>
                  <p className="text-xs text-muted-foreground">{booking.property.city}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Request sent</p>
                  <p className="text-sm font-medium">{formatDate(booking.requested_at)}</p>
                </div>
              </div>

              {booking.move_in_date && (
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Requested move-in</p>
                    <p className="text-sm font-medium">
                      {formatDate(booking.move_in_date)}
                      {booking.duration_months ? ` · ${booking.duration_months} months` : ''}
                    </p>
                  </div>
                </div>
              )}

              {booking.agreement && (
                <div className="flex items-center gap-2.5">
                  <IndianRupee className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Agreed rent</p>
                    <p className="text-sm font-medium">
                      {formatCurrency(booking.agreement.rent_amount)}/mo · Since{' '}
                      {formatDate(booking.agreement.start_date)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Tenant Message */}
            {booking.message && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Message from tenant
                  </p>
                  <p className="rounded-lg bg-muted px-3 py-2.5 text-sm leading-relaxed">
                    {booking.message}
                  </p>
                </div>
              </>
            )}

            {/* Rejection Reason */}
            {booking.rejection_reason && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-destructive/70">
                    Rejection reason
                  </p>
                  <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive leading-relaxed">
                    {booking.rejection_reason}
                  </p>
                </div>
              </>
            )}

          </div>

          {/* Accept / Reject footer for pending bookings */}
          {isPending_ && (
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="flex-1 text-destructive hover:bg-destructive/10"
                onClick={() => { setDetailOpen(false); setRejectOpen(true); }}
                disabled={isPending}
              >
                <XCircle className="mr-1.5 h-4 w-4" /> Reject
              </Button>
              <Button
                className="flex-1 bg-secondary-600 hover:bg-secondary-700"
                onClick={() => { setDetailOpen(false); handleApprove(); }}
                disabled={isPending}
                loading={isPending}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Accept Request
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Setup Rent Tracker Dialog */}
      {isApproved && (
        <SetupRentDialog
          open={rentOpen}
          onOpenChange={setRentOpen}
          bookingId={booking.id}
          propertyId={booking.property_id}
          tenantId={booking.tenant_id}
          tenantName={booking.tenant.name ?? 'Tenant'}
          tenantPhone={booking.tenant.phone}
          propertyTitle={booking.property.title}
          defaultStartDate={booking.move_in_date?.split('T')[0]}
          defaultDuration={booking.duration_months ?? 11}
          defaultRent={booking.agreement?.rent_amount ?? 0}
          isUpdate={booking.hasRentTracker}
        />
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Booking</DialogTitle>
            <DialogDescription>
              Provide an optional reason that will be sent to the tenant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason-tenant-menu">Reason (optional)</Label>
            <Textarea
              id="reject-reason-tenant-menu"
              placeholder="e.g. Property already rented, dates not suitable…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isPending}
              loading={isPending}
            >
              Reject Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
