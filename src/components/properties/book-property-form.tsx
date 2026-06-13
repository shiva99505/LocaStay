'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

interface PropertySummary {
  id: string;
  title: string;
  city: string;
  state: string;
  rent: number;
  deposit: number;
  availableFrom?: string | null;
}

interface BookPropertyFormProps {
  property: PropertySummary;
}

export function BookPropertyForm({ property }: BookPropertyFormProps) {
  const router = useRouter();
  const [moveInDate, setMoveInDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [durationMonths, setDurationMonths] = useState(11);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: property.id,
          moveInDate: new Date(moveInDate + 'T00:00:00').toISOString(),
          durationMonths,
          message,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to create booking request.');
        return;
      }

      setStatus('Booking request submitted successfully. Redirecting...');
      setTimeout(() => {
        router.push('/tenant/stay');
      }, 600);
    } catch (_err) {
      setError('Unable to submit booking request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="font-display text-xl font-bold text-foreground">Request booking</h2>
        <p className="text-sm text-muted-foreground">
          Request a booking for <span className="font-semibold text-foreground">{property.title}</span> in {property.city}, {property.state}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-muted-foreground">
          Move-in date
          <input
            type="date"
            required
            value={moveInDate}
            onChange={(event) => setMoveInDate(event.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-100"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-muted-foreground">
          Duration (months)
          <input
            type="number"
            min={1}
            max={36}
            required
            value={durationMonths}
            onChange={(event) => setDurationMonths(Number(event.target.value))}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-100"
          />
        </label>
      </div>

      <label className="space-y-2 text-sm font-medium text-muted-foreground">
        Message for landlord
        <textarea
          rows={4}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-100"
          placeholder="Add any details about your move-in plans or questions..."
        />
      </label>

      <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
        <p>
          Rent: <span className="font-semibold text-foreground">{formatCurrency(property.rent)}/month</span>
        </p>
        <p>
          Deposit: <span className="font-semibold text-foreground">{formatCurrency(property.deposit)}</span>
        </p>
        {property.availableFrom && (
          <p>Available from: <span className="font-semibold text-foreground">{property.availableFrom}</span></p>
        )}
      </div>

      {error && <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {status && <div className="rounded-2xl bg-secondary/10 px-4 py-3 text-sm text-secondary-700">{status}</div>}

      <Button type="submit" disabled={isSubmitting} className="w-full justify-center gap-2">
        {isSubmitting ? 'Submitting...' : 'Submit booking request'}
      </Button>
    </form>
  );
}
