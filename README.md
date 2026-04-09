# 🌊 WaveCamp Morocco — Surf Booking Platform MVP

A full-stack SaaS booking platform for surf camps and accommodation in Morocco.
Built with Next.js 14, TypeScript, Tailwind CSS, Prisma, PostgreSQL, Stripe, and NextAuth.

---

## 🗂️ Project Structure

```
moroccan-surf-booking/
├── app/
│   ├── layout.tsx                    # Root layout (fonts, Navbar, Providers)
│   ├── page.tsx                      # Homepage — hero + listings grid
│   ├── not-found.tsx                 # 404 page
│   ├── providers.tsx                 # SessionProvider wrapper
│   ├── globals.css                   # Tailwind + design tokens
│   ├── login/page.tsx                # Sign in page
│   ├── register/page.tsx             # Sign up page
│   ├── listings/[slug]/page.tsx      # Listing detail + booking widget
│   ├── booking/
│   │   └── success/page.tsx          # Post-payment confirmation
│   ├── account/
│   │   └── bookings/page.tsx         # User's bookings history
│   ├── admin/
│   │   ├── layout.tsx                # Admin sidebar layout
│   │   ├── page.tsx                  # Dashboard — stats + recent bookings
│   │   ├── bookings/page.tsx         # All bookings table
│   │   ├── listings/
│   │   │   ├── page.tsx              # Listings grid management
│   │   │   ├── new/page.tsx          # Create listing form
│   │   │   └── [slug]/edit/page.tsx  # Edit listing form
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/route.ts
│       │   └── register/route.ts
│       ├── listings/
│       │   ├── route.ts              # GET all, POST create
│       │   └── [slug]/
│       │       ├── route.ts          # GET, PATCH, DELETE
│       │       └── availability/route.ts
│       ├── bookings/route.ts         # POST create, GET list
│       ├── checkout/route.ts         # POST → Stripe session
│       ├── webhooks/stripe/route.ts  # Stripe webhook handler
│       └── admin/
│           ├── bookings/route.ts
│           └── block-dates/route.ts
├── components/
│   ├── Navbar.tsx
│   ├── ListingCard.tsx
│   ├── BookingWidget.tsx             # Full booking flow (dates → details → pay)
│   ├── DateRangePicker.tsx
│   ├── HeroSearch.tsx
│   └── CategoryFilter.tsx
├── lib/
│   ├── prisma.ts                     # Prisma client singleton
│   ├── auth.ts                       # NextAuth options
│   ├── stripe.ts                     # Stripe client
│   ├── availability.ts               # Booking conflict logic
│   └── utils.ts                      # formatPrice, calculateTotal, etc.
├── prisma/
│   ├── schema.prisma                 # Full DB schema
│   └── seed.ts                       # Sample listings + users
├── middleware.ts                     # Route protection
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.js
└── .env.example
```

---

## 🚀 Run Locally

### 1. Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a cloud DB)
- Stripe account (test mode)
- Stripe CLI (for webhooks)

### 2. Install

```bash
git clone <your-repo>
cd moroccan-surf-booking
npm install
```

### 3. Environment setup

```bash
cp .env.example .env
```

Fill in `.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/wavecamp"
NEXTAUTH_SECRET="any-random-32-char-string"
NEXTAUTH_URL="http://localhost:3000"
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."   # fill in after step 6
```

### 4. Database setup

```bash
npx prisma db push        # Creates the schema in your DB
npx prisma generate       # Generates the Prisma client
npm run db:seed           # Seeds sample listings + users
```

### 5. Start dev server

```bash
npm run dev
# → http://localhost:3000
```

### 6. Stripe webhooks (local)

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the `whsec_...` secret shown in the terminal into `.env` as `STRIPE_WEBHOOK_SECRET`.

### 7. Demo accounts

| Role  | Email                   | Password  |
|-------|-------------------------|-----------|
| Admin | admin@wavecamp.ma       | admin123  |
| User  | surfer@example.com      | user1234  |

---

## 🌍 Deploy to Vercel + Neon

### Database — Neon (free tier)

1. Go to [neon.tech](https://neon.tech) and create a project
2. Copy the connection string
3. Set `DATABASE_URL` in Vercel environment variables

### Deploy

```bash
# Install Vercel CLI
npm i -g vercel

vercel deploy
```

In the Vercel dashboard → **Settings → Environment Variables**, add:

```
DATABASE_URL          = postgresql://...neon.tech/...
NEXTAUTH_SECRET       = <random 32+ char string>
NEXTAUTH_URL          = https://your-domain.vercel.app
STRIPE_SECRET_KEY     = sk_live_... (or sk_test_...)
STRIPE_WEBHOOK_SECRET = whsec_...
```

### After deployment

```bash
# Run migrations on production DB
npx prisma db push --schema=./prisma/schema.prisma
```

### Stripe webhooks (production)

In [Stripe Dashboard](https://dashboard.stripe.com/webhooks), add endpoint:
```
https://your-domain.vercel.app/api/webhooks/stripe
```

Listen for:
- `checkout.session.completed`
- `checkout.session.expired`

---

## ✨ Features Summary

| Feature | Status |
|---------|--------|
| Listing grid with categories | ✅ |
| Listing detail page | ✅ |
| Date range picker + availability | ✅ |
| Guest selector | ✅ |
| No double-booking logic | ✅ |
| Price calculation | ✅ |
| Stripe Checkout (test mode) | ✅ |
| Webhook → confirm booking | ✅ |
| User auth (register/login) | ✅ |
| User bookings history | ✅ |
| Admin dashboard | ✅ |
| Admin: view all bookings | ✅ |
| Admin: create/edit listings | ✅ |
| Admin: block dates | ✅ |
| Mobile-first responsive UI | ✅ |
| Airbnb-inspired design | ✅ |

---

## 🔑 Key URLs

| URL | Description |
|-----|-------------|
| `/` | Homepage (listings grid) |
| `/listings/[slug]` | Listing detail + booking |
| `/booking/success` | Post-payment confirmation |
| `/account/bookings` | User's bookings |
| `/login` | Sign in |
| `/register` | Sign up |
| `/admin` | Admin dashboard |
| `/admin/bookings` | All bookings table |
| `/admin/listings` | Manage listings |
| `/admin/listings/new` | Create listing |
| `/api/...` | REST API endpoints |

---

## 💳 Stripe Test Cards

| Card | Number |
|------|--------|
| Success | `4242 4242 4242 4242` |
| Declined | `4000 0000 0000 0002` |
| Auth required | `4000 0025 0000 3155` |

Use any future expiry date and any 3-digit CVC.

---

## 🏗️ Extending the MVP

- **Email notifications** → Add Resend or SendGrid on booking confirm webhook
- **Image uploads** → Replace URL inputs with Cloudinary or Uploadthing
- **Reviews** → Add a `Review` model linked to `Booking`
- **Multi-currency** → Detect user locale, convert prices
- **i18n** → Add French/Arabic via next-intl
- **Calendar sync** → Export bookings as .ics (iCal)
- **Analytics** → Add Posthog or Plausible
