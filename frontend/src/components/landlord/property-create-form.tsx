'use client';

import { useState, useTransition, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  MapPin, Home, Info, Layers, Upload, X, ImageIcon,
  LocateFixed, School, Hospital, ShoppingCart, Bus, Train,
  Banknote, GraduationCap, CheckCircle2, Ruler,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INDIAN_STATES, PROPERTY_TYPES, type PropertyType } from '@/lib/constants';
import { createProperty, uploadCoverImage } from '@/lib/actions/property.actions';
import { cn } from '@/lib/utils';

const MapPicker = dynamic(
  () => import('@/components/common/map-picker').then((m) => m.MapPicker),
  { ssr: false, loading: () => <div className="h-64 w-full animate-pulse rounded-xl bg-muted" /> },
);

const AMENITIES = [
  { label: 'WiFi', emoji: '📶' }, { label: 'Parking', emoji: '🅿️' }, { label: 'Water 24/7', emoji: '💧' },
  { label: 'Electricity backup', emoji: '🔋' }, { label: 'Security guard', emoji: '👮' }, { label: 'CCTV', emoji: '📹' },
  { label: 'Lift', emoji: '🛗' }, { label: 'AC', emoji: '❄️' }, { label: 'Geyser', emoji: '🚿' },
  { label: 'Furnished', emoji: '🛋️' }, { label: 'Semi-furnished', emoji: '🪑' }, { label: 'Kitchen', emoji: '🍳' },
  { label: 'Washing machine', emoji: '🫧' }, { label: 'Garden', emoji: '🌿' }, { label: 'Balcony', emoji: '🏠' },
];

const DISTANCE_FIELDS = [
  { key: 'distanceToSchool',   label: 'School',          icon: School,       emoji: '🏫', hint: 'Nearest school' },
  { key: 'distanceToHospital', label: 'Hospital / Clinic',icon: Hospital,     emoji: '🏥', hint: 'Nearest hospital or clinic' },
  { key: 'distanceToMarket',   label: 'Market / Bazaar', icon: ShoppingCart, emoji: '🛒', hint: 'Nearest market or bazaar' },
  { key: 'distanceToBusStand', label: 'Bus Stand',        icon: Bus,          emoji: '🚌', hint: 'Nearest bus stand' },
  { key: 'distanceToRailway',  label: 'Railway Station',  icon: Train,        emoji: '🚂', hint: 'Nearest railway station' },
  { key: 'distanceToATM',      label: 'ATM / Bank',       icon: Banknote,     emoji: '🏧', hint: 'Nearest ATM or bank' },
  { key: 'distanceToCollege',  label: 'College',          icon: GraduationCap,emoji: '🎓', hint: 'Nearest college or university' },
] as const;

type DistanceKey = typeof DISTANCE_FIELDS[number]['key'];

const STEPS = ['Basic Details', 'Location', 'Distances', 'Facilities', 'Review'];

export function PropertyCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);

  // Step 0 — basic
  const [title, setTitle]                 = useState('');
  const [type, setType]                   = useState<PropertyType>('HOUSE');
  const [description, setDescription]     = useState('');
  const [rent, setRent]                   = useState('');
  const [deposit, setDeposit]             = useState('');
  const [totalRooms, setTotalRooms]       = useState('1');
  const [squareFeet, setSquareFeet]       = useState('');
  const [availableFrom, setAvailableFrom] = useState(() => new Date().toISOString().slice(0, 10));

  // Step 1 — location
  const [address, setAddress]       = useState('');
  const [village, setVillage]       = useState('');
  const [city, setCity]             = useState('');
  const [stateValue, setStateValue] = useState('');
  const [pincode, setPincode]       = useState('');
  const [latitude, setLatitude]     = useState('');
  const [longitude, setLongitude]   = useState('');

  // Step 2 — distances
  const [distances, setDistances] = useState<Partial<Record<DistanceKey, string>>>({});

  // Step 3 — facilities + image
  const [amenities, setAmenities]       = useState<string[]>([]);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile]       = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function setDist(key: DistanceKey, val: string) {
    setDistances(prev => ({ ...prev, [key]: val }));
  }

  function toggleAmenity(a: string) {
    setAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function removeImage() {
    setCoverFile(null);
    setCoverPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function canAdvance() {
    if (step === 0) return title.trim() && rent && Number(rent) > 0 && type;
    if (step === 1) return address.trim() && city.trim() && stateValue && pincode.trim() && latitude && longitude;
    return true;
  }

  function parseKm(val?: string): number | undefined {
    const n = parseFloat(val ?? '');
    return isNaN(n) || n < 0 ? undefined : n;
  }

  function handleSubmit() {
    startTransition(async () => {
      try {
        let coverImage: string | undefined;
        if (coverFile) {
          const fd = new FormData();
          fd.append('file', coverFile);
          const uploadResult = await uploadCoverImage(fd);
          if ('error' in uploadResult) {
            toast.warning(`Image upload failed: ${uploadResult.error}. Continuing without cover image.`);
          } else {
            coverImage = uploadResult.url;
          }
        }

        const result = await createProperty({
          title:          title.trim(),
          type,
          description:    description.trim() || undefined,
          rent:           Number(rent),
          deposit:        Number(deposit) || 0,
          totalRooms:     Number(totalRooms) || 1,
          squareFeet:     squareFeet ? Number(squareFeet) : undefined,
          availableFrom,
          address:        address.trim(),
          village:        village.trim() || undefined,
          city:           city.trim(),
          state:          stateValue,
          pincode:        pincode.trim(),
          latitude:       Number(latitude),
          longitude:      Number(longitude),
          amenities,
          coverImage,
          distanceToSchool:    parseKm(distances.distanceToSchool),
          distanceToHospital:  parseKm(distances.distanceToHospital),
          distanceToMarket:    parseKm(distances.distanceToMarket),
          distanceToBusStand:  parseKm(distances.distanceToBusStand),
          distanceToRailway:   parseKm(distances.distanceToRailway),
          distanceToATM:       parseKm(distances.distanceToATM),
          distanceToCollege:   parseKm(distances.distanceToCollege),
        });

        if ('error' in result) throw new Error(result.error);
        toast.success('🎉 Property submitted! Our team will verify it within 24 hours.');
        router.push('/landlord/properties');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  }

  const filledDistances = Object.values(distances).filter(v => v && v.trim()).length;

  const stepContent = [
    /* ── Step 0: Basic ─────────────────────────────────────────────── */
    <div key="basic" className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pc-title">Property title <span className="text-destructive">*</span></Label>
        <Input id="pc-title" placeholder="e.g. Spacious 2BHK near NH-58" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Property type <span className="text-destructive">*</span></Label>
          <Select value={type} onValueChange={v => setType(v as PropertyType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pc-rooms">Total rooms</Label>
          <Input id="pc-rooms" type="number" min={1} value={totalRooms} onChange={e => setTotalRooms(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pc-rent">Monthly rent (₹) <span className="text-destructive">*</span></Label>
          <Input id="pc-rent" type="number" min={0} placeholder="e.g. 8000" value={rent} onChange={e => setRent(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pc-deposit">Security deposit (₹)</Label>
          <Input id="pc-deposit" type="number" min={0} placeholder="e.g. 16000" value={deposit} onChange={e => setDeposit(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pc-sqft">Area (sq. ft.)</Label>
          <Input id="pc-sqft" type="number" min={0} placeholder="e.g. 850" value={squareFeet} onChange={e => setSquareFeet(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pc-avail">Available from</Label>
          <Input id="pc-avail" type="date" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pc-desc">Description</Label>
        <Textarea id="pc-desc" placeholder="Describe the property, nearby landmarks, tenant preferences…" value={description} onChange={e => setDescription(e.target.value)} rows={4} />
      </div>
    </div>,

    /* ── Step 1: Location ───────────────────────────────────────────── */
    <div key="location" className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pc-addr">Street address <span className="text-destructive">*</span></Label>
        <Input id="pc-addr" placeholder="House no., street name" value={address} onChange={e => setAddress(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pc-village">Village / Area</Label>
          <Input id="pc-village" placeholder="Village or locality" value={village} onChange={e => setVillage(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pc-city">City / Town <span className="text-destructive">*</span></Label>
          <Input id="pc-city" placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>State <span className="text-destructive">*</span></Label>
          <Select value={stateValue} onValueChange={setStateValue}>
            <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent>
              {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pc-pin">Pincode <span className="text-destructive">*</span></Label>
          <Input id="pc-pin" placeholder="6-digit pincode" maxLength={6} value={pincode} onChange={e => setPincode(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Pin on map <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">Click map to drop a pin or drag to adjust.</p>
        <MapPicker
          lat={latitude ? Number(latitude) : null}
          lng={longitude ? Number(longitude) : null}
          onChange={(lat, lng) => { setLatitude(String(lat)); setLongitude(String(lng)); }}
        />
        <div className="flex items-center gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs"
            onClick={() => {
              if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
              navigator.geolocation.getCurrentPosition(
                pos => { setLatitude(String(pos.coords.latitude.toFixed(6))); setLongitude(String(pos.coords.longitude.toFixed(6))); },
                () => toast.error('Could not get your location. Please pin manually.'),
              );
            }}>
            <LocateFixed className="h-3.5 w-3.5" /> Use GPS
          </Button>
          <div className="grid flex-1 grid-cols-2 gap-2">
            <Input placeholder="Latitude" type="number" step="0.000001" value={latitude} onChange={e => setLatitude(e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Longitude" type="number" step="0.000001" value={longitude} onChange={e => setLongitude(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>
        {latitude && longitude && (
          <p className="text-[11px] text-secondary-700 dark:text-secondary-400">
            📍 Pinned at {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
          </p>
        )}
      </div>
    </div>,

    /* ── Step 2: Distances ──────────────────────────────────────────── */
    <div key="distances" className="space-y-4">
      <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-3 dark:border-primary-500/20 dark:bg-primary-500/5">
        <div className="flex items-start gap-2">
          <Ruler className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
          <p className="text-xs text-primary-800 dark:text-primary-300">
            Enter the approximate distance in <strong>kilometres (km)</strong> from the property to each nearby landmark.
            Leave blank if not applicable. These help tenants assess the property location.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {DISTANCE_FIELDS.map(({ key, label, icon: Icon, emoji, hint }) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`dist-${key}`} className="flex items-center gap-1.5 text-xs">
              <span className="text-base leading-none">{emoji}</span>
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              {label}
            </Label>
            <div className="relative">
              <Input
                id={`dist-${key}`}
                type="number"
                min={0}
                step={0.1}
                placeholder={hint}
                value={distances[key] ?? ''}
                onChange={e => setDist(key, e.target.value)}
                className={cn('pr-10 transition-colors', distances[key] && Number(distances[key]) >= 0 ? 'border-secondary-400 bg-secondary-50/30 dark:border-secondary-500/40 dark:bg-secondary-500/5' : '')}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">km</span>
            </div>
          </div>
        ))}
      </div>

      {filledDistances > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-secondary-200 bg-secondary-50/50 px-3 py-2 dark:border-secondary-500/20 dark:bg-secondary-500/5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-secondary-600" />
          <p className="text-xs text-secondary-700 dark:text-secondary-300">
            {filledDistances} of {DISTANCE_FIELDS.length} distances filled — tenants love this detail!
          </p>
        </div>
      )}
    </div>,

    /* ── Step 3: Facilities + Cover ─────────────────────────────────── */
    <div key="facilities" className="space-y-5">
      <div className="space-y-2">
        <Label>Cover photo</Label>
        {coverPreview ? (
          <div className="relative h-40 w-full overflow-hidden rounded-xl border border-border">
            <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
            <button type="button" onClick={removeImage} aria-label="Remove"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 text-sm text-muted-foreground transition-colors hover:border-primary-300 hover:bg-primary-50/30">
            <ImageIcon className="h-6 w-6 opacity-50" />
            <span>Click to upload cover photo</span>
            <span className="text-xs">JPG, PNG, WebP · max 5 MB</span>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleImageChange} />
          </label>
        )}
      </div>

      <div className="space-y-2">
        <Label>Amenities</Label>
        <p className="text-xs text-muted-foreground">Select all that apply.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {AMENITIES.map(({ label, emoji }) => (
            <button key={label} type="button" onClick={() => toggleAmenity(label)}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-all duration-150',
                amenities.includes(label)
                  ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm dark:border-primary-400 dark:bg-primary-500/10 dark:text-primary-300'
                  : 'border-border text-muted-foreground hover:border-primary-300 hover:text-foreground',
              )}>
              <span className="text-base leading-none">{emoji}</span> {label}
            </button>
          ))}
        </div>
        {amenities.length > 0 && <p className="text-xs text-muted-foreground">{amenities.length} selected</p>}
      </div>
    </div>,

    /* ── Step 4: Review ──────────────────────────────────────────────── */
    <div key="review" className="space-y-4 text-sm">
      {coverPreview && <img src={coverPreview} alt="Cover" className="h-32 w-full rounded-xl object-cover" />}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: 'Title',          value: title },
          { label: 'Type',           value: type.replace(/_/g, ' ') },
          { label: 'Monthly rent',   value: `₹${Number(rent).toLocaleString('en-IN')}` },
          { label: 'Deposit',        value: deposit ? `₹${Number(deposit).toLocaleString('en-IN')}` : '—' },
          { label: 'Rooms',          value: totalRooms },
          { label: 'Area',           value: squareFeet ? `${squareFeet} sq ft` : '—' },
          { label: 'Available from', value: availableFrom },
          { label: 'Address',        value: [address, village, city, stateValue, pincode].filter(Boolean).join(', ') },
          { label: 'GPS',            value: latitude && longitude ? `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}` : '—' },
          { label: 'Amenities',      value: amenities.length ? amenities.join(', ') : 'None' },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-0.5 font-medium text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {filledDistances > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nearby Distances</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DISTANCE_FIELDS.filter(f => distances[f.key]).map(({ key, label, emoji }) => (
              <div key={key} className="flex items-center gap-2 rounded-xl border border-border p-2 text-xs">
                <span className="text-base">{emoji}</span>
                <div>
                  <p className="font-semibold text-foreground">{distances[key]} km</p>
                  <p className="text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {description && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</p>
          <p className="mt-0.5 text-foreground/90">{description}</p>
        </div>
      )}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        🕐 Your property will be reviewed by our team before it goes live. Usually within 24 hours.
      </div>
    </div>,
  ];

  const stepIcons = [Info, MapPin, Ruler, Layers, Home];
  const StepIcon = stepIcons[step];

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="space-y-4">
        {/* Step indicator */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-200',
                  i < step  ? 'cursor-pointer bg-secondary-500 text-white hover:bg-secondary-600 scale-90'
                  : i === step ? 'bg-primary-700 text-white scale-105 shadow-md'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
                )}
              >
                {i < step ? '✓' : i + 1}
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn('h-0.5 w-6 transition-all duration-300', i < step ? 'bg-secondary-400' : 'bg-border')} />
              )}
            </div>
          ))}
        </div>

        <CardTitle className="flex items-center gap-2 text-lg">
          <StepIcon className="h-5 w-5 text-primary-600" /> {STEPS[step]}
          {step === 2 && (
            <span className="ml-1 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-500/15 dark:text-primary-300">
              Boosts visibility!
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="min-h-[320px] transition-all duration-200">
          {stepContent[step]}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0 || isPending}>
            ← Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}
              className="gap-2 transition-transform active:scale-95">
              Continue →
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={isPending}
              className="gap-2 bg-secondary-600 transition-transform hover:bg-secondary-700 active:scale-95">
              {isPending
                ? <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Submitting…</>
                : <><Upload className="h-4 w-4" /> Submit for Review</>}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
