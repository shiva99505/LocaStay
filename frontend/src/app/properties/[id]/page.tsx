import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  MapPin, Star, ShieldCheck, BedDouble, Phone, MessageSquare, Calendar,
  School, Hospital, ShoppingCart, Bus, Train, AtSign, Wifi, ExternalLink, ArrowLeft,
  Share2, CheckCircle2,
} from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getPropertyById } from '@/lib/data-access';
import { getIsSaved } from '@/lib/actions/booking.actions';
import { PROPERTY_TYPE_LABELS, type PropertyType } from '@/lib/constants';
import { formatCurrency, formatDate, formatDistanceKm, googleMapsViewUrl, whatsappLink, telLink, initials, cn } from '@/lib/utils';
import { BookPropertyForm } from '@/components/tenant/book-property-form';
import { SavePropertyButton } from '@/components/tenant/save-property-button';
import { ReviewForm } from '@/components/common/review-form';

export const revalidate = 60;

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const property = await getPropertyById(id);
  if (!property) return { title: 'Property not found' };
  return {
    title: `${property.title} — LocaStay`,
    description: property.description ?? `${property.type} for rent in ${property.city}, ${property.state} at ₹${property.rent}/month`,
    openGraph: {
      images: property.coverImage ? [property.coverImage] : [],
    },
  };
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [property, initialSaved] = await Promise.all([
    getPropertyById(id),
    getIsSaved(id),
  ]);
  if (!property) notFound();

  const images    = [property.coverImage, ...property.images].filter(Boolean) as string[];
  const typeLabel = PROPERTY_TYPE_LABELS[property.type as PropertyType] ?? property.type;
  const vacancies = Math.max(property.totalRooms - property.occupiedRooms, 0);

  const distances = [
    { label: 'School',    value: property.distanceToSchool,   icon: School },
    { label: 'Hospital',  value: property.distanceToHospital, icon: Hospital },
    { label: 'Market',    value: property.distanceToMarket,   icon: ShoppingCart },
    { label: 'Bus stand', value: property.distanceToBusStand, icon: Bus },
    { label: 'Railway',   value: property.distanceToRailway,  icon: Train },
    { label: 'ATM',       value: property.distanceToATM,      icon: AtSign },
  ].filter((d): d is { label: string; value: number; icon: typeof School } => typeof d.value === 'number');

  const avgRating = property.reviews.length > 0
    ? property.reviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / property.reviews.length
    : 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex-1">
        {/* ── Image gallery ─────────────────────────────────────────── */}
        <div className="relative bg-muted">
          {images.length > 0 ? (
            <div className="relative mx-auto max-w-7xl">
              <div className="grid h-72 grid-cols-4 gap-1.5 overflow-hidden rounded-b-none px-0 sm:h-80 lg:h-[420px] lg:rounded-b-2xl">
                <div className="relative col-span-2 row-span-2 overflow-hidden rounded-b-none lg:rounded-bl-2xl">
                  <Image
                    src={images[0]} alt={property.title}
                    fill sizes="50vw"
                    className="object-cover"
                    priority  /* hero image — load immediately */
                  />
                </div>
                {images.slice(1, 5).map((img, i) => (
                  <div key={i} className={cn('relative overflow-hidden', i === 1 && 'lg:rounded-tr-2xl', i === 3 && 'lg:rounded-br-2xl')}>
                    <Image src={img} alt={`${property.title} ${i + 2}`} fill sizes="25vw"
                      className="object-cover transition-transform hover:scale-105" />
                  </div>
                ))}
                {images.length < 2 && Array.from({ length: 4 - Math.max(images.length - 1, 0) }).map((_, i) => (
                  <div key={i} className="flex items-center justify-center bg-muted/60">
                    <BedDouble className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center">
              <BedDouble className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

            {/* ── Main content ──────────────────────────────────────── */}
            <div className="flex-1 space-y-6 min-w-0">
              <Link href="/properties" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Back to listings
              </Link>

              {/* Title + badges */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="brand">{typeLabel}</Badge>
                  {property.isVerified && <Badge variant="success" className="gap-1"><ShieldCheck className="h-3 w-3" /> GPS Verified</Badge>}
                  {property.isFeatured && <Badge variant="warning">Featured</Badge>}
                  <Badge variant={vacancies > 0 ? 'info' : 'muted'}>
                    {vacancies > 0 ? `${vacancies} room${vacancies > 1 ? 's' : ''} available` : 'Fully occupied'}
                  </Badge>
                </div>
                <h1 className="mt-3 font-display text-2xl font-extrabold text-foreground sm:text-3xl">{property.title}</h1>
                <p className="mt-1.5 flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {property.address}, {[property.village, property.city, property.state].filter(Boolean).join(', ')}
                </p>
                {property.reviews.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-sm">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    <span className="font-bold">{avgRating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({property.reviews.length} review{property.reviews.length !== 1 ? 's' : ''})</span>
                  </div>
                )}
              </div>

              {/* Pricing + book CTA (inline, visible on mobile) */}
              <Card className="border-primary-200 bg-primary-50/30 dark:border-primary-500/20 dark:bg-primary-500/5">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
                  <div>
                    <p className="font-display text-3xl font-extrabold text-foreground">
                      {formatCurrency(property.rent)}<span className="text-base font-normal text-muted-foreground">/month</span>
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Deposit: <span className="font-semibold text-foreground">{formatCurrency(property.deposit)}</span>
                      {property.squareFeet && <> · <span className="font-semibold text-foreground">{property.squareFeet} sq ft</span></>}
                      · {property.totalRooms} room{property.totalRooms > 1 ? 's' : ''} total
                    </p>
                    {property.availableFrom && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" /> Available from {formatDate(property.availableFrom)}
                      </p>
                    )}
                  </div>
                  <div className="w-full sm:w-auto">
                    <BookPropertyForm propertyId={property.id} propertyTitle={property.title} rent={property.rent} />
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              {property.description && (
                <Card>
                  <CardHeader><CardTitle className="text-base font-bold">About this property</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{property.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Amenities */}
              {property.amenities.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base font-bold">Amenities ({property.amenities.length})</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {property.amenities.map((amenity: { key: string; label: string }) => (
                        <Badge key={amenity.key} variant="outline" className="gap-1.5 normal-case tracking-normal">
                          <Wifi className="h-3 w-3" /> {amenity.label}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Distances */}
              {distances.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-bold">
                      <MapPin className="h-4 w-4 text-primary-600" /> Nearby Distances
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {distances.map(({ label, value, icon: Icon }) => (
                        <div key={label} className="flex items-center gap-2.5 rounded-xl border border-border p-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-500/10">
                            <Icon className="h-4 w-4 text-primary-700 dark:text-primary-300" />
                          </span>
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                            <p className="text-sm font-bold text-foreground">{formatDistanceKm(value)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <a href={googleMapsViewUrl(property.latitude, property.longitude)}
                      target="_blank" rel="noopener noreferrer"
                      className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline dark:text-primary-300">
                      <MapPin className="h-4 w-4" /> View GPS location on map <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </CardContent>
                </Card>
              )}

              {/* Reviews */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base font-bold">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" /> Reviews ({property.reviews.length})
                  </CardTitle>
                  <ReviewForm propertyId={property.id} propertyTitle={property.title} />
                </CardHeader>
                <CardContent className="space-y-4">
                  {property.reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
                  ) : (
                    property.reviews.map((review: { id: string; rating: number; comment: string | null; landlordReply: string | null; createdAt: string; tenant: { name: string | null; avatar: string | null } }) => (
                      <div key={review.id} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded-lg">
                            {review.tenant.avatar
                              ? <img src={review.tenant.avatar} alt={review.tenant.name ?? 'Tenant'} className="h-full w-full rounded-lg object-cover" />
                              : null}
                            <AvatarFallback className="rounded-lg text-xs">{initials(review.tenant.name ?? 'T')}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-foreground">{review.tenant.name}</p>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={cn('h-3 w-3', i < review.rating ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30')} />
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                        </div>
                        {review.comment && <p className="pl-11 text-sm text-foreground/90">{review.comment}</p>}
                        {review.landlordReply && (
                          <div className="ml-11 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">Landlord replied:</span> {review.landlordReply}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Sidebar ───────────────────────────────────────────── */}
            <div className="w-full space-y-4 lg:w-80 lg:shrink-0">
              <div className="sticky top-4 space-y-4">
                {/* Book + save CTA */}
                <Card>
                  <CardContent className="space-y-4 pt-5">
                    <div className="text-center">
                      <p className="font-display text-2xl font-extrabold text-foreground">
                        {formatCurrency(property.rent)}<span className="text-sm font-normal text-muted-foreground">/month</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Deposit: {formatCurrency(property.deposit)}</p>
                    </div>
                    <BookPropertyForm propertyId={property.id} propertyTitle={property.title} rent={property.rent} />
                    <div className="flex gap-2">
                      <SavePropertyButton propertyId={property.id} initialSaved={initialSaved} />
                      <Button variant="outline" size="sm" className="flex-1 gap-1.5">
                        <Share2 className="h-3.5 w-3.5" /> Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Landlord card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Listed by</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 rounded-xl">
                        {property.landlord.user.avatar
                          ? <img src={property.landlord.user.avatar} alt={property.landlord.user.name ?? 'Landlord'} className="h-full w-full rounded-xl object-cover" />
                          : null}
                        <AvatarFallback className="rounded-xl">{initials(property.landlord.user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-display text-base font-bold text-foreground">{property.landlord.user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {property.landlord.user.isVerified
                            ? <span className="flex items-center gap-1 text-secondary-600 dark:text-secondary-400"><ShieldCheck className="h-3 w-3" /> Verified Landlord</span>
                            : 'Landlord'}
                        </p>
                        {property.landlord.user.createdAt && (
                          <p className="text-[11px] text-muted-foreground">
                            Member since {formatDate(property.landlord.user.createdAt, { year: 'numeric', month: 'long' })}
                          </p>
                        )}
                      </div>
                    </div>
                    {property.landlord.responseRate && (
                      <div className="rounded-xl bg-muted/40 px-3 py-2 text-xs">
                        <span className="font-semibold text-foreground">{property.landlord.responseRate}%</span>
                        <span className="text-muted-foreground"> response rate</span>
                      </div>
                    )}
                    <div className="space-y-2">
                      {property.landlord.user.phone && (
                        <Button asChild variant="outline" size="sm" className="w-full gap-1.5">
                          <a href={telLink(property.landlord.user.phone)}>
                            <Phone className="h-3.5 w-3.5" /> Call Landlord
                          </a>
                        </Button>
                      )}
                      {property.landlord.user.phone && (
                        <Button asChild size="sm" className="w-full gap-1.5 bg-secondary-600 hover:bg-secondary-700">
                          <a href={whatsappLink(property.landlord.user.phone, `Hi, I'm interested in your property: ${property.title}`)}
                            target="_blank" rel="noopener noreferrer">
                            <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* GPS verification badge */}
                {property.isVerified && (
                  <Card className="border-secondary-200 bg-secondary-50/30 dark:border-secondary-500/20 dark:bg-secondary-500/5">
                    <CardContent className="flex items-start gap-3 pt-4">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-secondary-600" />
                      <div className="text-xs">
                        <p className="font-bold text-foreground">GPS-verified listing</p>
                        <p className="mt-0.5 text-muted-foreground">Location, distances and landlord details have been independently verified by LocaStay.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
