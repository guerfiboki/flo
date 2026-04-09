// file: app/api/bookings/route.ts — FIXED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calculateTotalPrice } from '@/lib/utils'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { startOfDay } from 'date-fns'

const bookingSchema = z.object({
  listingId: z.string().cuid('Invalid listing ID'),
  checkIn: z.string().datetime('Invalid check-in date'),
  checkOut: z.string().datetime('Invalid check-out date'),
  guests: z.number().int().positive().max(50),
  guestName: z.string().min(2).max(100),
  guestEmail: z.string().email().max(255),
  guestPhone: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Please log in to book' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bookingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid booking data', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const data = parsed.data

  const checkIn = startOfDay(new Date(data.checkIn))
  const checkOut = startOfDay(new Date(data.checkOut))

  if (checkIn >= checkOut) {
    return NextResponse.json({ error: 'Check-out must be after check-in' }, { status: 400 })
  }

  const MS_PER_DAY = 86_400_000
  const nights = (checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY
  if (nights > 365) {
    return NextResponse.json({ error: 'Booking cannot exceed 365 nights' }, { status: 400 })
  }

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({
        where: { id: data.listingId },
      })

      if (!listing || !listing.active) {
        throw new Error('LISTING_NOT_FOUND')
      }

      if (data.guests > listing.capacity) {
        throw new Error('TOO_MANY_GUESTS')
      }

      const conflictingBooking = await tx.booking.findFirst({
        where: {
          listingId: listing.id,
          status: { in: ['PENDING', 'CONFIRMED'] },
          checkIn: { lt: checkOut },
          checkOut: { gt: checkIn },
        },
      })

      if (conflictingBooking) {
        throw new Error('DATES_UNAVAILABLE')
      }

      const blockedConflict = await tx.blockedDate.findFirst({
        where: {
          listingId: listing.id,
          date: { gte: checkIn, lt: checkOut },
        },
      })

      if (blockedConflict) {
        throw new Error('DATES_UNAVAILABLE')
      }

      const totalPrice = calculateTotalPrice(listing.pricePerNight, checkIn, checkOut)

      return tx.booking.create({
        data: {
          listingId: listing.id,
          userId: (session.user as any).id,
          checkIn,
          checkOut,
          guests: data.guests,
          totalPrice,
          pricePerNightSnapshot: listing.pricePerNight, // ✅ FIX ADDED HERE
          guestName: data.guestName,
          guestEmail: data.guestEmail,
          guestPhone: data.guestPhone,
          notes: data.notes,
          status: 'PENDING',
        },
      })
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 5000,
    })

    return NextResponse.json(booking, { status: 201 })

  } catch (err: any) {
    const errorMap: Record<string, [string, number]> = {
      LISTING_NOT_FOUND: ['Listing not found or unavailable', 404],
      TOO_MANY_GUESTS: ['Guest count exceeds capacity', 400],
      DATES_UNAVAILABLE: ['These dates are not available', 409],
    }

    const [message, status] = errorMap[err?.message] ?? ['Booking failed. Please try again.', 500]
    console.error('Booking error:', err)
    return NextResponse.json({ error: message }, { status })
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const isAdmin = (session.user as any).role === 'ADMIN'

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = 50

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: isAdmin ? {} : { userId },
      include: {
        listing: { select: { title: true, slug: true, location: true, images: true } },
        payment: true
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.booking.count({ where: isAdmin ? {} : { userId } }),
  ])

  return NextResponse.json({
    bookings,
    total,
    page,
    pages: Math.ceil(total / limit)
  })
}
