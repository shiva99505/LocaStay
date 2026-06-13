'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MapPin, Home, Info, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { INDIAN_STATES, PROPERTY_TYPES, type PropertyType } from '@/lib/constants';

const AMENITIES = [
  'WiFi', 'Parking', 'Water 24/7', 'Electricity backup', 'Security guard',
  'CCTV', 'Lift', 'AC', 'Geyser', 'Furnished', 'Semi-furnished',
  'Kitchen', 'Washing machine', 'Garden', 'Balcony',
];

const STEPS = ['Basic Details', 'Location', 'Facilities', 'Review'];

export function PropertyCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);

  // Step 1 — basic
  const [title, setTitle] = useState('');
  const [type, setType] = useState<PropertyType>('HOUSE');
  const [description, setDescription] = useState('');
  const [rent, setRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [totalRooms, setTotalRooms] = useState('1');
  const [availableFrom, setAvailableFrom] = useState(() => new Date().toISOString().slice(0, 10));

  // Step 2 — location
  const [address, setAddress] = useState('');
  const [village, setVillage] = useState('');
  const [city, setCity] = useState('');
  const [stateValue, setStateValue] = useState('');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Step 3 — facilities
  const [amenities, setAmenities] = useState<string[]>([]);

  function toggleAmenity(a: string) {
    setAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  }

  function canAdvance() {
    if (step === 0) return title.trim() && rent && Number(rent) > 0 && type;
    if (step === 1) return address.trim() && city.trim() && stateValue && pincode.trim() && latitude && longitude;
    return true;
  }

  function handleSubmit() {
    startTransition(async () => {
      try {
        const res = await fetch('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            type,
            description: description.trim() || undefined,
            rent: Number(rent),
            deposit: Number(deposit) || 0,
            totalRooms: Number(totalRooms) || 1,
            availableFrom,
            address: address.trim(),
            village: village.trim() || undefined,
            city: city.trim(),
            state: stateValue,
            pincode: pincode.trim(),
            latitude: Number(latitude),
            longitude: Number(longitude),
            amenities,
          }),
        });
        const data = await res.json() as { error?: string };
        if (!res.ok) throw new Error(data.error ?? 'Failed to submit property');
        toast.success('Property submitted for review! Our team will verify it within 24 hours.');
        router.push('/landlord/properties');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  }

  const stepContent = [
    // Step 0 — Basic
    <div key="basic" className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pc-title">Property title <span className="text-destructive">*</span></Label>
        <Input id="pc-title" placeholder="e.g. Spacious 2BHK near NH-58" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Property type <span className="text-destructive">*</span></Label>
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
          <Label htmlFor="pc-rooms">Total rooms</Label>
          <Input id="pc-rooms" type="number" min={1} value={totalRooms} onChange={(e) => setTotalRooms(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pc-rent">Monthly rent (₹) <span className="text-destructive">*</span></Label>
          <Input id="pc-rent" type="number" min={0} placeholder="e.g. 8000" value={rent} onChange={(e) => setRent(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pc-deposit">Security deposit (₹)</Label>
          <Input id="pc-deposit" type="number" min={0} placeholder="e.g. 16000" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pc-avail">Available from</Label>
        <Input id="pc-avail" type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pc-desc">Description</Label>
        <Textarea id="pc-desc" placeholder="Describe the property, nearby landmarks, tenant preferences..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
      </div>
    </div>,

    // Step 1 — Location
    <div key="location" className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pc-addr">Street address <span className="text-destructive">*</span></Label>
        <Input id="pc-addr" placeholder="House no., street name" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pc-village">Village / Area</Label>
          <Input id="pc-village" placeholder="Village or locality" value={village} onChange={(e) => setVillage(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pc-city">City / Town <span className="text-destructive">*</span></Label>
          <Input id="pc-city" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>State <span className="text-destructive">*</span></Label>
          <Select value={stateValue} onValueChange={setStateValue}>
            <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent>
              {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pc-pin">Pincode <span className="text-destructive">*</span></Label>
          <Input id="pc-pin" placeholder="6-digit pincode" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> GPS Coordinates <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">Open Google Maps, right-click on your property location, and copy the coordinates.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input placeholder="Latitude (e.g. 28.6139)" type="number" step="0.000001" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
          <Input placeholder="Longitude (e.g. 77.2090)" type="number" step="0.000001" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
        </div>
      </div>
    </div>,

    // Step 2 — Facilities
    <div key="facilities" className="space-y-4">
      <p className="text-sm text-muted-foreground">Select all amenities your property offers. This helps tenants find the right match.</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {AMENITIES.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => toggleAmenity(a)}
            className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors ${
              amenities.includes(a)
                ? 'border-primary-600 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-500/10 dark:text-primary-300'
                : 'border-border text-muted-foreground hover:border-primary-300 hover:text-foreground'
            }`}
          >
            {a}
          </button>
        ))}
      </div>
      {amenities.length > 0 && (
        <p className="text-xs text-muted-foreground">{amenities.length} amenities selected</p>
      )}
    </div>,

    // Step 3 — Review
    <div key="review" className="space-y-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: 'Title', value: title },
          { label: 'Type', value: type.replace('_', ' ') },
          { label: 'Monthly rent', value: `₹${Number(rent).toLocaleString('en-IN')}` },
          { label: 'Deposit', value: deposit ? `₹${Number(deposit).toLocaleString('en-IN')}` : '—' },
          { label: 'Rooms', value: totalRooms },
          { label: 'Available from', value: availableFrom },
          { label: 'Address', value: [address, village, city, stateValue, pincode].filter(Boolean).join(', ') },
          { label: 'GPS', value: latitude && longitude ? `${latitude}, ${longitude}` : '—' },
          { label: 'Amenities', value: amenities.length ? amenities.join(', ') : 'None selected' },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-0.5 font-medium text-foreground">{value}</p>
          </div>
        ))}
      </div>
      {description && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</p>
          <p className="mt-0.5 text-foreground/90">{description}</p>
        </div>
      )}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        Your property will be reviewed by our team before it goes live. This usually takes less than 24 hours.
      </div>
    </div>,
  ];

  const stepIcons = [Info, MapPin, Layers, Home];
  const StepIcon = stepIcons[step];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="space-y-4">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                i < step ? 'bg-secondary-500 text-white' : i === step ? 'bg-primary-700 text-white' : 'bg-muted text-muted-foreground'
              }`}>{i + 1}</div>
              {i < STEPS.length - 1 && <div className={`h-px w-6 ${i < step ? 'bg-secondary-400' : 'bg-border'}`} />}
            </div>
          ))}
        </div>
        <CardTitle className="flex items-center gap-2 text-lg">
          <StepIcon className="h-5 w-5 text-primary-600" /> {STEPS[step]}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {stepContent[step]}

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0 || isPending}
          >
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              loading={isPending}
              className="gap-2"
            >
              Submit for review
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
