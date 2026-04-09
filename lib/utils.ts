// file: lib/utils.ts — FIXED VERSION
import { differenceInDays, eachDayOfInterval, format, startOfDay } from 'date-fns'

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

// FIX #14: 'en-EU' is not a valid BCP 47 locale — use 'fr-MA' (Moroccan French) or 'en-GB'
export function formatPrice(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function calculateTotalPrice(
  pricePerNight: number,
  checkIn: Date,
  checkOut: Date
): number {
  const nights = differenceInDays(checkOut, checkIn)
  if (nights <= 0) return 0
  return Math.round(pricePerNight * nights * 100) / 100 // Avoid floating point drift
}

export function getDatesInRange(start: Date, end: Date): Date[] {
  return eachDayOfInterval({ start, end })
}

export function formatDateRange(checkIn: Date, checkOut: Date): string {
  return `${format(checkIn, 'MMM d')} – ${format(checkOut, 'MMM d, yyyy')}`
}

export function getNights(checkIn: Date, checkOut: Date): number {
  const n = differenceInDays(checkOut, checkIn)
  return Math.max(0, n)
}

/**
 * FIX #10: Normalize a date to start-of-day in UTC.
 * Use this whenever persisting dates to avoid timezone-shifted storage.
 * e.g. "June 15 00:00 UTC+2" would be stored as "June 14 22:00 UTC" without this.
 */
export function normalizeBookingDate(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/** Format date as 'yyyy-MM-dd' using UTC — for safe string comparisons */
export function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}
