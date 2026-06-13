'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROPERTY_TYPES, type PropertyType } from '@/lib/constants';

interface PropertyEditFormProps {
  propertyId: string;
  initial: {
    title: string;
    type: string;
    description: string | null;
    rent: number;
    deposit: number;
    totalRooms: number;
    availableFrom: string;
    address: string;
    village: string | null;
    city: string;
    state: string;
    pincode: string;
  };
}

export function PropertyEditForm({ propertyId, initial }: PropertyEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial.title);
  const [type, setType] = useState<PropertyType>(initial.type as PropertyType);
  const [description, setDescription] = useState(initial.description ?? '');
  const [rent, setRent] = useState(String(initial.rent));
  const [deposit, setDeposit] = useState(String(initial.deposit));
  const [totalRooms, setTotalRooms] = useState(String(initial.totalRooms));
  const [availableFrom, setAvailableFrom] = useState(initial.availableFrom.slice(0, 10));

  function handleSave() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/properties/${propertyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            type,
            description: description.trim() || null,
            rent: Number(rent),
            deposit: Number(deposit),
            totalRooms: Number(totalRooms),
            availableFrom,
          }),
        });
        const data = await res.json() as { error?: string };
        if (!res.ok) throw new Error(data.error ?? 'Failed to save changes');
        toast.success('Property updated successfully');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="pe-title">Property title</Label>
          <Input id="pe-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Property type</Label>
          <Select value={type} onValueChange={(v) => setType(v as PropertyType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pe-rooms">Total rooms</Label>
          <Input id="pe-rooms" type="number" min={1} value={totalRooms} onChange={(e) => setTotalRooms(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pe-rent">Monthly rent (₹)</Label>
          <Input id="pe-rent" type="number" min={0} value={rent} onChange={(e) => setRent(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pe-deposit">Security deposit (₹)</Label>
          <Input id="pe-deposit" type="number" min={0} value={deposit} onChange={(e) => setDeposit(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pe-avail">Available from</Label>
          <Input id="pe-avail" type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pe-desc">Description</Label>
        <Textarea id="pe-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the property, nearby landmarks, tenant preferences..." />
      </div>

      <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
        <p className="font-semibold text-foreground mb-2">Address (read-only)</p>
        <p className="text-muted-foreground">
          {[initial.address, initial.village, initial.city, initial.state, initial.pincode].filter(Boolean).join(', ')}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">To change address or GPS, contact support.</p>
      </div>

      <Button onClick={handleSave} disabled={isPending} loading={isPending} className="w-full sm:w-auto gap-2">
        Save Changes
      </Button>
    </div>
  );
}
