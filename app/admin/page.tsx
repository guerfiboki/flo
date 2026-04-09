// file: app/admin/page.tsx
import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/utils'
import Link from 'next/link'
import { format } from 'date-fns'

export default async function AdminDashboard() {
  const [totalBookings, confirmedBookings, totalListings, recentBookings, revenue] =
    await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      prisma.listing.count({ where: { active: true } }),
      prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { listing: true },
      }),
      prisma.booking.aggregate({
        where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
        _sum: { totalPrice: true },
      }),
    ])

  const stats = [
    { label: 'Total bookings', value: totalBookings, icon: '📋', color: 'bg-blue-50 text-blue-700' },
    { label: 'Confirmed', value: confirmedBookings, icon: '✅', color: 'bg-green-50 text-green-700' },
    { label: 'Active listings', value: totalListings, icon: '🏡', color: 'bg-purple-50 text-purple-700' },
    {
      label: 'Total revenue',
      value: formatPrice(revenue._sum.totalPrice || 0),
      icon: '💰',
      color: 'bg-sand-50 text-sand-700',
    },
  ]

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    CONFIRMED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-600',
    COMPLETED: 'bg-gray-100 text-gray-600',
  }

  return (
    <div>
      <h1 className="font-display mb-8 text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-6">
            <div className={`inline-flex rounded-2xl p-3 ${s.color}`}>
              <span className="text-2xl">{s.icon}</span>
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent bookings */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-50 p-6">
          <h2 className="font-display text-xl font-bold">Recent bookings</h2>
          <Link href="/admin/bookings" className="text-sm font-medium text-ocean-600 hover:underline">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentBookings.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-5">
              <div>
                <p className="font-semibold text-gray-900">{b.guestName}</p>
                <p className="text-sm text-gray-500">
                  {b.listing.title} · {format(b.checkIn, 'MMM d')} – {format(b.checkOut, 'MMM d, yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900">{formatPrice(b.totalPrice)}</span>
                <span className={`badge text-xs ${statusColors[b.status]}`}>{b.status}</span>
              </div>
            </div>
          ))}
          {recentBookings.length === 0 && (
            <p className="p-8 text-center text-gray-400">No bookings yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
