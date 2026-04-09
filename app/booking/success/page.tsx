// file: app/booking/success/page.tsx
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatPrice, formatDateRange } from '@/lib/utils'

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string }
}) {
  let booking = null
  let listing = null

  if (searchParams.session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        searchParams.session_id
      )
      const bookingId = session.metadata?.bookingId

      if (bookingId) {
        booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: { listing: true },
        })
        listing = booking?.listing
      }
    } catch (e) {
      // Session not found
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg text-center">
        {/* Success icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="font-display text-3xl font-bold text-gray-900">
          Booking Confirmed! 🌊
        </h1>
        <p className="mt-3 text-gray-500">
          Get ready to surf! Your booking is confirmed and a receipt has been sent
          to your email.
        </p>

        {booking && listing && (
          <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-card">
            <div className="flex gap-4">
              {listing.images[0] && (
                <img
                  src={listing.images[0]}
                  alt={listing.title}
                  className="h-20 w-20 flex-shrink-0 rounded-xl object-cover"
                />
              )}
              <div>
                <p className="font-semibold text-gray-900">{listing.title}</p>
                <p className="text-sm text-gray-500">📍 {listing.location}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-gray-50 pt-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Dates</p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {formatDateRange(booking.checkIn, booking.checkOut)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Guests</p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {booking.guests} guest{booking.guests > 1 ? 's' : ''}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total paid</p>
                <p className="mt-1 text-sm font-bold text-ocean-600">
                  {formatPrice(booking.totalPrice)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Status</p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                  ✓ Confirmed
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/" className="btn-primary">
            Browse more stays
          </Link>
          <Link href="/account/bookings" className="btn-secondary">
            My bookings
          </Link>
        </div>
      </div>
    </div>
  )
}
