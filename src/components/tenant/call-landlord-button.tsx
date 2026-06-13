'use client';

import { useState } from 'react';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

export function CallLandlordButton({
  phone,
  landlordName,
}: {
  phone: string;
  landlordName: string;
}) {
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    setOpen(false);
    window.location.href = `tel:${phone}`;
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Phone className="h-3.5 w-3.5" /> Call
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Call {landlordName}?</DialogTitle>
            <DialogDescription>
              Pehli call par <span className="font-bold text-foreground">₹3</span> charge hoga. Kya aap proceed karna chahte hain?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirm} className="gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Haan, Call Karo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
