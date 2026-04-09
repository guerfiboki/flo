// file: app/listings/[slug]/page.tsx
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { BookingWidget } from '@/components/BookingWidget'
import { formatPrice } from '@/lib/utils'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const listing = await prisma.listing.findUnique({ where: { slug: params.slug } })
  if (!listing) return {}
  return { title: `${listing.title} — WaveCamp Morocco` }
}

export default async function ListingPage({
  params,
}: {
  params: { slug: string }
}) {
  const [listing, session] = await Promise.all([
    prisma.listing.findUnique({ where: { slug: params.slug, active: true } }),
    getServerSession(authOptions),
  ])

  if (!listing) notFound()

  const categoryLabel: Record<string, string> = {
    SURF_CAMP: '🏄 Surf Camp',
    ROOM: '🛏 Room',
    VILLA: '🏡 Villa',
    HOSTEL: '🏠 Hostel',
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-400">
        <a href="/" className="hover:text-gray-700">Home</a>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{listing.title}</span>
      </nav>

      {/* Title block */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-900 sm:text-4xl">
              {listing.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span className="badge bg-ocean-100 text-ocean-700">
                {categoryLabel[listing.category] || listing.category}
              </span>
              <span>📍 {listing.location}</span>
              <span>👥 Up to {listing.capacity} guests</span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-display text-3xl font-bold text-ocean-600">
              {formatPrice(listing.pricePerNight)}
            </span>
            <span className="text-gray-400"> / night</span>
          </div>
        </div>
      </div>

      {/* Image gallery */}
      <div className="mb-8 grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-3xl h-[480px]">
        {listing.images.slice(0, 5).map((img, i) => (
          <div
            key={i}
            className={`relative overflow-hidden ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
          >
            <img
              src={img}
              alt={`${listing.title} photo ${i + 1}`}
              className="h-full w-full object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
        ))}
      </div>

      {/* Main content + booking widget */}
      <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
        <div>
          {/* Description */}
          <section className="border-b border-gray-100 pb-8">
            <h2 className="font-display mb-4 text-2xl font-bold">About this place</h2>
            <p className="leading-relaxed text-gray-600 whitespace-pre-line">
              {listing.description}
            </p>
          </section>

          {/* Amenities */}
          {listing.amenities.length > 0 && (
            <section className="border-b border-gray-100 py-8">
              <h2 className="font-display mb-4 text-2xl font-bold">What&apos;s included</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {listing.amenities.map((a) => (
                  <div key={a} className="flex items-center gap-2 text-gray-700">
                    <svg className="h-5 w-5 text-ocean-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm">{a}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Location */}
          <section className="py-8">
            <h2 className="font-display mb-4 text-2xl font-bold">Location</h2>
            <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4">
              <span className="text-3xl">📍</span>
              <div>
                <p className="font-semibold text-gray-900">{listing.location}</p>
                <p className="text-sm text-gray-500">Morocco</p>
              </div>
            </div>
          </section>
        </div>

        {/* Booking widget — sticky */}
        <div>
          <div className="sticky top-24">
            <BookingWidget listing={listing} session={session} />
          </div>
        </div>
      </div>
    </div>
  )
}
