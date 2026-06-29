'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

interface MapPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629]; // center of India
const DEFAULT_ZOOM = 5;
const PIN_ZOOM = 15;

export function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef    = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // Destroy any stale instance (React StrictMode mounts twice)
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null; }

    let cancelled = false;

    // Dynamically import Leaflet (browser only)
    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      // Fix default marker icon paths broken by webpack
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const center: [number, number] = lat != null && lng != null ? [lat, lng] : DEFAULT_CENTER;
      const zoom = lat != null && lng != null ? PIN_ZOOM : DEFAULT_ZOOM;

      const map = L.map(containerRef.current!, { center, zoom, zoomControl: true });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      if (lat != null && lng != null) {
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current = marker;
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onChange(+pos.lat.toFixed(6), +pos.lng.toFixed(6));
        });
      }

      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        const roundedLat = +clickLat.toFixed(6);
        const roundedLng = +clickLng.toFixed(6);

        if (markerRef.current) {
          markerRef.current.setLatLng([roundedLat, roundedLng]);
        } else {
          const marker = L.marker([roundedLat, roundedLng], { draggable: true }).addTo(map);
          markerRef.current = marker;
          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            onChange(+pos.lat.toFixed(6), +pos.lng.toFixed(6));
          });
        }
        onChange(roundedLat, roundedLng);
      });
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current  = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external lat/lng changes (manual text input) → move map + marker
  useEffect(() => {
    if (!mapRef.current || lat == null || lng == null) return;
    import('leaflet').then((L) => {
      if (!mapRef.current) return;
      mapRef.current.setView([lat, lng], PIN_ZOOM);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
        markerRef.current = marker;
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onChange(+pos.lat.toFixed(6), +pos.lng.toFixed(6));
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      className="h-64 w-full overflow-hidden rounded-xl border border-border"
      style={{ zIndex: 0 }}
    />
  );
}
