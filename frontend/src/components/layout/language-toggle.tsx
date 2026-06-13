'use client';

import { Languages } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { localeMeta, locales } from '@/lib/i18n/dictionaries';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change language" className="rounded-full">
          <Languages className="h-[1.1rem] w-[1.1rem]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {locales.map((code) => (
          <DropdownMenuItem key={code} onClick={() => setLocale(code)} className="gap-2.5">
            <span className="text-base leading-none">{localeMeta[code].flag}</span>
            {localeMeta[code].native}
            {locale === code && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-600" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
