'use client'
// file: components/HeroSearch.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const LOCATIONS = [
  'Taghazout',
  'Imsouane',
  'Agadir',
  'Sidi Ifni',
  'Mirleft',
]

export function HeroSearch() {
  const router = useRouter()
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('ALL')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (category !== 'ALL') params.set('category', category)
    if (location) params.set('location', location)
    router.push(`/?${params.toString()}`)
  }

  return (
    <form
      onSubmit={handleSearch}
      className="flex flex-col gap-2 rounded-2xl bg-white/95 p-2 shadow-xl backdrop-blur-sm sm:flex-row sm:items-center"
    >
      {/* Location */}
      <div className="flex flex-1 items-center gap-3 rounded-xl px-4 py-3">
        <span className="text-gray-400">📍</span>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Location</p>
          <input
            list="locations"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Anywhere in Morocco"
            className="mt-0.5 w-full bg-transparent text-sm font-medium text-gray-800 placeholder-gray-400 outline-none"
          />
          <datalist id="locations">
            {LOCATIONS.map((l) => <option key={l} value={l} />)}
          </datalist>
        </div>
      </div>

      <div className="hidden h-10 w-px bg-gray-100 sm:block" />

      {/* Category */}
      <div className="flex flex-1 items-center gap-3 rounded-xl px-4 py-3">
        <span className="text-gray-400">🏄</span>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Type</p>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-0.5 w-full bg-transparent text-sm font-medium text-gray-800 outline-none"
          >
            <option value="ALL">All types</option>
            <option value="SURF_CAMP">Surf Camp</option>
            <option value="ROOM">Room</option>
            <option value="VILLA">Villa</option>
            <option value="HOSTEL">Hostel</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="flex items-center justify-center gap-2 rounded-xl bg-ocean-600 px-8 py-4 text-sm font-bold text-white shadow-md transition hover:bg-ocean-700 active:scale-95"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        Search
      </button>
    </form>
  )
}
