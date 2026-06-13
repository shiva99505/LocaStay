'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { INDIAN_STATES } from '@/lib/constants';

interface LandlordProfileEditFormProps {
  initial: {
    businessName?: string | null;
    bio?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    upiId?: string | null;
    panNumber?: string | null;
    gstNumber?: string | null;
    bankAccount?: string | null;
    ifscCode?: string | null;
  };
}

export function LandlordProfileEditForm({ initial }: LandlordProfileEditFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [businessName, setBusinessName] = useState(initial.businessName ?? '');
  const [bio, setBio] = useState(initial.bio ?? '');
  const [address, setAddress] = useState(initial.address ?? '');
  const [city, setCity] = useState(initial.city ?? '');
  const [state, setState] = useState(initial.state ?? '');
  const [upiId, setUpiId] = useState(initial.upiId ?? '');
  const [panNumber, setPanNumber] = useState(initial.panNumber ?? '');
  const [gstNumber, setGstNumber] = useState(initial.gstNumber ?? '');
  const [bankAccount, setBankAccount] = useState(initial.bankAccount ?? '');
  const [ifscCode, setIfscCode] = useState(initial.ifscCode ?? '');

  function handleSave() {
    startTransition(async () => {
      try {
        const res = await fetch('/api/landlord/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessName: businessName.trim() || undefined,
            bio: bio.trim() || undefined,
            address: address.trim() || undefined,
            city: city.trim() || undefined,
            state: state || undefined,
            upiId: upiId.trim() || undefined,
            panNumber: panNumber.trim().toUpperCase() || undefined,
            gstNumber: gstNumber.trim().toUpperCase() || undefined,
            bankAccount: bankAccount.trim() || undefined,
            ifscCode: ifscCode.trim().toUpperCase() || undefined,
          }),
        });
        const data = await res.json() as { success?: boolean; error?: string };
        if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed to update profile');
        toast.success('Profile updated successfully');
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" /> Edit Profile
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Business Profile</DialogTitle>
            <DialogDescription>Update your landlord profile, bank details and KYC information.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lp-biz">Business Name</Label>
              <Input id="lp-biz" placeholder="e.g. Sharma Properties" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lp-bio">About / Bio</Label>
              <Textarea id="lp-bio" placeholder="Tell tenants about yourself and your properties..." value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lp-addr">Address</Label>
              <Input id="lp-addr" placeholder="Street / village" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lp-city">City</Label>
                <Input id="lp-city" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Bank & Payment Details</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lp-upi">UPI ID</Label>
              <Input id="lp-upi" placeholder="e.g. yourname@ybl" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lp-bank">Bank Account No.</Label>
                <Input id="lp-bank" placeholder="Account number" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lp-ifsc">IFSC Code</Label>
                <Input id="lp-ifsc" placeholder="e.g. SBIN0001234" value={ifscCode} onChange={(e) => setIfscCode(e.target.value.toUpperCase())} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lp-pan">PAN Number</Label>
                <Input id="lp-pan" placeholder="ABCDE1234F" maxLength={10} value={panNumber} onChange={(e) => setPanNumber(e.target.value.toUpperCase())} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lp-gst">GST Number (optional)</Label>
                <Input id="lp-gst" placeholder="27ABCDE1234F1Z5" maxLength={15} value={gstNumber} onChange={(e) => setGstNumber(e.target.value.toUpperCase())} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending} loading={isPending}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
