// file: app/admin/bookings/page.tsx — FIXED (paginated)
import { prisma } from '@/lib/prisma'
import { formatPrice, formatDateRange } from '@/lib/utils'
import { format } from 'date-fns'
import Link from 'next/link'

const PAGE_SIZE = 50

const statusColors: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
  COMPLETED: 'bg-gray-100 text-gray-600',
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string }
}) {
  const page = Math.max(1, Number(searchParams.page ?? 1))
  const statusFilter = searchParams.status

  const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']
  const where = {
    ...(statusFilter && validStatuses.includes(statusFilter) ? { status: statusFilter as any } : {}),
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        listing: { select: { title: true, slug: true, location: true } },
        user:    { select: { name: true, email: true } },
        payment: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.booking.count({ where }),
  ])

  const pages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-gray-900">All Bookings</h1>
          <p className="mt-1 text-sm text-gray-500">{total} total bookings</p>
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-2">
          {['ALL', ...['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']].map((s) => {
            const isActive = s === 'ALL' ? !statusFilter : statusFilter === s
            return (
              <Link
                key={s}
                href={`/admin/bookings${s === 'ALL' ? '' : `?status=${s}`}`}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'border-ocean-500 bg-ocean-50 text-ocean-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Guest', 'Listing', 'Dates', 'Guests', 'Total', 'Payment', 'Status', 'Created'].map(
                (h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {bookings.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <p className="font-semibold text-gray-900">{b.guestName}</p>
                  <p className="text-gray-400 text-xs">{b.guestEmail}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-medium text-gray-900">{b.listing.title}</p>
                  <p className="text-gray-400 text-xs">{b.listing.location}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                  {formatDateRange(b.checkIn, b.checkOut)}
                </td>
                <td className="px-4 py-4 text-gray-600">{b.guests}</td>
                <td className="whitespace-nowrap px-4 py-4 font-semibold text-gray-900">
                  {formatPrice(b.totalPrice)}
                </td>
                <td className="px-4 py-4">
                  {b.payment ? (
                    <span className={`badge text-xs ${
                      b.payment.status === 'PAID'   ? 'bg-green-100 text-green-700'  :
                      b.payment.status === 'FAILED' ? 'bg-red-100 text-red-600'      :
                                                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {b.payment.status}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <span className={`badge text-xs ${statusColors[b.status]}`}>{b.status}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-gray-400">
                  {format(b.createdAt, 'MMM d, yyyy')}
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={8} className="py-16 text-center text-gray-400">
                  No bookings found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/admin/bookings?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ''}`}
              className="btn-secondary px-4 py-2 text-sm"
            >
              ← Previous
            </Link>
          )}
          <span className="text-sm text-gray-500">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link
              href={`/admin/bookings?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ''}`}
              className="btn-secondary px-4 py-2 text-sm"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
