-- ============================================================
-- LocaStay — Supabase PostgreSQL Schema + RLS
-- Run via: supabase db push  OR paste into SQL Editor
-- ============================================================

-- ----------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- full-text search
CREATE EXTENSION IF NOT EXISTS "postgis" SCHEMA extensions;  -- geo queries (optional)

-- ----------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------
CREATE TYPE user_role            AS ENUM ('TENANT', 'LANDLORD', 'ADMIN');
CREATE TYPE kyc_status           AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE verification_status  AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE property_type        AS ENUM ('HOUSE','HOSTEL','PG','ROOM','FARM_HOUSE','APARTMENT','VILLA');
CREATE TYPE property_status      AS ENUM ('PENDING','AVAILABLE','OCCUPIED','MAINTENANCE','DELISTED','REJECTED');
CREATE TYPE booking_status       AS ENUM ('PENDING','APPROVED','REJECTED','CANCELLED','COMPLETED');
CREATE TYPE payment_status       AS ENUM ('PENDING','PAID','OVERDUE','FAILED','REFUNDED');
CREATE TYPE payment_method       AS ENUM ('UPI','NEFT','CASH','CARD');
CREATE TYPE agreement_status     AS ENUM ('DRAFT','PENDING_SIGNATURE','ACTIVE','EXPIRED','TERMINATED');
CREATE TYPE document_type        AS ENUM ('AADHAAR','PAN','POLICE_VERIFICATION','INCOME_PROOF','PROPERTY_DEED');
CREATE TYPE notification_type    AS ENUM ('BOOKING','PAYMENT','AGREEMENT','KYC','SYSTEM','COMPLAINT','MAINTENANCE','LEAD');
CREATE TYPE complaint_category   AS ENUM ('MAINTENANCE','NEIGHBOR','LANDLORD','SAFETY','BILLING','OTHER');
CREATE TYPE complaint_status     AS ENUM ('OPEN','IN_PROGRESS','RESOLVED','CLOSED');
CREATE TYPE priority_level       AS ENUM ('LOW','MEDIUM','HIGH','URGENT');
CREATE TYPE maintenance_category AS ENUM ('PLUMBING','ELECTRICAL','CLEANING','STRUCTURAL','APPLIANCE','OTHER');
CREATE TYPE expense_category     AS ENUM ('REPAIR','TAX','INSURANCE','UTILITIES','STAFF','MARKETING','OTHER');
CREATE TYPE lead_source          AS ENUM ('WHATSAPP','CALL','SITE_VISIT','WALK_IN');
CREATE TYPE lead_status          AS ENUM ('NEW','CONTACTED','QUALIFIED','CONVERTED','LOST');
CREATE TYPE bill_type            AS ENUM ('WATER','ELECTRICITY','INTERNET','GAS','MAINTENANCE');
CREATE TYPE bill_status          AS ENUM ('PENDING','PAID','OVERDUE');
CREATE TYPE support_category     AS ENUM ('TECHNICAL','BILLING','BOOKING','ACCOUNT','OTHER');
CREATE TYPE ticket_status        AS ENUM ('OPEN','IN_PROGRESS','RESOLVED','CLOSED');
CREATE TYPE fraud_entity_type    AS ENUM ('USER','PROPERTY','BOOKING','REVIEW');
CREATE TYPE fraud_status         AS ENUM ('FLAGGED','UNDER_REVIEW','CONFIRMED','CLEARED');
CREATE TYPE notice_audience      AS ENUM ('ALL','TENANT','LANDLORD');

-- ----------------------------------------------------------------
-- Helper: auto-update updated_at
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ================================================================
-- CORE — Profiles (extends auth.users)
-- ================================================================

-- Single flat profile table — covers both tenant details + base user info.
-- Landlord-specific fields live in landlord_profiles.
CREATE TABLE profiles (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  email             TEXT        UNIQUE NOT NULL,
  phone             TEXT        UNIQUE,
  role              user_role   NOT NULL DEFAULT 'TENANT',
  avatar            TEXT,
  is_verified       BOOLEAN     NOT NULL DEFAULT false,
  is_suspended      BOOLEAN     NOT NULL DEFAULT false,
  language          TEXT        NOT NULL DEFAULT 'en',
  -- Tenant profile fields
  bio               TEXT,
  address           TEXT,
  village           TEXT,
  city              TEXT,
  district          TEXT,
  state             TEXT,
  pincode           TEXT,
  dob               DATE,
  occupation        TEXT,
  monthly_income    INTEGER,
  family_size       INTEGER,
  kyc_status        kyc_status  NOT NULL DEFAULT 'PENDING',
  aadhaar_number    TEXT,
  aadhaar_url       TEXT,
  pan_number        TEXT,
  credit_score      INTEGER     NOT NULL DEFAULT 650,
  preferred_amenities TEXT[]    NOT NULL DEFAULT '{}',
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role  ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_phone ON profiles(phone);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Auto-create a profile row when a new auth.user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role, phone, language)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'TENANT'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'language', 'en')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ================================================================
-- LANDLORD PROFILES
-- ================================================================

CREATE TABLE landlord_profiles (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name       TEXT,
  bio                 TEXT,
  address             TEXT,
  city                TEXT,
  state               TEXT,
  bank_account        TEXT,
  ifsc_code           TEXT,
  upi_id              TEXT,
  pan_number          TEXT,
  gst_number          TEXT,
  verification_status verification_status NOT NULL DEFAULT 'PENDING',
  response_rate       INTEGER     NOT NULL DEFAULT 95,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_landlord_profiles_user_id ON landlord_profiles(user_id);

CREATE TRIGGER trg_landlord_profiles_updated_at
  BEFORE UPDATE ON landlord_profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ================================================================
-- PROPERTIES
-- ================================================================

CREATE TABLE properties (
  id                    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id           UUID            NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
  title                 TEXT            NOT NULL,
  description           TEXT,
  type                  property_type   NOT NULL,
  status                property_status NOT NULL DEFAULT 'PENDING',
  rent                  INTEGER         NOT NULL,
  deposit               INTEGER         NOT NULL DEFAULT 0,
  address               TEXT            NOT NULL,
  village               TEXT,
  city                  TEXT            NOT NULL,
  district              TEXT,
  state                 TEXT            NOT NULL,
  pincode               TEXT            NOT NULL,
  latitude              DOUBLE PRECISION NOT NULL DEFAULT 0,
  longitude             DOUBLE PRECISION NOT NULL DEFAULT 0,
  square_feet           INTEGER,
  available_from        TIMESTAMPTZ     NOT NULL DEFAULT now(),
  total_rooms           INTEGER         NOT NULL DEFAULT 1,
  occupied_rooms        INTEGER         NOT NULL DEFAULT 0,
  -- Media
  cover_image           TEXT,
  images                TEXT[]          NOT NULL DEFAULT '{}',
  videos                TEXT[]          NOT NULL DEFAULT '{}',
  documents             TEXT[]          NOT NULL DEFAULT '{}',
  virtual_tour_url      TEXT,
  -- Nearby distances (km)
  distance_to_school    DOUBLE PRECISION,
  distance_to_hospital  DOUBLE PRECISION,
  distance_to_college   DOUBLE PRECISION,
  distance_to_market    DOUBLE PRECISION,
  distance_to_bus_stand DOUBLE PRECISION,
  distance_to_railway   DOUBLE PRECISION,
  distance_to_atm       DOUBLE PRECISION,
  -- Intelligence
  ai_suggested_rent     INTEGER,
  performance_score     INTEGER         NOT NULL DEFAULT 0,
  -- Metadata
  views                 INTEGER         NOT NULL DEFAULT 0,
  rating                DOUBLE PRECISION NOT NULL DEFAULT 0,
  review_count          INTEGER         NOT NULL DEFAULT 0,
  is_verified           BOOLEAN         NOT NULL DEFAULT false,
  is_featured           BOOLEAN         NOT NULL DEFAULT false,
  rejection_reason      TEXT,
  published_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_properties_landlord_id ON properties(landlord_id);
CREATE INDEX idx_properties_city        ON properties(city);
CREATE INDEX idx_properties_status      ON properties(status);
CREATE INDEX idx_properties_type        ON properties(type);
CREATE INDEX idx_properties_latlon      ON properties(latitude, longitude);
CREATE INDEX idx_properties_search      ON properties USING gin(to_tsvector('english', title || ' ' || COALESCE(description,'') || ' ' || city || ' ' || state));

CREATE TRIGGER trg_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ================================================================
-- AMENITIES (lookup + junction)
-- ================================================================

CREATE TABLE amenities (
  id    UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  key   TEXT  UNIQUE NOT NULL,
  label TEXT  NOT NULL,
  icon  TEXT
);

CREATE TABLE property_amenities (
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  amenity_id  UUID NOT NULL REFERENCES amenities(id)  ON DELETE CASCADE,
  PRIMARY KEY (property_id, amenity_id)
);

-- ================================================================
-- SAVED PROPERTIES
-- ================================================================

CREATE TABLE saved_properties (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, property_id)
);

CREATE INDEX idx_saved_properties_user_id     ON saved_properties(user_id);
CREATE INDEX idx_saved_properties_property_id ON saved_properties(property_id);

-- ================================================================
-- PROPERTY VIEWS
-- ================================================================

CREATE TABLE property_views (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  property_id UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_property_views_property_id ON property_views(property_id);
CREATE INDEX idx_property_views_viewed_at   ON property_views(viewed_at);

-- ================================================================
-- BOOKINGS
-- ================================================================

CREATE TABLE bookings (
  id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id      UUID           NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  status           booking_status NOT NULL DEFAULT 'PENDING',
  move_in_date     TIMESTAMPTZ    NOT NULL,
  duration_months  INTEGER        NOT NULL DEFAULT 11,
  message          TEXT,
  rejection_reason TEXT,
  requested_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
  responded_at     TIMESTAMPTZ
);

CREATE INDEX idx_bookings_tenant_id   ON bookings(tenant_id);
CREATE INDEX idx_bookings_property_id ON bookings(property_id);
CREATE INDEX idx_bookings_status      ON bookings(status);

-- ================================================================
-- RENT PAYMENTS
-- ================================================================

CREATE TABLE rent_payments (
  id                  UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id         UUID           NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  booking_id          UUID           REFERENCES bookings(id) ON DELETE SET NULL,
  period              TEXT           NOT NULL,   -- e.g. "2026-06"
  amount              INTEGER        NOT NULL,
  late_fee            INTEGER        NOT NULL DEFAULT 0,
  due_date            TIMESTAMPTZ    NOT NULL,
  paid_date           TIMESTAMPTZ,
  status              payment_status NOT NULL DEFAULT 'PENDING',
  method              payment_method,
  transaction_id      TEXT,
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  receipt_number      TEXT           UNIQUE,
  notes               TEXT,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX idx_rent_payments_tenant_id   ON rent_payments(tenant_id);
CREATE INDEX idx_rent_payments_property_id ON rent_payments(property_id);
CREATE INDEX idx_rent_payments_status      ON rent_payments(status);
CREATE INDEX idx_rent_payments_due_date    ON rent_payments(due_date);

CREATE TRIGGER trg_rent_payments_updated_at
  BEFORE UPDATE ON rent_payments
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ================================================================
-- AGREEMENTS
-- ================================================================

CREATE TABLE agreements (
  id                   UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id            UUID             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  landlord_id          UUID             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id          UUID             NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  booking_id           UUID             UNIQUE REFERENCES bookings(id) ON DELETE SET NULL,
  rent_amount          INTEGER          NOT NULL,
  deposit_amount       INTEGER          NOT NULL DEFAULT 0,
  start_date           TIMESTAMPTZ      NOT NULL,
  end_date             TIMESTAMPTZ,
  renewal_date         TIMESTAMPTZ,
  terms                TEXT[]           NOT NULL DEFAULT '{}',
  status               agreement_status NOT NULL DEFAULT 'DRAFT',
  tenant_signed_at     TIMESTAMPTZ,
  landlord_signed_at   TIMESTAMPTZ,
  document_url         TEXT,
  created_at           TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_agreements_tenant_id   ON agreements(tenant_id);
CREATE INDEX idx_agreements_landlord_id ON agreements(landlord_id);
CREATE INDEX idx_agreements_property_id ON agreements(property_id);

CREATE TRIGGER trg_agreements_updated_at
  BEFORE UPDATE ON agreements
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ================================================================
-- REVIEWS
-- ================================================================

CREATE TABLE reviews (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id     UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating          INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  images          TEXT[]      NOT NULL DEFAULT '{}',
  landlord_reply  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_property_id ON reviews(property_id);
CREATE INDEX idx_reviews_tenant_id   ON reviews(tenant_id);

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Auto-update property rating + review_count when a review changes
CREATE OR REPLACE FUNCTION sync_property_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_prop_id UUID;
BEGIN
  v_prop_id := COALESCE(NEW.property_id, OLD.property_id);
  UPDATE properties
  SET
    rating       = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE property_id = v_prop_id),
    review_count = (SELECT COUNT(*) FROM reviews WHERE property_id = v_prop_id),
    updated_at   = now()
  WHERE id = v_prop_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_property_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION sync_property_rating();

-- ================================================================
-- KYC / DOCUMENTS
-- ================================================================

CREATE TABLE documents (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type             document_type NOT NULL,
  url              TEXT          NOT NULL,
  number           TEXT,
  status           kyc_status    NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_type    ON documents(type);

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ================================================================
-- NOTIFICATIONS
-- ================================================================

CREATE TABLE notifications (
  id         UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID              NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      TEXT              NOT NULL,
  message    TEXT              NOT NULL,
  link       TEXT,
  is_read    BOOLEAN           NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ       NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ================================================================
-- COMPLAINTS
-- ================================================================

CREATE TABLE complaints (
  id          UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID              NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID              REFERENCES properties(id) ON DELETE SET NULL,
  category    complaint_category NOT NULL,
  title       TEXT              NOT NULL,
  description TEXT              NOT NULL,
  attachments TEXT[]            NOT NULL DEFAULT '{}',
  status      complaint_status  NOT NULL DEFAULT 'OPEN',
  priority    priority_level    NOT NULL DEFAULT 'MEDIUM',
  resolution  TEXT,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT now()
);

CREATE INDEX idx_complaints_user_id ON complaints(user_id);
CREATE INDEX idx_complaints_status  ON complaints(status);

-- ================================================================
-- EMERGENCY CONTACTS
-- ================================================================

CREATE TABLE emergency_contacts (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  phone      TEXT        NOT NULL,
  relation   TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_emergency_contacts_user_id ON emergency_contacts(user_id);

-- ================================================================
-- BILLS
-- ================================================================

CREATE TABLE bills (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        bill_type   NOT NULL,
  provider    TEXT,
  amount      DOUBLE PRECISION NOT NULL,
  due_date    TIMESTAMPTZ NOT NULL,
  paid_date   TIMESTAMPTZ,
  status      bill_status NOT NULL DEFAULT 'PENDING',
  bill_number TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bills_user_id ON bills(user_id);
CREATE INDEX idx_bills_type    ON bills(type);

-- ================================================================
-- QR CODES
-- ================================================================

CREATE TABLE qr_codes (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID        UNIQUE NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  code        TEXT        UNIQUE NOT NULL,
  scans       INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- MAINTENANCE REQUESTS
-- ================================================================

CREATE TABLE maintenance_requests (
  id          UUID                 PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID                 NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id   UUID                 REFERENCES auth.users(id) ON DELETE SET NULL,
  category    maintenance_category NOT NULL,
  title       TEXT                 NOT NULL,
  description TEXT                 NOT NULL,
  images      TEXT[]               NOT NULL DEFAULT '{}',
  priority    priority_level       NOT NULL DEFAULT 'MEDIUM',
  status      complaint_status     NOT NULL DEFAULT 'OPEN',
  cost        INTEGER,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ          NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ          NOT NULL DEFAULT now()
);

CREATE INDEX idx_maintenance_property_id ON maintenance_requests(property_id);
CREATE INDEX idx_maintenance_status      ON maintenance_requests(status);

CREATE TRIGGER trg_maintenance_updated_at
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ================================================================
-- EXPENSES (Landlord)
-- ================================================================

CREATE TABLE expenses (
  id          UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id UUID             NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
  property_id UUID             REFERENCES properties(id) ON DELETE SET NULL,
  category    expense_category NOT NULL,
  amount      INTEGER          NOT NULL,
  date        TIMESTAMPTZ      NOT NULL DEFAULT now(),
  note        TEXT,
  receipt_url TEXT,
  created_at  TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_landlord_id ON expenses(landlord_id);

-- ================================================================
-- LEADS (CRM)
-- ================================================================

CREATE TABLE leads (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id UUID        NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
  property_id UUID        REFERENCES properties(id) ON DELETE SET NULL,
  tenant_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  name        TEXT        NOT NULL,
  phone       TEXT        NOT NULL,
  message     TEXT,
  source      lead_source NOT NULL DEFAULT 'SITE_VISIT',
  status      lead_status NOT NULL DEFAULT 'NEW',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_landlord_id ON leads(landlord_id);
CREATE INDEX idx_leads_status      ON leads(status);

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ================================================================
-- COMPARISON LISTS
-- ================================================================

CREATE TABLE comparison_lists (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL DEFAULT 'My Comparison',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE comparison_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id     UUID NOT NULL REFERENCES comparison_lists(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id)       ON DELETE CASCADE,
  UNIQUE (list_id, property_id)
);

-- ================================================================
-- RENTAL HISTORY
-- ================================================================

CREATE TABLE rental_histories (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id      UUID        REFERENCES properties(id) ON DELETE SET NULL,
  landlord_name    TEXT        NOT NULL,
  address          TEXT        NOT NULL,
  rent_amount      INTEGER     NOT NULL,
  start_date       TIMESTAMPTZ NOT NULL,
  end_date         TIMESTAMPTZ,
  reason_for_leaving TEXT,
  rating           INTEGER     CHECK (rating BETWEEN 1 AND 5),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rental_histories_profile_id ON rental_histories(profile_id);

-- ================================================================
-- BLOG POSTS
-- ================================================================

CREATE TABLE blog_posts (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id UUID        REFERENCES landlord_profiles(id) ON DELETE SET NULL,
  title       TEXT        NOT NULL,
  slug        TEXT        UNIQUE NOT NULL,
  excerpt     TEXT,
  content     TEXT        NOT NULL,
  cover_image TEXT,
  is_published BOOLEAN    NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ================================================================
-- CONTENT (Admin)
-- ================================================================

CREATE TABLE banners (
  id        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title     TEXT        NOT NULL,
  subtitle  TEXT,
  image_url TEXT        NOT NULL,
  link      TEXT,
  position  INTEGER     NOT NULL DEFAULT 0,
  is_active BOOLEAN     NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at   TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notices (
  id         UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  title      TEXT           NOT NULL,
  content    TEXT           NOT NULL,
  audience   notice_audience NOT NULL DEFAULT 'ALL',
  is_pinned  BOOLEAN        NOT NULL DEFAULT false,
  is_active  BOOLEAN        NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- ================================================================
-- SUPPORT CENTER
-- ================================================================

CREATE TABLE support_tickets (
  id          UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject     TEXT             NOT NULL,
  category    support_category NOT NULL DEFAULT 'OTHER',
  description TEXT             NOT NULL,
  status      ticket_status    NOT NULL DEFAULT 'OPEN',
  priority    priority_level   NOT NULL DEFAULT 'MEDIUM',
  created_at  TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status  ON support_tickets(status);

CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TABLE ticket_messages (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id  UUID        NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message    TEXT        NOT NULL,
  is_staff   BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);

-- ================================================================
-- FRAUD FLAGS (Admin / AI)
-- ================================================================

CREATE TABLE fraud_flags (
  id          UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type fraud_entity_type NOT NULL,
  user_id     UUID              REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID              REFERENCES properties(id) ON DELETE CASCADE,
  risk_score  INTEGER           NOT NULL DEFAULT 50,
  reasons     TEXT[]            NOT NULL DEFAULT '{}',
  status      fraud_status      NOT NULL DEFAULT 'FLAGGED',
  reviewed_by UUID              REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ       NOT NULL DEFAULT now()
);

CREATE INDEX idx_fraud_flags_entity_type ON fraud_flags(entity_type);
CREATE INDEX idx_fraud_flags_status      ON fraud_flags(status);

CREATE TRIGGER trg_fraud_flags_updated_at
  BEFORE UPDATE ON fraud_flags
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ================================================================
-- LOCAL SERVICES DIRECTORY
-- ================================================================

CREATE TABLE local_services (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT    NOT NULL,
  category    TEXT    NOT NULL,
  phone       TEXT,
  address     TEXT,
  city        TEXT    NOT NULL,
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  rating      DOUBLE PRECISION NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false
);

-- ================================================================
-- ANALYTICS & AUDIT
-- ================================================================

CREATE TABLE analytics_events (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  type       TEXT        NOT NULL,
  entity_id  UUID,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_events_type       ON analytics_events(type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);

CREATE TABLE audit_logs (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action      TEXT        NOT NULL,
  entity_type TEXT        NOT NULL,
  entity_id   UUID,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action   ON audit_logs(action);

-- ================================================================
-- STORAGE BUCKETS
-- ================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('property-images',  'property-images',  true,  5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('avatars',          'avatars',          true,  2097152, ARRAY['image/jpeg','image/png','image/webp']),
  ('documents',        'documents',        false, 10485760, ARRAY['image/jpeg','image/png','application/pdf']),
  ('agreements',       'agreements',       false, 10485760, ARRAY['application/pdf']);

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================
-- Pattern: enable RLS on every table, then add only the policies needed.
-- Admin check uses a helper to keep policies readable.

ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlord_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties            ENABLE ROW LEVEL SECURITY;
ALTER TABLE amenities             ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_amenities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_properties      ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_views        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements            ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews               ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints            ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparison_lists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparison_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_histories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners               ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices               ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_flags           ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_services        ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs            ENABLE ROW LEVEL SECURITY;

-- Admin helper function (avoids recursive policy self-joins)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

-- Helper: get landlord_profile.id for the current user
CREATE OR REPLACE FUNCTION my_landlord_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM landlord_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ────────────────────────────────────────────────────────────────
-- profiles
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "profiles: public read"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "profiles: own insert"
  ON profiles FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles: admin update"
  ON profiles FOR UPDATE USING (is_admin());

-- ────────────────────────────────────────────────────────────────
-- landlord_profiles
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "landlord_profiles: public read"
  ON landlord_profiles FOR SELECT USING (true);

CREATE POLICY "landlord_profiles: own insert"
  ON landlord_profiles FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "landlord_profiles: own update"
  ON landlord_profiles FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "landlord_profiles: admin update"
  ON landlord_profiles FOR UPDATE USING (is_admin());

-- ────────────────────────────────────────────────────────────────
-- properties
-- ────────────────────────────────────────────────────────────────

-- Anyone may view AVAILABLE or OCCUPIED properties
CREATE POLICY "properties: public read available"
  ON properties FOR SELECT
  USING (status IN ('AVAILABLE', 'OCCUPIED'));

-- Landlord sees all their own (including PENDING/REJECTED)
CREATE POLICY "properties: landlord read own"
  ON properties FOR SELECT
  USING (landlord_id = my_landlord_id());

-- Admin sees everything
CREATE POLICY "properties: admin read all"
  ON properties FOR SELECT USING (is_admin());

-- Landlord creates property tied to their profile
CREATE POLICY "properties: landlord insert"
  ON properties FOR INSERT
  WITH CHECK (landlord_id = my_landlord_id());

-- Landlord updates their own (not status — status is set by admin or trigger)
CREATE POLICY "properties: landlord update own"
  ON properties FOR UPDATE
  USING (landlord_id = my_landlord_id());

-- Admin can update everything (approval/rejection/feature)
CREATE POLICY "properties: admin update all"
  ON properties FOR UPDATE USING (is_admin());

-- Landlord can delete their own only when PENDING/DELISTED
CREATE POLICY "properties: landlord delete pending"
  ON properties FOR DELETE
  USING (landlord_id = my_landlord_id() AND status IN ('PENDING', 'DELISTED'));

-- ────────────────────────────────────────────────────────────────
-- amenities / property_amenities — public read, landlord/admin write
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "amenities: public read"     ON amenities         FOR SELECT USING (true);
CREATE POLICY "amenities: admin write"     ON amenities         FOR ALL    USING (is_admin());
CREATE POLICY "prop_amenities: public read" ON property_amenities FOR SELECT USING (true);
CREATE POLICY "prop_amenities: landlord write"
  ON property_amenities FOR ALL
  USING (
    property_id IN (SELECT id FROM properties WHERE landlord_id = my_landlord_id())
    OR is_admin()
  );

-- ────────────────────────────────────────────────────────────────
-- saved_properties
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "saved_properties: own read"
  ON saved_properties FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "saved_properties: own insert"
  ON saved_properties FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_properties: own delete"
  ON saved_properties FOR DELETE USING (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- property_views — anyone can insert, user reads own
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "property_views: public insert"
  ON property_views FOR INSERT WITH CHECK (true);

CREATE POLICY "property_views: landlord read own"
  ON property_views FOR SELECT
  USING (
    property_id IN (SELECT id FROM properties WHERE landlord_id = my_landlord_id())
    OR is_admin()
  );

-- ────────────────────────────────────────────────────────────────
-- bookings
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "bookings: tenant read own"
  ON bookings FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY "bookings: landlord read for properties"
  ON bookings FOR SELECT
  USING (
    property_id IN (SELECT id FROM properties WHERE landlord_id = my_landlord_id())
  );

CREATE POLICY "bookings: admin read all"
  ON bookings FOR SELECT USING (is_admin());

CREATE POLICY "bookings: tenant insert"
  ON bookings FOR INSERT WITH CHECK (tenant_id = auth.uid());

-- Tenant can only cancel their own PENDING booking
CREATE POLICY "bookings: tenant cancel"
  ON bookings FOR UPDATE
  USING (tenant_id = auth.uid() AND status = 'PENDING');

-- Landlord approves/rejects their property's bookings
CREATE POLICY "bookings: landlord respond"
  ON bookings FOR UPDATE
  USING (
    property_id IN (SELECT id FROM properties WHERE landlord_id = my_landlord_id())
  );

-- Admin full control
CREATE POLICY "bookings: admin update"
  ON bookings FOR UPDATE USING (is_admin());

-- ────────────────────────────────────────────────────────────────
-- rent_payments
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "rent_payments: tenant read own"
  ON rent_payments FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY "rent_payments: landlord read for properties"
  ON rent_payments FOR SELECT
  USING (
    property_id IN (SELECT id FROM properties WHERE landlord_id = my_landlord_id())
  );

CREATE POLICY "rent_payments: admin read all"
  ON rent_payments FOR SELECT USING (is_admin());

-- Only backend (service role) / landlord inserts payment records
CREATE POLICY "rent_payments: landlord insert"
  ON rent_payments FOR INSERT
  WITH CHECK (
    property_id IN (SELECT id FROM properties WHERE landlord_id = my_landlord_id())
    OR is_admin()
  );

-- Tenant marks their own payment as paid (UPI simulation)
CREATE POLICY "rent_payments: tenant pay"
  ON rent_payments FOR UPDATE
  USING (tenant_id = auth.uid() AND status = 'PENDING');

CREATE POLICY "rent_payments: landlord update"
  ON rent_payments FOR UPDATE
  USING (
    property_id IN (SELECT id FROM properties WHERE landlord_id = my_landlord_id())
  );

CREATE POLICY "rent_payments: admin update"
  ON rent_payments FOR UPDATE USING (is_admin());

-- ────────────────────────────────────────────────────────────────
-- agreements
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "agreements: tenant read own"
  ON agreements FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY "agreements: landlord read own"
  ON agreements FOR SELECT USING (landlord_id = auth.uid());

CREATE POLICY "agreements: admin read all"
  ON agreements FOR SELECT USING (is_admin());

CREATE POLICY "agreements: landlord insert"
  ON agreements FOR INSERT
  WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "agreements: parties update"
  ON agreements FOR UPDATE
  USING (tenant_id = auth.uid() OR landlord_id = auth.uid() OR is_admin());

-- ────────────────────────────────────────────────────────────────
-- reviews
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "reviews: public read"
  ON reviews FOR SELECT USING (true);

-- Tenant may only review a property they have an APPROVED booking for
CREATE POLICY "reviews: tenant insert"
  ON reviews FOR INSERT
  WITH CHECK (
    tenant_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings
      WHERE tenant_id = auth.uid()
        AND property_id = reviews.property_id
        AND status = 'APPROVED'
    )
  );

CREATE POLICY "reviews: tenant update own"
  ON reviews FOR UPDATE USING (tenant_id = auth.uid());

-- Landlord may only update their own property's review (for landlord_reply)
CREATE POLICY "reviews: landlord reply"
  ON reviews FOR UPDATE
  USING (
    property_id IN (SELECT id FROM properties WHERE landlord_id = my_landlord_id())
  );

CREATE POLICY "reviews: admin delete"
  ON reviews FOR DELETE USING (is_admin());

-- ────────────────────────────────────────────────────────────────
-- documents
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "documents: own read"
  ON documents FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "documents: own insert"
  ON documents FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "documents: admin update"
  ON documents FOR UPDATE USING (is_admin());

-- ────────────────────────────────────────────────────────────────
-- notifications
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "notifications: own read"
  ON notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications: own update (mark read)"
  ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Only service role / edge functions insert notifications
CREATE POLICY "notifications: service insert"
  ON notifications FOR INSERT WITH CHECK (is_admin());

-- ────────────────────────────────────────────────────────────────
-- complaints
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "complaints: own read"
  ON complaints FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "complaints: own insert"
  ON complaints FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "complaints: admin update"
  ON complaints FOR UPDATE USING (is_admin());

-- ────────────────────────────────────────────────────────────────
-- emergency_contacts / bills
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "emergency_contacts: own all"
  ON emergency_contacts FOR ALL USING (user_id = auth.uid());

CREATE POLICY "bills: own read"
  ON bills FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "bills: own update (pay)"
  ON bills FOR UPDATE USING (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- maintenance_requests
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "maintenance: tenant read own"
  ON maintenance_requests FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY "maintenance: landlord read for property"
  ON maintenance_requests FOR SELECT
  USING (
    property_id IN (SELECT id FROM properties WHERE landlord_id = my_landlord_id())
    OR is_admin()
  );

CREATE POLICY "maintenance: tenant insert"
  ON maintenance_requests FOR INSERT WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "maintenance: landlord update"
  ON maintenance_requests FOR UPDATE
  USING (
    property_id IN (SELECT id FROM properties WHERE landlord_id = my_landlord_id())
    OR is_admin()
  );

-- ────────────────────────────────────────────────────────────────
-- expenses — landlord-only
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "expenses: landlord own"
  ON expenses FOR ALL
  USING (landlord_id = my_landlord_id() OR is_admin());

-- ────────────────────────────────────────────────────────────────
-- leads
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "leads: landlord own"
  ON leads FOR ALL
  USING (landlord_id = my_landlord_id() OR is_admin());

-- ────────────────────────────────────────────────────────────────
-- comparison_lists / comparison_items
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "comparison_lists: own all"
  ON comparison_lists FOR ALL USING (user_id = auth.uid());

CREATE POLICY "comparison_items: own all"
  ON comparison_items FOR ALL
  USING (
    list_id IN (SELECT id FROM comparison_lists WHERE user_id = auth.uid())
  );

-- ────────────────────────────────────────────────────────────────
-- rental_histories
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "rental_histories: own read"
  ON rental_histories FOR SELECT
  USING (profile_id = auth.uid() OR is_admin());

CREATE POLICY "rental_histories: own insert"
  ON rental_histories FOR INSERT WITH CHECK (profile_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- blog_posts — public read published, landlord CRUD own
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "blog_posts: public read published"
  ON blog_posts FOR SELECT USING (is_published = true);

CREATE POLICY "blog_posts: landlord read own"
  ON blog_posts FOR SELECT USING (landlord_id = my_landlord_id());

CREATE POLICY "blog_posts: landlord write"
  ON blog_posts FOR ALL
  USING (landlord_id = my_landlord_id() OR is_admin());

-- ────────────────────────────────────────────────────────────────
-- banners / notices — public read, admin write
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "banners: public read active" ON banners FOR SELECT USING (is_active = true);
CREATE POLICY "banners: admin all"          ON banners FOR ALL   USING (is_admin());
CREATE POLICY "notices: public read active" ON notices FOR SELECT USING (is_active = true);
CREATE POLICY "notices: admin all"          ON notices FOR ALL   USING (is_admin());

-- ────────────────────────────────────────────────────────────────
-- support_tickets / ticket_messages
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "support_tickets: own read"
  ON support_tickets FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "support_tickets: own insert"
  ON support_tickets FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "support_tickets: admin update"
  ON support_tickets FOR UPDATE USING (is_admin());

CREATE POLICY "ticket_messages: own read"
  ON ticket_messages FOR SELECT
  USING (
    ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "ticket_messages: own insert"
  ON ticket_messages FOR INSERT WITH CHECK (sender_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- fraud_flags / local_services / analytics / audit — admin-only
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "fraud_flags: admin all"     ON fraud_flags      FOR ALL    USING (is_admin());
CREATE POLICY "local_services: public read" ON local_services  FOR SELECT USING (true);
CREATE POLICY "local_services: admin write" ON local_services  FOR ALL    USING (is_admin());
CREATE POLICY "analytics: service insert"  ON analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "analytics: admin read"      ON analytics_events FOR SELECT USING (is_admin());
CREATE POLICY "audit_logs: admin read"     ON audit_logs       FOR SELECT USING (is_admin());
CREATE POLICY "audit_logs: service insert" ON audit_logs       FOR INSERT WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────
-- qr_codes — public read, landlord write
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "qr_codes: public read"
  ON qr_codes FOR SELECT USING (true);

CREATE POLICY "qr_codes: landlord write"
  ON qr_codes FOR ALL
  USING (
    property_id IN (SELECT id FROM properties WHERE landlord_id = my_landlord_id())
    OR is_admin()
  );

-- ================================================================
-- STORAGE RLS (Storage Object-level policies)
-- ================================================================

-- property-images: public read, landlord upload under their folder
CREATE POLICY "property-images: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images');

CREATE POLICY "property-images: landlord upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "property-images: landlord delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- avatars: public read, own upload
CREATE POLICY "avatars: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars: own upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars: own delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- documents: private — only owner reads
CREATE POLICY "documents: own read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "documents: own upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- agreements: tenant or landlord reads, service role writes
CREATE POLICY "agreements: parties read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'agreements' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
