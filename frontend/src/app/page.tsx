import Link from 'next/link';
import {
  MapPin, ShieldCheck, FileText, IndianRupee, Star, ArrowRight, Building2,
  Users, Home as HomeIcon, Sparkles, Quote, CheckCircle2,
} from 'lucide-react';
import { AnimatedCounter } from '@/components/common/animated-counter';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { HeroSearch } from '@/components/marketing/hero-search';
import { PropertyCard, type PropertyCardData } from '@/components/common/property-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getFeaturedProperties } from '@/lib/data-access';
import { fromJsonArray } from '@/lib/constants';
import { formatNumber } from '@/lib/utils';
import { dictionaries } from '@/lib/i18n/dictionaries';

export const revalidate = 60;

const hero = dictionaries.en.hero;

const TRUST_POINTS = [
  { icon: MapPin, title: 'GPS-mapped listings', description: 'Every property is pinned with exact coordinates and verified distances to schools, hospitals, markets and transit.' },
  { icon: ShieldCheck, title: 'Verified landlords & tenants', description: 'KYC documents, police verification badges and platform reviews keep both sides accountable.' },
  { icon: FileText, title: 'Digital rental agreements', description: 'Generate, e-sign and store legally-formatted agreements — no paperwork runs, no disputes.' },
  { icon: IndianRupee, title: 'Transparent rent tracking', description: 'Automated reminders, UPI payments and a shared ledger so rent never becomes a guessing game.' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Search by place, not just price', description: 'Type a village, town or landmark — or simply use voice search in your language — and explore GPS-pinned homes nearby.' },
  { step: '02', title: 'Compare verified options', description: 'Check ratings, amenities, distances to essentials and real reviews from past tenants before you decide.' },
  { step: '03', title: 'Book & sign — all online', description: 'Send a request, chat with the landlord, generate a digital agreement and pay your deposit securely via UPI.' },
  { step: '04', title: 'Track rent & stay supported', description: 'Get rent reminders, raise maintenance requests and reach local emergency contacts — all from one dashboard.' },
];

const TESTIMONIALS = [
  { name: 'Aarav Mehta', role: 'Schoolteacher · Sehore, MP', quote: 'I found a verified PG within walking distance of my school in two days. The GPS map made all the difference — I knew exactly what was around before I even visited.' },
  { name: 'Sunita Devi', role: 'Landlord · Begusarai, Bihar', quote: 'Listing my house took fifteen minutes and the AI rent suggestion was spot on. I now manage tenants, agreements and rent collection from my phone.' },
  { name: 'Imran Khan', role: 'Migrant worker · Bikaner, Rajasthan', quote: 'The Hindi interface and WhatsApp support helped me explain exactly what I needed. Found a place near the railway station within my budget.' },
];

const STATS = [
  { value: 16, suffix: '+', label: 'GPS-verified properties live' },
  { value: 5, suffix: '', label: 'States across rural & semi-urban India' },
  { value: 11, suffix: '', label: 'Verified landlords onboarded' },
  { value: 4.6, suffix: '★', label: 'Average tenant satisfaction rating' },
];

function toPropertyCardData(property: Awaited<ReturnType<typeof getFeaturedProperties>>[number]): PropertyCardData {
  const distances = [
    property.distanceToSchool, property.distanceToHospital, property.distanceToMarket,
    property.distanceToBusStand, property.distanceToCollege, property.distanceToRailway, property.distanceToATM,
  ].filter((value): value is number => typeof value === 'number');

  return {
    id: property.id,
    title: property.title,
    type: property.type,
    rent: property.rent,
    village: property.village,
    city: property.city,
    state: property.state,
    coverImage: property.coverImage,
    images: property.images ?? [],
    rating: property.rating,
    reviewCount: property.reviewCount,
    isVerified: property.isVerified,
    isFeatured: property.isFeatured,
    totalRooms: property.totalRooms,
    occupiedRooms: property.occupiedRooms,
    nearestDistanceKm: distances.length ? Math.min(...distances) : null,
  };
}

export default async function LandingPage() {
  const featured = (await getFeaturedProperties()).map(toPropertyCardData);

  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary-50/70 via-background to-background dark:from-primary-500/10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgb(14_59_154_/_0.12),transparent_55%)] dark:bg-[radial-gradient(circle_at_top_right,_rgb(85_147_247_/_0.18),transparent_55%)]" />
          <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 pb-16 pt-14 text-center sm:px-6 sm:pb-20 sm:pt-20 lg:px-8">
            <Badge variant="brand" className="gap-1.5 px-4 py-1.5 text-[11px]">
              <Sparkles className="h-3 w-3" /> India&apos;s First GPS-Powered Rural Property Marketplace
            </Badge>
            <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {hero.title1} <span className="bg-gradient-to-r from-primary-700 to-secondary-600 bg-clip-text text-transparent dark:from-primary-300 dark:to-secondary-400">{hero.title2}</span>
            </h1>
            <p className="max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              {hero.subtitle}
            </p>

            <div className="w-full max-w-3xl">
              <HeroSearch />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button asChild size="lg" className="gap-2 shadow-glow-primary">
                <Link href="/properties"><HomeIcon className="h-4 w-4" /> {hero.ctaTenant}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link href="/landlord/properties"><Building2 className="h-4 w-4" /> {hero.ctaLandlord}</Link>
              </Button>
            </div>

            <div className="grid w-full max-w-3xl grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border/70 bg-card/70 px-3 py-4 backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <p className="font-display text-2xl font-extrabold text-foreground sm:text-3xl">
                    <AnimatedCounter to={stat.value} decimals={stat.value % 1 !== 0 ? 1 : 0} suffix={stat.suffix} />
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground sm:text-xs">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust signals */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="normal-case tracking-normal">Why LocaStay</Badge>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Built for trust, designed for Bharat&apos;s rural rental economy
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              We verify every listing and every account so finding — or filling — a home never feels like a gamble.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_POINTS.map((point) => (
              <div key={point.title} className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-primary-300">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-700 transition-colors group-hover:bg-primary-700 group-hover:text-white dark:bg-primary-500/15 dark:text-primary-300">
                  <point.icon className="h-[22px] w-[22px]" />
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-foreground">{point.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{point.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Featured properties */}
        <section className="border-y border-border bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <Badge variant="outline" className="normal-case tracking-normal">Handpicked for you</Badge>
                <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                  Featured GPS-verified homes
                </h2>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
                  A snapshot of trending listings across Madhya Pradesh, Bihar, Rajasthan, Gujarat and Maharashtra — refreshed daily.
                </p>
              </div>
              <Button asChild variant="outline" className="gap-1.5">
                <Link href="/properties">View all properties <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>

            {featured.length > 0 ? (
              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {featured.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
                New listings are being verified — check back soon, or run <code className="rounded bg-muted px-1.5 py-0.5 text-xs">npm run db:seed</code> to load demo data.
              </div>
            )}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="normal-case tracking-normal">How it works</Badge>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              From search to move-in, in four simple steps
            </h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-4">
            {HOW_IT_WORKS.map((item, idx) => (
              <div key={item.step} className="relative rounded-2xl border border-border bg-card p-6 shadow-card">
                <span className="font-display text-3xl font-extrabold text-primary-200 dark:text-primary-500/30">{item.step}</span>
                <h3 className="mt-3 font-display text-base font-bold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                {idx < HOW_IT_WORKS.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-border lg:block" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="border-y border-border bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="normal-case tracking-normal">Voices from the community</Badge>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Trusted by tenants and landlords across rural India
              </h2>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {TESTIMONIALS.map((person) => (
                <figure key={person.name} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-card">
                  <Quote className="h-6 w-6 text-primary-300 dark:text-primary-500/40" />
                  <blockquote className="flex-1 text-sm leading-relaxed text-foreground/90">&ldquo;{person.quote}&rdquo;</blockquote>
                  <figcaption>
                    <p className="text-sm font-bold text-foreground">{person.name}</p>
                    <p className="text-xs text-muted-foreground">{person.role}</p>
                  </figcaption>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* Dual CTA */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 to-primary-900 p-8 text-white shadow-xl sm:p-10">
              <Users className="h-9 w-9 text-primary-200" />
              <h3 className="mt-5 font-display text-2xl font-extrabold sm:text-3xl">Looking for a home near your workplace?</h3>
              <p className="mt-3 max-w-md text-sm text-primary-100/90">
                Browse GPS-verified houses, PGs and hostels with transparent pricing, real reviews and instant booking requests.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-primary-50">
                {['See exact distance to school, hospital & market', 'Chat & book directly with verified landlords', 'Pay rent & deposits securely via UPI'].map((line) => (
                  <li key={line} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-secondary-300" /> {line}</li>
                ))}
              </ul>
              <Button asChild size="lg" variant="secondary" className="mt-7 gap-2 bg-white text-primary-800 hover:bg-primary-50">
                <Link href="/properties">Start exploring homes <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-card sm:p-10">
              <Building2 className="h-9 w-9 text-secondary-600" />
              <h3 className="mt-5 font-display text-2xl font-extrabold text-foreground sm:text-3xl">Have a property to rent out?</h3>
              <p className="mt-3 max-w-md text-sm text-muted-foreground">
                List in minutes with AI-assisted pricing & descriptions, manage tenants, generate agreements and track rent — all in one dashboard.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-foreground/90">
                {['Get AI-suggested rent based on your locality', 'Auto-generate digital rental agreements & QR listings', 'Track payments, leads, maintenance & expenses'].map((line) => (
                  <li key={line} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-secondary-600" /> {line}</li>
                ))}
              </ul>
              <Button asChild size="lg" className="mt-7 gap-2 shadow-glow-primary">
                <Link href="/landlord/properties">List your property <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
