'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { PROPERTY_TYPE_LABELS, PROPERTY_TYPES } from '@/lib/constants';
import { useLocale } from '@/components/providers/locale-provider';

export function HeroSearch() {
  const router = useRouter();
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<string>('ANY');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (type !== 'ANY') params.set('type', type);
    router.push(`/properties${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <div className="flex w-full flex-col gap-2 rounded-2xl border border-border/70 bg-card/95 p-2.5 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:rounded-full sm:p-2">
      <div className="relative flex flex-1 items-center">
        <MapPin className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-primary-600" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={t.hero.searchPlaceholder}
          className="h-12 rounded-full border-none bg-transparent pl-11 pr-4 text-sm shadow-none focus-visible:ring-0 sm:h-11"
        />
      </div>
      <div className="hidden h-8 w-px bg-border sm:block" />
      <Select value={type} onValueChange={setType}>
        <SelectTrigger className="h-12 w-full rounded-full border-none bg-muted/60 text-sm shadow-none focus:ring-0 sm:h-11 sm:w-44">
          <SelectValue placeholder="Property type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ANY">Any property type</SelectItem>
          {PROPERTY_TYPES.map((value) => (
            <SelectItem key={value} value={value}>{PROPERTY_TYPE_LABELS[value]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 shrink-0 rounded-full sm:h-11 sm:w-11"
          aria-label="Search by voice"
          title="Voice search"
        >
          <Mic className="h-[18px] w-[18px]" />
        </Button>
        <Button
          type="button"
          onClick={handleSearch}
          size="lg"
          className="h-12 flex-1 gap-2 rounded-full shadow-glow-primary sm:h-11 sm:flex-initial sm:px-7"
        >
          <Search className="h-4 w-4" /> {t.common.search}
        </Button>
      </div>
    </div>
  );
}
