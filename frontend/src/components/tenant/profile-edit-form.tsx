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

interface ProfileEditFormProps {
  initial: {
    bio?: string | null;
    address?: string | null;
    village?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    occupation?: string | null;
    monthlyIncome?: number | null;
    familySize?: number | null;
  };
}

export function ProfileEditForm({ initial }: ProfileEditFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [bio, setBio] = useState(initial.bio ?? '');
  const [address, setAddress] = useState(initial.address ?? '');
  const [village, setVillage] = useState(initial.village ?? '');
  const [city, setCity] = useState(initial.city ?? '');
  const [state, setState] = useState(initial.state ?? '');
  const [pincode, setPincode] = useState(initial.pincode ?? '');
  const [occupation, setOccupation] = useState(initial.occupation ?? '');
  const [monthlyIncome, setMonthlyIncome] = useState(String(initial.monthlyIncome ?? ''));
  const [familySize, setFamilySize] = useState(String(initial.familySize ?? ''));

  function handleSave() {
    startTransition(async () => {
      try {
        const res = await fetch('/api/tenant/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bio: bio.trim() || undefined,
            address: address.trim() || undefined,
            village: village.trim() || undefined,
            city: city.trim() || undefined,
            state: state || undefined,
            pincode: pincode.trim() || undefined,
            occupation: occupation.trim() || undefined,
            monthlyIncome: monthlyIncome ? Number(monthlyIncome) : undefined,
            familySize: familySize ? Number(familySize) : undefined,
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
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your personal details and address information.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="p-bio">About / Bio</Label>
              <Textarea id="p-bio" placeholder="Tell landlords a bit about yourself..." value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-occ">Occupation</Label>
              <Input id="p-occ" placeholder="e.g. Software Engineer, Student, Factory Worker" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="p-income">Monthly Income (₹)</Label>
                <Input id="p-income" type="number" min={0} placeholder="e.g. 25000" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-family">Family Size</Label>
                <Input id="p-family" type="number" min={1} max={20} placeholder="Number of people" value={familySize} onChange={(e) => setFamilySize(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-address">Address</Label>
              <Input id="p-address" placeholder="House/Flat no, Street" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="p-village">Village / Area</Label>
                <Input id="p-village" placeholder="Village or locality" value={village} onChange={(e) => setVillage(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-city">City / Town</Label>
                <Input id="p-city" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>State</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-pin">Pincode</Label>
                <Input id="p-pin" placeholder="6-digit pincode" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value)} />
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
