'use client';

import { useState } from 'react';
import { Phone, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

interface ContactLandlordButtonsProps {
  phone: string;
  landlordName: string;
  propertyTitle: string;
}

export function ContactLandlordButtons({ phone, landlordName, propertyTitle }: ContactLandlordButtonsProps) {
  const [callOpen, setCallOpen] = useState(false);
  const [waOpen, setWaOpen] = useState(false);

  function handleCall() {
    setCallOpen(false);
    window.location.href = `tel:${phone}`;
  }

  function handleWhatsApp() {
    setWaOpen(false);
    const msg = encodeURIComponent(`Hi, I'm your tenant at ${propertyTitle}`);
    const clean = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${clean.startsWith('91') ? clean : '91' + clean}?text=${msg}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCallOpen(true)}>
        <Phone className="h-3.5 w-3.5" /> Call
      </Button>
      <Button size="sm" className="gap-1.5 bg-secondary-600 hover:bg-secondary-700" onClick={() => setWaOpen(true)}>
        <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
      </Button>

      {/* Call confirmation */}
      <Dialog open={callOpen} onOpenChange={setCallOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Call {landlordName}?</DialogTitle>
            <DialogDescription>
              Pehli call par <span className="font-bold text-foreground">₹3</span> charge hoga. Kya aap proceed karna chahte hain?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCallOpen(false)}>Cancel</Button>
            <Button onClick={handleCall} className="gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Haan, Call Karo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp confirmation */}
      <Dialog open={waOpen} onOpenChange={setWaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>WhatsApp {landlordName}?</DialogTitle>
            <DialogDescription>
              Pehle message par <span className="font-bold text-foreground">₹3</span> charge hoga. Kya aap proceed karna chahte hain?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWaOpen(false)}>Cancel</Button>
            <Button onClick={handleWhatsApp} className="gap-1.5 bg-secondary-600 hover:bg-secondary-700">
              <MessageSquare className="h-3.5 w-3.5" /> Haan, Bhejo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
