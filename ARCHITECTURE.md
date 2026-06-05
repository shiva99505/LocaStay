# LocaStay - Complete Architecture Document

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER (Next.js)                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Tenant Dashboard │  │Landlord Dashboard│  │Admin Dashboard│ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                   │
│  Components:                                                     │
│  - Property Cards, Maps, Filters                                │
│  - Booking Forms, Payment UI                                    │
│  - Analytics Charts, User Management                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
         ┌────────────────────────────────────────┐
         │  Middleware & Authentication (Clerk)    │
         │  - RBAC enforcement                    │
         │  - Protected API routes                │
         │  - Session management                  │
         └────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     API LAYER (Next.js Routes)                  │
│  /api/properties      - Property CRUD operations                │
│  /api/bookings        - Booking management                      │
│  /api/payments        - Rent tracking & receipts               │
│  /api/agreements      - Document generation                    │
│  /api/users           - User management                        │
│  /api/notifications   - Alert system                           │
│  /api/analytics       - Data aggregation                       │
│  /api/search          - Full-text search                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
         ┌────────────────────────────────────────┐
         │  Business Logic & Services              │
         │  - PropertyService                     │
         │  - BookingService                      │
         │  - PaymentService                      │
         │  - NotificationService                 │
         │  - AgreementService                    │
         │  - AnalyticsService                    │
         └────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 DATA LAYER (Prisma ORM)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  PostgreSQL  │  │  Cloudinary  │  │ Google Maps API      │ │
│  │  - 30+ Tables│  │  - Media     │  │ - Location Services  │ │
│  │  - Indexes   │  │  - Storage   │  │ - Geocoding          │ │
│  │  - Relations │  │  - CDN       │  │ - Distance Matrix    │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
         ┌────────────────────────────────────────┐
         │  External Services & Integrations      │
         │  - Razorpay (Payments)                │
         │  - WhatsApp API (Notifications)       │
         │  - Twilio (SMS)                       │
         │  - SendGrid (Email)                   │
         │  - AWS S3 (Backups)                   │
         └────────────────────────────────────────┘
```

## Database Schema Highlights

### Core Entities
```sql
Users (Base) → TenantProfile / LandlordProfile
    ├── Documents (KYC, Verification)
    ├── Notifications
    ├── EmergencyContacts
    └── Bills

Properties (By Landlord)
    ├── Amenities (Many-to-Many)
    ├── Images/Videos (Stored in Cloudinary)
    ├── Bookings (Tenant requests)
    ├── Reviews (From tenants)
    ├── RentPayments (Monthly tracking)
    ├── Agreements (Digital documents)
    └── QRCode (For property)

Bookings (Tenant → Property)
    ├── RentPayments
    └── Agreement

RentPayments
    ├── Razorpay Integration
    ├── Receipt Generation
    └── Analytics
```

### Key Features by Module

#### TENANT MODULE
```
Dashboard
├── Welcome & Recommendations
├── Recently Viewed Properties
├── Saved/Favorite Properties
└── Nearby Properties (GPS-based)

Property Discovery
├── Advanced Search (type, price, amenities)
├── GPS-based filtering
├── Property cards with quick info
└── Detailed property view with:
    ├── Image/Video galleries
    ├── Owner information
    ├── Distance calculations
    ├── Reviews & ratings
    ├── Virtual tour (360°)
    ├── QR code
    └── Contact options (WhatsApp, Call)

Booking
├── Request submission
├── Status tracking
└── Booking history

Rent Tracker
├── Monthly status
├── Payment history
├── UPI integration (Razorpay)
├── Auto-generated receipts
├── PDF download
└── Alerts (late payment, due reminders)

Map My Stay
├── Pin current property
├── Live navigation
├── Share location
└── Favorite nearby places

Agreement Center
├── View documents
├── Download PDF
└── Renewal reminders

Profile Management
├── Personal details
├── KYC verification (Aadhaar)
├── Rental history
└── Credit score

Additional Features
├── Voice search (Hindi support)
├── Property comparison
├── Wishlist management
├── Complaint system
├── Bill tracking
└── Notification center
```

#### LANDLORD MODULE
```
Dashboard
├── Property statistics
├── Active tenants count
├── Monthly income tracking
├── Pending rent alerts
└── Performance metrics

Property Upload (6-step wizard)
├── Step 1: Basic details (title, type, rent, deposit, size)
├── Step 2: Media (photos, videos, documents)
├── Step 3: Location (GPS, map pin, preview)
├── Step 4: Amenities selection
├── Step 5: Nearby distances (school, hospital, etc.)
└── Step 6: Publish

Property Management
├── Edit details
├── Delete property
├── Availability toggle
├── View inquiries
└── View bookings

Rent Collection
├── Collection history
├── Due alerts
├── Auto receipts
└── Monthly reports

Agreement Generator
├── Template-based generation
├── Auto-fill tenant data
├── E-signature support
├── PDF download

QR Code Generator
├── Unique code per property
├── Flyer download
├── Poster generation
└── Scan analytics

Tenant Management
├── Active tenants
├── Past tenants
├── Verification status
└── Document storage

Analytics
├── Property views
├── Booking requests
├── Conversion rates
└── Revenue charts

AI Features
├── Pricing suggestions
├── Description generator
└── Occupancy prediction
```

#### ADMIN MODULE
```
Dashboard
├── Total users count
├── Total properties
├── Active bookings
├── Revenue overview
└── Key metrics

User Management
├── User list with search
├── Role management
├── Suspend/ban users
├── KYC approval
└── Document verification

Property Management
├── Approve listings
├── Reject with reason
├── Feature promotion
├── Fake property removal
└── Verification

Booking Management
├── Track all bookings
├── Status management
├── Dispute resolution
└── Payment verification

Rent Monitoring
├── Payment reports
├── Revenue tracking
├── Late payment alerts
└── Forecasting

Content Management
├── Homepage banners
├── Notices & alerts
└── Blog posts

Support Center
├── Ticket tracking
├── Complaint management
├── Chat support
└── Resolution tracking

Reports
├── District-wise analytics
├── Village-wise breakdown
├── Occupancy reports
├── Revenue forecasting

AI Moderation
├── Fraud detection
├── Fake listing identification
├── Risk scoring
└── Auto-moderation
```

## API Endpoint Structure

### Properties
```
GET    /api/properties                    # List with filters & pagination
GET    /api/properties/:id                # Single property detail
POST   /api/properties                    # Create (landlord only)
PUT    /api/properties/:id                # Update
DELETE /api/properties/:id                # Delete
GET    /api/properties/nearby             # GPS-based search
GET    /api/properties/search             # Full-text search
POST   /api/properties/:id/views          # Track views
```

### Bookings
```
POST   /api/bookings                      # Create booking request
GET    /api/bookings                      # List user's bookings
GET    /api/bookings/:id                  # Booking detail
PUT    /api/bookings/:id                  # Update status (landlord)
DELETE /api/bookings/:id                  # Cancel booking
```

### Payments
```
POST   /api/payments/create-order         # Razorpay order creation
POST   /api/payments/verify               # Verify payment
GET    /api/payments/history              # Payment history
GET    /api/payments/:id/receipt          # Generate receipt
POST   /api/payments/:id/download         # PDF download
```

### Agreements
```
POST   /api/agreements/generate           # Generate from template
GET    /api/agreements/:id                # Fetch agreement
PUT    /api/agreements/:id/sign           # E-sign document
DELETE /api/agreements/:id                # Cancel agreement
```

### Analytics
```
GET    /api/analytics/dashboard           # Dashboard metrics
GET    /api/analytics/properties          # Property analytics
GET    /api/analytics/revenue             # Revenue reports
GET    /api/analytics/occupancy           # Occupancy data
```

### Users & Auth
```
POST   /api/auth/register                 # User registration
POST   /api/auth/login                    # Login (via Clerk)
POST   /api/users/verify-kyc              # Document upload
GET    /api/users/profile                 # User details
PUT    /api/users/profile                 # Update profile
```

### Notifications
```
GET    /api/notifications                 # Fetch notifications
PUT    /api/notifications/:id/read        # Mark as read
DELETE /api/notifications/:id             # Delete
```

## Security Architecture

```
┌─────────────────────────────────────────────────────┐
│              Security Layers                        │
├─────────────────────────────────────────────────────┤
│ 1. Authentication (Clerk)                           │
│    - JWT tokens                                     │
│    - Session management                            │
│    - Multi-factor auth ready                       │
├─────────────────────────────────────────────────────┤
│ 2. Authorization (RBAC)                            │
│    - Role-based access control                     │
│    - Resource-level permissions                    │
│    - API route protection                          │
├─────────────────────────────────────────────────────┤
│ 3. Data Security                                    │
│    - HTTPS/TLS encryption                          │
│    - Password hashing (bcrypt)                     │
│    - Sensitive data masking                        │
│    - PII encryption                                │
├─────────────────────────────────────────────────────┤
│ 4. API Security                                     │
│    - Rate limiting                                 │
│    - CORS protection                               │
│    - Input validation & sanitization               │
│    - SQL injection prevention (Prisma)             │
│    - XSS protection                                │
├─────────────────────────────────────────────────────┤
│ 5. File Security                                    │
│    - Cloudinary CDN                                │
│    - Antivirus scanning                            │
│    - Size limits & validation                      │
│    - Access control lists                          │
├─────────────────────────────────────────────────────┤
│ 6. Monitoring & Logging                            │
│    - Activity logs                                 │
│    - Error tracking                                │
│    - Fraud detection                               │
│    - Audit trails                                  │
└─────────────────────────────────────────────────────┘
```

## Performance Optimization

### Frontend
- Next.js static generation & ISR
- Code splitting by route
- Image optimization (next/image)
- CSS-in-JS with critical CSS
- Service worker caching

### Backend
- Database indexing strategy
- Query optimization (N+1 prevention)
- Caching layers (Redis ready)
- Pagination for large datasets
- Connection pooling

### Database
- Proper indexing on frequently queried columns
- Denormalization where needed
- Archive old records
- Regular vacuum & maintenance

## Deployment Architecture

### Development
```
Local Machine
├── Next.js dev server (port 3000)
├── PostgreSQL local instance
└── Prisma Studio for data
```

### Staging
```
AWS RDS (PostgreSQL)
Vercel (Preview deployments)
GitHub Actions (Automated testing)
```

### Production
```
┌────────────────────────────────────┐
│         Vercel (Frontend)          │
│  - Next.js deployment              │
│  - Edge functions                  │
│  - CDN distribution                │
│  - Auto-scaling                    │
└────────────────────────────────────┘
            ↓
┌────────────────────────────────────┐
│     AWS Load Balancer (ALB)        │
│  - SSL/TLS termination             │
│  - Request distribution            │
└────────────────────────────────────┘
            ↓
┌────────────────────────────────────┐
│    AWS ECS (API Containers)        │
│  - Docker containers               │
│  - Auto-scaling groups             │
│  - Health checks                   │
└────────────────────────────────────┘
            ↓
┌────────────────────────────────────┐
│    AWS RDS (PostgreSQL)            │
│  - Multi-AZ deployment             │
│  - Automated backups               │
│  - Point-in-time recovery          │
│  - Read replicas                   │
└────────────────────────────────────┘
            ↓
┌────────────────────────────────────┐
│  External Services & Caches        │
│  - Cloudinary CDN                  │
│  - Redis (ElastiCache)             │
│  - Google Maps API                 │
│  - Razorpay                        │
└────────────────────────────────────┘
```

## Scalability Strategy

### Horizontal Scaling
- Stateless API servers
- Load balancing (AWS ALB)
- Auto-scaling groups
- Database read replicas

### Vertical Scaling
- Upgrade server resources
- Database optimization
- Cache layer (Redis)

### Data Partitioning
- Shard by geography (state/district)
- Archive old data
- Backup cold storage

## Monitoring & Analytics

```
Monitoring Stack:
- DataDog / New Relic for APM
- CloudWatch for AWS services
- Error tracking (Sentry)
- Performance monitoring (Web Vitals)

Analytics:
- Google Analytics 4
- Property view trends
- User behavior tracking
- Conversion funnel analysis
- Revenue analytics
```

---

**This architecture ensures:**
- ✅ Scalability to 100k+ properties
- ✅ Sub-second page loads
- ✅ 99.9% uptime
- ✅ Secure transactions
- ✅ Real-time notifications
- ✅ Data-driven insights
