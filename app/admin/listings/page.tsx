// file: app/admin/listings/page.tsx
import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminListingsPage() {
  const listings = await prisma.listing.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { bookings: true } } },
  })

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-gray-900">Listings</h1>
        <Link href="/admin/listings/new" className="btn-primary">
          + Add listing
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((l) => (
          <div key={l.id} className="card overflow-hidden">
            {l.images[0] && (
              <div className="relative h-44 overflow-hidden">
                <img
                  src={l.images[0]}
                  alt={l.title}
                  className="h-full w-full object-cover"
                />
                <div className={`absolute right-3 top-3 badge text-xs ${
                  l.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}>
                  {l.active ? 'Active' : 'Inactive'}
                </div>
              </div>
            )}
            <div className="p-5">
              <h3 className="font-display font-bold text-gray-900">{l.title}</h3>
              <p className="text-sm text-gray-500">📍 {l.location}</p>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-ocean-600">{formatPrice(l.pricePerNight)}/night</p>
                  <p className="text-xs text-gray-400">{l._count.bookings} bookings · {l.capacity} guests max</p>
                </div>
                <Link
                  href={`/admin/listings/${l.slug}/edit`}
                  className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Edit
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {listings.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 py-24 text-center">
          <span className="text-5xl">🏡</span>
          <p className="mt-4 font-semibold text-gray-700">No listings yet</p>
          <Link href="/admin/listings/new" className="btn-primary mt-4">
            Add your first listing
          </Link>
        </div>
      )}
    </div>
  )
}
