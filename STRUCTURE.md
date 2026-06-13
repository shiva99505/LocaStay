# LocaStay — Project Structure

```
LocaStay/
├── backend/          ← Express.js REST API (Node.js + TypeScript)
│   ├── src/
│   │   ├── server.ts             ← Entry point (runs on port 4000)
│   │   ├── routes/
│   │   │   ├── auth.routes.ts    ← POST /api/auth/register, login, logout
│   │   │   ├── properties.routes.ts
│   │   │   ├── bookings.routes.ts
│   │   │   ├── reviews.routes.ts
│   │   │   ├── payments.routes.ts
│   │   │   ├── notifications.routes.ts
│   │   │   ├── landlord.routes.ts
│   │   │   ├── tenant.routes.ts
│   │   │   ├── admin.routes.ts
│   │   │   └── upload.routes.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts  ← JWT Bearer token validation
│   │   │   └── error.middleware.ts
│   │   └── lib/
│   │       ├── supabase.ts         ← Supabase client factory
│   │       └── types.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example  ← Copy to .env and fill in credentials
│
├── frontend/         ← Next.js 15 UI (React + TypeScript)
│   ├── src/
│   │   ├── app/                    ← Pages (no /api folder — calls backend)
│   │   ├── components/             ← UI components
│   │   └── lib/
│   │       ├── supabase/
│   │       │   ├── client.ts       ← Browser Supabase client
│   │       │   └── server.ts       ← Server Supabase client
│   │       └── api/
│   │           ├── client.ts       ← Universal fetch wrapper → backend
│   │           ├── auth.ts         ← Auth helpers
│   │           ├── properties.ts   ← Property API calls
│   │           └── bookings.ts     ← Booking API calls
│   ├── next.config.ts
│   ├── package.json
│   └── .env.example  ← Copy to .env and fill in credentials
│
└── supabase/         ← Supabase Edge Functions + DB migrations
    ├── migrations/001_schema_and_rls.sql
    └── functions/
        ├── booking-notification/
        └── rent-reminder/
```

## How to run

### 1. Backend
```bash
cd backend
cp .env.example .env       # add Supabase credentials
npm install
npm run dev                # starts on http://localhost:4000
```

### 2. Frontend
```bash
cd frontend
cp .env.example .env       # add Supabase + API URL
npm install
npm run dev                # starts on http://localhost:3000
```

## API Endpoints (Backend — port 4000)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | — | Create account |
| POST | /api/auth/login | — | Sign in |
| POST | /api/auth/logout | ✓ | Sign out |
| GET | /api/auth/me | ✓ | Current user |
| GET | /api/properties | — | List with filters |
| POST | /api/properties | LANDLORD | Create property |
| GET | /api/properties/:id | — | Property detail |
| PATCH | /api/properties/:id | LANDLORD | Update |
| DELETE | /api/properties/:id | LANDLORD | Delist |
| POST | /api/properties/:id/save | ✓ | Toggle saved |
| POST | /api/bookings | TENANT | Book property |
| PATCH | /api/bookings/:id | LANDLORD | Approve/reject |
| DELETE | /api/bookings/:id | ✓ | Cancel |
| POST | /api/reviews | TENANT | Write review |
| PATCH | /api/payments/:id | TENANT | Mark paid |
| GET | /api/notifications | ✓ | List |
| POST | /api/notifications/read | ✓ | Mark read |
| GET | /api/landlord/profile | LANDLORD | Profile |
| PATCH | /api/landlord/profile | LANDLORD | Update |
| GET | /api/tenant/profile | ✓ | Profile |
| POST | /api/upload | ✓ | Upload file |
| GET | /api/admin/dashboard | ADMIN | Stats |
| PATCH | /api/admin/users/:id | ADMIN | Verify/suspend |
| PATCH | /api/admin/properties/:id | ADMIN | Approve/reject |
