'use client'
// file: components/BookingWidget.tsx — FIXED VERSION
import { useState, useEffect, useCallback, useMemo } from 'react'
import { DateRangePicker } from './DateRangePicker'
import { formatPrice, calculateTotalPrice, getNights, toDateKey } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { format, isBefore, startOfDay } from 'date-fns'

type Listing = {
  id: string
  slug: string
  title: string
  pricePerNight: number
  capacity: number
}

export function BookingWidget({
  listing,
  session,
}: {
  listing: Listing
  session: any | null
}) {
  const router = useRouter()
  const [checkIn, setCheckIn] = useState<Date | undefined>()
  const [checkOut, setCheckOut] = useState<Date | undefined>()
  const [guests, setGuests] = useState(1)
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([])
  const [availabilityLoading, setAvailabilityLoading] = useState(true)
  const [availabilityError, setAvailabilityError] = useState(false) // FIX #15
  const [step, setStep] = useState<'dates' | 'details' | 'loading'>('dates')
  const [error, setError] = useState('')
  const [submitDisabled, setSubmitDisabled] = useState(false)

  const [guestName, setGuestName] = useState(session?.user?.name || '')
  const [guestEmail, setGuestEmail] = useState(session?.user?.email || '')
  const [guestPhone, setGuestPhone] = useState('')
  const [notes, setNotes] = useState('')

  const nights = checkIn && checkOut ? getNights(checkIn, checkOut) : 0
  const total = checkIn && checkOut ? calculateTotalPrice(listing.pricePerNight, checkIn, checkOut) : 0

  useEffect(() => {
    setAvailabilityLoading(true)
    setAvailabilityError(false)

    fetch(`/api/listings/${listing.slug}/availability`)
      .then((r) => {
        // FIX #15: Treat non-200 responses as errors, don't silently swallow
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((dates: string[]) => {
        setUnavailableDates(dates.map((d) => new Date(d)))
        setAvailabilityLoading(false)
      })
      .catch(() => {
        setAvailabilityError(true)
        setAvailabilityLoading(false)
      })
  }, [listing.slug])

  // FIX #18: Memoize the Set for O(1) lookups instead of O(n) linear scan
  const unavailableSet = useMemo(
    () => new Set(unavailableDates.map((d) => toDateKey(d))),
    [unavailableDates]
  )

  // FIX #18: Memoize the callback to avoid unnecessary re-renders
  const isDateUnavailable = useCallback(
    (date: Date) => {
      if (isBefore(date, startOfDay(new Date()))) return true
      return unavailableSet.has(toDateKey(date))
    },
    [unavailableSet]
  )

  async function handleBook() {
    if (!session) {
      router.push(`/login?callbackUrl=/listings/${listing.slug}`)
      return
    }

    if (!checkIn || !checkOut || !guestName.trim() || !guestEmail.trim()) {
      setError('Please fill in all required fields')
      return
    }

    // FIX: Prevent double submission
    if (submitDisabled) return
    setSubmitDisabled(true)
    setStep('loading')
    setError('')

    try {
      const bookingRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          guests,
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim(),
          guestPhone: guestPhone.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })

      if (!bookingRes.ok) {
        const data = await bookingRes.json()
        setError(data.error || 'Booking failed')
        setStep('details')
        setSubmitDisabled(false)
        return
      }

      const booking = await bookingRes.json()

      const checkoutRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      })

      if (!checkoutRes.ok) {
        const data = await checkoutRes.json()
        setError(data.error || 'Payment setup failed')
        setStep('details')
        setSubmitDisabled(false)
        return
      }

      const { url } = await checkoutRes.json()
      window.location.href = url
      // Don't re-enable submit — we're navigating away
    } catch (e) {
      setError('Something went wrong. Please try again.')
      setStep('details')
      setSubmitDisabled(false)
    }
  }

  return (
    <div className="card p-6">
      <div className="mb-5 flex items-baseline gap-1">
        <span className="font-display text-2xl font-bold text-gray-900">
          {formatPrice(listing.pricePerNight)}
        </span>
        <span className="text-gray-400">/ night</span>
      </div>

      {/* FIX #15: Show availability error prominently */}
      {availabilityError && (
        <div className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
          ⚠️ Could not load availability calendar. Please{' '}
          <button
            onClick={() => window.location.reload()}
            className="underline font-medium"
          >
            refresh
          </button>{' '}
          or contact us to confirm dates.
        </div>
      )}

      {(step === 'dates' || step === 'details') && (
        <>
          <DateRangePicker
            checkIn={checkIn}
            checkOut={checkOut}
            onChange={(ci, co) => {
              setCheckIn(ci)
              setCheckOut(co)
              setError('')
            }}
            isDateUnavailable={isDateUnavailable}
            disabled={availabilityLoading}
          />

          <div className="mt-3">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Guests</label>
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
              <button
                type="button"
                onClick={() => setGuests(Math.max(1, guests - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
              >
                −
              </button>
              <span className="flex-1 text-center font-semibold">{guests}</span>
              <button
                type="button"
                onClick={() => setGuests(Math.min(listing.capacity, guests + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
              >
                +
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">Max {listing.capacity} guests</p>
          </div>
        </>
      )}

      {step === 'details' && checkIn && checkOut && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-700">Your details</p>

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <input
            placeholder="Full name *"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            maxLength={100}
            className="input-field"
          />
          <input
            placeholder="Email *"
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            maxLength={255}
            className="input-field"
          />
          <input
            placeholder="Phone (optional)"
            type="tel"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            maxLength={20}
            className="input-field"
          />
          <textarea
            placeholder="Special requests (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            rows={2}
            className="input-field resize-none"
          />
        </div>
      )}

      {step === 'loading' && (
        <div className="flex flex-col items-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ocean-600 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">Redirecting to payment…</p>
        </div>
      )}

      {nights > 0 && step !== 'loading' && (
        <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>
              {formatPrice(listing.pricePerNight)} × {nights} night{nights > 1 ? 's' : ''}
            </span>
            <span>{formatPrice(total)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      )}

      {step !== 'loading' && (
        <>
          {step === 'dates' && checkIn && checkOut ? (
            <button
              onClick={() => setStep('details')}
              className="btn-coral mt-4 w-full py-3.5"
            >
              Continue — {nights} night{nights > 1 ? 's' : ''}
            </button>
          ) : step === 'dates' ? (
            <button
              disabled
              className="btn-coral mt-4 w-full py-3.5 opacity-50 cursor-not-allowed"
            >
              {availabilityLoading ? 'Loading availability…' : 'Select dates to continue'}
            </button>
          ) : (
            <button
              onClick={handleBook}
              disabled={submitDisabled}
              className="btn-coral mt-4 w-full py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {session ? '🔒 Pay now' : 'Sign in to book'}
            </button>
          )}
        </>
      )}

      <p className="mt-3 text-center text-xs text-gray-400">
        You won&apos;t be charged yet — review on the next page
      </p>
    </div>
  )
}
