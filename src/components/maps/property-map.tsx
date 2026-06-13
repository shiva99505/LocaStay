'use client';

import { useEffect, useRef } from 'react';

export interface MapProperty {
  id: string;
  title: string;
  city: string;
  state: string;
  rent: number;
  latitude: number;
  longitude: number;
  isVerified: boolean;
  status: string;
}

export interface PropertyMapProps {
  properties: MapProperty[];
  center?: { lat: number; lng: number };
  zoom?: number;
  highlightId?: string;
  className?: string;
}

export function PropertyMap({ properties, center, zoom = 12, highlightId, className }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null);

  useEffect(() => {
    let isMounted = true;
    import('leaflet').then((L) => {
      if (!mapRef.current || !isMounted) return;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const mapCenter = center
        ? [center.lat, center.lng] as [number, number]
        : properties.length > 0
          ? [properties[0].latitude, properties[0].longitude] as [number, number]
          : [22.9734, 78.6569] as [number, number]; // India centre

      const map = L.map(mapRef.current, { center: mapCenter, zoom });
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      properties.forEach((prop) => {
        const isHighlighted = prop.id === highlightId;
        const markerHtml = `
          <div style="
            width: ${isHighlighted ? 36 : 30}px;
            height: ${isHighlighted ? 36 : 30}px;
            border-radius: 50%;
            background: ${prop.status === 'AVAILABLE' ? (prop.isVerified ? '#16a34a' : '#2563eb') : '#9ca3af'};
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 10px; font-weight: 700;
          ">₹</div>
        `;
        const icon = L.divIcon({ html: markerHtml, className: '', iconSize: [isHighlighted ? 36 : 30, isHighlighted ? 36 : 30], iconAnchor: [isHighlighted ? 18 : 15, isHighlighted ? 18 : 15] });
        L.marker([prop.latitude, prop.longitude], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:180px;font-family:sans-serif">
              <p style="font-weight:700;margin:0 0 4px">${prop.title}</p>
              <p style="font-size:12px;color:#666;margin:0 0 4px">${prop.city}, ${prop.state}</p>
              <p style="font-size:13px;font-weight:600;color:#1e3a8a;margin:0">₹${prop.rent.toLocaleString('en-IN')}/month</p>
              ${prop.isVerified ? '<p style="font-size:11px;color:#16a34a;margin:4px 0 0">✓ Verified listing</p>' : ''}
              <a href="/properties/${prop.id}" style="display:block;margin-top:6px;font-size:12px;color:#2563eb;font-weight:600;">View details →</a>
            </div>
          `);
      });

      if (center) {
        const userIcon = L.divIcon({
          html: `<div style="width:16px;height:16px;border-radius:50%;background:#dc2626;border:3px solid white;box-shadow:0 0 0 3px rgba(220,38,38,0.3)"></div>`,
          className: '', iconSize: [16, 16], iconAnchor: [8, 8],
        });
        L.marker([center.lat, center.lng], { icon: userIcon }).addTo(map).bindPopup('You are here');
      }
    });

    return () => {
      isMounted = false;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, [properties, center, zoom, highlightId]);

  return <div ref={mapRef} className={className ?? 'h-full w-full'} />;
}
