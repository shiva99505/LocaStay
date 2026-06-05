# LocaStay - India's GPS-Powered Rural Property Marketplace

A modern, production-ready SaaS platform connecting rural property owners with tenants using GPS technology, AI-powered features, and secure transactions.

## 🎯 Overview

LocaStay is a complete rural property marketplace with three powerful dashboards:
- **Tenant Dashboard**: Discover, book, and manage rural properties
- **Landlord Dashboard**: List properties, manage tenants, track rent
- **Admin Dashboard**: Platform governance, analytics, and fraud detection

## ✨ Key Features

### Tenant Features
- GPS-based property discovery
- Advanced property search & filters
- Property comparison & wishlists
- Secure booking system
- Monthly rent tracking & UPI payments
- Agreement management
- Complaint & grievance system
- Emergency contacts
- Bill tracking (water, electricity, internet)
- Voice search in Hindi

### Landlord Features
- Multi-step property upload
- Media management (photos, videos, documents)
- Tenant management & verification
- Rent collection tracking
- Auto-generated agreements & receipts
- Property analytics & performance
- QR code generation for properties
- AI pricing suggestions
- Bulk property upload
- Expense tracking

### Admin Features
- User & property management
- Booking & dispute resolution
- Revenue & payment analytics
- Content management
- Support ticket system
- KYC verification
- Fraud & fake listing detection
- District & village-wise analytics

## 🏗️ Tech Stack

### Frontend
- **Next.js 15** - React framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **ShadCN UI** - Component library
- **Framer Motion** - Animations
- **React Hook Form** - Form management
- **Zustand** - State management

### Backend
- **Node.js** - Runtime
- **Express.js** - API framework
- **PostgreSQL** - Database
- **Prisma** - ORM
- **Clerk** - Authentication
- **Cloudinary** - Media storage

### Integrations
- **Google Maps API** - Location services
- **Razorpay** - Payments
- **WhatsApp API** - Notifications
- **Twilio** - SMS
- **AWS S3** - Backup storage

### DevOps
- **Vercel** - Frontend deployment
- **AWS EC2/RDS** - Backend & database
- **Docker** - Containerization
- **GitHub Actions** - CI/CD

## 📁 Project Structure

```
locastay/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── (auth)/         # Authentication pages
│   │   ├── dashboard/      # Dashboards (tenant, landlord, admin)
│   │   ├── properties/     # Property pages
│   │   ├── api/            # API routes
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/             # ShadCN components
│   │   ├── dashboard/      # Dashboard components
│   │   ├── property/       # Property components
│   │   └── common/         # Shared components
│   ├── lib/                # Utilities & helpers
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript types
│   ├── utils/              # Helper functions
│   └── styles/             # Global styles
├── prisma/
│   └── schema.prisma       # Database schema
├── public/
│   ├── locales/            # i18n translations
│   └── icons/              # App icons
└── .env.example            # Environment variables
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone & Install**
```bash
git clone <repo>
cd locastay
npm install
```

2. **Setup Environment**
```bash
cp .env.example .env.local
# Fill in your API keys and database URL
```

3. **Setup Database**
```bash
npm run db:push
npm run db:seed
```

4. **Run Development Server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📋 Database Schema

### Core Tables
- **users** - User accounts with roles (tenant, landlord, admin)
- **profiles** - Extended user information
- **properties** - Property listings with GPS coordinates
- **bookings** - Property booking requests & approvals
- **rent_payments** - Monthly rent tracking & payments
- **agreements** - Rental agreements & documents
- **reviews** - Property ratings & feedback
- **amenities** - Property amenities/facilities
- **notifications** - User alerts & messages
- **disputes** - Conflict resolution system
- **documents** - User verification documents
- **bills** - Utility bill tracking

## 🔐 Authentication & Authorization

- **Clerk.dev** for user authentication
- **Role-based access control** (RBAC)
  - Tenant: View properties, make bookings, pay rent
  - Landlord: Manage properties, collect rent, create agreements
  - Admin: Manage all users, properties, bookings, payments, disputes

## 💳 Payment Integration

- **Razorpay** for secure UPI/card payments
- Monthly rent collection with auto-generated receipts
- Refund processing for rejected bookings
- Payment history & analytics

## 📍 Location Services

- **Google Maps API** integration
- GPS-based property discovery
- Distance calculation to nearby amenities
- Live navigation to properties
- Location sharing features

## 🌐 Internationalization

- **Hindi & English** support
- Dynamic language switching
- Locale-specific formatting (currency, dates)
- RTL support ready

## 🎨 Design Features

- **Mobile-first responsive design**
- **Light & Dark mode** toggle
- **Accessible UI** (WCAG 2.1)
- **Smooth animations** with Framer Motion
- **Loading states** & error handling
- **Rural-friendly UX** with simple navigation

## 📱 PWA Features

- **Offline support** via service workers
- **Installable app** manifest
- **Web app shortcuts**
- **Push notifications** ready

## 🔄 Deployment

### Frontend (Vercel)
```bash
npm run build
# Deploy to Vercel
```

### Backend (AWS)
```bash
docker build -t locastay .
docker push <registry>
# Deploy to AWS ECS/EC2
```

## 📚 Documentation

- [API Documentation](docs/API.md)
- [Database Schema](prisma/schema.prisma)
- [Setup Guide](docs/SETUP.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Contributing](CONTRIBUTING.md)

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@locastay.com
- 💬 WhatsApp: +91-XXXXXXXXXX
- 🐛 Issues: [GitHub Issues](issues)

## 🎯 Roadmap

### Phase 1 (Complete)
- [x] Project setup & architecture
- [x] Database schema
- [ ] Authentication system
- [ ] Tenant dashboard core

### Phase 2 (In Progress)
- [ ] Property listing & discovery
- [ ] Booking system
- [ ] Rent tracking & payments
- [ ] Landlord dashboard

### Phase 3 (Planned)
- [ ] Admin dashboard
- [ ] Notifications & messaging
- [ ] AI features (pricing, description, fraud detection)
- [ ] Analytics & reporting

### Phase 4 (Future)
- [ ] Mobile app (React Native)
- [ ] Advanced AI features
- [ ] Integration with banks
- [ ] International expansion

## 👥 Team

Built with ❤️ by the LocaStay team.

---

**Made in India 🇮🇳 | GPS-Powered | Secure | Scalable**
