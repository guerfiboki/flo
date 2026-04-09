// file: lib/availability.ts — FIXED VERSION
import { prisma } from '@/lib/prisma'
import { eachDayOfInterval, subDays } from 'date-fns'

/** Format date as 'yyyy-MM-dd' using UTC — timezone safe */
function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function getUnavailableDates(listingId: string): Promise<Date[]> {
  const [bookings, blockedDates] = await Promise.all([
    prisma.booking.findMany({
      where: {
        listingId,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      select: { checkIn: true, checkOut: true },
    }),
    prisma.blockedDate.findMany({
      where: { listingId },
      select: { date: true },
    }),
  ])

  const bookedDays: Date[] = []

  for (const booking of bookings) {
    // FIX #9: Exclude checkout day — it's available for the next guest's check-in
    const days = eachDayOfInterval({
      start: booking.checkIn,
      end: subDays(booking.checkOut, 1),
    })
    bookedDays.push(...days)
  }

  const blocked = blockedDates.map((b) => b.date)
  return [...bookedDays, ...blocked]
}

/**
 * Checks availability using a DB-level overlap query.
 * FIX #1: This is NOT a replacement for the atomic transaction check in the booking route.
 * This function is for the availability calendar UI only.
 * The booking route MUST re-check inside a serializable transaction.
 */
export async function isAvailable(
  listingId: string,
  checkIn: Date,
  checkOut: Date
): Promise<boolean> {
  // FIX #9 + #10: Use DB-level overlap detection instead of expanding all days
  const conflictingBooking = await prisma.booking.findFirst({
    where: {
      listingId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      // Standard half-open interval overlap: A overlaps B iff A.start < B.end && A.end > B.start
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
  })

  if (conflictingBooking) return false

  const conflictingBlock = await prisma.blockedDate.findFirst({
    where: {
      listingId,
      date: { gte: checkIn, lt: checkOut },
    },
  })

  return !conflictingBlock
}
