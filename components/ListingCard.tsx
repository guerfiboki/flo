// file: components/ListingCard.tsx
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

type Listing = {
  id: string
  slug: string
  title: string
  location: string
  pricePerNight: number
  capacity: number
  images: string[]
  category: string
}

const categoryEmoji: Record<string, string> = {
  SURF_CAMP: '🏄',
  ROOM: '🛏',
  VILLA: '🏡',
  HOSTEL: '🏠',
}

export function ListingCard({ listing, index = 0 }: { listing: Listing; index?: number }) {
  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group block animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Image */}
      <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100">
        {listing.images[0] ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-gray-300">
            🏄
          </div>
        )}

        {/* Category badge */}
        <div className="absolute left-3 top-3">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-gray-700 backdrop-blur-sm">
            {categoryEmoji[listing.category] || '🏠'}{' '}
            {listing.category.replace('_', ' ')}
          </span>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
      </div>

      {/* Info */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 leading-snug group-hover:text-ocean-700 transition-colors">
            {listing.title}
          </h3>
        </div>

        <p className="text-sm text-gray-500">📍 {listing.location}</p>

        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-gray-400">👥 Up to {listing.capacity}</p>
          <p className="text-sm">
            <span className="font-bold text-gray-900">{formatPrice(listing.pricePerNight)}</span>
            <span className="text-gray-400"> / night</span>
          </p>
        </div>
      </div>
    </Link>
  )
}
