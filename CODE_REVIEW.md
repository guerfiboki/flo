# 🔍 WaveCamp — Senior Code Review

---

## 🔴 CRITICAL ISSUES (Must fix before going live)

---

### 🔴 #1 — RACE CONDITION: Double Booking is 100% possible

**File:** `lib/availability.ts` + `app/api/bookings/route.ts`

**The bug:**
```
User A: checks availability → available ✓
User B: checks availability → available ✓  (same dates, same listing)
User A: creates booking      → success
User B: creates booking      → success ← DOUBLE BOOKING. Money taken twice.
```

The check-then-insert is NOT atomic. There is no DB-level lock between `isAvailable()` and `prisma.booking.create()`. On a busy listing, this WILL happen in production.

**Fix — Use a DB transaction + unique constraint:**

```prisma
// prisma/schema.prisma — add a unique constraint on overlapping bookings
// PostgreSQL doesn't support range exclusion in Prisma directly,
// so we use a serializable transaction + application-level check inside it.

model Booking {
  // ... existing fields
  @@index([listingId, checkIn, checkOut])
}
```

```typescript
// app/api/bookings/route.ts — wrap in serializable transaction
const booking = await prisma.$transaction(async (tx) => {
  // Re-check availability INSIDE the transaction with a lock
  const conflicting = await tx.booking.findFirst({
    where: {
      listingId: listing.id,
      status: { in: ['PENDING', 'CONFIRMED'] },
      OR: [
        // New booking overlaps existing: starts before existing ends AND ends after existing starts
        {
          checkIn:  { lt: checkOut },
          checkOut: { gt: checkIn },
        },
      ],
    },
  })

  if (conflicting) {
    throw new Error('DATES_UNAVAILABLE')
  }

  // Also check blocked dates inside the transaction
  const blockedConflict = await tx.blockedDate.findFirst({
    where: {
      listingId: listing.id,
      date: { gte: checkIn, lt: checkOut },
    },
  })

  if (blockedConflict) {
    throw new Error('DATES_UNAVAILABLE')
  }

  return tx.booking.create({ data: { ...bookingData } })
}, {
  isolationLevel: 'Serializable', // Critical — prevents phantom reads
})
```

---

### 🔴 #2 — DUPLICATE CHARGES: Calling /api/checkout multiple times creates multiple Stripe sessions for the same booking

**File:** `app/api/checkout/route.ts`

**The bug:**
```typescript
// No check if a payment already exists for this booking.
// User hits back, re-submits → a second Stripe session is created.
// Both sessions can be paid independently → two charges for one booking.
await prisma.payment.create({  // Will THROW if payment exists (unique constraint),
  ...                           // but the Stripe session was ALREADY created above.
                                // Money is already in flight.
})
```

**Fix — Check for existing payment first, and wrap Stripe + DB in a try/catch that voids the session on DB failure:**

```typescript
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookingId } = await req.json()
  if (!bookingId || typeof bookingId !== 'string') {
    return NextResponse.json({ error: 'Invalid bookingId' }, { status: 400 })
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { listing: true, payment: true },
  })

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 🔐 Owner check — user can only checkout their OWN booking
  if (booking.userId !== (session.user as any).id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ✅ Idempotency — return existing session URL if already pending
  if (booking.payment) {
    if (booking.payment.status === 'PAID') {
      return NextResponse.json({ error: 'Already paid' }, { status: 409 })
    }
    // Re-use existing pending session instead of creating a new one
    const existing = await stripe.checkout.sessions.retrieve(booking.payment.stripeSessionId)
    if (existing.status === 'open') {
      return NextResponse.json({ url: existing.url })
    }
    // Session expired — delete old payment record and create a new one
    await prisma.payment.delete({ where: { id: booking.payment.id } })
  }

  // Only create Stripe session if booking is PENDING
  if (booking.status !== 'PENDING') {
    return NextResponse.json({ error: 'Booking is not in a payable state' }, { status: 409 })
  }

  const nights = getNights(booking.checkIn, booking.checkOut)
  let stripeSession: Stripe.Checkout.Session

  try {
    stripeSession = await stripe.checkout.sessions.create({ /* ... */ })
  } catch (err) {
    return NextResponse.json({ error: 'Payment provider error' }, { status: 502 })
  }

  try {
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        stripeSessionId: stripeSession.id,
        amount: booking.totalPrice,
        currency: 'eur',
        status: 'PENDING',
      },
    })
  } catch (err) {
    // DB failed AFTER Stripe session was created — expire the session to prevent orphaned charges
    await stripe.checkout.sessions.expire(stripeSession.id).catch(() => {})
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }

  return NextResponse.json({ url: stripeSession.url })
}
```

---

### 🔴 #3 — BROKEN OWNERSHIP CHECK: Any logged-in user can pay any other user's booking

**File:** `app/api/checkout/route.ts`

```typescript
// CURRENT CODE — NO ownership check!
const booking = await prisma.booking.findUnique({
  where: { id: bookingId },
  include: { listing: true },
})
// Any authenticated user can pass ANY bookingId and checkout for it.
```

**Fix:** Already shown in #2 — add `booking.userId !== (session.user as any).id` check.

---

### 🔴 #4 — WEBHOOK: Two separate DB writes are NOT atomic — partial state corruption on failure

**File:** `app/api/webhooks/stripe/route.ts`

```typescript
// If the first update succeeds but the second throws,
// payment is PAID but booking is still PENDING.
// Stripe will retry the webhook → you update payment again (fine),
// but the booking CONFIRM might fail again silently.
await prisma.payment.update({ ... status: 'PAID' })   // succeeds
await prisma.booking.update({ ... status: 'CONFIRMED' }) // crashes → booking stays PENDING
```

**Fix — Wrap in a transaction + make webhook idempotent:**

```typescript
if (event.type === 'checkout.session.completed') {
  const stripeSession = event.data.object as Stripe.CheckoutSession
  const bookingId = stripeSession.metadata?.bookingId

  if (!bookingId) {
    console.error('Webhook: missing bookingId in metadata', stripeSession.id)
    return NextResponse.json({ received: true }) // Return 200 so Stripe doesn't retry endlessly
  }

  try {
    await prisma.$transaction([
      prisma.payment.update({
        where: { stripeSessionId: stripeSession.id },
        data: {
          status: 'PAID',
          stripePaymentIntent: stripeSession.payment_intent as string,
        },
      }),
      prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      }),
    ])
  } catch (err) {
    console.error('Webhook DB update failed:', err)
    // Return 500 so Stripe retries — it will retry with exponential backoff
    return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
  }
}
```

---

### 🔴 #5 — PRICE TAMPERING: Price is calculated client-side and trusted server-side

**File:** `components/BookingWidget.tsx` + `app/api/bookings/route.ts`

The frontend calculates and displays the total. The server recalculates from `listing.pricePerNight`. This part is actually okay... BUT:

```typescript
// checkout/route.ts line 40:
unit_amount: Math.round(booking.listing.pricePerNight * 100),
// quantity: nights

// This matches booking.totalPrice only if pricePerNight hasn't changed since booking was created.
// Admin edits the price AFTER booking but before payment → Stripe charges new price,
// DB has old totalPrice. They're now out of sync.
```

**Fix:**
```typescript
// Use booking.totalPrice (locked at booking time) for Stripe, NOT the live listing price
unit_amount: Math.round((booking.totalPrice / nights) * 100),
// OR store a snapshot of pricePerNight on the Booking model itself:
// pricePerNightSnapshot  Float  // locked when booking is created
```

---

### 🔴 #6 — NO RATE LIMITING on auth endpoints — trivial to brute-force passwords

**Files:** `app/api/auth/register/route.ts`, `lib/auth.ts`

There is zero rate limiting. An attacker can:
1. Enumerate valid emails (register returns `"Email already in use"`)
2. Brute-force any password at thousands of requests/sec

**Fix:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
// lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const authRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 min per IP
})

// In authorize() callback:
const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
const { success } = await authRatelimit.limit(ip)
if (!success) throw new Error('Too many login attempts')
```

---

## 🟠 IMPORTANT ISSUES

---

### 🟠 #7 — MASS ASSIGNMENT: PATCH /api/listings/[slug] accepts raw body with no validation

**File:** `app/api/listings/[slug]/route.ts`

```typescript
const body = await req.json()
const listing = await prisma.listing.update({
  where: { slug: params.slug },
  data: body,  // ← Passes ANYTHING from the request body directly to Prisma
})
```

An admin (or compromised admin token) can set `{ "id": "...", "slug": "admin" }` or any field including relations. Add a strict Zod schema for PATCH.

**Fix:**
```typescript
const patchSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  location: z.string().optional(),
  pricePerNight: z.number().positive().optional(),
  capacity: z.number().int().positive().optional(),
  images: z.array(z.string().url()).optional(),
  amenities: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  category: z.enum(['SURF_CAMP', 'ROOM', 'VILLA', 'HOSTEL']).optional(),
}).strict() // .strict() rejects unknown keys

const data = patchSchema.parse(body)
```

---

### 🟠 #8 — UNVALIDATED INPUT in block-dates POST — crash or injection via malformed dates

**File:** `app/api/admin/block-dates/route.ts`

```typescript
const { listingId, dates, reason } = await req.json()
// dates is completely unvalidated. If dates is not an array:
dates.map(...)  // → TypeError: dates.map is not a function → 500 crash

// If a date string is malicious: new Date("'; DROP TABLE...")
// Prisma parameterizes queries so SQL injection won't work,
// but new Date(invalidString) → Invalid Date → Prisma throws an ugly 500
```

**Fix:**
```typescript
const blockSchema = z.object({
  listingId: z.string().cuid(),
  dates: z.array(z.string().datetime()).min(1).max(365),
  reason: z.string().max(200).optional(),
})
const { listingId, dates, reason } = blockSchema.parse(await req.json())
```

---

### 🟠 #9 — AVAILABILITY LOGIC BUG: `eachDayOfInterval` includes checkout day — blocks it for next guest

**File:** `lib/availability.ts`

```typescript
const days = eachDayOfInterval({
  start: booking.checkIn,
  end: booking.checkOut,  // ← checkout day is included in unavailable dates
})
```

If Guest A checks out on June 15, Guest B cannot check IN on June 15, even though the room is free that morning. This is wrong for any hotel/camp — checkout day should be available for the next guest to check in.

**Fix:**
```typescript
import { subDays } from 'date-fns'

const days = eachDayOfInterval({
  start: booking.checkIn,
  end: subDays(booking.checkOut, 1), // Don't block the checkout day
})
```

And in `isAvailable`, the overlap check should use:
```typescript
// Booking overlaps if: newCheckIn < existingCheckOut AND newCheckOut > existingCheckIn
// (standard half-open interval comparison)
```

---

### 🟠 #10 — TIMEZONE BUG: Dates stored and compared in UTC, displayed in local time

**Files:** everywhere dates are used

When a user in GMT+2 (Morocco is UTC+1 in summer) selects "June 15" in the date picker:
```
new Date("June 15") → 2024-06-15T00:00:00.000+02:00 → stored as 2024-06-14T22:00:00.000Z in Postgres
```

`isAvailable` uses `isSameDay()` which compares in LOCAL server time. If your server is UTC, a booking for "June 15" is stored as June 14 at 22:00 UTC. The comparison breaks.

**Fix:**
```typescript
// When creating bookings, normalize to start-of-day UTC
import { startOfDay } from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'

// Server-side: always normalize incoming dates
const checkIn = startOfDay(new Date(data.checkIn))
const checkOut = startOfDay(new Date(data.checkOut))

// For isSameDay comparisons, compare formatted strings instead:
const fmt = (d: Date) => d.toISOString().slice(0, 10) // 'yyyy-MM-dd'
return !requestedDays.some(day => unavailable.some(u => fmt(u) === fmt(day)))
```

---

### 🟠 #11 — SESSION TOKEN: JWT role is baked in at login and never refreshed

**File:** `lib/auth.ts`

```typescript
async jwt({ token, user }) {
  if (user) {
    token.role = (user as any).role  // Set once at login, never updated
  }
  return token
}
```

If you demote an admin (change DB role to USER), their JWT still says ADMIN until it expires. JWTs default to 30-day expiry in NextAuth. A fired admin can access the admin panel for 30 days.

**Fix:**
```typescript
async jwt({ token, user, trigger }) {
  if (user) {
    token.id = user.id
    token.role = (user as any).role
  }
  // Re-fetch role from DB on every session check (or every N minutes)
  if (trigger === 'update' || !token.roleVerifiedAt || 
      Date.now() - (token.roleVerifiedAt as number) > 5 * 60 * 1000) {
    const dbUser = await prisma.user.findUnique({
      where: { id: token.id as string },
      select: { role: true },
    })
    if (dbUser) token.role = dbUser.role
    token.roleVerifiedAt = Date.now()
  }
  return token
}
```

---

### 🟠 #12 — NO PAGINATION: Admin bookings query fetches ALL rows

**File:** `app/api/admin/bookings/route.ts`, `app/admin/bookings/page.tsx`

```typescript
const bookings = await prisma.booking.findMany({
  include: { listing: true, user: true, payment: true },
  // No limit, no pagination
})
```

At 10,000 bookings this query will: (a) time out, (b) OOM the serverless function, (c) send megabytes of JSON to the browser.

**Fix:**
```typescript
const page = Number(searchParams.get('page') ?? 1)
const limit = 50

const [bookings, total] = await Promise.all([
  prisma.booking.findMany({
    include: { listing: true, user: true, payment: true },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  }),
  prisma.booking.count(),
])
```

---

### 🟠 #13 — STALE PRICE in Stripe: `unit_amount` uses listing's CURRENT price, not booking price

Already partially covered in #5, but the exact line to flag:

```typescript
// checkout/route.ts:40
unit_amount: Math.round(booking.listing.pricePerNight * 100),
```

If admin changes price from €89 → €149 after booking but before payment, user is charged €149 but DB says €89.

**Fix:** Add `pricePerNightSnapshot` to Booking schema and use that.

---

## 🟡 MINOR ISSUES

---

### 🟡 #14 — `formatPrice` uses `'en-EU'` locale which doesn't exist

**File:** `lib/utils.ts`

```typescript
new Intl.NumberFormat('en-EU', { ... })
// 'en-EU' is not a valid BCP 47 locale tag. Falls back to system default.
// Use 'en-GB' or 'fr-MA' (Morocco) or just 'en-US' depending on your audience.
```

---

### 🟡 #15 — Availability fetch in BookingWidget silently swallows errors

**File:** `components/BookingWidget.tsx`

```typescript
fetch(`/api/listings/${listing.slug}/availability`)
  .catch(() => {}) // Silently fails — user sees no blocked dates, can book taken dates
```

If this fetch fails (network error, server error), `unavailableDates` stays `[]` and ALL dates appear available. The server will reject the double-booking, but the UX is terrible — user filled out all details, hit Pay, got to Stripe, then got bounced.

**Fix:**
```typescript
const [unavailableDates, setUnavailableDates] = useState<Date[]>([])
const [availabilityError, setAvailabilityError] = useState(false)

useEffect(() => {
  fetch(`/api/listings/${listing.slug}/availability`)
    .then((r) => { if (!r.ok) throw new Error(); return r.json() })
    .then((dates: string[]) => setUnavailableDates(dates.map((d) => new Date(d))))
    .catch(() => setAvailabilityError(true))
}, [listing.slug])

// In the JSX:
{availabilityError && (
  <p className="text-xs text-amber-600">
    ⚠️ Could not load availability. Please contact us to confirm dates.
  </p>
)}
```

---

### 🟡 #16 — `slug` field on listings has no format validation — spaces/special chars break URLs

**File:** `app/api/listings/route.ts`

```typescript
slug: z.string().min(3),
// Admin can create slug "my surf camp!" → URL becomes /listings/my%20surf%20camp!
```

**Fix:**
```typescript
slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
```

---

### 🟡 #17 — `notes` and `guestName` fields have no max length — potential DoS / DB bloat

**File:** `app/api/bookings/route.ts`

```typescript
guestName: z.string().min(2),          // No max → 10MB string accepted
notes: z.string().optional(),          // No max → unbounded
```

**Fix:**
```typescript
guestName: z.string().min(2).max(100),
guestPhone: z.string().max(20).optional(),
notes: z.string().max(1000).optional(),
```

---

### 🟡 #18 — `isDateUnavailable` in BookingWidget runs a linear scan on every render

**File:** `components/BookingWidget.tsx`

```typescript
const isDateUnavailable = (date: Date) => {
  // Called for every day rendered in the calendar (typically 42 cells)
  return unavailableDates.some(  // O(n) scan for EACH day
    (u) => format(u, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
  )
}
```

With 200+ unavailable dates this runs 42 × 200 = 8,400 string comparisons on every calendar render. Use a Set.

**Fix:**
```typescript
const unavailableSet = useMemo(
  () => new Set(unavailableDates.map((d) => format(d, 'yyyy-MM-dd'))),
  [unavailableDates]
)

const isDateUnavailable = useCallback((date: Date) => {
  if (isBefore(date, startOfDay(new Date()))) return true
  return unavailableSet.has(format(date, 'yyyy-MM-dd'))
}, [unavailableSet])
```

---

### 🟡 #19 — Missing DB indexes — slow queries at scale

**File:** `prisma/schema.prisma`

```prisma
// MISSING INDEXES:
// Booking queries filter by listingId + status constantly (availability check)
// Booking queries filter by userId constantly (user's bookings)
// BlockedDate queries filter by listingId constantly
// Payment queries filter by stripeSessionId (webhook)

model Booking {
  @@index([listingId, status])      // availability check
  @@index([userId])                 // user bookings page
  @@index([checkIn, checkOut])      // date range queries
}

model BlockedDate {
  @@index([listingId, date])        // availability check
}
```

---

### 🟡 #20 — `config = { api: { bodyParser: false } }` is Pages Router syntax — does nothing in App Router

**File:** `app/api/webhooks/stripe/route.ts`

```typescript
export const config = { api: { bodyParser: false } }
// This is the Next.js Pages Router pattern. In App Router, body parsing
// is already raw when you call req.text(). This export does nothing
// but is misleading. Remove it.
```

In App Router, the correct way to ensure the raw body is available for Stripe signature verification is already being done correctly (`req.text()`). Just delete the export.

---

### 🟡 #21 — CORS: API routes have no CORS headers — third-party clients can call your booking API

For an MVP this is acceptable, but at production any site can POST to `/api/bookings` from a browser. Add CORS middleware or at minimum verify the `Origin` header on state-changing routes.

---

## 💡 RECOMMENDED ARCHITECTURE FIXES (Summary)

### Fix 1: Atomic availability check (most critical)
Replace two-step check-then-insert with a single serializable transaction using DB-level overlap detection.

### Fix 2: Idempotent checkout
Before creating a Stripe session, check if one already exists. Return existing open session URL. This handles back-button, double-click, network retries.

### Fix 3: Price snapshot on Booking
```prisma
model Booking {
  pricePerNightSnapshot  Float   // Set at booking creation, never changes
}
```

### Fix 4: Add these missing indexes
```prisma
model Booking {
  @@index([listingId, status])
  @@index([userId])
}
model BlockedDate {
  @@index([listingId, date])
}
```

### Fix 5: Add NEXTAUTH_SECRET validation on startup
```typescript
// lib/auth.ts
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET is not set. Authentication is insecure.')
}
```

### Fix 6: Validate bookingId ownership in checkout
```typescript
if (booking.userId !== (session.user as any).id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

## 🏁 Severity Summary

| # | Issue | Severity | File |
|---|-------|----------|------|
| 1 | Race condition → double booking | 🔴 Critical | availability.ts + bookings/route.ts |
| 2 | Duplicate Stripe charges | 🔴 Critical | checkout/route.ts |
| 3 | Any user can checkout any booking | 🔴 Critical | checkout/route.ts |
| 4 | Non-atomic webhook DB writes | 🔴 Critical | webhooks/stripe/route.ts |
| 5 | Price mismatch Stripe vs DB | 🔴 Critical | checkout/route.ts |
| 6 | No rate limiting on auth | 🔴 Critical | auth/register + auth.ts |
| 7 | Mass assignment in PATCH listing | 🟠 Important | listings/[slug]/route.ts |
| 8 | Unvalidated block-dates input | 🟠 Important | admin/block-dates/route.ts |
| 9 | Checkout day blocked for next guest | 🟠 Important | availability.ts |
| 10 | Timezone date comparison bug | 🟠 Important | availability.ts |
| 11 | Stale role in JWT (30-day window) | 🟠 Important | lib/auth.ts |
| 12 | No pagination on admin queries | 🟠 Important | admin/bookings |
| 13 | Live price used in Stripe | 🟠 Important | checkout/route.ts |
| 14 | Invalid locale 'en-EU' | 🟡 Minor | lib/utils.ts |
| 15 | Silent availability fetch failure | 🟡 Minor | BookingWidget.tsx |
| 16 | Slug allows invalid URL chars | 🟡 Minor | listings/route.ts |
| 17 | Unbounded string fields | 🟡 Minor | bookings/route.ts |
| 18 | O(n) date scan on render | 🟡 Minor | BookingWidget.tsx |
| 19 | Missing DB indexes | 🟡 Minor | schema.prisma |
| 20 | Dead config export in webhook | 🟡 Minor | webhooks/stripe/route.ts |
| 21 | No CORS policy | 🟡 Minor | API routes |

**Bottom line:** Issues #1–#6 are business-critical and will cause real money loss or security breaches in production. Fix those before anything else.
